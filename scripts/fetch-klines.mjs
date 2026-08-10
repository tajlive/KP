#!/usr/bin/env node
/**
 * Henter 1h-candles fra Kraken (public OHLC API) og lagrer i price_candles.
 * Kjøres daglig av cron — inkrementell (henter kun nye candles etter siste lagrede).
 *
 * Historikk: het fetch-klines.mjs og brukte Binance via binance-proxy EF.
 * Binance er død (2026-08-08, Tom-mandat; EF fjernet → HTTP 404).
 * Kraken er eneste tallkilde. Symbolnavn i DB beholdes (USDT-suffiks) slik at
 * backtest-sweep.mjs og price_candles-schema er uendret. UNI/POL finnes ikke
 * som USDT-par på Kraken → USD-par brukes (USDT≈USD for backtest-formål).
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// Last .env.local eksplisitt (Playwright/dotenv-mønsteret)
const envPath = resolve(process.cwd(), ".env.local");
try {
  const env = readFileSync(envPath, "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
} catch { /* .env.local ikke påkrevd i CI */ }

/** DB-symbol → Kraken altname (public AssetPairs) */
const SYMBOLS = {
  BTCUSDT: "XBTUSDT",
  ETHUSDT: "ETHUSDT",
  SOLUSDT: "SOLUSDT",
  AVAXUSDT: "AVAXUSDT",
  DOGEUSDT: "XDGUSDT",
  LINKUSDT: "LINKUSDT",
  ADAUSDT: "ADAUSDT",
  DOTUSDT: "DOTUSDT",
  UNIUSDT: "UNIUSD", // ingen USDT-par på Kraken — USD er nærmeste ekvivalent
  POLUSDT: "POLUSD", // tilsvarende
};

const DAYS_BACK = 365;       // ved tom DB: hent 1 år
const INTERVAL_MIN = 60;     // 1h
const KRAKEN_MAX = 720;      // max candles per OHLC-kall
const PACING_MS = 1100;      // Kraken public rate-limit pacing

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function lastOpenTime(symbol) {
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = `${supaUrl}/rest/v1/price_candles?symbol=eq.${symbol}&order=open_time.desc&limit=1&select=open_time`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${srk}`, apikey: srk },
  });
  if (!res.ok) throw new Error(`lastOpenTime HTTP ${res.status}`);
  const rows = await res.json();
  return rows.length ? new Date(rows[0].open_time).getTime() : null;
}

async function fetchOHLC(pair, sinceSec) {
  const url = `https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=${INTERVAL_MIN}&since=${sinceSec}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Kraken HTTP ${res.status}`);
  const data = await res.json();
  if (data.error && data.error.length) throw new Error(`Kraken: ${data.error.join(",")}`);
  const key = Object.keys(data.result).find((k) => k !== "last");
  return data.result[key] || [];
}

async function upsertCandles(symbol, candles) {
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Kraken OHLC-rad: [time(s), open, high, low, close, vwap, volume, count]
  const rows = candles.map((k) => ({
    symbol,
    open_time: new Date(k[0] * 1000).toISOString(),
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[6]),
    close_time: new Date((k[0] + INTERVAL_MIN * 60 - 1) * 1000).toISOString(),
  }));

  const url = `${supaUrl}/rest/v1/price_candles?on_conflict=symbol,open_time`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${srk}`,
      apikey: srk,
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upsert failed: ${res.status} ${text.slice(0, 200)}`);
  }
  return rows.length;
}

async function main() {
  const fallbackStart = Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000;
  let total = 0;

  for (const [symbol, pair] of Object.entries(SYMBOLS)) {
    try {
      // Inkrementell: start fra siste lagrede candle (med 1 dag overlapp for sikkerhets skyld)
      const last = await lastOpenTime(symbol);
      let fromMs = last ? last - 24 * 60 * 60 * 1000 : fallbackStart;
      let count = 0;

      while (true) {
        const candles = await fetchOHLC(pair, Math.floor(fromMs / 1000));
        if (candles.length === 0) break;

        // Hopp over allerede-lagrede (overlapp) og pågående (siste, ufullendte) candle
        const complete = candles.filter(
          (k) => k[0] * 1000 > (last ?? 0) && (k[0] + INTERVAL_MIN * 60) * 1000 <= Date.now()
        );
        if (complete.length > 0) count += await upsertCandles(symbol, complete);

        if (candles.length < KRAKEN_MAX) break; // siste side
        fromMs = candles[candles.length - 1][0] * 1000 + 1;
        await sleep(PACING_MS);
      }

      console.log(`${symbol}: ${count} candles (${pair})`);
      total += count;
    } catch (err) {
      console.error(`${symbol}: FEIL — ${err.message}`);
    }
    await sleep(PACING_MS);
  }

  console.log(`TOTALT: ${total} candles hentet (Kraken)`);
}

main().catch((err) => {
  console.error("KRITISK:", err);
  process.exit(1);
});
