#!/usr/bin/env node
/**
 * Kraken live-status probe — Toms grid + equity + kill-state i ett kall.
 *
 * Hvorfor denne finnes: sessionen bygde tilsvarende script to ganger for hånd
 * (kraken-live-analyse.mjs + kraken-grid-detaljer.mjs) og slettet dem. Denne
 * er den permanente versjonen — kopier til /Users/taj/klarpakke/scripts/ og kjør:
 *
 *   cd /Users/taj/klarpakke && node scripts/kraken-live-probe.mjs
 *
 * Bruker SAMME signering som scripts/kraken-grid-manager.mjs (node crypto —
 * den virker; Python-urllib på macOS 3.14 har SSL-sertifikat-problemer og
 * lett-signerte kall gir EAPI:Invalid key — se klarpakke-hermes-ops §Python 3.14).
 *
 * Output: balanse, åpne ordre per par/side, ticker-priser, equity vs start,
 * drawdown %, drawdown_kill-flag, state-fil-alder.
 */
import { createHmac, createHash } from "crypto";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const STATE_PATH = join(ROOT, ".hermes", "kraken-grid-state.json");
// Oppdater ved grid-re-allokering (baseline = markedsverdi av ALLE holdings ved start)
const INITIAL_EQUITY = 153.44;

function loadEnv() {
  const env = {};
  for (const line of readFileSync(join(ROOT, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}
const ENV = loadEnv();

async function kraken(endpoint, params = {}, isPublic = false) {
  const path = `/0/${isPublic ? "public" : "private"}/${endpoint}`;
  const nonce = (Date.now() * 1000).toString(); // μs-nonce — API-nøkkel har 10000ms nonce-window
  const body = new URLSearchParams({ nonce, ...params }).toString();
  const sha256 = createHash("sha256").update(nonce + body).digest();
  const sig = createHmac("sha512", Buffer.from(ENV.KRAKEN_API_SECRET, "base64"))
    .update(path).update(sha256).digest("base64");
  const res = await fetch(`https://api.kraken.com${path}`, {
    method: "POST",
    headers: {
      "API-Key": ENV.KRAKEN_API_KEY,
      "API-Sign": sig,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "klarpakke-live-probe/1.0",
    },
    body,
  });
  const data = await res.json();
  if (data.error?.length) throw new Error(`Kraken ${endpoint}: ${data.error.join("; ")}`);
  return data.result;
}
const pub = async (ep, params = {}) => {
  const res = await fetch(`https://api.kraken.com/0/public/${ep}?${new URLSearchParams(params)}`, {
    headers: { "User-Agent": "klarpakke-live-probe/1.0" },
  });
  return (await res.json()).result;
};

// Balanse
const bal = await kraken("Balance");
console.log("=== BALANSE (total, inkl. låst) ===");
for (const [k, v] of Object.entries(bal).sort()) {
  if (parseFloat(v) > 0) console.log(`  ${k}: ${parseFloat(v).toFixed(8)}`);
}

// Åpne ordre
const openOrders = (await kraken("OpenOrders")).open ?? {};
console.log(`\n=== ÅPNE ORDRE: ${Object.keys(openOrders).length} ===`);
const pairs = {}, sides = {};
let lockedUsdc = 0;
for (const [txid, o] of Object.entries(openOrders)) {
  pairs[o.descr.pair] = (pairs[o.descr.pair] ?? 0) + 1;
  sides[o.descr.type] = (sides[o.descr.type] ?? 0) + 1;
  if (o.descr.type === "buy") lockedUsdc += parseFloat(o.vol) * parseFloat(o.descr.price);
}
console.log("  Per par:", JSON.stringify(pairs));
console.log("  Sider:", JSON.stringify(sides));
console.log(`  Låst i kjøpsordre: ~${lockedUsdc.toFixed(2)} USDC`);

// Ticker
const tick = await pub("Ticker", { pair: "XBTUSDC,ETHUSDC,SOLUSDC" });
console.log("\n=== PRISER ===");
for (const [k, v] of Object.entries(tick)) {
  console.log(`  ${k}: ${v.c[0]}`);
}

// State
if (existsSync(STATE_PATH)) {
  const state = JSON.parse(readFileSync(STATE_PATH, "utf8"));
  console.log("\n=== STATE ===");
  console.log(`  realized_profit: ${state.realized_profit ?? 0} USDC`);
  console.log(`  lastRun: ${state.lastRun}`);
  console.log(`  drawdown_kill: ${state.drawdown_kill ?? false}`);
  const orders = state.orders ?? {};
  console.log(`  ordre i state: ${Object.keys(orders).length}`);
  const ageMin = (Date.now() - new Date(state.lastRun).getTime()) / 60000;
  console.log(`  state-alder: ${ageMin.toFixed(1)} min (manager cron = */5 → >15 = manager nede)`);
}

// Equity + drawdown
const usdc = parseFloat(bal.USDC ?? "0");
let coinVal = 0;
for (const [asset, pair] of [["XXBT", "XBTUSDC"], ["XETH", "ETHUSDC"], ["XSOL", "SOLUSDC"]]) {
  const qty = parseFloat(bal[asset] ?? "0");
  if (qty > 0) {
    const p = parseFloat(tick[pair].c[0]);
    coinVal += qty * p;
  }
}
const equity = usdc + coinVal;
const drawdown = Math.max(0, 1 - equity / INITIAL_EQUITY);
console.log("\n=== EQUITY ===");
console.log(`  Total: ${equity.toFixed(2)} USDC (start ${INITIAL_EQUITY})`);
console.log(`  Endring: ${(equity - INITIAL_EQUITY).toFixed(2)} USDC (${((equity / INITIAL_EQUITY - 1) * 100).toFixed(2)}%)`);
console.log(`  Drawdown: ${(drawdown * 100).toFixed(2)}% (kill-terskel 15%)`);
console.log(`  Ledig USDC: ${Math.max(0, usdc - lockedUsdc).toFixed(2)}`);
