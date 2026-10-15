import { bearerToken, handle, roomCode } from "../../../lib/server/http.js";
import { sync } from "../../../lib/server/meetingService.js";

export function POST(req) {
  const code = roomCode(req);
  return handle(async () => ({ state: await sync(bearerToken(req), code) }));
}
