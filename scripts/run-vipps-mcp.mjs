#!/usr/bin/env node
/**
 * Vipps MCP wrapper — laster VIPPS_* variabler fra .env.production eller .env.local
 */
import { spawn } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadEnvLocal } from "./load-env.mjs";
import fs from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const env = loadEnvLocal();

// Sjekk .env.production hvis mangler i .env.local
const required = ["VIPPS_CLIENT_ID", "VIPPS_CLIENT_SECRET"];
const missingInLocal = required.filter((k) => !env[k]);

if (missingInLocal.length) {
  const prodEnvPath = resolve(root, ".env.production");
  if (fs.existsSync(prodEnvPath)) {
    const prodContent = fs.readFileSync(prodEnvPath, "utf8");
    for (const key of missingInLocal) {
      const match = prodContent.match(new RegExp(`^${key}=(.+)$`, "m"));
      if (match) {
        env[key] = match[1].trim();
      }
    }
  }
}

const stillMissing = required.filter((k) => !env[k]);
if (stillMissing.length) {
  console.error("[run-vipps-mcp] Mangler i .env.local eller .env.production:", stillMissing.join(", "));
  process.exit(1);
}

const serverPath = resolve(__dirname, "vipps-mcp-server.mjs");
const child = spawn("node", [serverPath], {
  env,
  stdio: "inherit",
  cwd: root,
});

child.on("exit", (code) => process.exit(code ?? 0));
