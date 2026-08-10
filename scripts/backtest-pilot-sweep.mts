/**
 * Måneds-sweep: kjører Pilot-backtest per 30-dagers vindu over siste år.
 * Svarer «hva blir resultatene?» per REGIME — sidelengs vs nedtrend.
 * Kjør: npx tsx scripts/backtest-pilot-sweep.mts [SYMBOL]
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { runSimpleBacktest, formatBacktestBevis } from "../src/lib/backtest/simple-backtest";
import type { Candle } from "../src/lib/trading/strategies/types";

const envPath = resolve(process.cwd(), ".env.local");
try {
  const env = readFileSync(envPath, "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
} catch { /* */ }

const SYMBOL = process.argv[2] || "SOLUSDT";
const VINDU_DAGER = 30;

async function hentAlle(): Promise<Candle[]> {
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const siden = new Date(Date.now() - 365 * 86_400_000).toISOString();
  const alle: Candle[] = [];
  let offset = 0;
  for (;;) {
    const res = await fetch(
      `${supaUrl}/rest/v1/price_candles?symbol=eq.${SYMBOL}&open_time=gte.${siden}&order=open_time.asc&limit=1000&offset=${offset}&select=open_time,open,high,low,close,volume`,
      { headers: { Authorization: `Bearer ${srk}`, apikey: srk } },
    );
    const rows = (await res.json()) as { open_time: string; open: number; high: number; low: number; close: number; volume: number }[];
    for (const r of rows) {
      alle.push({ time: new Date(r.open_time).getTime(), open: +r.open, high: +r.high, low: +r.low, close: +r.close, volume: +r.volume });
    }
    if (rows.length < 1000) break;
    offset += 1000;
  }
  return alle;
}

async function main() {
  const alle = await hentAlle();
  console.log(`\n${SYMBOL} — måned for måned (30-dagers vinduer, 10 000 USDT kapital)\n`);
  console.log("Vindu               │ Marked  │ Pilot     │ Lukkede │ WinRate │ DD     │ Dom");
  console.log("────────────────────┼─────────┼───────────┼─────────┼─────────┼────────┼────────────");

  const steg = VINDU_DAGER * 24; // 1h-candles per vindu
  for (let start = 0; start + steg <= alle.length; start += steg) {
    const vindu = alle.slice(start, start + steg);
    const res = runSimpleBacktest({ candles: vindu, initialCapital: 10000 });
    const hold = ((vindu[vindu.length - 1].close / vindu[0].close - 1) * 100);
    const m = res.metrics;
    const dato = new Date(vindu[0].time).toISOString().slice(0, 10);
    const regime = hold > 5 ? "OPPTREND" : hold < -5 ? "NEDTREND" : "sidelengs";
    const dom = m.totalPnl > 0 ? "✅ vant" : m.closedTrades > 0 || m.totalBuys > 0 ? "❌ tap" : "⏸️  pauset";
    console.log(
      `${dato}        │ ${regime.padEnd(7)} │ ${(m.totalReturnPct >= 0 ? "+" : "") + m.totalReturnPct.toFixed(1).padStart(6)}%  │ ${String(m.closedTrades).padStart(7)} │ ${m.winRate.toFixed(0).padStart(6)}% │ ${m.maxDrawdownPct.toFixed(1).padStart(4)}% │ ${dom}  ${formatBacktestBevis(m.totalPnl)}`,
    );
  }
  console.log("\nMarked-kolonnen = buy-and-hold for samme vindu. Historisk ≠ fremtidig.");
}
main().catch((e) => { console.error(e); process.exit(1); });
