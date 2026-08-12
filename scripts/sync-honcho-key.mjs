#!/usr/bin/env node
/**
 * sync-honcho-key.mjs — READ-ONLY sync av Honcho-access-token til .env.local
 *
 * ERSTATTER refresh-honcho-key.mjs (som roterte OAuth-granten og kastet det
 * nye refresh-tokenet — rotårsaken til at Honcho «krasjet hele tiden»).
 *
 * REGLER (2026-08-12, KLA-278):
 * 1. ALDRI kall OAuth-endepunktet herfra. Honcho roterer refresh-tokenet ved
 *    hvert refresh — en ekstern refresh invaliderer Hermes' grant.
 * 2. Hermes er ENESTE refresh-klient og eier ~/.hermes/honcho.json.
 * 3. Dette scriptet kopierer kun access-tokenet (apiKey) til .env.local for
 *    KIMI CLI / run-honcho-mcp.mjs. Ingen nettverkskall.
 * 4. Hvis tokenet i honcho.json er utgått (expiresAt < nå + 5 min), avslutt
 *    med exit 2 — health-monitoren fanger det (Hermes bør ha fornyet).
 *
 * Bruk: node scripts/sync-honcho-key.mjs
 * Cron: hver 45. minutt (no_agent, wrapper i ~/.hermes/scripts/)
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const honchoJsonPath = resolve(process.env.HOME, ".hermes/honcho.json");
const envLocalPath = resolve(root, ".env.local");

const config = JSON.parse(readFileSync(honchoJsonPath, "utf8"));
const h = config.hosts?.hermes;
if (!h?.apiKey) {
  console.error("[honcho-sync] Ingen apiKey i honcho.json");
  process.exit(1);
}

const expiresAt = h.oauth?.expiresAt ?? 0;
if (expiresAt && expiresAt * 1000 < Date.now() + 5 * 60_000) {
  console.error(
    `[honcho-sync] Token utgått (expiresAt=${expiresAt}) — Hermes har ikke fornyet. Alert via health-monitor.`
  );
  process.exit(2);
}

const content = readFileSync(envLocalPath, "utf8");
if (content.includes(`HONCHO_API_KEY=${h.apiKey}`)) {
  console.log("[honcho-sync] .env.local allerede fersk — ingen endring.");
  process.exit(0);
}
const updated = /^HONCHO_API_KEY=.*$/m.test(content)
  ? content.replace(/^HONCHO_API_KEY=.*$/m, `HONCHO_API_KEY=${h.apiKey}`)
  : content + `\nHONCHO_API_KEY=${h.apiKey}\n`;
writeFileSync(envLocalPath, updated, "utf8");
console.log(`[honcho-sync] HONCHO_API_KEY synkronisert (${h.apiKey.slice(0, 8)}…)`);
