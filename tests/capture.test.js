import test from "node:test";
import assert from "node:assert/strict";
import { CAPTURE_LAYOUTS, requestCapture, parseCapture } from "../lib/capture.js";
import { newRoomMetadata, parsePublicState, parseRoomMetadata, requestHostTransfer, requestLeave, syncPresence } from "../lib/roomState.js";

const now = 10_000;
function room() {
  return syncPresence(newRoomMetadata({ code: "123456", passwordHash: "hash", hostIdentity: "host", now: 0 }),
    [{ identity: "host", name: "Host", joinedAt: 1 }, { identity: "guest", name: "Guest", joinedAt: 2 }], now).meta;
}
function start(meta = room(), overrides = {}) {
  return requestCapture(meta, "host", { action: "start", frameType: "1x3", slotIndex: 0, ...overrides }, now, "shot-1");
}

test("only a connected host can start capture", () => {
  assert.equal(requestCapture(room(), "guest", { action: "start" }, now, "id").error.status, 403);
  assert.equal(start({ ...room(), stack: [] }).error.code, "not_connected");
});

test("every layout accepts exactly its own slots", () => {
  for (const [frameType, count] of Object.entries(CAPTURE_LAYOUTS)) {
    assert.equal(start(room(), { frameType, slotIndex: count - 1 }).ok, true);
    assert.equal(start(room(), { frameType, slotIndex: count }).error.status, 400);
  }
  for (const frameType of ["invalid", "toString", "__proto__", null]) assert.equal(start(room(), { frameType }).ok, false);
  for (const slotIndex of [-1, 0.5, "0"]) assert.equal(start(room(), { slotIndex }).ok, false);
});

test("countdown has a server timestamp and survives metadata serialization", () => {
  const meta = start().meta;
  assert.equal(meta.capture.captureAt, now + 3000);
  assert.equal(meta.rev, room().rev + 1);
  assert.deepEqual(parsePublicState(JSON.stringify(meta)).capture, meta.capture);
  assert.equal(parsePublicState(JSON.stringify(meta)).passwordHash, undefined);
  assert.deepEqual(parseRoomMetadata(JSON.stringify(meta)).capture, meta.capture);
  assert.equal(parsePublicState(JSON.stringify(room())).capture, null);
});

test("duplicate starts conflict; expired attempts can be replaced", () => {
  const meta = start().meta;
  assert.equal(start(meta).error.code, "capture_busy");
  assert.equal(requestCapture(meta, "host", { action: "start", frameType: "1x1", slotIndex: 0 }, now + 5000, "shot-2").ok, true);
});

test("completion rejects early, stale, and late commands", () => {
  const meta = start().meta;
  const body = { action: "complete", captureId: "shot-1" };
  assert.equal(requestCapture(meta, "host", body, now + 2000).error.code, "capture_expired");
  assert.equal(requestCapture(meta, "host", body, now + 5000).error.code, "capture_expired");
  assert.equal(requestCapture(meta, "host", { ...body, captureId: "old" }, now + 3100).error.code, "capture_changed");
  const done = requestCapture(meta, "host", body, now + 3100).meta;
  assert.equal(done.capture.status, "done");
  assert.equal(requestCapture(done, "host", body, now + 3200).changed, false);
});

test("cancellation prevents a delayed completion from resurrecting a shot", () => {
  const meta = start().meta;
  const cancelled = requestCapture(meta, "host", { action: "cancel", captureId: "shot-1" }, now + 500).meta;
  assert.equal(cancelled.capture.status, "cancelled");
  assert.equal(requestCapture(cancelled, "host", { action: "complete", captureId: "shot-1" }, now + 3100).meta.capture.status, "cancelled");
});

test("host transfer, departure, and disconnect cancel pending capture", () => {
  const meta = start().meta;
  assert.equal(requestHostTransfer(meta, "host", "guest", now + 100).meta.capture.status, "cancelled");
  assert.equal(requestLeave(meta, "host", now + 100).meta.capture.status, "cancelled");
  assert.equal(syncPresence(meta, [{ identity: "guest", name: "Guest", joinedAt: 2 }], now + 100).meta.capture.status, "cancelled");
});

test("presence changes preserve an active capture and malformed capture data is ignored", () => {
  const meta = start().meta;
  assert.equal(syncPresence(meta, [...meta.stack, { identity: "new", name: "New", joinedAt: 3 }], now + 100).meta.capture.id, "shot-1");
  for (const malformed of [null, {}, { ...meta.capture, slotIndex: 100 }, { ...meta.capture, status: "unknown" }]) {
    assert.equal(parseCapture(malformed), null);
  }
});
