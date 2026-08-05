#!/usr/bin/env node
/**
 * Kraken Live Grid Manager — Toms konto
 * Kjøres av Hermes-cron hvert 5. minutt.
 *
 * Logikk (port av paper-grid trailing, klarpakke-trading-strategy skill):
 * 1. Finn kjøpsordre som er FILLED (var åpne i state, borte nå) → legg salgsordre @ buyPrice × 1.02
 * 2. Finn salgsordre som er FILLED → gevinst realisert, legg NY kjøpsordre @ samme nivå
 * 3. USDC idle > 25 → ekstra kjøpsnivå på par med størst gap
 * 4. realized_profit akkumuleres i state (grunnlag for reinvest-loop senere)
 *
 * State: /Users/taj/klarpakke/.hermes/kraken-grid-state.json
 * Nøkler: /Users/taj/klarpakke/.env.local (KRAKEN_API_KEY / KRAKEN_API_SECRET)
 */

import { createHmac, createHash } from "crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const STATE_PATH = join(ROOT, ".hermes", "kraken-grid-state.json");
const TRAIL_SELL_PCT = 1.02; // +2% — dekker 0.52% round-trip fee × 3.8
const IDLE_THRESHOLD = 25; // USDC idle over dette → nytt nivå
const MIN_LEVEL_USDC = 8; // minste nye nivå
const MAX_OPEN_ORDERS = 20; // beskyttelse mot ordre-spam (15 standard + margin)
const DRAWDOWN_KILL_PCT = 0.15; // auto-kill: total verdi falt >15% fra start
// Total start-equity (verifisert 2026-08-05): 138.66 USDC + 0.00022872 XBT × 64612 = 153.44.
// INKLUDERER XBT-beholdningen — ellers slår kill inn ved 23% ekte tap, ikke 15%.
const INITIAL_EQUITY = 153.44;
const API_URL = "https://api.kraken.com";

// ---------- env ----------
function loadEnv() {
  const env = {};
  for (const line of readFileSync(join(ROOT, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}
const ENV = loadEnv();
const API_KEY = ENV.KRAKEN_API_KEY;
const API_SECRET = ENV.KRAKEN_API_SECRET;
if (!API_KEY || !API_SECRET) {
  console.error("Mangler KRAKEN_API_KEY/SECRET i .env.local");
  process.exit(1);
}

// ---------- Kraken signing ----------
async function kraken(endpoint, params = {}, isPublic = false) {
  const path = `/0/${isPublic ? "public" : "private"}/${endpoint}`;
  const nonce = Date.now().toString();
  const body = new URLSearchParams({ nonce, ...params }).toString();
  const sha256 = createHash("sha256").update(nonce + body).digest();
  const sig = createHmac("sha512", Buffer.from(API_SECRET, "base64"))
    .update(path)
    .update(sha256)
    .digest("base64");
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "API-Key": API_KEY,
      "API-Sign": sig,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "klarpakke-grid-manager/1.0",
    },
    body,
  });
  const data = await res.json();
  if (data.error?.length) throw new Error(`Kraken ${endpoint}: ${data.error.join("; ")}`);
  return data.result;
}
const krakenPublic = (ep, params = {}) =>
  fetch(`${API_URL}/0/public/${ep}?${new URLSearchParams(params)}`, {
    headers: { "User-Agent": "klarpakke-grid-manager/1.0" },
  }).then((r) => r.json()).then((d) => d.result);

// ---------- state ----------
function loadState() {
  if (!existsSync(STATE_PATH)) return { orders: {}, realized_profit: 0, lastRun: null };
  return JSON.parse(readFileSync(STATE_PATH, "utf8"));
}
function saveState(s) {
  mkdirSync(dirname(STATE_PATH), { recursive: true });
  s.lastRun = new Date().toISOString();
  writeFileSync(STATE_PATH, JSON.stringify(s, null, 2));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- config per par ----------
const PAIR_CFG = {
  XBTUSDC: { dec: 1, ordremin: 0.00005, spacing: 0.008 },
  ETHUSDC: { dec: 2, ordremin: 0.001, spacing: 0.010 },
  SOLUSDC: { dec: 2, ordremin: 0.06, spacing: 0.012 },
};

// ---------- main ----------
const changes = [];
const state = loadState();

// ── 0) KILL-SWITCH: drawdown-beskyttelse (bruker-beskyttelse, Task 6) ──
// Total verdi = ledig USDC + markedsverdi av alle posisjoner.
// Hvis verdi faller > DRAWDOWN_KILL_PCT fra INITIAL_EQUITY → kanseller ALLE
// åpne ordre og sett drawdown_kill=true. Da slutter manageren å legge nye
// ordre (fill-rekjøp og idle-nivåer skippes) inntil manuell reset.
const drawdownKill = state.drawdown_kill === true;

if (drawdownKill) {
  changes.push("🔴 KILL-SWITCH AKTIV (drawdown) — nye ordre stoppet. Nullstill state.drawdown_kill manuelt etter vurdering.");
} else {
  try {
    const [bal, tick] = await Promise.all([
      kraken("Balance"),
      krakenPublic("Ticker", { pair: Object.keys(PAIR_CFG).join(",") }),
    ]);
    // Equity = USDC-kontant + markedsverdi av krypto-beholdning (XBT/ETH/SOL)
    let coinValueUsdc = 0;
    for (const [pair, cfg] of Object.entries(PAIR_CFG)) {
      const base = pair.replace("USDC", "");
      const qty = parseFloat(bal[base] ?? "0");
      if (qty > 0) {
        const price = parseFloat(tick[pair]?.c?.[0] ?? "0");
        coinValueUsdc += qty * price;
      }
    }
    const equity = parseFloat(bal.USDC ?? "0") + coinValueUsdc;
    // Samme regler som src/lib/trading/kraken-kill-switch.ts (TDD-testet)
    const drawdown = Math.max(0, 1 - equity / INITIAL_EQUITY);
    if (drawdown > DRAWDOWN_KILL_PCT) {
      const cancelIds = Object.keys(open);
      for (const id of cancelIds) {
        try {
          await kraken("CancelOrder", { txid: id });
        } catch (e) {
          changes.push(`FEIL kansellering ${id}: ${e.message}`);
        }
        await sleep(200);
      }
      state.drawdown_kill = true;
      changes.push(
        `🔴 AUTO-KILL: drawdown ${(drawdown * 100).toFixed(1)}% > ${(DRAWDOWN_KILL_PCT * 100).toFixed(0)}% — kansellerte ${cancelIds.length} ordre. Equity ${equity.toFixed(2)} USDC (start ${INITIAL_EQUITY}). Trading stoppet — vurder situasjonen før reset.`,
      );
    }
  } catch (e) {
    changes.push(`KILL-SJEKK feilet (ikke utløst): ${e.message}`);
  }
}

const open = (await kraken("OpenOrders")).open ?? {};
const openTxids = new Set(Object.keys(open));

// 1) FILLED kjøpsordre → legg salgsordre (+2%) — SKIPPES ved drawdown-kill
for (const [txid, info] of Object.entries(state.orders)) {
  if (!drawdownKill && info.side === "buy" && info.status === "open" && !openTxids.has(txid)) {
    const cfg = PAIR_CFG[info.pair];
    const sellPrice = (info.price * TRAIL_SELL_PCT).toFixed(cfg.dec);
    try {
      const res = await kraken("AddOrder", {
        pair: info.pair, type: "sell", ordertype: "limit",
        price: sellPrice, volume: info.volume,
      });
      const sellTxid = res.txid[0];
      state.orders[txid] = { ...info, status: "filled" };
      state.orders[sellTxid] = {
        side: "sell", pair: info.pair, price: parseFloat(sellPrice),
        volume: info.volume, status: "open", refBuyTxid: txid, buyPrice: info.price,
      };
      changes.push(`FILL-KJØP ${info.pair} @ ${info.price} → salgsordre @ ${sellPrice} (${sellTxid})`);
      await sleep(300);
    } catch (e) {
      changes.push(`FEIL salgsordre for ${txid}: ${e.message}`);
    }
  }

  // 2) FILLED salgsordre → gevinst + ny kjøpsordre på samme nivå — SKIPPES ved drawdown-kill
  if (!drawdownKill && info.side === "sell" && info.status === "open" && !openTxids.has(txid)) {
    const profit = (info.price - info.buyPrice) * parseFloat(info.volume);
    const fee = (info.price * parseFloat(info.volume) + info.buyPrice * parseFloat(info.volume)) * 0.0026;
    state.realized_profit = (state.realized_profit ?? 0) + profit - fee;
    state.orders[txid] = { ...info, status: "filled" };
    try {
      const res = await kraken("AddOrder", {
        pair: info.pair, type: "buy", ordertype: "limit",
        price: info.buyPrice.toFixed(PAIR_CFG[info.pair].dec), volume: info.volume,
      });
      state.orders[res.txid[0]] = {
        side: "buy", pair: info.pair, price: info.buyPrice,
        volume: info.volume, status: "open",
      };
      changes.push(`GEVINST ${info.pair}: +${(profit - fee).toFixed(3)} USDC (totalt ${state.realized_profit.toFixed(2)}) → re-kjøp @ ${info.buyPrice}`);
      await sleep(300);
    } catch (e) {
      changes.push(`FEIL re-kjøp ${info.pair}: ${e.message}`);
    }
  }
}

// 3) Registrer nye ordre lagt utenfor manageren (f.eks. manuell re-allokering)
for (const [txid, o] of Object.entries(open)) {
  if (!state.orders[txid]) {
    state.orders[txid] = {
      side: o.descr.type, pair: o.descr.pair,
      price: parseFloat(o.descr.price), volume: o.vol, status: "open",
    };
  }
}

// 4) Idle USDC > terskel → ekstra nivå på par med størst gap (pris høyest over laveste nivå)
// SKIPPES ved drawdown-kill. Ordre-limit: aldri over MAX_OPEN_ORDERS.
// NB: Balance viser TOTAL (inkl. låst i åpne ordre) — trekk fra låst volum for ekte ledig
const bal = await kraken("Balance");
const totalUsdc = parseFloat(bal.USDC ?? "0");
const lockedUsdc = Object.values(open)
  .filter((o) => o.descr.pair.endsWith("USDC") && o.descr.type === "buy")
  .reduce((s, o) => s + (parseFloat(o.vol) - parseFloat(o.vol_exec ?? "0")) * parseFloat(o.descr.price), 0);
const freeUsdc = Math.max(0, totalUsdc - lockedUsdc);

if (!drawdownKill && freeUsdc > IDLE_THRESHOLD && openTxids.size < MAX_OPEN_ORDERS) {
  const tick = await krakenPublic("Ticker", { pair: Object.keys(PAIR_CFG).join(",") });
  let best = null;
  for (const [pair, cfg] of Object.entries(PAIR_CFG)) {
    const priceNow = parseFloat(tick[pair].c[0]);
    const pairBuys = Object.values(state.orders)
      .filter((o) => o.pair === pair && o.side === "buy" && o.status === "open")
      .map((o) => o.price);
    const lowest = pairBuys.length ? Math.min(...pairBuys) : priceNow;
    const gap = (priceNow - lowest) / priceNow;
    if (!best || gap < best.gap) best = { pair, priceNow, lowest, gap, cfg };
  }
  if (best) {
    const newPrice = +(best.lowest * (1 - best.cfg.spacing)).toFixed(best.cfg.dec);
    const volume = Math.min(freeUsdc - 1, Math.max(MIN_LEVEL_USDC, freeUsdc * 0.5)) / newPrice;
    if (volume >= best.cfg.ordremin * 1.1) {
      try {
        const res = await kraken("AddOrder", {
          pair: best.pair, type: "buy", ordertype: "limit",
          price: newPrice.toString(), volume: volume.toFixed(8).replace(/\.?0+$/, ""),
        });
        state.orders[res.txid[0]] = {
          side: "buy", pair: best.pair, price: newPrice,
          volume: volume.toFixed(8).replace(/\.?0+$/, ""), status: "open", extra: true,
        };
        changes.push(`IDLE ${freeUsdc.toFixed(1)} USDC → ekstra nivå ${best.pair} @ ${newPrice}`);
      } catch (e) {
        changes.push(`FEIL idle-nivå ${best.pair}: ${e.message}`);
      }
    }
  }
}

saveState(state);

// Stille når ingenting skjedde (watchdog-mønster: tom output = stille)
if (changes.length) {
  console.log(changes.join("\n"));
  console.log(`realized_profit_total=${(state.realized_profit ?? 0).toFixed(3)} USDC | åpne=${openTxids.size} | idle_usdc=${freeUsdc.toFixed(2)}`);
}
