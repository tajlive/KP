#!/usr/bin/env node
/**
 * refresh-honcho-key.mjs — fornyer HONCHO_API_KEY i .env.local
 *
 * Honcho access tokens (hch-at-...) utløper etter 1 time.
 * Hermes fornyer sin egen token automatisk via OAuth-refresh.
 * Denne skriptet synkroniserer den friske tokenen til Klarpakkes
 * .env.local slik at KIMI CLI / run-honcho-mcp.mjs alltid har gyldig key.
 *
 * Bruk: node scripts/refresh-honcho-key.mjs
 * Cron: hver 45. minutt (anbefalt)
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const honchoJsonPath = resolve(process.env.HOME, ".hermes/honcho.json");
const envLocalPath = resolve(root, ".env.local");

function loadHermesHonchoConfig() {
  try {
    const raw = readFileSync(honchoJsonPath, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    console.error(`[honcho-refresh] Kunne ikke lese ${honchoJsonPath}: ${e.message}`);
    process.exit(1);
  }
}

async function refreshAccessToken(config) {
  const h = config.hosts.hermes;
  const { refreshToken, clientId, tokenEndpoint } = h.oauth;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    scope: h.oauth.scope || "write",
  });

  const res = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[honcho-refresh] OAuth-feil ${res.status}: ${text.slice(0, 200)}`);
    process.exit(2);
  }
  const data = await res.json();
  return (data.access_token || data.accessToken || "").trim();
}

function updateEnvLocal(newToken) {
  const content = readFileSync(envLocalPath, "utf8");
  const hasKey = /^HONCHO_API_KEY=.*$/m.test(content);

  let updated;
  if (hasKey) {
    updated = content.replace(/^HONCHO_API_KEY=.*$/m, `HONCHO_API_KEY=${newToken}`);
  } else {
    updated = content + `\nHONCHO_API_KEY=${newToken}\n`;
  }

  writeFileSync(envLocalPath, updated, "utf8");
  console.log(`[honcho-refresh] HONCHO_API_KEY oppdatert i .env.local (${newToken.slice(0, 8)}...)`);
}

const config = loadHermesHonchoConfig();
const fresh = await refreshAccessToken(config);
if (!fresh || !fresh.startsWith("hch-")) {
  console.error("[honcho-refresh] Ugyldig token fra OAuth-endepunktet");
  process.exit(3);
}
updateEnvLocal(fresh);
