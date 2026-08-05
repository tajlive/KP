/**
 * KLARPAKKE TRADING-AGENT — Offisiell backtestEngine + walk-forward (uke 32)
 *
 * Kjører repoets egne runBacktest + runWalkForward (SSoT) på BTC/ETH med
 * balansert trend-follow-konfigurasjon, for å validere at den offisielle
 * enginen også gir positive gates på de symbolene fasiten peker på.
 *
 * Kjør: npx tsx scripts/trading-agent/engine-walkforward.ts
 */
import { fetchHistoricalData, runBacktest, STRATEGY_CONFIGS } from "../../src/lib/trading/backtestEngine";
import { runWalkForward } from "../../src/lib/trading/walk-forward";

async function main() {
  const symbols: Array<{ symbol: string; id: "btc-sma-20-50" | "eth-dca" }> = [
    { symbol: "BTCUSDT", id: "btc-sma-20-50" },
    { symbol: "ETHUSDT", id: "eth-dca" },
  ];

  for (const { symbol, id } of symbols) {
    console.log(`\n════════ ${symbol} (${id}) — 730d daglige lys ════════`);
    const candles = await fetchHistoricalData(symbol, 730);
    console.log(`Candles: ${candles.length}`);

    const config = STRATEGY_CONFIGS[id === "eth-dca" ? "konservativ" : "balansert"];
    const cfg = { ...config, symbol };

    const result = runBacktest(candles, cfg, 10_000);
    const m = result.metrics;
    console.log(`Backtest: trades=${m.totalTrades} winRate=${m.winRate.toFixed(1)}% PF=${m.profitFactor === Infinity ? "∞" : m.profitFactor.toFixed(2)} ret=${m.totalReturnPct.toFixed(1)}% maxDD=${m.maxDrawdownPct.toFixed(1)}% buyHold=${result.buyHoldReturn.toFixed(1)}%`);

    // 70/30 walk-forward
    const wf = runWalkForward(candles, cfg, 10_000, { numWindows: 5, inSamplePct: 0.7, minCandlesPerWindow: 60 });
    console.log(`WalkForward: WFE=${wf.walkForwardEfficiency.toFixed(2)} oosProfitable=${wf.oosProfitablePct.toFixed(0)}% verdict=${wf.verdict} meanOosRet=${wf.meanOosReturn.toFixed(2)}% meanIsRet=${wf.meanIsReturn.toFixed(2)}%`);
    for (const w of wf.windows) {
      console.log(`  win${w.index}: OOS ret=${w.outOfSample.metrics.totalReturnPct.toFixed(1)}% PF=${w.outOfSample.metrics.profitFactor === Infinity ? "∞" : w.outOfSample.metrics.profitFactor.toFixed(2)} trades=${w.outOfSample.metrics.totalTrades} maxDD=${w.outOfSample.metrics.maxDrawdownPct.toFixed(1)}%`);
    }
  }
}

main().catch((e) => { console.error("FEIL:", e); process.exit(1); });
