import { clientIp, readJson } from "../lib/server/http.js";
import { checkUnlockCode } from "../lib/server/unlockService.js";

const NO_STORE = { "cache-control": "no-store" };

export async function POST(req) {
  try {
    const { status, body } = checkUnlockCode(await readJson(req).catch(() => null), clientIp(req));
    const headers = { ...NO_STORE };
    if (body.retryAfter) headers["retry-after"] = String(body.retryAfter);
    return Response.json(body, { status, headers });
  } catch (err) {
    console.error("[api] unexpected error", err);
    return Response.json({ ok: false, error: "Something went wrong." }, { status: 500, headers: NO_STORE });
  }
}
