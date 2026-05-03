#!/usr/bin/env node
/**
 * 30-Day Paper Trading Validation
 * Runs new strategies against last 30 days and compares with actual paper trades.
 */

import {
  fetchHistoricalData,
  runBacktest,
} from '../src/lib/backtest/engine.ts';

const BOTS = [
  { name: 'DCA/DOGE', symbol: 'DOGEUSDT', strategy: 'DCA', config: { interval_minutes: 1440, position_size: 0.05, use_trailing_stop: true } },
  { name: 'Trend/LINK', symbol: 'LINKUSDT', strategy: 'SMA_CROSSOVER', config: { fast_period: 8, slow_period: 21, use_adx_filter: true } },
  { name: 'Grid/MATIC', symbol: 'MATICUSDT', strategy: 'GRID', config: { grid_levels: 10, volatility_adjust: true } },
  { name: 'Multi/DOT', symbol: 'DOTUSDT', strategy: 'MULTI_SIGNAL', config: { rsi_buy_threshold: 45, rsi_sell_threshold: 55, use_bollinger: true } },
  { name: 'AI-Copy/AVAX', symbol: 'AVAXUSDT', strategy: 'MULTI_SIGNAL', config: { rsi_buy_threshold: 45, rsi_sell_threshold: 55, use_bollinger: true } },
];

const INITIAL_CAPITAL = 100000; // 100K NOK
const DAYS = 30;

async function run() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  30-DAY PAPER VALIDATION — New Strategies');
  console.log('  Period: Last 30 days');
  console.log('  Capital: 100,000 NOK per bot');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const results = [];

  for (const bot of BOTS) {
    process.stdout.write(`📊 ${bot.name} (${bot.symbol})... `);
    const startTime = Date.now();

    const candles = await fetchHistoricalData(bot.symbol, '1h', DAYS);
    const result = runBacktest(candles, bot.strategy, INITIAL_CAPITAL, {
      feeRate: 0.001,
      slippagePct: 0.05,
      strategyConfig: bot.config,
    });

    const elapsed = Date.now() - startTime;
    console.log(`done in ${elapsed}ms | ${candles.length} candles`);

    const m = result.metrics;
    results.push({
      name: bot.name,
      symbol: bot.symbol,
      strategy: bot.strategy,
      returnPct: m.totalReturnPct,
      sharpe: m.sharpeRatio,
      maxDD: m.maxDrawdownPct,
      winRate: m.winRate,
      trades: m.totalTrades,
      profitFactor: m.profitFactor,
      avgDuration: m.avgTradeDuration,
      buyHoldReturn: result.buyHoldReturn,
      alpha: result.enhancedMetrics.alpha,
    });
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════');
  console.log('  30-DAY EXPECTED RESULTS (Backtest)');
  console.log('═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════');
  console.log('  Bot           | Return   | Buy&Hold | Alpha    | Sharpe | Max DD  | Win Rate | Trades | P.Factor | Avg Hours');
  console.log('───────────────────────────────────────────────────────────────────────────────────────────────────────────────────');

  for (const r of results) {
    const name = r.name.padEnd(13);
    const ret = (r.returnPct >= 0 ? '+' : '') + r.returnPct.toFixed(2) + '%';
    const bh = (r.buyHoldReturn >= 0 ? '+' : '') + r.buyHoldReturn.toFixed(2) + '%';
    const alpha = (r.alpha >= 0 ? '+' : '') + r.alpha.toFixed(2) + '%';
    const sharpe = r.sharpe.toFixed(2);
    const dd = r.maxDD.toFixed(1) + '%';
    const wr = r.winRate.toFixed(1) + '%';
    const tr = String(r.trades).padStart(4);
    const pf = r.profitFactor.toFixed(2);
    const dur = (r.avgDuration * 24).toFixed(1); // convert days to hours

    console.log(`  ${name} | ${ret.padStart(8)} | ${bh.padStart(8)} | ${alpha.padStart(8)} | ${sharpe.padStart(6)} | ${dd.padStart(7)} | ${wr.padStart(8)} | ${tr} | ${pf.padStart(8)} | ${dur.padStart(9)}`);
  }

  console.log('───────────────────────────────────────────────────────────────────────────────────────────────────────────────────');

  // Save results
  const fs = await import('fs');
  const outputPath = './paper-validation-30day.json';
  fs.writeFileSync(outputPath, JSON.stringify({
    metadata: {
      period: 'Last 30 days',
      days: DAYS,
      initialCapital: INITIAL_CAPITAL,
      interval: '1h',
      feeRate: 0.001,
      slippagePct: 0.05,
      runAt: new Date().toISOString(),
    },
    results,
  }, null, 2));
  console.log(`\n💾 Results saved to ${outputPath}`);
}

run().catch(err => {
  console.error('Validation failed:', err);
  process.exit(1);
});
