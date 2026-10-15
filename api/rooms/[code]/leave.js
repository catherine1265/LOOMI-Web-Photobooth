import { bearerToken, handle, roomCode } from "../../../lib/server/http.js";
import { leave } from "../../../lib/server/meetingService.js";

export function POST(req) {
  const code = roomCode(req);
  return handle(async () => ({ state: await leave(bearerToken(req), code) }));
}
