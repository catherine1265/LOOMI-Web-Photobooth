import { randomInt, randomUUID } from "node:crypto";
import { requestCapture } from "../capture.js";
import { RoomServiceClient } from "livekit-server-sdk";
import { IDENTITY_PREFIX, NAME_MAX_LENGTH, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "../config.js";
import {
  newRoomMetadata,
  parseRoomMetadata,
  requestHostTransfer,
  requestLeave,
  requestReorder,
  syncPresence,
  toPublicState,
} from "../roomState.js";
import { burnPasswordCheck, hashPassword, verifyPassword } from "./password.js";
import { issueRoomToken, isValidRejoinKey, newIdentity, rejoinKeyFor, verifyRoomToken } from "./tokens.js";

const MEETING_CODE_LENGTH = 6;
const MEETING_CODE_PATTERN = /^\d{4,10}$/;
const GENERIC_JOIN_ERROR = "Invalid code or password";
const JOIN_LIMIT = 5;
const JOIN_WINDOW_MS = 60_000;
const ROOM_EMPTY_TIMEOUT_S = 5 * 60;
const ROOM_DEPARTURE_TIMEOUT_S = 60;
const ROOM_MAX_PARTICIPANTS = 50;
const TOKEN_REFRESH_MAX_EXPIRED_SECONDS = 6 * 60 * 60;
const PARTICIPANT_STATE_DISCONNECTED = 3;

export class ServiceError extends Error {
  constructor(status, code, message, state, retryAfterSeconds) {
    super(message);
    this.status = status;
    this.code = code;
    this.state = state;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

let livekit = null;

function getLiveKit() {
  if (livekit) return livekit;
  const { LIVEKIT_URL: url, LIVEKIT_API_KEY: apiKey, LIVEKIT_API_SECRET: apiSecret } = process.env;
  if (!url || !apiKey || !apiSecret) {
    throw new ServiceError(500, "not_configured", "Server is not configured: set LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET.");
  }
  livekit = { url, keys: { apiKey, apiSecret }, rooms: new RoomServiceClient(url, apiKey, apiSecret) };
  return livekit;
}

function normalizeName(raw) {
  if (typeof raw !== "string") return null;
  const name = raw.replace(/\s+/g, " ").trim();
  return name.length >= 1 && name.length <= NAME_MAX_LENGTH ? name : null;
}

function requireName(raw) {
  const name = normalizeName(raw);
  if (!name) throw new ServiceError(400, "invalid_name", `Please enter a display name (1-${NAME_MAX_LENGTH} characters).`);
  return name;
}

// Failed join attempts per IP and per meeting code (per server instance).
const failedJoins = new Map();

function recentFailures(key, now) {
  const list = (failedJoins.get(key) ?? []).filter((t) => now - t < JOIN_WINDOW_MS);
  if (list.length) failedJoins.set(key, list);
  else failedJoins.delete(key);
  return list;
}

function joinRetryAfterMs(key, now) {
  const list = recentFailures(key, now);
  return list.length < JOIN_LIMIT ? 0 : list[0] + JOIN_WINDOW_MS - now;
}

function recordFailedJoin(key, now) {
  failedJoins.set(key, [...recentFailures(key, now), now]);
  if (failedJoins.size > 10_000) failedJoins.delete(failedJoins.keys().next().value);
}

const roomLocks = new Map();

function withRoomLock(code, fn) {
  const run = (roomLocks.get(code) ?? Promise.resolve()).catch(() => undefined).then(fn);
  const tail = run.catch(() => undefined);
  roomLocks.set(code, tail);
  tail.then(() => {
    if (roomLocks.get(code) === tail) roomLocks.delete(code);
  });
  return run;
}

async function readRoom(code) {
  const [room] = await getLiveKit().rooms.listRooms([code]);
  return room ? parseRoomMetadata(room.metadata) : null;
}

async function writeRoom(meta) {
  await getLiveKit().rooms.updateRoomMetadata(meta.code, JSON.stringify(meta));
}

async function listPresence(code) {
  const participants = await getLiveKit().rooms.listParticipants(code);
  return participants
    .filter((p) => p.identity.startsWith(IDENTITY_PREFIX) && p.state !== PARTICIPANT_STATE_DISCONNECTED)
    .map((p) => ({ identity: p.identity, name: p.name || "Guest", joinedAt: Number(p.joinedAtMs) || Number(p.joinedAt) * 1000 }));
}

async function freeMeetingCode() {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = String(randomInt(10 ** (MEETING_CODE_LENGTH - 1), 10 ** MEETING_CODE_LENGTH));
    if ((await getLiveKit().rooms.listRooms([code])).length === 0) return code;
  }
  throw new ServiceError(503, "code_unavailable", "Could not allocate a meeting code. Please try again.");
}

async function session(code, identity, name) {
  const { url, keys } = getLiveKit();
  return {
    code,
    identity,
    name,
    token: await issueRoomToken(keys, { room: code, identity, name }),
    url,
    rejoinKey: rejoinKeyFor(keys.apiSecret, code, identity),
  };
}

async function authenticate(token, code) {
  const caller = token ? await verifyRoomToken(getLiveKit().keys, token) : null;
  if (!caller) throw new ServiceError(401, "unauthorized", "Your session has expired. Please rejoin.");
  if (caller.room !== code) throw new ServiceError(403, "wrong_room", "This token is for a different meeting.");
  return caller;
}

// Read the room, reconcile it with who is really connected, apply the change, write it back.
function mutate(code, op, excludeFromPresence) {
  return withRoomLock(code, async () => {
    const meta = await readRoom(code);
    if (!meta) throw new ServiceError(404, "room_not_found", "This meeting has ended.");
    const presence = (await listPresence(code)).filter((p) => p.identity !== excludeFromPresence);
    const now = Date.now();
    const synced = syncPresence(meta, presence, now);
    const result = op(synced.meta, now);
    if (!result.ok) {
      if (synced.changed) await writeRoom(synced.meta);
      throw new ServiceError(result.error.status, result.error.code, result.error.message, toPublicState(synced.meta));
    }
    if (synced.changed || result.changed) await writeRoom(result.meta);
    return toPublicState(result.meta);
  });
}

export async function createMeeting(body) {
  const name = requireName(body.name);
  const password = body.password;
  if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    throw new ServiceError(400, "invalid_password", `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  }
  const { rooms } = getLiveKit();
  const passwordHash = await hashPassword(password);
  const identity = newIdentity();
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = await freeMeetingCode();
    const room = await rooms.createRoom({
      name: code,
      emptyTimeout: ROOM_EMPTY_TIMEOUT_S,
      departureTimeout: ROOM_DEPARTURE_TIMEOUT_S,
      maxParticipants: ROOM_MAX_PARTICIPANTS,
      metadata: JSON.stringify(newRoomMetadata({ code, passwordHash, hostIdentity: identity, now: Date.now() })),
    });
    // Another request may have created the same code first; then this room is not ours.
    if (parseRoomMetadata(room.metadata)?.hostIdentity === identity) return session(code, identity, name);
  }
  throw new ServiceError(503, "code_unavailable", "Could not allocate a meeting code. Please try again.");
}

export async function joinMeeting(body, ip) {
  const code = typeof body.code === "string" ? body.code.replace(/\s+/g, "") : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name = requireName(body.name);

  const now = Date.now();
  const limitKeys = [`ip:${ip}`, `code:${code}`];
  const waitMs = Math.max(...limitKeys.map((k) => joinRetryAfterMs(k, now)));
  if (waitMs > 0) {
    const seconds = Math.ceil(waitMs / 1000);
    throw new ServiceError(429, "rate_limited", `Too many attempts. Try again in ${seconds} seconds.`, undefined, seconds);
  }
  const fail = () => {
    limitKeys.forEach((k) => recordFailedJoin(k, now));
    return new ServiceError(401, "invalid_credentials", GENERIC_JOIN_ERROR);
  };

  const meta = MEETING_CODE_PATTERN.test(code) ? await readRoom(code) : null;
  if (!meta) {
    await burnPasswordCheck(password);
    throw fail();
  }
  if (!(await verifyPassword(password, meta.passwordHash))) throw fail();

  const { keys } = getLiveKit();
  const identity = isValidRejoinKey(keys.apiSecret, code, body.identity, body.rejoinKey) ? body.identity : newIdentity();
  return session(code, identity, name);
}

export async function sync(token, code) {
  await authenticate(token, code);
  return mutate(code, (meta) => ({ ok: true, meta, changed: false }));
}

export async function capturePhoto(token, code, body) {
  const caller = await authenticate(token, code);
  return mutate(code, (meta, now) => requestCapture(meta, caller.identity, body, now, randomUUID()));
}

export async function reorder(token, code, order) {
  const caller = await authenticate(token, code);
  return mutate(code, (meta, now) => requestReorder(meta, caller.identity, order, now));
}

export async function transferHost(token, code, target) {
  const caller = await authenticate(token, code);
  return mutate(code, (meta, now) => requestHostTransfer(meta, caller.identity, target, now));
}

export async function leave(token, code) {
  const caller = await authenticate(token, code);
  return mutate(code, (meta, now) => requestLeave(meta, caller.identity, now), caller.identity);
}

// An expired token can still be refreshed while its owner is connected to the room.
export async function refreshToken(token) {
  const { keys } = getLiveKit();
  const caller = token ? await verifyRoomToken(keys, token, TOKEN_REFRESH_MAX_EXPIRED_SECONDS) : null;
  if (!caller) throw new ServiceError(401, "unauthorized", "Your session has expired. Please rejoin.");
  if (caller.expiresAt <= Date.now()) {
    const presence = await listPresence(caller.room).catch(() => []);
    if (!presence.some((p) => p.identity === caller.identity)) {
      throw new ServiceError(401, "unauthorized", "Your session has expired. Please rejoin.");
    }
  }
  return { token: await issueRoomToken(keys, { room: caller.room, identity: caller.identity, name: caller.name }) };
}
