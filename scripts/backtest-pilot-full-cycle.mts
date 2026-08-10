/**
 * FULL-SYKLUS BACKTEST (2021→2026) — OKX history-candles (1H)
 * Svarer: «Lønner det seg med lengre backtest?» — det dekker EN full
 * kryptosyklus (2021-rally, 2022-bjørn (Luna/FTX), 2023-chop, 2024-topp,
 * 2025-26-bjørn). DSR nTrials=1 (evaluerer VALGT config, ingen seleksjon).
 *
 * Kjør: npx tsx scripts/backtest-pilot-full-cycle.mts [SOL-USDT] [startÅr]
 */
import { runSimpleBacktest, formatBacktestBevis } from "../src/lib/backtest/simple-backtest";
import type { Candle } from "../src/lib/trading/strategies/types";

const INST = process.argv[2] || "SOL-USDT";
const START_TS = new Date(Number(process.argv[3]) || 2021, 6, 1).getTime(); // default juli 2021
const PACING_MS = 120;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface OkxSvar {
  code: string;
  msg?: string;
  data: [string, string, string, string, string, string, string, string, string][];
}

async function hentFullHistorikk(): Promise<Candle[]> {
  const alle = new Map<number, Candle>();
  let after = Date.now();
  let runder = 0;

  for (;;) {
    const url = `https://www.okx.com/api/v5/market/history-candles?instId=${INST}&bar=1H&limit=100&after=${after}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OKX HTTP ${res.status}`);
    const d = (await res.json()) as OkxSvar;
    if (d.code !== "0") throw new Error(`OKX: ${d.msg}`);
    if (!d.data.length) break;

    let eldst = Infinity;
    for (const [ts, o, h, l, c, , vol] of d.data) {
      const t = Number(ts);
      if (t < eldst) eldst = t;
      if (t >= START_TS) {
        alle.set(t, { time: t, open: +o, high: +h, low: +l, close: +c, volume: +vol });
      }
    }

    runder++;
    if (runder % 50 === 0) {
      console.log(`  …${alle.size} candles (tilbake til ${new Date(eldst).toISOString().slice(0, 10)})`);
    }
    if (eldst <= START_TS) break;
    after = eldst - 1;
    await sleep(PACING_MS);
  }

  return [...alle.values()].sort((a, b) => a.time - b.time);
}

async function main() {
  console.log(`Henter ${INST} 1H-candles fra OKX tilbake til ${new Date(START_TS).toISOString().slice(0, 10)} …`);
  const candles = await hentFullHistorikk();
  console.log(`✓ ${candles.length} candles (${new Date(candles[0].time).toISOString().slice(0, 10)} → ${new Date(candles[candles.length - 1].time).toISOString().slice(0, 10)})\n`);

  // Per kalenderår
  const perÅr = new Map<number, Candle[]>();
  for (const c of candles) {
    const år = new Date(c.time).getUTCFullYear();
    perÅr.set(år, [...(perÅr.get(år) ?? []), c]);
  }

  console.log("År        │ Marked   │ Pilot      │ Lukkede │ WinRate │ MaxDD");
  console.log("──────────┼──────────┼────────────┼─────────┼─────────┼──────");
  for (const [år, lys] of [...perÅr.entries()].sort()) {
    if (lys.length < 100) continue;
    const res = runSimpleBacktest({ candles: lys, initialCapital: 10000 });
    const hold = (lys[lys.length - 1].close / lys[0].close - 1) * 100;
    const m = res.metrics;
    console.log(
      `${år}      │ ${(hold >= 0 ? "+" : "") + hold.toFixed(0).padStart(4)}%   │ ${(m.totalReturnPct >= 0 ? "+" : "") + m.totalReturnPct.toFixed(1).padStart(6)}%    │ ${String(m.closedTrades).padStart(7)} │ ${m.winRate.toFixed(0).padStart(6)}% │ ${m.maxDrawdownPct.toFixed(1).padStart(4)}%`,
    );
  }

  // HELE perioden
  const res = runSimpleBacktest({ candles, initialCapital: 10000, nTrials: Number(process.argv[4]) || 1 });
  const m = res.metrics;
  const hold = (candles[candles.length - 1].close / candles[0].close - 1) * 100;
  console.log("──────────┴──────────┴────────────┴─────────┴─────────┴──────");
  console.log(`HELE SYKLUSEN:  Pilot ${formatBacktestBevis(m.totalPnl)} (${m.totalReturnPct >= 0 ? "+" : ""}${m.totalReturnPct.toFixed(1)}%)  vs  buy-and-hold ${hold >= 0 ? "+" : ""}${hold.toFixed(1)}%`);
  console.log(`  Lukkede: ${m.closedTrades} · WinRate ${m.winRate.toFixed(1)}% · PF ${m.profitFactor === Infinity ? "∞" : m.profitFactor.toFixed(2)} · MaxDD ${m.maxDrawdownPct.toFixed(1)}% · Sharpe ${m.sharpe.toFixed(2)} · DSR ${res.validation.dsr.toFixed(2)} ${res.validation.dsrGate ? "✓" : "✗"}`);
  console.log("\nHistorisk avkastning er ingen garanti for fremtidig avkastning.");
}
main().catch((e) => { console.error(e); process.exit(1); });
