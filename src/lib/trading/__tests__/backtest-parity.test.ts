/**
 * Cross-engine parity tests for the two backtest engines.
 *
 * Verifies that `src/lib/trading/backtestEngine.ts` and `src/lib/backtest/engine.ts`
 * produce consistent results for the same deterministic input:
 * - same candles
 * - same strategy/risk profile
 * - same initial capital
 */

import { describe, it, expect } from "vitest";
import {
  runBacktest as runLegacyBacktest,
  STRATEGY_CONFIGS,
  type OHLCV as LegacyOHLCV,
} from "../backtestEngine";
import {
  runBacktest as runNewBacktest,
  type OHLCV as NewOHLCV,
} from "../../backtest/engine";

const FEE_RATE = 0.001;
const SLIPPAGE_PCT = 0.05; // 0.05 % => 0.0005 rate

function makeDeterministicCandles(
  count: number,
  startPrice: number,
  startTime = Date.now(),
): LegacyOHLCV[] & NewOHLCV[] {
  const candles: LegacyOHLCV[] & NewOHLCV[] = [];
  let price = startPrice;

  for (let i = 0; i < count; i++) {
    // Create a clear bullish trend then reversal to guarantee crossovers.
    if (i < count * 0.45) {
      price = price * 1.008;
    } else if (i < count * 0.55) {
      price = price * 0.998;
    } else {
      price = price * 1.002;
    }

    candles.push({
      timestamp: startTime + i * 24 * 60 * 60 * 1000,
      open: price * 0.999,
      high: price * 1.003,
      low: price * 0.997,
      close: price,
      volume: 1_000_000,
    });
  }

  return candles;
}

type TrendProfileKey = "balansert" | "aggressiv";

const TREND_PROFILES: Array<{
  key: TrendProfileKey;
  startPrice: number;
}> = [
  { key: "balansert", startPrice: 50000 },
  { key: "aggressiv", startPrice: 50000 },
];

describe("backtest engine parity", () => {
  it.each(TREND_PROFILES)(
    "legacy and new engines agree for SMA_CROSSOVER / $key",
    ({ key, startPrice }) => {
      const candles = makeDeterministicCandles(150, startPrice);
      const initialCapital = 100_000;

      const config = STRATEGY_CONFIGS[key];
      const legacyResult = runLegacyBacktest(candles, config, initialCapital);

      const newResult = runNewBacktest(
        candles,
        "SMA_CROSSOVER",
        initialCapital,
        {
          symbol: config.symbol,
          smaFast: config.smaFast,
          smaSlow: config.smaSlow,
          maxPositionPct: config.maxPositionPct,
          riskProfile: key,
          feeRate: FEE_RATE,
          slippagePct: SLIPPAGE_PCT,
        },
      );

      const legacyFinalEquity =
        legacyResult.equityCurve[legacyResult.equityCurve.length - 1]
          ?.equity ?? initialCapital;
      const newFinalEquity =
        newResult.equityCurve[newResult.equityCurve.length - 1]?.equity ??
        initialCapital;

      expect(newResult.trades.length).toBe(legacyResult.trades.length);
      expect(newResult.metrics.totalReturnPct).toBeCloseTo(
        legacyResult.metrics.totalReturnPct,
        1,
      );
      expect(newFinalEquity).toBeCloseTo(legacyFinalEquity, 1);
    },
  );
});
