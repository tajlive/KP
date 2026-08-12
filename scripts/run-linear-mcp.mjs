#!/usr/bin/env node
/**
 * Linear MCP wrapper — laster LINEAR_API_KEY fra .env.local,
 * og spawner den kompilerte MCP-serveren.
 *
 * Mønster: Samme som run-honcho-mcp.mjs / run-supabase-mcp.mjs.
 */
import { spawn } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadEnvLocal } from "./load-env.mjs";
import { gracefulExit } from "./mcp-graceful-exit.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const env = loadEnvLocal();

if (!env.LINEAR_API_KEY) {
  gracefulExit(["LINEAR_API_KEY"], "run-linear-mcp");
  process.exit(0);
}

const child = spawn(
  process.execPath,
  [resolve(__dirname, "mcp", "dist", "linear-mcp.js")],
  { env, stdio: "inherit", cwd: root },
);

child.on("exit", (code) => process.exit(code ?? 0));
