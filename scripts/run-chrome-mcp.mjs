#!/usr/bin/env node
/**
 * Chrome Control MCP wrapper — loads .env.local and starts the Playwright MCP backend
 * via a thin chrome_* → browser_* proxy, with Klarpakke-specific defaults.
 *
 * Optional env:
 *   CHROME_MCP_HEADLESS — default "true"; set "false" for headed.
 *   CHROME_MCP_DEVICE — Playwright device name, e.g. "iPhone 14", "Pixel 7", "Desktop Chrome".
 *   PLAYWRIGHT_MCP_ALLOWED_HOSTS — comma-separated host allowlist.
 *   PLAYWRIGHT_MCP_ALLOWED_ORIGINS — semicolon-separated origin allowlist.
 */
import { spawn } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { loadEnvLocal } from "./load-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const env = loadEnvLocal();

// Verify Playwright is installed locally (avoid npx fallback / M1 timeout)
const playwrightModulePath = resolve(root, "node_modules", "playwright");
if (!existsSync(playwrightModulePath)) {
  console.error(
    "[run-chrome-mcp] FEIL: playwright er ikke installert. Kjør: npm install && npm run playwright:install",
  );
  process.exit(1);
}

const headless = env.CHROME_MCP_HEADLESS !== "false";
const device = env.CHROME_MCP_DEVICE || "";
const outputDir = resolve(root, "logs", "browser-qa");
mkdirSync(outputDir, { recursive: true });

// Use a temporary profile directory so we never corrupt or lock the user's
// existing Chrome profile. The directory is removed when the wrapper exits.
const userDataDir = mkdtempSync(resolve(tmpdir(), "klarpakke-chrome-mcp-"));

const pwMcpCli = resolve(root, "node_modules", "@playwright", "mcp", "cli.js");
let useFallback = false;

if (!existsSync(pwMcpCli)) {
  console.error(
    `[run-chrome-mcp] WARNING: ${pwMcpCli} not found. Falling back to legacy scripts/chrome-mcp-server.mjs.`,
  );
  useFallback = true;
}

const args = useFallback
  ? [resolve(root, "scripts/chrome-mcp-server.mjs")]
  : [resolve(root, "scripts/playwright-mcp-proxy.mjs")];

const allowedHosts =
  env.PLAYWRIGHT_MCP_ALLOWED_HOSTS ||
  "www.klarpakke.no,klarpakke.no,localhost:3000,example.com";
const allowedOrigins =
  env.PLAYWRIGHT_MCP_ALLOWED_ORIGINS ||
  "https://www.klarpakke.no;https://klarpakke.no;http://localhost:3000;https://example.com";

const child = spawn("node", args, {
  env: {
    ...env,
    PLAYWRIGHT_MCP_HEADLESS: headless ? "true" : "false",
    PLAYWRIGHT_MCP_DEVICE: device,
    PLAYWRIGHT_MCP_USER_DATA_DIR: userDataDir,
    PLAYWRIGHT_MCP_OUTPUT_DIR: outputDir,
    PLAYWRIGHT_MCP_ALLOWED_HOSTS: allowedHosts,
    PLAYWRIGHT_MCP_ALLOWED_ORIGINS: allowedOrigins,
    PLAYWRIGHT_MCP_CAPS: "core,core-navigation,core-tabs,core-input,assertion,network,storage,testing,pdf",
  },
  stdio: "inherit",
  cwd: root,
});

function cleanup() {
  try {
    rmSync(userDataDir, { recursive: true, force: true });
  } catch (err) {
    console.error(`[run-chrome-mcp] Could not remove temp profile ${userDataDir}: ${err.message}`);
  }
}

process.on("exit", cleanup);
process.on("SIGINT", () => {
  cleanup();
  child.kill("SIGINT");
});
process.on("SIGTERM", () => {
  cleanup();
  child.kill("SIGTERM");
});

child.on("exit", (code) => {
  cleanup();
  process.exit(code ?? 0);
});
