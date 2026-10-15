import { ServiceError } from "./meetingService.js";

const NO_STORE = { "cache-control": "no-store" };

export function bearerToken(req) {
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") ?? "");
  return match ? match[1].trim() : null;
}

export function clientIp(req) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** The [code] part of /api/rooms/[code]/... (Vercel also passes it as ?code=). */
export function roomCode(req) {
  const url = new URL(req.url);
  const fromPath = /\/rooms\/([^/]+)\/[^/]+\/?$/.exec(url.pathname)?.[1];
  return decodeURIComponent(url.searchParams.get("code") ?? fromPath ?? "");
}

export async function readJson(req) {
  try {
    const body = await req.json();
    if (body && typeof body === "object" && !Array.isArray(body)) return body;
  } catch {}
  throw new ServiceError(400, "bad_request", "Request body must be a JSON object.");
}

export async function handle(fn) {
  try {
    return Response.json(await fn(), { headers: NO_STORE });
  } catch (err) {
    if (err instanceof ServiceError) {
      const body = { error: { code: err.code, message: err.message } };
      if (err.state) body.state = err.state;
      const headers = { ...NO_STORE };
      if (err.retryAfterSeconds) headers["retry-after"] = String(err.retryAfterSeconds);
      return Response.json(body, { status: err.status, headers });
    }
    console.error("[api] unexpected error", err);
    return Response.json(
      { error: { code: "internal", message: "Something went wrong. Please try again." } },
      { status: 500, headers: NO_STORE },
    );
  }
}
