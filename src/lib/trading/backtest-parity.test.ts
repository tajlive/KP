import { describe, it, expect } from 'vitest';
import { runBacktest, STRATEGY_CONFIGS, type OHLCV } from './backtestEngine';

describe('backtest parity', () => {
  function generateDeterministicCandles(count: number, startPrice: number): OHLCV[] {
    const candles: OHLCV[] = [];
    let price = startPrice;

    for (let i = 0; i < count; i++) {
      // Deterministic slight upward drift so the trend engine produces signals.
      price = price * 1.001;
      candles.push({
        timestamp: 1_704_067_200_000 + i * 24 * 60 * 60 * 1000,
        open: price * 0.999,
        high: price * 1.002,
        low: price * 0.998,
        close: price,
        volume: 1_000_000,
      });
    }

    return candles;
  }

  it('produces deterministic results for identical inputs', () => {
    const candles = generateDeterministicCandles(200, 50_000);
    const config = STRATEGY_CONFIGS.balansert;

    const a = runBacktest(candles, config, 10_000);
    const b = runBacktest(candles, config, 10_000);

    expect(a.metrics.totalReturnPct).toBe(b.metrics.totalReturnPct);
    expect(a.metrics.totalTrades).toBe(b.metrics.totalTrades);
    expect(a.trades.length).toBe(b.trades.length);
    expect(a.equityCurve.length).toBe(b.equityCurve.length);

    if (a.equityCurve.length > 0 && b.equityCurve.length > 0) {
      expect(a.equityCurve[a.equityCurve.length - 1].equity).toBe(
        b.equityCurve[b.equityCurve.length - 1].equity,
      );
    }
  });

  it('produces deterministic results across risk profiles', () => {
    const candles = generateDeterministicCandles(250, 3_000);

    for (const profile of ['konservativ', 'balansert', 'aggressiv'] as const) {
      const config = STRATEGY_CONFIGS[profile];
      const a = runBacktest(candles, config, 10_000);
      const b = runBacktest(candles, config, 10_000);

      expect(a.metrics.totalTrades).toBe(b.metrics.totalTrades);
      expect(a.metrics.totalReturnPct).toBe(b.metrics.totalReturnPct);
    }
  });
});
