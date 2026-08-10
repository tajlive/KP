/**
 * PORTEFØLJE-BACKTEST: Pilot-grid på flere symboler samtidig (strukturell
 * diversifisering — aldri er alle symboler i nedtrend samtidig).
 * Kapital splittes likt, hvert symbol kjører uavhengig, equity summeres.
 * Kjør: npx tsx scripts/backtest-pilot-portfolio.mts [DAGER] [SYM1,SYM2,...]
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

const DAGER = Number(process.argv[2]) || 365;
const SYMBOLER = (process.argv[3] || "SOLUSDT,BTCUSDT,ETHUSDT").split(",");
const TOTAL_KAPITAL = 10_000;

async function hentCandles(sym: string): Promise<Candle[]> {
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const siden = new Date(Date.now() - DAGER * 86_400_000).toISOString();
  const alle: Candle[] = [];
  let offset = 0;
  for (;;) {
    const res = await fetch(
      `${supaUrl}/rest/v1/price_candles?symbol=eq.${sym}&open_time=gte.${siden}&order=open_time.asc&limit=1000&offset=${offset}&select=open_time,close,volume`,
      { headers: { Authorization: `Bearer ${srk}`, apikey: srk } },
    );
    const rows = (await res.json()) as { open_time: string; close: number; volume: number }[];
    for (const r of rows) {
      alle.push({ time: new Date(r.open_time).getTime(), open: +r.close, high: +r.close, low: +r.close, close: +r.close, volume: +r.volume });
    }
    if (rows.length < 1000) break;
    offset += 1000;
  }
  return alle;
}

async function main() {
  const perSym = TOTAL_KAPITAL / SYMBOLER.length;
  console.log(`\nPORTEFØLJE-BACKTEST ${DAGER}d — ${SYMBOLER.join(" + ")} (${TOTAL_KAPITAL.toLocaleString("no-NO")} USDT totalt, ${Math.round(perSym).toLocaleString("no-NO")} per symbol)\n`);

  let portPnl = 0;
  let portLukkede = 0;
  let portVunnet = 0;
  const kurver: { time: number; equity: number }[][] = [];

  for (const sym of SYMBOLER) {
    const candles = await hentCandles(sym);
    const res = runSimpleBacktest({ candles, initialCapital: perSym });
    const m = res.metrics;
    portPnl += m.totalPnl;
    portLukkede += m.closedTrades;
    portVunnet += (m.winRate / 100) * m.closedTrades;
    kurver.push(res.equityCurve);
    console.log(`${sym.padEnd(9)}: ${formatBacktestBevis(m.totalPnl).padStart(11)} (${(m.totalReturnPct >= 0 ? "+" : "")}${m.totalReturnPct.toFixed(1)}%)  ·  ${m.closedTrades} lukkede · ${m.winRate.toFixed(0)}% win · DD ${m.maxDrawdownPct.toFixed(1)}%`);
  }

  // Samlet equity-kurve (snuplar per dag for enkelhets skyld)
  const perDag = new Map<number, number>();
  for (const kurve of kurver) {
    for (const p of kurve) {
      const dag = Math.floor(p.time / 86_400_000);
      perDag.set(dag, (perDag.get(dag) ?? 0) + p.equity);
    }
  }
  const samlet = [...perDag.values()];
  let topp = TOTAL_KAPITAL, maksDD = 0;
  for (const e of samlet) {
    if (e > topp) topp = e;
    const dd = ((topp - e) / topp) * 100;
    if (dd > maksDD) maksDD = dd;
  }

  const portWinRate = portLukkede > 0 ? (portVunnet / portLukkede) * 100 : 0;
  console.log("─────────────────────────────────────────────────────────");
  console.log(`PORTEFØLJE:  ${formatBacktestBevis(portPnl).padStart(11)} (${((portPnl / TOTAL_KAPITAL) * 100).toFixed(1)}%)  ·  ${portLukkede} lukkede · ${portWinRate.toFixed(0)}% win · DD ${maksDD.toFixed(1)}%`);
  console.log("Historisk avkastning er ingen garanti for fremtidig avkastning.\n");
}
main().catch((e) => { console.error(e); process.exit(1); });
