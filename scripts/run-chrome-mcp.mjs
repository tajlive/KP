#!/usr/bin/env node
/**
 * Chrome Control MCP wrapper — loads .env.local and starts the Chrome MCP server.
 *
 * Required env:
 *   MCP_API_KEY — API key for the MCP transport wrapper.
 *
 * Optional env:
 *   CHROME_MCP_ALLOWLIST — comma-separated list of allowed domains.
 *   CHROME_MCP_PROFILE_MODE — default profile mode passed to chrome_start:
 *                             clean (default) | copy | cdp | storage
 *   CHROME_CDP_URL — CDP endpoint when profile mode is cdp (default http://127.0.0.1:9222)
 */
import { spawn } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import { loadEnvLocal } from "./load-env.mjs";
import { gracefulExit } from "./mcp-graceful-exit.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const env = loadEnvLocal();

if (!env.MCP_API_KEY) {
  gracefulExit(["MCP_API_KEY"], "run-chrome-mcp");
}

// Verify Playwright is installed locally (avoid npx fallback / M1 timeout)
const playwrightModulePath = resolve(root, "node_modules", "playwright");
if (!existsSync(playwrightModulePath)) {
  console.error(
    "[run-chrome-mcp] FEIL: playwright er ikke installert. Kjør: npm install && npm run playwright:install",
  );
  process.exit(1);
}

const child = spawn(
  "node",
  [resolve(root, "scripts/chrome-mcp-server.mjs")],
  { env, stdio: "inherit", cwd: root }
);

child.on("exit", (code) => process.exit(code ?? 0));
