#!/usr/bin/env node
/**
 * Vercel API CLI – les prosjekter, deployments og status med VERCEL_TOKEN fra .env.local.
 * Brukes når MCP ikke er tilgjengelig eller for CI/scripting.
 *
 * MCP: Bruk offisiell Vercel MCP i Cursor (url: https://mcp.vercel.com) for full tilgang.
 *
 * Eksempel:
 *   node scripts/vercel-api.mjs test
 *   node scripts/vercel-api.mjs projects
 *   node scripts/vercel-api.mjs deployments [limit]
 *   node scripts/vercel-api.mjs project [projectId]
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env.local");

const BASE = "https://api.vercel.com";

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
const token = env.VERCEL_TOKEN || process.env.VERCEL_TOKEN;
const projectId = env.VERCEL_PROJECT_ID || process.env.VERCEL_PROJECT_ID;
const teamId = env.VERCEL_ORG_ID || process.env.VERCEL_ORG_ID;

async function api(path, options = {}) {
  if (!token) {
    throw new Error("VERCEL_TOKEN mangler. Legg den i .env.local eller export VERCEL_TOKEN.");
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
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Vercel API HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || res.statusText;
    throw new Error(`Vercel API HTTP ${res.status}: ${msg}`);
  }
  return data;
}

async function test() {
  const data = await api("/v2/user");
  console.log("Vercel API OK – bruker:", data.user?.username || data.user?.email || "—");
  return data;
}

async function projects() {
  const q = teamId ? `?teamId=${teamId}` : "";
  const data = await api(`/v9/projects${q}`);
  const list = data.projects || [];
  console.log(JSON.stringify(list.map((p) => ({ id: p.id, name: p.name })), null, 2));
  return list;
}

async function deployments(limit = 10) {
  const params = new URLSearchParams();
  if (projectId) params.set("projectId", projectId);
  if (teamId) params.set("teamId", teamId);
  params.set("limit", String(Math.min(Number(limit) || 10, 100)));
  const data = await api(`/v6/deployments?${params}`);
  const list = data.deployments || [];
  console.log(
    JSON.stringify(
      list.map((d) => ({
        uid: d.uid,
        state: d.state,
        url: d.url,
        created: d.created,
        target: d.target,
      })),
      null,
      2
    )
  );
  return list;
}

async function project(id) {
  const pid = id || projectId;
  if (!pid) throw new Error("Angi projectId som argument eller sett VERCEL_PROJECT_ID i .env.local");
  const q = teamId ? `?teamId=${teamId}` : "";
  const data = await api(`/v9/projects/${encodeURIComponent(pid)}${q}`);
  console.log(JSON.stringify(data, null, 2));
  return data;
}

const [cmd, ...args] = process.argv.slice(2);
const commands = {
  test: () => test(),
  projects: () => projects(),
  deployments: () => deployments(args[0]),
  project: () => project(args[0]),
};

async function main() {
  if (!cmd || !commands[cmd]) {
    console.error("Bruk: node scripts/vercel-api.mjs <test|projects|deployments|project> [limit|projectId]");
    console.error("MCP: Legg til vercel med url https://mcp.vercel.com i .cursor/mcp.json for full tilgang.");
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
