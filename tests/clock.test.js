import test from "node:test";
import assert from "node:assert/strict";
import { estimateServerClock } from "../lib/clock.js";

test("slow API processing does not become clock skew", () => {
  // 100 ms each way, 8500 ms processing, identical clocks.
  assert.equal(estimateServerClock(1000, 9700, 1100, 9600), 0);
});

test("clock estimate accounts for actual server offset", () => {
  assert.equal(estimateServerClock(1000, 9700, 1600, 10100), 500);
  assert.equal(estimateServerClock(1000, 9700, 600, 9100), -500);
});

test("invalid timing and old API responses cannot overwrite clock samples", () => {
  assert.equal(estimateServerClock(1000, 9700, undefined, 9600), null);
  assert.equal(estimateServerClock(1000, 900, 1100, 9600), null);
  assert.equal(estimateServerClock(1000, 9700, 9600, 1100), null);
});
