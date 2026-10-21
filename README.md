# LOOMI Web Photobooth

Collaborative video rooms with host-controlled layers, photo capture, and a strip editor.

## Run locally

Install dependencies with `npm ci`. Run `npm run dev` for the frontend (solo capture, upload, and editing).

For collaborative rooms, create `.env.local` in the repository root (beside `package.json`):

```dotenv
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
```

Run `npm run env:check` to check that all three variables are populated without printing their values, then `npm run dev:full`. This explicitly loads `.env.local` before starting Vercel and its API functions. Use the address printed by Vercel. Restart the server after changing credentials. Plain `npm run dev` only runs Vite and does not run the `/api` functions. LiveKit credentials must stay on the server; do not add a `VITE_` prefix. The credentials file is ignored by Git. For deployed Vercel builds, set these variables in the project's Environment Variables settings as well; the local launcher only affects local development.

## Collaborative capture

1. Create or join a room, choose a layout, and enable the camera.
2. The host presses **Take photos**. Every participant sees the countdown; the host snapshots the combined canvas after three seconds.
3. Remaining slots are captured automatically, with a fresh countdown for each photo. **Cancel countdown** stops the sequence without losing completed photos.
4. Select a slot in the strip preview to retake only that photo. **Start over** clears the strip and unlocks layout selection.
5. Download the plain strip immediately, or select **Continue to edit** to add frames, effects, stickers, and text. Select **DONE**, then download the final PNG.

The supported layouts are 1x1, 1x2, 1x3, 1x4, and 2x2. The complete collaborative composition is fitted inside each slot, preserving participants at the edges. Countdown UI is excluded from the photo.

Only the connected host can start, cancel, or complete a capture. Host transfer or departure cancels a pending countdown. Turning off the host camera or losing the connection also stops capture. Switching between host and guest browser windows does not cancel capture; the compositor renders a fresh frame before each snapshot even if the preview animation is paused. If the browser suspends the page long enough to miss the capture deadline, the late capture is rejected; return to the host and use retake.

Photos are saved on the capturing host's device, not uploaded or distributed to guests. Capture drafts and the final exported image use tab storage when space permits. If storage is full, the app keeps the current image in memory and asks you to download before refreshing. Returning from the editor to retake preserves the collaborative draft.

The API endpoint `POST /api/rooms/:code/capture` uses the existing room bearer token and accepts `start` (`frameType`, `slotIndex`), `cancel` (`captureId`), or `complete` (`captureId`, `capturedAt`). Countdown timestamps and status travel through LiveKit room metadata; image bytes remain in the browser. Clock synchronization excludes API processing time. The photo must be taken within 1.5 seconds of its target; the backend allows up to 30 seconds to acknowledge that on-time photo through slow LiveKit metadata calls. Existing room locking remains local to each server instance.

## Validation

- `npm test`: capture authorization, slot validation, timing, duplicate requests, cancellation, host changes, metadata compatibility, and storage handling.
- `npm run build`: production frontend build.
- Optional browser smoke test: install Playwright without changing the lockfile (`npm install --no-save --package-lock=false playwright`), run `npx playwright install chromium`, then `node tests/capture.browser.mjs`. You can instead provide `PLAYWRIGHT_MODULE` (absolute module path) and `CHROME_PATH` for an existing installation. This test simulates the room transport and uses the real capture component, editor, and result page; it does not require LiveKit credentials. Outputs go to `tmp/capture-tests/`.

For a live check, create a room in one browser and join from a second browser/device. Verify both see the countdown, the host gets all slots, retake replaces the selected slot, and both download paths produce a PNG. Also test cancellation and host departure during countdown. This requires a configured LiveKit project and the API server.

`node tests/capture.live.mjs` runs an integration check against `http://localhost:3000` (override with `LOOMI_TEST_ORIGIN`). It uses the same optional Playwright configuration described above, creates one temporary LiveKit room with two synthetic cameras, verifies capture while viewing the guest, and leaves both sessions afterward. No credentials or session tokens are printed. Run this only against your development project.
