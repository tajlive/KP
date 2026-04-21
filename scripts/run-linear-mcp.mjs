#!/usr/bin/env node
/**
 * Linear MCP wrapper — laster LINEAR_API_KEY fra .env.local
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
}

const child = spawn(
  "npx",
  ["-y", "@mseep/linear-mcp"],
  { env, stdio: "inherit", cwd: root }
);

child.on("exit", (code) => process.exit(code ?? 0));
