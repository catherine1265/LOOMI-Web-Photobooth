import { clientIp, handle, readJson } from "../../lib/server/http.js";
import { joinMeeting } from "../../lib/server/meetingService.js";

export function POST(req) {
  return handle(async () => joinMeeting(await readJson(req), clientIp(req)));
}
