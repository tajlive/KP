#!/usr/bin/env node
/**
 * Henter 1 års 1h-klines fra Binance (via proxy) og lagrer i DB.
 * Kjøres daglig av cron — holder historikken oppdatert.
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

const SYMBOLS = [
  "BTCUSDT", "ETHUSDT", "SOLUSDT", "AVAXUSDT", "DOGEUSDT",
  "LINKUSDT", "ADAUSDT", "DOTUSDT", "UNIUSDT", "POLUSDT",
];

const DAYS = 365;
const INTERVAL = "1h";
const LIMIT = 1000;

async function fetchKlines(symbol, startTime) {
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const proxySecret = process.env.BINANCE_PROXY_SECRET;

  const url = `${supaUrl}/functions/v1/binance-proxy`;
  const body = {
    action: "publicApi",
    publicApiPath: `/api/v3/klines?symbol=${symbol}&interval=${INTERVAL}&startTime=${startTime}&limit=${LIMIT}`,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
      "x-binance-proxy-secret": proxySecret,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.data || [];
}

async function upsertCandles(symbol, klines) {
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const rows = klines.map((k) => ({
    symbol,
    open_time: new Date(k[0]).toISOString(),
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
    close_time: new Date(k[6]).toISOString(),
  }));

  const url = `${supaUrl}/rest/v1/price_candles`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upsert failed: ${res.status} ${text}`);
  }
  return rows.length;
}

async function main() {
  const startTime = Date.now() - DAYS * 24 * 60 * 60 * 1000;
  let total = 0;

  for (const symbol of SYMBOLS) {
    try {
      let from = startTime;
      let count = 0;

      while (true) {
        const klines = await fetchKlines(symbol, from);
        if (klines.length === 0) break;

        count += await upsertCandles(symbol, klines);
        from = klines[klines.length - 1][6] + 1; // close_time + 1

        if (klines.length < LIMIT) break;
        await new Promise((r) => setTimeout(r, 200)); // Rate-limit
      }

      console.log(`${symbol}: ${count} candles`);
      total += count;
    } catch (err) {
      console.error(`${symbol}: FEIL — ${err.message}`);
    }
  }

  console.log(`TOTALT: ${total} candles hentet`);
}

main().catch((err) => {
  console.error("KRITISK:", err);
  process.exit(1);
});
