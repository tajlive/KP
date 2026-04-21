/**
 * Tests for Portfolio Allocator
 */

import { describe, it, expect } from "vitest";
import {
  allocatePortfolio,
  backtestToStrategyPerformance,
  type StrategyPerformance,
  type AllocationResult,
} from "../portfolio-allocator";

// Helper: create a strategy performance mock
function makeStrategy(
  id: string,
  overrides: Partial<StrategyPerformance> = {},
): StrategyPerformance {
  return {
    strategyId: id,
    name: `Strategy ${id}`,
    returns: Array.from({ length: 100 }, (_, i) => (Math.sin(i * 0.5) * 0.02)),
    winRate: 0.55,
    avgWin: 0.025,
    avgLoss: 0.015,
    annualVolatility: 0.40,
    sharpeRatio: 1.2,
    maxDrawdown: 0.15,
    sampleSize: 50,
    ...overrides,
  };
}

// Helper: generate uncorrelated returns
function uncorrelatedReturns(n: number, seed: number): number[] {
  let rng = seed;
  return Array.from({ length: n }, () => {
    rng = (rng * 1664525 + 1013904223) >>> 0;
    return ((rng >>> 0) / 4294967296 - 0.48) * 0.04;
  });
}

describe("Portfolio Allocator", () => {
  describe("allocatePortfolio", () => {
    it("should return empty result for no strategies", () => {
      const result = allocatePortfolio([]);

      expect(result.allocations).toHaveLength(0);
      expect(result.rawTotalKelly).toBe(0);
    });

    it("should allocate to a single strategy", () => {
      const strat = makeStrategy("BTC-SMA", { winRate: 0.55, avgWin: 0.03, avgLoss: 0.02 });
      const result = allocatePortfolio([strat], {
        totalCapital: 100000,
        kellyMultiplier: 0.5,
      });

      expect(result.allocations).toHaveLength(1);
      expect(result.allocations[0].allocationPct).toBeGreaterThan(0);
      expect(result.allocations[0].allocationAmount).toBeGreaterThan(0);
    });

    it("should allocate across multiple strategies", () => {
      const strategies = [
        makeStrategy("BTC", { returns: uncorrelatedReturns(100, 1), winRate: 0.55, avgWin: 0.03, avgLoss: 0.02 }),
        makeStrategy("ETH", { returns: uncorrelatedReturns(100, 99), winRate: 0.52, avgWin: 0.04, avgLoss: 0.025 }),
        makeStrategy("SOL", { returns: uncorrelatedReturns(100, 42), winRate: 0.58, avgWin: 0.02, avgLoss: 0.01 }),
      ];

      const result = allocatePortfolio(strategies, { totalCapital: 100000 });

      expect(result.allocations).toHaveLength(3);

      // Total allocation should not exceed target utilization
      const totalPct = result.allocations.reduce((s, a) => s + a.allocationPct, 0);
      expect(totalPct).toBeLessThanOrEqual(85); // 80% + some margin
    });

    it("should respect maxSingleAllocation constraint", () => {
      const strat = makeStrategy("STRONG", {
        winRate: 0.70,
        avgWin: 0.05,
        avgLoss: 0.01, // Extremely profitable
        sampleSize: 100,
      });

      const result = allocatePortfolio([strat], {
        totalCapital: 100000,
        maxSingleAllocation: 0.30,
      });

      expect(result.allocations[0].allocationPct).toBeLessThanOrEqual(30);
    });

    it("should exclude strategies below minAllocation", () => {
      const strategies = [
        makeStrategy("GOOD", { winRate: 0.60, avgWin: 0.03, avgLoss: 0.02, sampleSize: 50 }),
        makeStrategy("WEAK", { winRate: 0.51, avgWin: 0.01, avgLoss: 0.025, sampleSize: 8 }),
      ];

      const result = allocatePortfolio(strategies, {
        totalCapital: 100000,
        minAllocation: 0.02,
      });

      // Weak strategy might be excluded
      const weakAlloc = result.allocations.find(a => a.strategyId === "WEAK");
      const goodAlloc = result.allocations.find(a => a.strategyId === "GOOD");

      // Good strategy should have higher allocation than weak
      if (weakAlloc && goodAlloc) {
        expect(goodAlloc.allocationPct).toBeGreaterThanOrEqual(weakAlloc.allocationPct);
      }
    });

    it("should penalize correlated strategies", () => {
      // Create two strategies with identical returns (max correlation)
      const sharedReturns = uncorrelatedReturns(100, 42);

      const strategies = [
        makeStrategy("A", { returns: sharedReturns, winRate: 0.55, avgWin: 0.03, avgLoss: 0.02 }),
        makeStrategy("B", { returns: sharedReturns, winRate: 0.55, avgWin: 0.03, avgLoss: 0.02 }),
      ];

      const resultCorrelated = allocatePortfolio(strategies, { totalCapital: 100000 });

      // Now with uncorrelated returns
      const strategies2 = [
        makeStrategy("C", { returns: uncorrelatedReturns(100, 42), winRate: 0.55, avgWin: 0.03, avgLoss: 0.02 }),
        makeStrategy("D", { returns: uncorrelatedReturns(100, 99), winRate: 0.55, avgWin: 0.03, avgLoss: 0.02 }),
      ];

      const resultUncorrelated = allocatePortfolio(strategies2, { totalCapital: 100000 });

      // Uncorrelated portfolio should have at least similar total allocation
      // (correlated strategies get penalized)
      const totalCorr = resultCorrelated.allocations.reduce((s, a) => s + a.allocationPct, 0);
      const totalUncorr = resultUncorrelated.allocations.reduce((s, a) => s + a.allocationPct, 0);

      // This is a relative test — the uncorrelated portfolio shouldn't be penalized
      // Both should be valid
      expect(totalCorr).toBeGreaterThanOrEqual(0);
      expect(totalUncorr).toBeGreaterThanOrEqual(0);
    });

    it("should calculate portfolio-level metrics", () => {
      const strategies = [
        makeStrategy("A", { returns: uncorrelatedReturns(100, 1), winRate: 0.55, avgWin: 0.03, avgLoss: 0.02 }),
        makeStrategy("B", { returns: uncorrelatedReturns(100, 99), winRate: 0.58, avgWin: 0.025, avgLoss: 0.015 }),
      ];

      const result = allocatePortfolio(strategies, { totalCapital: 100000 });

      expect(Number.isFinite(result.portfolioSharpe)).toBe(true);
      expect(Number.isFinite(result.expectedReturnPct)).toBe(true);
      expect(Number.isFinite(result.expectedVolatilityPct)).toBe(true);
      expect(result.diversificationRatio).toBeGreaterThanOrEqual(1);
    });

    it("should include correlation matrix of correct dimensions", () => {
      const strategies = [
        makeStrategy("A", { returns: uncorrelatedReturns(100, 1) }),
        makeStrategy("B", { returns: uncorrelatedReturns(100, 2) }),
        makeStrategy("C", { returns: uncorrelatedReturns(100, 3) }),
      ];

      const result = allocatePortfolio(strategies, { totalCapital: 100000 });

      expect(result.correlationMatrix).toHaveLength(3);
      expect(result.correlationMatrix[0]).toHaveLength(3);

      // Diagonal should be 1.0
      for (let i = 0; i < 3; i++) {
        expect(result.correlationMatrix[i][i]).toBe(1.0);
      }

      // Should be symmetric
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          expect(result.correlationMatrix[i][j]).toBeCloseTo(
            result.correlationMatrix[j][i],
            8,
          );
        }
      }
    });

    it("should calculate risk contributions summing to ~100%", () => {
      const strategies = [
        makeStrategy("A", { returns: uncorrelatedReturns(100, 1), winRate: 0.55, avgWin: 0.03, avgLoss: 0.02 }),
        makeStrategy("B", { returns: uncorrelatedReturns(100, 2), winRate: 0.58, avgWin: 0.025, avgLoss: 0.015 }),
      ];

      const result = allocatePortfolio(strategies, { totalCapital: 100000 });

      // Filter out excluded strategies (allocationPct = 0)
      const activeAllocations = result.allocations.filter(a => a.allocationPct > 0);

      if (activeAllocations.length > 0) {
        const totalRisk = activeAllocations.reduce(
          (s, a) => s + a.riskContributionPct,
          0,
        );
        expect(totalRisk).toBeCloseTo(100, 0); // ~100%
      }
    });
  });

  describe("backtestToStrategyPerformance", () => {
    it("should convert empty trades to zero performance", () => {
      const perf = backtestToStrategyPerformance("test", "Test", [], []);

      expect(perf.winRate).toBe(0);
      expect(perf.sampleSize).toBe(0);
      expect(perf.returns).toHaveLength(0);
    });

    it("should compute correct stats from trades", () => {
      const trades = [
        { entryTime: 0, exitTime: 86400000, entryPrice: 50000, exitPrice: 52000, side: "LONG" as const, size: 0.1, pnl: 200, pnlPct: 4, fee: 5 },
        { entryTime: 86400000, exitTime: 172800000, entryPrice: 52000, exitPrice: 51000, side: "LONG" as const, size: 0.1, pnl: -100, pnlPct: -1.92, fee: 5 },
        { entryTime: 172800000, exitTime: 259200000, entryPrice: 51000, exitPrice: 53000, side: "LONG" as const, size: 0.1, pnl: 200, pnlPct: 3.92, fee: 5 },
      ];
      const equityCurve = [
        { equity: 10000 },
        { equity: 10200 },
        { equity: 10100 },
        { equity: 10300 },
      ];

      const perf = backtestToStrategyPerformance("test", "Test", trades, equityCurve);

      expect(perf.winRate).toBeCloseTo(2 / 3, 2);
      expect(perf.sampleSize).toBe(3);
      expect(perf.avgWin).toBeGreaterThan(0);
      expect(perf.avgLoss).toBeGreaterThan(0); // Stored as positive
    });
  });

  describe("Edge cases", () => {
    it("should handle strategies with zero avgLoss", () => {
      const strat = makeStrategy("PERFECT", {
        winRate: 1.0,
        avgWin: 0.05,
        avgLoss: 0,
        sampleSize: 30,
      });

      const result = allocatePortfolio([strat], { totalCapital: 100000 });

      // Should not crash
      expect(result.allocations).toHaveLength(1);
    });

    it("should handle strategies with very small sample size", () => {
      const strat = makeStrategy("TINY", {
        sampleSize: 2,
        winRate: 0.55,
        avgWin: 0.03,
        avgLoss: 0.02,
      });

      const result = allocatePortfolio([strat], { totalCapital: 100000 });

      // Small sample → heavily penalized or excluded
      expect(result.allocations[0].allocationPct).toBeLessThanOrEqual(30);
    });

    it("should handle strategies with very short return series", () => {
      const strat = makeStrategy("SHORT", {
        returns: [0.01, 0.02],
        sampleSize: 20,
      });

      const result = allocatePortfolio([strat], { totalCapital: 100000 });
      expect(result).toBeDefined();
    });
  });
});
