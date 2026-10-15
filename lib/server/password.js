import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 32;
const SALT_BYTES = 16;

function scryptAsync(password, salt, keylen, n, r, p) {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, keylen, { N: n, r, p, maxmem: 256 * n * r }, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

export async function hashPassword(password) {
  const salt = randomBytes(SALT_BYTES);
  const key = await scryptAsync(password, salt, KEY_LENGTH, N, R, P);
  return ["scrypt", N, R, P, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPassword(password, stored) {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  // Bounds so a tampered hash cannot make the server burn huge amounts of CPU/memory.
  if (!Number.isInteger(n) || n < 1024 || n > 2 ** 17 || (n & (n - 1)) !== 0) return false;
  if (!Number.isInteger(r) || r < 1 || r > 16 || !Number.isInteger(p) || p < 1 || p > 4) return false;
  const salt = Buffer.from(parts[4], "base64url");
  const expected = Buffer.from(parts[5], "base64url");
  if (salt.length < 8 || expected.length < 16) return false;
  const actual = await scryptAsync(password, salt, expected.length, n, r, p);
  return timingSafeEqual(actual, expected);
}

let dummyHash = null;

// Makes "wrong code" take as long as "wrong password", so codes cannot be probed by timing.
export async function burnPasswordCheck(password) {
  dummyHash ??= hashPassword(randomBytes(12).toString("hex"));
  await verifyPassword(password, await dummyHash);
}
