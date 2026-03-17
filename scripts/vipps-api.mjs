#!/usr/bin/env node
/**
 * Vipps API CLI – test konfigurasjon med VIPPS_* fra .env.local.
 * Brukes når MCP ikke er tilgjengelig eller for CI/scripting.
 *
 * MCP: Bruk scripts/run-vipps-mcp.mjs (vipps i .cursor/mcp.json) for full tilgang.
 *
 * Eksempel:
 *   node scripts/vipps-api.mjs test
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env.local");

function loadEnv() {
  const env = {};
  if (!existsSync(envPath)) return env;
  try {
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const eq = trimmed.indexOf("=");
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1).replace(/\\"/g, '"');
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1).replace(/\\'/g, "'");
        env[key] = value;
      }
    }
  } catch (_) {}
  return env;
}

const env = loadEnv();
const clientId = env.VIPPS_CLIENT_ID || process.env.VIPPS_CLIENT_ID;
const clientSecret = env.VIPPS_CLIENT_SECRET || process.env.VIPPS_CLIENT_SECRET;
const baseUrl = (env.VIPPS_BASE_URL || process.env.VIPPS_BASE_URL || "https://api.vipps.no").replace(/\/$/, "");

async function test() {
  if (!clientId || !clientSecret) {
    console.error("VIPPS_CLIENT_ID og VIPPS_CLIENT_SECRET må være satt i .env.local.");
    process.exit(1);
  }
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64");
  const res = await fetch(`${baseUrl}/access-management-1.0/access/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
      "Vipps-System-Name": "klarpakke",
      "Vipps-System-Version": "1.0",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error_description || data.error || res.statusText;
    console.error("Vipps API feil:", msg);
    process.exit(1);
  }
  if (data.access_token) {
    console.log("Vipps API OK – token hentet (client_credentials).");
    return data;
  }
  console.error("Vipps API – uventet svar:", JSON.stringify(data).slice(0, 200));
  process.exit(1);
}

const [cmd] = process.argv.slice(2);
if (cmd === "test") {
  test().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
} else {
  console.error("Bruk: node scripts/vipps-api.mjs test");
  process.exit(1);
}
