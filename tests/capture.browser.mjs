// Optional UI smoke test: provide PLAYWRIGHT_MODULE and CHROME_PATH if they are not installed locally.
import assert from "node:assert/strict";
import { createServer } from "vite";
import { pathToFileURL } from "node:url";
import { mkdir } from "node:fs/promises";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
const server = await createServer({ server: { host: "127.0.0.1", port: 0 }, plugins: [{
  name: "capture-test-page",
  configureServer(vite) {
    vite.middlewares.use(async (req, res, next) => {
      if (req.url !== "/__capture-test__") return next();
      res.setHeader("Content-Type", "text/html");
      res.end(await vite.transformIndexHtml(req.url, '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div></body></html>'));
    });
  },
}] });
let browser;
try {
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const page = await browser.newPage({ viewport: { width: 1000, height: 900 }, acceptDownloads: true });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(`${origin}/__capture-test__`);
  // Use Vite's resolved dependency URLs, so React hooks use the same module instance as the component.
  const rootPath = process.cwd().replaceAll("\\", "/");
  const transformedBooth = await server.transformRequest("/CaptureBooth.jsx");
  const transformedApp = await server.transformRequest("/App.jsx");
  const reactUrl = /from "([^"]*\/react\.js[^"]*)"/.exec(transformedBooth.code)[1];
  const reactDomUrl = /from "([^"]*react-dom_client\.js[^"]*)"/.exec(transformedApp.code)[1];
  await page.evaluate(async ({ rootPath, reactUrl, reactDomUrl }) => {
    const { default: React } = await import(reactUrl);
    const { useEffect, useRef, useSyncExternalStore } = React;
    const reactDom = await import(reactDomUrl);
    const createRoot = reactDom.createRoot || reactDom.default.createRoot;
    const { default: CaptureBooth } = await import("/CaptureBooth.jsx");
    const { requestCapture } = await import(`/@fs/${rootPath}/lib/capture.js`);
    const listeners = new Set();
    let serial = 0;
    const client = {
      session: { code: "123456", identity: "host" }, clockOffset: 0,
      snapshot: { connection: "connected", cameraOn: true, state: {
        v: 1, code: "123456", createdAt: 0, updatedAt: 0, rev: 1, hostIdentity: "host",
        stack: [{ identity: "host", name: "Host", joinedAt: 1 }], capture: null,
      } },
      getSnapshot: () => client.snapshot,
      subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
      getVideoElement: () => ({ readyState: 4 }),
      publish: () => { client.snapshot = { ...client.snapshot }; listeners.forEach((listener) => listener()); },
      capture: async (body) => {
        const result = requestCapture(client.snapshot.state, client.session.identity, body, Date.now(), `shot-${++serial}`);
        if (!result.ok) return { ok: false, message: result.error.message };
        client.snapshot.state = result.meta;
        client.publish();
        return { ok: true };
      },
    };
    function Harness() {
      const snap = useSyncExternalStore(client.subscribe, client.getSnapshot);
      const canvasRef = useRef(null);
      const captureFrameRef = useRef(null);
      useEffect(() => {
        const ctx = canvasRef.current.getContext("2d");
        ctx.fillStyle = "#ff0000"; ctx.fillRect(0, 0, 1280, 720);
        ctx.fillStyle = "#00ff00"; ctx.fillRect(0, 0, 180, 720);
        ctx.fillStyle = "#0000ff"; ctx.fillRect(1100, 0, 180, 720);
        // No animation loop: a capture must request a fresh render itself.
        captureFrameRef.current = () => {
          window.captureRenders = (window.captureRenders || 0) + 1;
          ctx.fillStyle = "#ffff00"; ctx.fillRect(600, 300, 80, 80);
        };
        return () => { captureFrameRef.current = null; };
      }, []);
      return React.createElement(CaptureBooth, { client, snap, canvasRef, captureFrameRef, initialFrameType: "1x2", onEdit: () => { window.didEdit = true; } },
        React.createElement("canvas", { ref: canvasRef, width: 1280, height: 720, style: { width: "100%" } }));
    }
    window.mockClient = client;
    createRoot(document.getElementById("root")).render(React.createElement(React.StrictMode, null, React.createElement(Harness)));
  }, { rootPath, reactUrl, reactDomUrl });

  await page.getByRole("button", { name: "Take photos", exact: true }).click();
  await page.getByRole("button", { name: "Cancel countdown" }).click();
  await page.waitForTimeout(3300);
  assert.equal(await page.locator(".capture-booth__slot img").count(), 0, "cancel must not save a photo");
  await page.getByRole("button", { name: "Take photos", exact: true }).click();
  // Chrome/Edge can mark the host document hidden when the guest window is foregrounded.
  await page.evaluate(() => Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" }));
  await page.waitForFunction(() => document.querySelectorAll(".capture-booth__slot img").length === 2, null, { timeout: 12000 });
  assert.equal(await page.getByRole("alert").count(), 0, "switching away from the host must not cancel capture");
  assert.equal(await page.evaluate(() => window.captureRenders), 2, "each shot explicitly refreshes the canvas");
  const center = await page.evaluate(async () => {
    const photo = JSON.parse(sessionStorage.getItem("loomi.photoSession")).photos[0];
    const image = new Image(); image.src = photo.src; await image.decode();
    const canvas = document.createElement("canvas"); canvas.width = 1280; canvas.height = 720;
    const ctx = canvas.getContext("2d"); ctx.drawImage(image, 0, 0);
    return [...ctx.getImageData(640, 340, 1, 1).data];
  });
  assert.ok(center[0] > 240 && center[1] > 240 && center[2] < 20, "snapshot must include freshly drawn pixels");
  await page.evaluate(() => { delete document.visibilityState; });
  assert.equal(await page.getByRole("button", { name: "Continue to edit" }).isEnabled(), true);
  await page.getByRole("button", { name: "Retake photo 1" }).click();
  await page.waitForFunction(() => window.mockClient.snapshot.state.capture.status === "done");
  assert.equal(await page.locator(".capture-booth__slot img").count(), 2, "retake replaces one slot");

  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download strip" }).click();
  const download = await downloadEvent;
  assert.equal(download.suggestedFilename(), "loomi-123456-1x2.png");
  await mkdir("tmp/capture-tests", { recursive: true });
  await download.saveAs("tmp/capture-tests/strip.png");
  const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem("loomi.photoSession")));
  assert.equal(saved.source, "collab");
  assert.equal(saved.photos.length, 2);
  await page.getByRole("button", { name: "Continue to edit" }).click();
  assert.equal(await page.evaluate(() => window.didEdit), true);

  // Guest countdown and host-disconnect cancellation use the same component, with a simulated transport.
  await page.evaluate(() => {
    const client = window.mockClient;
    client.snapshot.state = { ...client.snapshot.state, hostIdentity: "other", capture: {
      id: "guest-countdown", owner: "other", status: "countdown", frameType: "1x2", slotIndex: 0, captureAt: Date.now() + 3000,
    } };
    client.publish();
  });
  await page.getByText("The host controls capture.", { exact: false }).waitFor();
  assert.equal(await page.locator(".capture-booth__countdown").count(), 1);
  assert.equal(await page.getByRole("button", { name: "Take photos", exact: true }).count(), 0);
  await page.evaluate(() => {
    const client = window.mockClient;
    client.snapshot.state = { ...client.snapshot.state, hostIdentity: "host", capture: null };
    client.publish();
  });
  await page.getByRole("button", { name: "Retake photo 1" }).click();
  await page.evaluate(() => { window.mockClient.snapshot.connection = "reconnecting"; window.mockClient.publish(); });
  await page.getByRole("alert").filter({ hasText: "cancelled" }).waitFor();
  assert.equal(await page.evaluate(() => window.mockClient.snapshot.state.capture.status), "cancelled");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "tmp/capture-tests/mobile.png", fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "mobile view must fit");

  // Real editor/result routes with the captured photos, rather than the transport harness.
  await page.goto(`${origin}/edit`);
  await page.locator(".edit-strip canvas").first().waitFor();
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: "DONE", exact: true }).click();
  await page.locator(".result-photo__image").waitFor();
  await page.reload();
  await page.locator(".result-photo__image").waitFor();
  const finalDownloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download photo", exact: true }).click();
  assert.equal((await finalDownloadEvent).suggestedFilename(), "loomi-photo.png");
  assert.deepEqual(pageErrors, []);
  console.log("PASS: background-host capture, fresh canvas snapshots, cancellation, automatic multi-shot, retake, PNG download, guest countdown, disconnect cancellation, mobile layout, real editor/result, and refresh persistence.");
} finally {
  await browser?.close();
  await server.close();
}
