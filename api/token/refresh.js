import { bearerToken, handle } from "../../lib/server/http.js";
import { refreshToken } from "../../lib/server/meetingService.js";

export function POST(req) {
  return handle(() => refreshToken(bearerToken(req)));
}
