#!/usr/bin/env node
/**
 * Cursor Cloud Agents API CLI – liste/hent/start agenter med CURSOR_API_KEY fra .env.local.
 * Brukes for scripting og CI. Krever API-nøkkel fra cursor.com/dashboard (Cloud Agents).
 *
 * MCP: Cursor er selv MCP-klient; prosjektets MCP-er står i .cursor/mcp.json.
 *
 * Eksempel:
 *   node scripts/cursor-api.mjs test
 *   node scripts/cursor-api.mjs me
 *   node scripts/cursor-api.mjs agents [limit]
 *   node scripts/cursor-api.mjs agent <id>
 *   node scripts/cursor-api.mjs models
 */
import { readFileSync, readdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env.local");

const BASE = "https://api.cursor.com";

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
const apiKey = env.CURSOR_API_KEY || process.env.CURSOR_API_KEY;

function authHeader() {
  if (!apiKey) {
    throw new Error("CURSOR_API_KEY mangler. Legg den i .env.local eller export CURSOR_API_KEY (cursor.com/dashboard → Cloud Agents).");
  }
  const basic = Buffer.from(apiKey + ":", "utf8").toString("base64");
  return { Authorization: `Basic ${basic}` };
}

async function api(path, options = {}) {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
      ...options.headers,
    },
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Cursor API HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const msg = data?.message || data?.error || res.statusText;
    throw new Error(`Cursor API HTTP ${res.status}: ${msg}`);
  }
  return data;
}

async function test() {
  const data = await api("/v0/me");
  console.log("Cursor API OK –", data.apiKeyName || "—", "|", data.userEmail || "—");
  return data;
}

async function me() {
  const data = await api("/v0/me");
  console.log(JSON.stringify(data, null, 2));
  return data;
}

async function agents(limit = 20) {
  const data = await api(`/v0/agents?limit=${Math.min(Number(limit) || 20, 100)}`);
  const list = data.agents || [];
  console.log(JSON.stringify(list.map((a) => ({ id: a.id, name: a.name, status: a.status, createdAt: a.createdAt })), null, 2));
  return list;
}

async function agent(id) {
  if (!id) throw new Error("Angi agent id: node scripts/cursor-api.mjs agent <id>");
  const data = await api(`/v0/agents/${encodeURIComponent(id)}`);
  console.log(JSON.stringify(data, null, 2));
  return data;
}

async function models() {
  const data = await api("/v0/models");
  console.log(JSON.stringify(data.models || [], null, 2));
  return data.models;
}

function config() {
  const mcpPath = resolve(root, ".cursor/mcp.json");
  const rulesDir = resolve(root, ".cursor/rules");
  const out = { mcpServers: [], rules: [] };
  if (existsSync(mcpPath)) {
    try {
      const mcp = JSON.parse(readFileSync(mcpPath, "utf8"));
      out.mcpServers = Object.keys(mcp.mcpServers || {});
    } catch (_) {}
  }
  if (existsSync(rulesDir)) {
    try {
      out.rules = readdirSync(rulesDir, { withFileTypes: true })
        .filter((e) => e.isFile())
        .map((e) => e.name);
    } catch (_) {}
  }
  console.log(JSON.stringify(out, null, 2));
  return out;
}

const [cmd, ...args] = process.argv.slice(2);
const commands = {
  test: () => test(),
  me: () => me(),
  agents: () => agents(args[0]),
  agent: () => agent(args[0]),
  models: () => models(),
  config: () => config(),
};

async function main() {
  if (!cmd || !commands[cmd]) {
    console.error("Bruk: node scripts/cursor-api.mjs <test|me|agents|agent|models|config> [limit|id]");
    console.error("API-nøkkel: cursor.com/dashboard → Cloud Agents. Dokumentasjon: docs/CURSOR-MCP-CLI-API.md");
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
