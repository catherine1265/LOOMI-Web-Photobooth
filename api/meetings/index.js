import { handle, readJson } from "../../lib/server/http.js";
import { createMeeting } from "../../lib/server/meetingService.js";

export function POST(req) {
  return handle(async () => createMeeting(await readJson(req)));
}
