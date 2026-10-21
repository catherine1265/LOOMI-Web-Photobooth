export const CAPTURE_LAYOUTS = { "1x1": 1, "1x2": 2, "1x3": 3, "1x4": 4, "2x2": 4 };
export const COUNTDOWN_MS = 3000;
export const CAPTURE_LATE_MS = 1500;

export function parseCapture(value) {
  if (!value || typeof value.id !== "string" || typeof value.owner !== "string" ||
      !Object.hasOwn(CAPTURE_LAYOUTS, value.frameType) ||
      !Number.isInteger(value.slotIndex) || value.slotIndex < 0 || value.slotIndex >= CAPTURE_LAYOUTS[value.frameType] ||
      !Number.isFinite(value.captureAt) || !["countdown", "done", "cancelled"].includes(value.status)) return null;
  return { id: value.id, owner: value.owner, frameType: value.frameType, slotIndex: value.slotIndex,
    captureAt: value.captureAt, status: value.status };
}

export function requestCapture(meta, caller, body, now, id) {
  const fail = (status, code, message) => ({ ok: false, error: { status, code, message } });
  if (meta.hostIdentity !== caller) return fail(403, "not_host", "Only the host can control capture.");
  if (!meta.stack.some((p) => p.identity === caller && p.absentSince === undefined)) {
    return fail(403, "not_connected", "Connect to the meeting before taking photos.");
  }
  const current = meta.capture;
  let capture;
  if (body.action === "start") {
    if (!Object.hasOwn(CAPTURE_LAYOUTS, body.frameType) || !Number.isInteger(body.slotIndex) ||
        body.slotIndex < 0 || body.slotIndex >= CAPTURE_LAYOUTS[body.frameType]) {
      return fail(400, "invalid_capture", "Choose a valid layout and photo slot.");
    }
    if (current?.status === "countdown" && now <= current.captureAt + CAPTURE_LATE_MS) {
      return fail(409, "capture_busy", "A photo is already being taken.");
    }
    capture = { id, owner: caller, frameType: body.frameType, slotIndex: body.slotIndex,
      captureAt: now + COUNTDOWN_MS, status: "countdown" };
  } else if (body.action === "cancel" || body.action === "complete") {
    if (!current || body.captureId !== current.id) return fail(409, "capture_changed", "This capture has changed. Please try again.");
    if (current.status !== "countdown") return { ok: true, meta, changed: false };
    if (body.action === "complete" && (now < current.captureAt || now > current.captureAt + CAPTURE_LATE_MS)) {
      return fail(409, "capture_expired", "Capture timing was interrupted. Please retake the photo.");
    }
    capture = { ...current, status: body.action === "cancel" ? "cancelled" : "done" };
  } else return fail(400, "invalid_action", "Unknown capture action.");
  return { ok: true, changed: true, meta: { ...meta, capture, rev: meta.rev + 1, updatedAt: now } };
}
