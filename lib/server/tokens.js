import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { AccessToken, TokenVerifier } from "livekit-server-sdk";
import { IDENTITY_PREFIX } from "../config.js";

const TOKEN_TTL_SECONDS = 10 * 60;

export function newIdentity() {
  return IDENTITY_PREFIX + randomBytes(9).toString("base64url");
}

export async function issueRoomToken(keys, { room, identity, name }) {
  const at = new AccessToken(keys.apiKey, keys.apiSecret, { identity, name, ttl: TOKEN_TTL_SECONDS });
  at.addGrant({
    room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    canUpdateOwnMetadata: false,
    roomAdmin: false,
    roomCreate: false,
    roomList: false,
  });
  return at.toJwt();
}

export async function verifyRoomToken(keys, token, clockToleranceSeconds = 5) {
  try {
    const claims = await new TokenVerifier(keys.apiKey, keys.apiSecret).verify(token, clockToleranceSeconds);
    const room = claims.video?.room;
    if (!claims.sub || !room || !claims.video?.roomJoin || typeof claims.exp !== "number") return null;
    return { identity: claims.sub, name: claims.name ?? "", room, expiresAt: claims.exp * 1000 };
  } catch {
    return null;
  }
}

// Lets a reconnecting browser get its old identity (and layer position) back.
export function rejoinKeyFor(secret, room, identity) {
  return createHmac("sha256", secret).update(`rejoin:${room}:${identity}`).digest("base64url");
}

export function isValidRejoinKey(secret, room, identity, key) {
  if (typeof identity !== "string" || typeof key !== "string") return false;
  if (!identity.startsWith(IDENTITY_PREFIX) || identity.length > 64) return false;
  const expected = Buffer.from(rejoinKeyFor(secret, room, identity));
  const given = Buffer.from(key);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
