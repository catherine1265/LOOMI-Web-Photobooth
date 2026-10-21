import test from "node:test";
import assert from "node:assert/strict";

function storage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
}

test("exported photo survives a module reload and can be cleared", async () => {
  globalThis.sessionStorage = storage();
  const first = await import("../frontend/pages/ResultPhoto/ResultPhoto.js?storage-first");
  first.setResultPhoto("data:image/png;base64,photo");
  const refreshed = await import("../frontend/pages/ResultPhoto/ResultPhoto.js?storage-reload");
  assert.equal(refreshed.getResultPhoto(), "data:image/png;base64,photo");
  refreshed.clearResultPhoto();
  assert.equal(sessionStorage.getItem("loomi.resultPhoto"), null);
});

test("quota failure keeps the current result in memory and removes the stale result", async () => {
  globalThis.sessionStorage = storage();
  sessionStorage.setItem("loomi.resultPhoto", "old-photo");
  sessionStorage.setItem = () => { throw new Error("QuotaExceededError"); };
  const result = await import("../frontend/pages/ResultPhoto/ResultPhoto.js?storage-quota");
  result.setResultPhoto("new-photo");
  assert.equal(result.getResultPhoto(), "new-photo");
  assert.equal(result.hasResultPersistenceWarning(), true);
  assert.equal(sessionStorage.getItem("loomi.resultPhoto"), null);
});

test("capture draft reports quota failure while preserving its in-memory photos", async () => {
  globalThis.window = { sessionStorage: storage() };
  window.sessionStorage.setItem("loomi.photoSession", JSON.stringify({ source: "old" }));
  window.sessionStorage.setItem = () => { throw new Error("QuotaExceededError"); };
  const store = await import("../frontend/photoStore.js?storage-quota");
  const draft = { source: "collab", roomCode: "123456", frameType: "1x1", photos: [{ slotIndex: 0, src: "photo" }] };
  assert.equal(store.setPhotoSession(draft), false);
  assert.deepEqual(store.getPhotoSession(), draft);
  assert.equal(window.sessionStorage.getItem("loomi.photoSession"), null);
});
