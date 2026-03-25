#!/usr/bin/env node
/**
 * Vipps MCP wrapper — laster VIPPS_* variabler fra .env.local
 */
import { spawn } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadEnvLocal } from "./load-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const env = loadEnvLocal();

const required = ["VIPPS_CLIENT_ID", "VIPPS_CLIENT_SECRET"];
const missing = required.filter((k) => !env[k]);

if (missing.length) {
  console.error("[run-vipps-mcp] Mangler i .env.local:", missing.join(", "));
  process.exit(1);
}

const serverPath = resolve(__dirname, "vipps-mcp-server.mjs");
const child = spawn("node", [serverPath], {
  env,
  stdio: "inherit",
  cwd: root,
});

child.on("exit", (code) => process.exit(code ?? 0));
