import { bearerToken, handle, readJson, roomCode } from "../../../lib/server/http.js";
import { capturePhoto } from "../../../lib/server/meetingService.js";

export function POST(req) {
  return handle(async () => ({
    state: await capturePhoto(bearerToken(req), roomCode(req), await readJson(req)),
    serverTime: Date.now(),
  }));
}
