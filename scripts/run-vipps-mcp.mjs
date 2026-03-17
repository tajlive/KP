#!/usr/bin/env node
/**
 * Wrapper for Vipps MCP server – laster VIPPS_* fra .env.local og starter vipps-mcp-server.mjs.
 *
 * Krever minst i .env.local:
 *   VIPPS_CLIENT_ID
 *   VIPPS_CLIENT_SECRET
 *   VIPPS_MERCHANT_SERIAL_NUMBER
 *   VIPPS_SUBSCRIPTION_KEY (for Login API)
 * Valgfritt: VIPPS_BASE_URL (default https://api.vipps.no; test: https://apitest.vipps.no)
 *
 * Bruk: node scripts/run-vipps-mcp.mjs
 */
import { spawn } from "child_process";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env.local");

const env = { ...process.env };

if (existsSync(envPath)) {
  try {
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const eq = trimmed.indexOf("=");
        if (eq > 0) {
          const key = trimmed.slice(0, eq).trim();
          let value = trimmed.slice(eq + 1).trim();
          if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1).replace(/\\"/g, '"');
          if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1).replace(/\\'/g, "'");
          if (key.startsWith("VIPPS_")) env[key] = value;
        }
      }
    }
  } catch (e) {
    console.error("[run-vipps-mcp] Could not read .env.local:", e.message);
  }
}

const required = ["VIPPS_CLIENT_ID", "VIPPS_CLIENT_SECRET"];
const missing = required.filter((k) => !env[k]);
if (missing.length) {
  console.error("[run-vipps-mcp] Mangler i .env.local:", missing.join(", "));
  console.error("[run-vipps-mcp] VIPPS_MERCHANT_SERIAL_NUMBER og VIPPS_SUBSCRIPTION_KEY anbefales for Login API.");
  process.exit(1);
}

const serverPath = resolve(__dirname, "vipps-mcp-server.mjs");
const child = spawn("node", [serverPath], {
  env,
  stdio: "inherit",
  cwd: root,
});

child.on("exit", (code) => process.exit(code ?? 0));
