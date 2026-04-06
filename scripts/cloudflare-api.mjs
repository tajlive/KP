#!/usr/bin/env node
/**
 * Cloudflare API CLI – zones, DNS, konto og Pages med CLOUDFLARE_API_TOKEN fra .env.local.
 * Brukes når MCP ikke er tilgjengelig eller for CI/scripting.
 *
 * MCP: Bruk offisiell Cloudflare MCP i Cursor (url: https://mcp.cloudflare.com/mcp) for full API-tilgang.
 *
 * Eksempel:
 *   node scripts/cloudflare-api.mjs test
 *   node scripts/cloudflare-api.mjs zones
 *   node scripts/cloudflare-api.mjs dns [zoneName]
 *   node scripts/cloudflare-api.mjs account
 *   node scripts/cloudflare-api.mjs pages
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env.local");

const BASE = "https://api.cloudflare.com/client/v4";

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
const token = env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
const accountId = env.CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;

async function api(path, options = {}) {
  if (!token) {
    throw new Error("CLOUDFLARE_API_TOKEN mangler. Legg den i .env.local eller export CLOUDFLARE_API_TOKEN.");
  }
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.errors?.[0]?.message || data?.message || res.statusText;
    throw new Error(`Cloudflare API HTTP ${res.status}: ${msg}`);
  }
  if (data.success === false) {
    const msg = data?.errors?.[0]?.message || "Unknown error";
    throw new Error(`Cloudflare API: ${msg}`);
  }
  return data;
}

async function test() {
  const data = await api("/user");
  console.log("Cloudflare API OK – bruker:", data.result?.email || "—");
  return data;
}

async function zones() {
  const data = await api("/zones");
  const list = data.result || [];
  console.log(JSON.stringify(list.map((z) => ({ id: z.id, name: z.name, status: z.status })), null, 2));
  return list;
}

async function dns(zoneName = "klarpakke.no") {
  const zonesData = await api("/zones?name=" + encodeURIComponent(zoneName));
  const zones = zonesData.result || [];
  if (!zones.length) {
    throw new Error(`Ingen zone funnet for: ${zoneName}`);
  }
  const zoneId = zones[0].id;
  const data = await api(`/zones/${zoneId}/dns_records`);
  const list = data.result || [];
  console.log(JSON.stringify(list.map((r) => ({ type: r.type, name: r.name, content: r.content })), null, 2));
  return list;
}

async function account() {
  if (!accountId) {
    const data = await api("/accounts");
    const list = data.result || [];
    console.log(JSON.stringify(list.map((a) => ({ id: a.id, name: a.name })), null, 2));
    return list;
  }
  const data = await api(`/accounts/${accountId}`);
  console.log(JSON.stringify(data.result, null, 2));
  return data.result;
}

async function pages() {
  const id = accountId;
  if (!id) {
    const acc = await api("/accounts");
    const first = acc.result?.[0]?.id;
    if (!first) throw new Error("Ingen konto funnet. Sett CLOUDFLARE_ACCOUNT_ID i .env.local.");
    const data = await api(`/accounts/${first}/pages/projects`);
    const list = data.result || [];
    console.log(JSON.stringify(list.map((p) => ({ name: p.name, created_at: p.created_on })), null, 2));
    return list;
  }
  const data = await api(`/accounts/${id}/pages/projects`);
  const list = data.result || [];
  console.log(JSON.stringify(list.map((p) => ({ name: p.name, created_at: p.created_on })), null, 2));
  return list;
}

const [cmd, ...args] = process.argv.slice(2);
const commands = {
  test: () => test(),
  zones: () => zones(),
  dns: () => dns(args[0]),
  account: () => account(),
  pages: () => pages(),
};

async function main() {
  if (!cmd || !commands[cmd]) {
    console.error("Bruk: node scripts/cloudflare-api.mjs <test|zones|dns|account|pages> [zoneName]");
    console.error("MCP: Legg til cloudflare med url https://mcp.cloudflare.com/mcp i .cursor/mcp.json for full tilgang.");
    process.exit(1);
  }
  try {
    await commands[cmd]();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

main();
