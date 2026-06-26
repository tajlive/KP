#!/usr/bin/env node
/**
 * Purge Cloudflare cache for klarpakke.no
 *
 * Reads CLOUDFLARE_API_TOKEN from environment or .env.local.
 * Requires a token with:
 *   - Zone:Cache Purge -> Edit
 *   - Zone:Zone -> Read (only if ZONE_ID is not provided)
 *
 * Usage:
 *   export CLOUDFLARE_API_TOKEN=<token>
 *   node scripts/purge-cloudflare-cache.mjs
 *
 * Or with explicit URLs instead of purge-everything:
 *   node scripts/purge-cloudflare-cache.mjs https://www.klarpakke.no/ https://www.klarpakke.no/no
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const ZONE_ID_FROM_WRANGLER = "328d7de7e8e48308fd4f9d760da5b18f";
const ZONE_NAME = "klarpakke.no";
const BASE = "https://api.cloudflare.com/client/v4";

function loadEnv() {
  const envPath = resolve(root, ".env.local");
  const env = {};
  if (!existsSync(envPath)) return env;
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eq = trimmed.indexOf("=");
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1).replace(/\\"/g, '"');
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1).replace(/\\'/g, "'");
    }
    env[key] = value;
  }
  return env;
}

const envFile = loadEnv();
const token = process.env.CLOUDFLARE_API_TOKEN || envFile.CLOUDFLARE_API_TOKEN;

if (!token) {
  console.error(
    "❌ CLOUDFLARE_API_TOKEN mangler.\n" +
      "   Legg den i .env.local eller export CLOUDFLARE_API_TOKEN=<token>",
  );
  process.exit(1);
}

async function api(path, options = {}) {
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
  if (!res.ok || data.success === false) {
    const msg = data?.errors?.[0]?.message || data?.message || res.statusText;
    throw new Error(`Cloudflare API HTTP ${res.status}: ${msg}`);
  }
  return data;
}

async function getZoneId() {
  if (ZONE_ID_FROM_WRANGLER) return ZONE_ID_FROM_WRANGLER;
  const data = await api(`/zones?name=${encodeURIComponent(ZONE_NAME)}`);
  const zone = data.result?.[0];
  if (!zone) throw new Error(`Fant ingen zone for ${ZONE_NAME}`);
  return zone.id;
}

async function main() {
  const urls = process.argv.slice(2).filter((arg) => arg.startsWith("http"));
  const zoneId = await getZoneId();

  console.log(`🧹 Purger Cloudflare-cache for zone ${zoneId} (${ZONE_NAME})...`);

  const body = urls.length > 0 ? { files: urls } : { purge_everything: true };
  const data = await api(`/zones/${zoneId}/purge_cache`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (data.success) {
    console.log(
      urls.length > 0
        ? `✅ Cache purget for ${urls.length} URL(er).`
        : "✅ All Cloudflare-cache purget for klarpakke.no.",
    );
  } else {
    console.error("❌ Purge feilet:", data);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
