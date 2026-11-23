const STORAGE_KEY = "loomi.watermarkUnlocked";

export class UnlockError extends Error {
  constructor(retryAfter) {
    super(retryAfter ? "Too many tries" : "Something went wrong, try again");
    this.retryAfter = retryAfter;
  }
}

// true: valid code, false: wrong code. Throws UnlockError when rate limited or the request fails.
export async function validateCode(code) {
  let response;
  try {
    response = await fetch("/api/unlock", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
  } catch {
    throw new UnlockError();
  }

  if (response.status === 429) {
    const body = await response.json().catch(() => null);
    throw new UnlockError(Math.ceil(Number(body?.retryAfter)) || 30);
  }
  if (response.status === 401) return false;
  if (!response.ok) throw new UnlockError();

  const body = await response.json().catch(() => null);
  return body?.ok === true;
}

export function isWatermarkUnlocked() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function rememberWatermarkUnlocked() {
  try {
    sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // sessionStorage unavailable; unlock only lasts until the page reloads.
  }
}

export function resetWatermarkUnlocked() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // sessionStorage unavailable; nothing to reset.
  }
}
