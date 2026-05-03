#!/usr/bin/env node
/**
 * Simulate strategy with actual session state to debug why sell never happens
 */

import {
  DCAStrategy,
  TrendFollowStrategy,
  MultiSignalStrategy,
  GridBotStrategy,
} from '../src/lib/trading/strategies';

// Fetch candles from Binance
async function fetchCandles(symbol, interval = '1h', limit = 168) { // 7 days
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.map(k => ({
    time: k[0],
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }));
}

async function run() {
  // Session data from debug output
  const sessions = [
    { id: '9fd3679b', strategy: 'trend', pair: 'BTCUSDT', pos: { quantity: 0.12693483, entry_price: 78741.21, highest_price: 78759.38 }, capital: 89990, config: { fast_period: 8, slow_period: 21, use_adx_filter: true } },
    { id: '440e4e6d', strategy: 'multi', pair: 'SOLUSDT', pos: { quantity: 118.69139649, entry_price: 84.21, highest_price: 84.25 }, capital: 89990, config: { rsi_buy_threshold: 45, rsi_sell_threshold: 55, use_bollinger: true } },
    { id: '86dfa6cf', strategy: 'grid', pair: 'DOGEUSDT', pos: { quantity: 100563.45704985, entry_price: 0.09939, highest_price: 0.11036 }, capital: 89990, config: { grid_levels: 10, volatility_adjust: true } },
    { id: '07a48410', strategy: 'dca', pair: 'BTCUSDT', pos: { quantity: 0.06377425, entry_price: 78362.37, highest_price: 78362.37 }, capital: 10000000, config: { interval_minutes: 1440, position_size: 0.05, use_trailing_stop: true } },
  ];

  for (const sess of sessions) {
    console.log(`\n═══════════════════════════════════════════════════════════════`);
    console.log(`  Simulating: ${sess.strategy.toUpperCase()} on ${sess.pair}`);
    console.log(`  Entry: $${sess.pos.entry_price} | Highest: $${sess.pos.highest_price} | Qty: ${sess.pos.quantity}`);
    console.log(`═══════════════════════════════════════════════════════════════`);

    const candles = await fetchCandles(sess.pair);
    const currentPrice = candles[candles.length - 1].close;
    console.log(`  Fetched ${candles.length} candles`);
    console.log(`  Current price: $${currentPrice}`);
    console.log(`  P&L from entry: ${((currentPrice - sess.pos.entry_price) / sess.pos.entry_price * 100).toFixed(2)}%`);

    // Create strategy
    let strategy;
    switch (sess.strategy) {
      case 'dca': strategy = new DCAStrategy(); break;
      case 'trend': strategy = new TrendFollowStrategy(); break;
      case 'multi': strategy = new MultiSignalStrategy(); break;
      case 'grid': strategy = new GridBotStrategy(); break;
    }

    // Simulate with session state
    const session = {
      open_position: {
        side: 'long',
        quantity: sess.pos.quantity,
        entry_price: sess.pos.entry_price,
        entry_time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        highest_price: sess.pos.highest_price,
      },
      last_tick_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      strategy_config: sess.config,
    };

    const signal = strategy.evaluate({
      candles,
      session,
      config: sess.config,
      currentTime: Date.now(),
    });

    console.log(`\n  📢 STRATEGY SIGNAL: ${signal.action.toUpperCase()}`);
    if (signal.reason) console.log(`     Reason: ${signal.reason}`);
    if (signal.positionSize) console.log(`     Position Size: ${(signal.positionSize * 100).toFixed(2)}%`);
    if (signal.indicators) {
      console.log(`     Indicators:`);
      for (const [k, v] of Object.entries(signal.indicators)) {
        console.log(`       ${k}: ${typeof v === 'number' ? v.toFixed(4) : v}`);
      }
    }
  }
}

run().catch(console.error);
