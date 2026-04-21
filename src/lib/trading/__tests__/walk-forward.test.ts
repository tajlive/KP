/**
 * Tests for Walk-Forward Optimization
 */

import { describe, it, expect } from "vitest";
import {
  runWalkForward,
  runAnchoredWalkForward,
  type WalkForwardResult,
} from "../walk-forward";
import type { OHLCV, StrategyConfig } from "../backtestEngine";

// Helper: generate synthetic candle data with a clear trend
function generateCandles(count: number, startPrice: number = 50000, seed: number = 42): OHLCV[] {
  const candles: OHLCV[] = [];
  let price = startPrice;
  let rng = seed;

  function nextRandom(): number {
    // Simple LCG for deterministic tests
    rng = (rng * 1664525 + 1013904223) >>> 0;
    return (rng >>> 0) / 4294967296;
  }

  for (let i = 0; i < count; i++) {
    const change = (nextRandom() - 0.48) * 0.03; // Slight upward bias
    price *= (1 + change);
    const high = price * (1 + nextRandom() * 0.01);
    const low = price * (1 - nextRandom() * 0.01);

    candles.push({
      timestamp: Date.now() - (count - i) * 86400000,
      open: price * (1 + (nextRandom() - 0.5) * 0.005),
      high,
      low,
      close: price,
      volume: 1000 + nextRandom() * 5000,
    });
  }

  return candles;
}

// Test strategy config
const testConfig: StrategyConfig = {
  id: "btc-sma-20-50",
  symbol: "BTCUSDT",
  name: "Test SMA 20/50",
  description: "Test strategy",
  smaFast: 10,
  smaSlow: 30,
  maxPositionPct: 0.8,
  feeRate: 0.001,
};

describe("Walk-Forward Optimization", () => {
  describe("runWalkForward", () => {
    it("should return overfit verdict with insufficient data", () => {
      const candles = generateCandles(50); // Too few for 5 windows
      const result = runWalkForward(candles, testConfig, 10000);

      expect(result.verdict).toBe("overfit");
      expect(result.windows).toHaveLength(0);
      expect(result.robustnessScore).toBe(0);
    });

    it("should split data into correct number of windows", () => {
      const candles = generateCandles(500);
      const result = runWalkForward(candles, testConfig, 10000, {
        numWindows: 5,
        inSamplePct: 0.7,
      });

      expect(result.windows.length).toBeLessThanOrEqual(5);
      expect(result.windows.length).toBeGreaterThan(0);
    });

    it("should have non-overlapping IS and OOS periods per window", () => {
      const candles = generateCandles(500);
      const result = runWalkForward(candles, testConfig, 10000);

      for (const window of result.windows) {
        // OOS starts after IS ends
        expect(new Date(window.outOfSample.startDate).getTime())
          .toBeGreaterThanOrEqual(new Date(window.inSample.endDate).getTime());
      }
    });

    it("should calculate Walk-Forward Efficiency", () => {
      const candles = generateCandles(600);
      const result = runWalkForward(candles, testConfig, 10000);

      // WFE should be a finite number
      expect(Number.isFinite(result.walkForwardEfficiency)).toBe(true);
    });

    it("should calculate robustness score between 0-100", () => {
      const candles = generateCandles(600);
      const result = runWalkForward(candles, testConfig, 10000);

      expect(result.robustnessScore).toBeGreaterThanOrEqual(0);
      expect(result.robustnessScore).toBeLessThanOrEqual(100);
    });

    it("should have valid metrics for each window", () => {
      const candles = generateCandles(500);
      const result = runWalkForward(candles, testConfig, 10000);

      for (const window of result.windows) {
        expect(Number.isFinite(window.inSample.metrics.totalReturnPct)).toBe(true);
        expect(Number.isFinite(window.outOfSample.metrics.totalReturnPct)).toBe(true);
        expect(window.inSample.candles).toBeGreaterThan(0);
        expect(window.outOfSample.candles).toBeGreaterThan(0);
      }
    });

    it("should respect custom config", () => {
      const candles = generateCandles(800);
      const result = runWalkForward(candles, testConfig, 10000, {
        numWindows: 8,
        inSamplePct: 0.6,
        minCandlesPerWindow: 30,
      });

      expect(result.config.numWindows).toBe(8);
      expect(result.config.inSamplePct).toBe(0.6);
    });

    it("should assign valid verdict based on WFE and profitability", () => {
      const candles = generateCandles(600);
      const result = runWalkForward(candles, testConfig, 10000);

      expect(["robust", "acceptable", "questionable", "overfit"]).toContain(result.verdict);
    });

    it("should report totalCandles", () => {
      const candles = generateCandles(500);
      const result = runWalkForward(candles, testConfig, 10000);

      expect(result.totalCandles).toBe(500);
    });
  });

  describe("runAnchoredWalkForward", () => {
    it("should use expanding IS window from start", () => {
      const candles = generateCandles(500);
      const result = runAnchoredWalkForward(candles, testConfig, 10000, 4);

      if (result.windows.length >= 2) {
        // Each successive IS window should be larger
        expect(result.windows[1].inSample.candles)
          .toBeGreaterThan(result.windows[0].inSample.candles);
      }
    });

    it("should handle insufficient data gracefully", () => {
      const candles = generateCandles(30);
      const result = runAnchoredWalkForward(candles, testConfig, 10000);

      expect(result.verdict).toBe("overfit");
      expect(result.windows).toHaveLength(0);
    });

    it("should produce valid results with enough data", () => {
      const candles = generateCandles(600);
      const result = runAnchoredWalkForward(candles, testConfig, 10000, 4);

      expect(result.windows.length).toBeGreaterThan(0);
      expect(Number.isFinite(result.walkForwardEfficiency)).toBe(true);
      expect(result.robustnessScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty candles array", () => {
      const result = runWalkForward([], testConfig, 10000);

      expect(result.windows).toHaveLength(0);
      expect(result.verdict).toBe("overfit");
    });

    it("should handle zero capital", () => {
      const candles = generateCandles(500);
      const result = runWalkForward(candles, testConfig, 0);

      // Should not crash
      expect(result).toBeDefined();
    });

    it("should handle 1 window config", () => {
      const candles = generateCandles(200);
      const result = runWalkForward(candles, testConfig, 10000, {
        numWindows: 1,
        minCandlesPerWindow: 50,
      });

      expect(result.windows.length).toBeLessThanOrEqual(1);
    });
  });
});
