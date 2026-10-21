import { HOST_CLAIM_WINDOW_MS } from "./config.js";
import { parseCapture } from "./capture.js";
import { applyOrder, reconcileWithPresence, removeParticipant, sameLayerState, transferHost, validateOrder } from "./layers.js";

export function newRoomMetadata({ code, passwordHash, hostIdentity, now }) {
  return { v: 1, code, passwordHash, createdAt: now, hostIdentity, stack: [], rev: 1, updatedAt: now };
}

export function toPublicState(meta) {
  const { passwordHash, ...rest } = meta;
  return rest;
}

function isEntry(e) {
  return (
    !!e &&
    typeof e.identity === "string" &&
    typeof e.name === "string" &&
    typeof e.joinedAt === "number" &&
    (e.absentSince === undefined || typeof e.absentSince === "number")
  );
}

export function parsePublicState(raw) {
  if (!raw) return null;
  let d;
  try {
    d = JSON.parse(raw);
  } catch {
    return null;
  }
  const valid =
    d &&
    d.v === 1 &&
    typeof d.code === "string" &&
    typeof d.createdAt === "number" &&
    typeof d.rev === "number" &&
    typeof d.updatedAt === "number" &&
    (d.hostIdentity === null || typeof d.hostIdentity === "string") &&
    Array.isArray(d.stack) &&
    d.stack.every(isEntry);
  if (!valid) return null;
  return { v: 1, code: d.code, createdAt: d.createdAt, rev: d.rev, updatedAt: d.updatedAt, hostIdentity: d.hostIdentity, stack: d.stack, capture: parseCapture(d.capture) };
}

export function parseRoomMetadata(raw) {
  const pub = parsePublicState(raw);
  if (!pub) return null;
  const { passwordHash } = JSON.parse(raw);
  return typeof passwordHash === "string" ? { ...pub, passwordHash } : null;
}

function fail(status, code, message) {
  return { ok: false, error: { status, code, message } };
}

function commit(meta, next, now) {
  if (sameLayerState(meta, next)) return { meta, changed: false };
  return {
    meta: { ...meta, hostIdentity: next.hostIdentity, stack: next.stack, rev: meta.rev + 1, updatedAt: now,
      capture: meta.capture?.status === "countdown" &&
        (next.hostIdentity !== meta.capture.owner || !next.stack.some((p) => p.identity === meta.capture.owner && p.absentSince === undefined))
        ? { ...meta.capture, status: "cancelled" } : meta.capture },
    changed: true,
  };
}

export function syncPresence(meta, presence, now) {
  const next = reconcileWithPresence(meta, presence, now, now - meta.createdAt < HOST_CLAIM_WINDOW_MS);
  return commit(meta, next, now);
}

export function requestReorder(meta, caller, order, now) {
  if (meta.hostIdentity !== caller) return fail(403, "not_host", "Only the host can reorder layers.");
  if (!Array.isArray(order) || !order.every((x) => typeof x === "string")) {
    return fail(400, "invalid_order", "Order must be a list of participant identities.");
  }
  const problem = validateOrder(meta.stack, order);
  if (problem === "duplicate") return fail(400, "invalid_order", "Order contains duplicate participants.");
  if (problem === "mismatch") {
    return fail(409, "conflict", "Participants changed while you were reordering. Please try again.");
  }
  return { ok: true, ...commit(meta, { hostIdentity: meta.hostIdentity, stack: applyOrder(meta.stack, order) }, now) };
}

export function requestHostTransfer(meta, caller, target, now) {
  if (meta.hostIdentity !== caller) return fail(403, "not_host", "Only the host can transfer the host role.");
  const entry = meta.stack.find((e) => e.identity === target);
  if (!entry || entry.absentSince !== undefined) return fail(400, "unknown_participant", "That participant is not connected.");
  return { ok: true, ...commit(meta, transferHost(meta, entry.identity), now) };
}

export function requestLeave(meta, caller, now) {
  return { ok: true, ...commit(meta, removeParticipant(meta, caller), now) };
}
