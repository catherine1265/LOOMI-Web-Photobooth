// Integration check against an already-running local API and its configured LiveKit project.
// Uses synthetic cameras; credentials and room tokens are never printed.
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
const origin = process.env.LOOMI_TEST_ORIGIN || "http://localhost:3000";
let browser;
const sessions = [];
try {
  browser = await chromium.launch({ headless: true,
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
  });
  const hostContext = await browser.newContext({ permissions: ["camera", "microphone"] });
  const guestContext = await browser.newContext({ permissions: ["camera", "microphone"] });
  const password = `test-${crypto.randomUUID()}`;
  console.log("Creating temporary integration-test room...");
  const created = await hostContext.request.post(`${origin}/api/meetings`, { data: { name: "Capture test host", password } });
  assert.equal(created.status(), 200, "local API must create the test room");
  const hostSession = await created.json();
  sessions.push(hostSession);
  const joined = await guestContext.request.post(`${origin}/api/meetings/join`, { data: { name: "Capture test guest", code: hostSession.code, password } });
  assert.equal(joined.status(), 200);
  const guestSession = await joined.json();
  sessions.push(guestSession);
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  const timings = new Map();
  host.on("request", (req) => { if (req.url().endsWith("/capture")) timings.set(req, Date.now()); });
  host.on("response", async (res) => {
    if (!res.url().endsWith("/capture")) return;
    const body = await res.json().catch(() => ({}));
    console.log(JSON.stringify({ captureAction: res.request().postDataJSON()?.action, status: res.status(),
      roundTripMs: Date.now() - (timings.get(res.request()) || Date.now()),
      deadlineRemainingAtServerMs: body.state?.capture?.captureAt - body.serverTime,
      errorCode: body.error?.code }));
  });
  for (const [page, session] of [[host, hostSession], [guest, guestSession]]) {
    console.log(page === host ? "Connecting host camera..." : "Connecting guest camera...");
    await page.addInitScript((session) => {
      sessionStorage.setItem(`vc-session:${session.code}`, JSON.stringify(session));
      sessionStorage.setItem("loomi.frameType", "1x1");
    }, session);
    await page.goto(`${origin}/room/${session.code}`);
    await page.getByRole("button", { name: "Turn camera off", exact: true }).waitFor({ timeout: 45000 });
  }
  await host.getByText("2 participants", { exact: false }).waitFor({ timeout: 30000 });
  console.log("Both participants connected. Taking a combined photo...");
  await host.getByRole("button", { name: "Take photos", exact: true }).click();
  await guest.bringToFront();
  await host.waitForFunction(() => document.querySelector(".capture-booth__slot img") || document.querySelector(".capture-booth__error"), null, { timeout: 45000 });
  const error = await host.locator(".capture-booth__error").allTextContents();
  if (error.length) console.log("Capture UI:", error.join(" "));
  assert.equal(error.length, 0, "real two-participant capture must succeed");
  assert.equal(await host.locator(".capture-booth__slot img").count(), 1);
  console.log("PASS: real local API + LiveKit, two synthetic camera participants, and host snapshot while viewing guest.");
} finally {
  for (const session of sessions) {
    await fetch(`${origin}/api/rooms/${session.code}/leave`, { method: "POST", headers: { authorization: `Bearer ${session.token}` }, signal: AbortSignal.timeout(10000) }).catch(() => {});
  }
  await browser?.close();
}
