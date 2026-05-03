#!/usr/bin/env node
/**
 * 4-Year Backtest Runner
 * Runs all strategies against 4 years of Binance historical data.
 */

import {
  fetchHistoricalData,
  runBacktest,
  STRATEGY_MAP,
} from '../src/lib/backtest/engine.ts';

const STRATEGIES = [
  { name: 'DCA', type: 'DCA', config: { interval_minutes: 1440, position_size: 0.05, use_trailing_stop: true } },
  { name: 'Trend Follow (SMA 8/21)', type: 'SMA_CROSSOVER', config: { fast_period: 8, slow_period: 21, use_adx_filter: true } },
  { name: 'Trend Follow (SMA 20/50)', type: 'SMA_CROSSOVER', config: { fast_period: 20, slow_period: 50, use_adx_filter: true } },
  { name: 'Multi-Signal', type: 'MULTI_SIGNAL', config: { rsi_buy_threshold: 45, rsi_sell_threshold: 55, use_bollinger: true } },
  { name: 'Grid Bot', type: 'GRID', config: { grid_levels: 10, volatility_adjust: true } },
];

const SYMBOLS = ['BTCUSDT', 'ETHUSDT'];
const INITIAL_CAPITAL = 10000; // $10k USD
const DAYS = 1461; // 4 years
const INTERVAL = '1h'; // Hourly (strategies are calibrated for 1h)

async function run() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  4-YEAR BACKTEST — Klarpakke Trading Strategies');
  console.log('  Period: 2022-05-03 → 2026-05-03');
  console.log('  Initial Capital: $' + INITIAL_CAPITAL.toLocaleString());
  console.log('═══════════════════════════════════════════════════════════════\n');

  const results = [];

  for (const symbol of SYMBOLS) {
    console.log(`\n📊 Fetching ${DAYS} days of ${symbol} data...`);
    const candles = await fetchHistoricalData(symbol, INTERVAL, DAYS);
    console.log(`   ✓ Got ${candles.length} daily candles`);

    for (const strat of STRATEGIES) {
      process.stdout.write(`   Running ${strat.name}... `);
      const startTime = Date.now();

      const result = runBacktest(candles, strat.type, INITIAL_CAPITAL, {
        smaFast: strat.config.fast_period ?? 20,
        smaSlow: strat.config.slow_period ?? 50,
        maxPositionPct: 1.0,
        feeRate: 0.001,
        slippagePct: 0.05,
        strategyConfig: strat.config,
      });

      const elapsed = Date.now() - startTime;
      console.log(`done in ${elapsed}ms`);

      const buyHold = result.buyHoldReturn;
      const alpha = result.enhancedMetrics.alpha;
      const m = result.metrics;

      results.push({
        symbol,
        strategy: strat.name,
        returnPct: m.totalReturnPct,
        buyHoldReturn: buyHold,
        alpha,
        sharpe: m.sharpeRatio,
        maxDD: m.maxDrawdownPct,
        winRate: m.winRate,
        trades: m.totalTrades,
        profitFactor: m.profitFactor,
        avgDuration: m.avgTradeDuration,
        bestTrade: m.bestTrade,
        worstTrade: m.worstTrade,
      });
    }
  }

  // Print summary table
  console.log('\n═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════');
  console.log('  RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════');
  console.log('  Strategy                    | Symbol   | Return   | Buy&Hold | Alpha    | Sharpe | Max DD  | Win Rate | Trades | P.Factor | Avg Days | Best    | Worst   ');
  console.log('───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────');

  for (const r of results) {
    const name = r.strategy.padEnd(27);
    const sym = r.symbol.padEnd(8);
    const ret = (r.returnPct >= 0 ? '+' : '') + r.returnPct.toFixed(1) + '%';
    const bh = (r.buyHoldReturn >= 0 ? '+' : '') + r.buyHoldReturn.toFixed(1) + '%';
    const alpha = (r.alpha >= 0 ? '+' : '') + r.alpha.toFixed(1) + '%';
    const sharpe = r.sharpe.toFixed(2);
    const dd = r.maxDD.toFixed(1) + '%';
    const wr = r.winRate.toFixed(1) + '%';
    const tr = String(r.trades).padStart(4);
    const pf = r.profitFactor.toFixed(2);
    const dur = r.avgDuration.toFixed(1);
    const best = (r.bestTrade >= 0 ? '+' : '') + r.bestTrade.toFixed(1) + '%';
    const worst = r.worstTrade.toFixed(1) + '%';

    console.log(`  ${name} | ${sym} | ${ret.padStart(8)} | ${bh.padStart(8)} | ${alpha.padStart(8)} | ${sharpe.padStart(6)} | ${dd.padStart(7)} | ${wr.padStart(8)} | ${tr} | ${pf.padStart(8)} | ${dur.padStart(8)} | ${best.padStart(7)} | ${worst.padStart(7)}`);
  }

  console.log('───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────');

  // Best performers
  const bestByReturn = [...results].sort((a, b) => b.returnPct - a.returnPct)[0];
  const bestBySharpe = [...results].sort((a, b) => b.sharpe - a.sharpe)[0];
  const bestByAlpha = [...results].sort((a, b) => b.alpha - a.alpha)[0];

  console.log('\n🏆 BEST PERFORMERS:');
  console.log(`   Highest Return:  ${bestByReturn.strategy} on ${bestByReturn.symbol} → ${bestByReturn.returnPct.toFixed(1)}%`);
  console.log(`   Best Sharpe:     ${bestBySharpe.strategy} on ${bestBySharpe.symbol} → ${bestBySharpe.sharpe.toFixed(2)}`);
  console.log(`   Highest Alpha:   ${bestByAlpha.strategy} on ${bestByAlpha.symbol} → ${bestByAlpha.alpha.toFixed(1)}%`);

  // Save results to file
  const fs = await import('fs');
  const outputPath = './backtest-results-4year.json';
  fs.writeFileSync(outputPath, JSON.stringify({
    metadata: {
      period: '2022-05-03 to 2026-05-03',
      days: DAYS,
      initialCapital: INITIAL_CAPITAL,
      symbols: SYMBOLS,
      feeRate: 0.001,
      slippagePct: 0.05,
      runAt: new Date().toISOString(),
    },
    results,
  }, null, 2));
  console.log(`\n💾 Results saved to ${outputPath}`);
}

run().catch(err => {
  console.error('Backtest failed:', err);
  process.exit(1);
});
