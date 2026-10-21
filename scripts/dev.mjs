import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";

// Load the repository's local environment before Vercel starts its functions.
// Vite has its own frontend root, so its env loading does not configure the API.
const root = fileURLToPath(new URL("../", import.meta.url));
let local = {};
try {
  local = parseEnv(readFileSync(new URL("../.env.local", import.meta.url), "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") {
    console.error("Unable to read .env.local. Check the file format and permissions.");
    process.exit(1);
  }
}

const env = { ...process.env, ...local };
const required = ["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"];
const missing = required.filter((key) => !env[key]?.trim());
if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(", ")}. Add them to .env.local in the repository root.`);
  process.exit(1);
}

if (process.argv.includes("--check")) {
  console.log("LiveKit environment is configured. All three required values are present (values hidden).");
  process.exit(0);
}

console.log("LiveKit environment loaded. Starting the frontend and API with Vercel...");
const windows = process.platform === "win32";
const child = spawn(windows ? (process.env.ComSpec || "cmd.exe") : "npx",
  windows ? ["/d", "/s", "/c", "npx.cmd vercel dev"] : ["vercel", "dev"],
  { cwd: root, env, stdio: "inherit", windowsHide: true });
child.on("error", () => {
  console.error("Could not start Vercel CLI. Make sure Node.js and npm are installed.");
  process.exitCode = 1;
});
child.on("exit", (code) => { process.exitCode = code ?? 1; });
// Let the child handle the same Ctrl+C signal from the terminal.
process.on("SIGINT", () => {});
