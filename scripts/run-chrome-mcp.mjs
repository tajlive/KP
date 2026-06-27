#!/usr/bin/env node
/**
 * Chrome Control MCP wrapper — loads .env.local and starts the Chrome MCP server.
 *
 * Required env:
 *   MCP_API_KEY — API key for the MCP transport wrapper.
 *
 * Optional env:
 *   CHROME_MCP_ALLOWLIST — comma-separated list of allowed domains.
 */
import { spawn } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadEnvLocal } from "./load-env.mjs";
import { gracefulExit } from "./mcp-graceful-exit.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const env = loadEnvLocal();

if (!env.MCP_API_KEY) {
  gracefulExit(["MCP_API_KEY"], "run-chrome-mcp");
}

const child = spawn(
  "node",
  [resolve(root, "scripts/chrome-mcp-server.mjs")],
  { env, stdio: "inherit", cwd: root }
);

child.on("exit", (code) => process.exit(code ?? 0));
