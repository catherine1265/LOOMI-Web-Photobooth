import { bearerToken, handle, readJson, roomCode } from "../../../lib/server/http.js";
import { transferHost } from "../../../lib/server/meetingService.js";

export function POST(req) {
  const code = roomCode(req);
  return handle(async () => {
    const body = await readJson(req);
    return { state: await transferHost(bearerToken(req), code, body.identity) };
  });
}
