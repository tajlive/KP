/**
 * PILOT 2.0 VARIANT-STUDIE (5 kombinasjoner, walk-forward OOS, DSR-korreksjon)
 *
 * Mandat (klarpakke-trading-agent): «beste-av-N er nesten alltid oppblåst» —
 * derfor DSR med nTrials=5, PF-gates, walk-forward (60% train / 40% OOS),
 * gebyr+slippage alltid med.
 *
 * V0: baseline (nåværende COMBO)
 * V1: adaptiv ATR-steg            (E1, dcabot +11.4pp-evidens)
 * V2: smart DCA                   (E2, dcabot +10.6pp-evidens)
 * V3: E1 + E2
 * V4: E1 + E2 + dd_gate 0.9 (strammere «slipp posene»)
 *
 * Kjør: npx tsx scripts/backtest-pilot-variants.mts
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { runSimpleBacktest, type SimpleBacktestResult } from "../src/lib/backtest/simple-backtest";
import type { Candle } from "../src/lib/trading/strategies/types";

const envPath = resolve(process.cwd(), ".env.local");
try {
  const env = readFileSync(envPath, "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
} catch { /* */ }

const SYMBOLER = ["SOLUSDT", "BTCUSDT", "ETHUSDT"];
const N_TRIALS = 5;
const KAPITAL = 10_000;

const VARIANTER: { id: string; config: Record<string, unknown> }[] = [
  { id: "V0 baseline", config: {} },
  { id: "V1 adaptiv-steg", config: { adaptive_step: true } },
  { id: "V2 smart-DCA", config: { smart_dca: true } },
  { id: "V3 E1+E2", config: { adaptive_step: true, smart_dca: true } },
  { id: "V4 E1+E2+gate0.9", config: { adaptive_step: true, smart_dca: true, dd_gate_pct: 0.9 } },
];

async function hentCandles(sym: string): Promise<Candle[]> {
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const siden = new Date(Date.now() - 365 * 86_400_000).toISOString();
  const alle: Candle[] = [];
  let offset = 0;
  for (;;) {
    const res = await fetch(
      `${supaUrl}/rest/v1/price_candles?symbol=eq.${sym}&open_time=gte.${siden}&order=open_time.asc&limit=1000&offset=${offset}&select=open_time,open,high,low,close,volume`,
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

function pf(res: SimpleBacktestResult): number {
  const selg = res.trades.filter((t) => t.side === "sell" && t.realizedPnl !== undefined);
  const gevinst = selg.reduce((s, t) => s + Math.max(0, t.realizedPnl!), 0);
  const tap = Math.abs(selg.reduce((s, t) => s + Math.min(0, t.realizedPnl!), 0));
  return tap > 0 ? gevinst / tap : gevinst > 0 ? Infinity : 0;
}

async function main() {
  console.log(`\nPILOT 2.0 VARIANT-STUDIE — 5 kombinasjoner × ${SYMBOLER.length} symboler × 365d`);
  console.log(`Walk-forward: 60% train / 40% OOS · DSR nTrials=${N_TRIALS} · gebyr 0.1% + slippage 0.2%\n`);

  for (const v of VARIANTER) {
    let sumTrain = 0, sumOos = 0, lukkede = 0, ddMaks = 0, pfTrainMin = Infinity, pfOosMin = Infinity;
    const perSymbol: string[] = [];

    for (const sym of SYMBOLER) {
      const alle = await hentCandles(sym);
      const split = Math.floor(alle.length * 0.6);
      const train = alle.slice(0, split);
      const oos = alle.slice(split);

      const resT = runSimpleBacktest({ candles: train, initialCapital: KAPITAL, config: v.config, nTrials: N_TRIALS });
      const resO = runSimpleBacktest({ candles: oos, initialCapital: KAPITAL, config: v.config, nTrials: N_TRIALS });

      sumTrain += resT.metrics.totalReturnPct;
      sumOos += resO.metrics.totalReturnPct;
      lukkede += resT.metrics.closedTrades + resO.metrics.closedTrades;
      ddMaks = Math.max(ddMaks, resT.metrics.maxDrawdownPct, resO.metrics.maxDrawdownPct);
      pfTrainMin = Math.min(pfTrainMin, pf(resT));
      pfOosMin = Math.min(pfOosMin, pf(resO));

      perSymbol.push(
        `   ${sym.padEnd(9)} train ${resT.metrics.totalReturnPct >= 0 ? "+" : ""}${resT.metrics.totalReturnPct.toFixed(1)}% (PF ${pf(resT).toFixed(2)}) → OOS ${resO.metrics.totalReturnPct >= 0 ? "+" : ""}${resO.metrics.totalReturnPct.toFixed(1)}% (PF ${pf(resO).toFixed(2)}, DSR ${resO.validation.dsr.toFixed(2)})`,
      );
    }

    const snittTrain = sumTrain / SYMBOLER.length;
    const snittOos = sumOos / SYMBOLER.length;
    const gates = [
      `PF_train≥1.3: ${pfTrainMin >= 1.3 ? "✓" : "✗"} (${pfTrainMin === Infinity ? "∞" : pfTrainMin.toFixed(2)})`,
      `PF_OOS≥1.1: ${pfOosMin >= 1.1 ? "✓" : "✗"} (${pfOosMin === Infinity ? "∞" : pfOosMin.toFixed(2)})`,
      `DD≤15%: ${ddMaks <= 15 ? "✓" : "✗"} (${ddMaks.toFixed(1)}%)`,
      `≥100 lukkede: ${lukkede >= 100 ? "✓" : "✗"} (${lukkede})`,
    ].join("  ");

    console.log(`\n${v.id}  —  snitt train ${snittTrain >= 0 ? "+" : ""}${snittTrain.toFixed(1)}% / OOS ${snittOos >= 0 ? "+" : ""}${snittOos.toFixed(1)}%`);
    for (const linje of perSymbol) console.log(linje);
    console.log(`   GATES: ${gates}`);
  }
  console.log("\nHistorisk ≠ fremtidig. Beste-av-5 må passere DSR-korreksjon før deploy.\n");
}
main().catch((e) => { console.error(e); process.exit(1); });
