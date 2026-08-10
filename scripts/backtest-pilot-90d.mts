/**
 * FØRSTE EKTE 90-DAGERS PILOT-BACKTEST (2026-08-10)
 *
 * Henter 90 dager 1h-candles for SOL fra price_candles (Supabase —
 * kanonisk kilde, mates daglig fra Kraken = samme data som prod-tick
 * bruker) og kjører runSimpleBacktest (simple_grid COMBO) med
 * gebyr 0.1 % + slippage 0.2 %.
 *
 * ÆRLIGHET: Tallet er hva det er — pluss eller minus. Historisk ≠ fremtidig.
 *
 * Kjør: npx tsx scripts/backtest-pilot-90d.mts
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { runSimpleBacktest, formatBacktestBevis } from "../src/lib/backtest/simple-backtest";
import type { Candle } from "../src/lib/trading/strategies/types";

// Last .env.local eksplisitt (samme mønster som fetch-klines.mjs)
const envPath = resolve(process.cwd(), ".env.local");
try {
  const env = readFileSync(envPath, "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
} catch { /* .env.local påkrevd */ }

const DAYS = Number(process.argv[2]) || 90;
const KAPITAL_USDT = 10_000; // ≈ 100 000 kr
const NOK_PER_USDT_FALLBACK = 9.6;

interface CandleRow {
  open_time: string;
  open: number; high: number; low: number; close: number; volume: number;
}

async function hentCandles(): Promise<Candle[]> {
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supaUrl || !srk) throw new Error("Mangler NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");

  const siden = new Date(Date.now() - DAYS * 86_400_000).toISOString();
  const alle: Candle[] = [];
  let offset = 0;

  for (;;) {
    const url = `${supaUrl}/rest/v1/price_candles?symbol=eq.${process.argv[4] || "SOLUSDT"}&open_time=gte.${siden}&order=open_time.asc&limit=1000&offset=${offset}&select=open_time,open,high,low,close,volume`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${srk}`, apikey: srk },
    });
    if (!res.ok) throw new Error(`Supabase HTTP ${res.status}`);
    const rows = (await res.json()) as CandleRow[];
    for (const r of rows) {
      alle.push({
        time: new Date(r.open_time).getTime(),
        open: Number(r.open), high: Number(r.high), low: Number(r.low),
        close: Number(r.close), volume: Number(r.volume),
      });
    }
    if (rows.length < 1000) break;
    offset += 1000;
  }
  return alle;
}

async function hentNokRate(): Promise<number> {
  try {
    const res = await fetch("https://www.klarpakke.no/api/fx/usdt-nok");
    if (res.ok) {
      const data = (await res.json()) as { rate?: number };
      if (typeof data.rate === "number" && data.rate > 5 && data.rate < 20) return data.rate;
    }
  } catch { /* fallback */ }
  return NOK_PER_USDT_FALLBACK;
}

async function main() {
  console.log(`Henter ${DAYS} dager 1h SOL-candles fra Kraken …`);
  const candles = await hentCandles();
  console.log(`✓ ${candles.length} candles hentet\n`);

  const rate = await hentNokRate();
  console.log(`NOK/USDT-rate: ${rate} (kilde: ${rate === NOK_PER_USDT_FALLBACK ? "fallback" : "klarpakke.no/api/fx"})\n`);

  const anchorOverride = Number(process.argv[3]) || undefined;
  const res = runSimpleBacktest({
    candles,
    initialCapital: KAPITAL_USDT,
    nTrials: 1,
    ...(anchorOverride ? { config: { anchor_candles: anchorOverride } } : {}),
    ...(process.argv[5] ? { config: { ...(anchorOverride ? { anchor_candles: anchorOverride } : {}), dd_gate_pct: Number(process.argv[5]) } } : {}),
  });
  if (anchorOverride) console.log(`Anchor-override: ${anchorOverride} candles\n`);

  const m = res.metrics;
  const v = res.validation;
  const pnlNok = m.totalPnl * rate;

  console.log("════════════════ PILOT-BACKTEST (${process.argv[4] || 'SOLUSDT'}, 1h) ════════════════");
  console.log(`Periode:              ${new Date(candles[0].time).toISOString().slice(0, 10)} → ${new Date(candles[candles.length - 1].time).toISOString().slice(0, 10)}`);
  console.log(`Startkapital:         ${KAPITAL_USDT.toLocaleString("no-NO")} USDT (≈100 000 kr)`);
  console.log("─────────────────────────────────────────────────────────────────────────");
  console.log(`RESULTAT:             ${formatBacktestBevis(m.totalPnl)} USDT  (= ${formatBacktestBevis(pnlNok)})`);
  console.log(`Avkastning:           ${m.totalReturnPct.toFixed(2)} %`);
  console.log(`Kjøp:                 ${m.totalBuys}`);
  console.log(`Lukkede lots:         ${m.closedTrades}  ${m.closedTrades >= 100 ? "✓ (≥100)" : "✗ (<100)"}`);
  console.log(`Win rate:             ${m.winRate.toFixed(1)} %`);
  console.log(`Profit factor:        ${m.profitFactor === Infinity ? "∞" : m.profitFactor.toFixed(2)}`);
  console.log(`Max drawdown:         ${m.maxDrawdownPct.toFixed(1)} %`);
  console.log(`Sharpe (annualisert): ${m.sharpe.toFixed(2)}`);
  console.log("─────────────────────────────────────────────────────────────────────────");
  console.log(`DSR:                  ${v.dsr.toFixed(3)}  ${v.dsrGate ? "✓ (≥0.95)" : "✗ (<0.95)"}`);
  console.log(`BEVIST-stempel:       ${v.bevist ? "JA ✅ (DSR + ≥100 lots)" : "NEI — ikke nok bevis ennå"}`);
  console.log("─────────────────────────────────────────────────────────────────────────");
  console.log(`Gebyr betalt i sim:   ${res.trades.reduce((s, t) => s + t.fee, 0).toFixed(2)} USDT (0.1% taker)`);
  console.log(`Landing-tekst:        «${formatBacktestBevis(pnlNok)}»`);
  console.log("═════════════════════════════════════════════════════════════════════════");
  console.log("Historisk avkastning er ingen garanti for fremtidig avkastning.");
}

main().catch((e) => {
  console.error("FEIL:", e);
  process.exit(1);
});
