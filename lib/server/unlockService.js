import { timingSafeEqual } from "node:crypto";

const UNLOCK_LIMIT = 5;
const UNLOCK_WINDOW_MS = 60_000;

const failedTries = new Map();

function normalize(input) {
  return String(input ?? "").trim().toUpperCase();
}

function retryAfterSeconds(ip, now) {
  const recent = (failedTries.get(ip) ?? []).filter((t) => now - t < UNLOCK_WINDOW_MS);
  if (recent.length === 0) failedTries.delete(ip);
  else failedTries.set(ip, recent);
  return recent.length < UNLOCK_LIMIT ? 0 : Math.ceil((recent[0] + UNLOCK_WINDOW_MS - now) / 1000);
}

function matches(input, expected) {
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Returns { status, body } for POST /api/unlock. */
export function checkUnlockCode(body, ip, expectedCode = process.env.UNLOCK_CODE) {
  const expected = normalize(expectedCode);
  if (!expected) return { status: 500, body: { ok: false, error: "Something went wrong." } };

  const now = Date.now();
  const retryAfter = retryAfterSeconds(ip, now);
  if (retryAfter > 0) return { status: 429, body: { ok: false, retryAfter } };

  if (typeof body?.code !== "string") return { status: 400, body: { ok: false } };

  if (matches(normalize(body.code), expected)) {
    failedTries.delete(ip);
    return { status: 200, body: { ok: true } };
  }

  failedTries.set(ip, [...(failedTries.get(ip) ?? []), now]);
  return { status: 401, body: { ok: false } };
}
