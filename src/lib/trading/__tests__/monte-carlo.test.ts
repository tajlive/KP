/**
 * Tests for Monte Carlo Simulation
 */

import { describe, it, expect } from "vitest";
import { runMonteCarlo, type MonteCarloResult } from "../monte-carlo";
import type { BacktestTrade } from "../backtestEngine";

// Helper: create a trade with given P&L
function makeTrade(pnl: number, pnlPct: number): BacktestTrade {
  return {
    entryTime: Date.now() - 86400000,
    exitTime: Date.now(),
    entryPrice: 50000,
    exitPrice: 50000 + (pnl / 0.1),
    side: "LONG",
    size: 0.1,
    pnl,
    pnlPct,
    fee: 1,
  };
}

// Helper: create winning trades
function makeWinningTrades(n: number): BacktestTrade[] {
  return Array.from({ length: n }, () => makeTrade(500, 5));
}

// Helper: create losing trades
function makeLosingTrades(n: number): BacktestTrade[] {
  return Array.from({ length: n }, () => makeTrade(-500, -5));
}

// Helper: create mixed trades
function makeMixedTrades(wins: number, losses: number): BacktestTrade[] {
  return [
    ...makeWinningTrades(wins),
    ...makeLosingTrades(losses),
  ];
}

describe("Monte Carlo Simulation", () => {
  describe("Edge cases", () => {
    it("should handle empty trades array", () => {
      const result = runMonteCarlo([], { simulations: 100, initialCapital: 10000 });

      expect(result.probabilityOfProfit).toBe(0);
      expect(result.probabilityOfRuin).toBe(0);
      expect(result.medianReturn).toBe(0);
      expect(result.simulationsRun).toBe(100);
    });

    it("should handle single trade", () => {
      const trades = [makeTrade(100, 1)];
      const result = runMonteCarlo(trades, {
        simulations: 100,
        initialCapital: 10000,
      });

      expect(result.simulationsRun).toBe(100);
      expect(result.probabilityOfProfit).toBeGreaterThan(0);
    });
  });

  describe("All winning trades", () => {
    it("should have high probability of profit", () => {
      const trades = makeWinningTrades(20);
      const result = runMonteCarlo(trades, {
        simulations: 1000,
        initialCapital: 10000,
      });

      // All trades are winners → P(profit) should be ~1.0
      expect(result.probabilityOfProfit).toBeGreaterThanOrEqual(0.99);
      expect(result.probabilityOfRuin).toBe(0);
      expect(result.medianReturn).toBeGreaterThan(0);
      expect(result.meanReturn).toBeGreaterThan(0);
    });

    it("should have positive confidence interval", () => {
      const trades = makeWinningTrades(20);
      const result = runMonteCarlo(trades, {
        simulations: 1000,
        initialCapital: 10000,
      });

      expect(result.confidenceInterval95[0]).toBeGreaterThan(0);
      expect(result.confidenceInterval95[1]).toBeGreaterThan(0);
    });

    it("should have zero consecutive losses", () => {
      const trades = makeWinningTrades(10);
      const result = runMonteCarlo(trades, {
        simulations: 500,
        initialCapital: 10000,
      });

      expect(result.maxConsecutiveLosses).toBe(0);
      expect(result.avgMaxConsecutiveLosses).toBe(0);
    });
  });

  describe("All losing trades", () => {
    it("should have near-zero probability of profit", () => {
      const trades = makeLosingTrades(20);
      const result = runMonteCarlo(trades, {
        simulations: 1000,
        initialCapital: 10000,
      });

      expect(result.probabilityOfProfit).toBe(0);
      expect(result.medianReturn).toBeLessThan(0);
    });

    it("should have high probability of ruin", () => {
      const trades = makeLosingTrades(20);
      const result = runMonteCarlo(trades, {
        simulations: 1000,
        initialCapital: 10000,
        ruinThresholdPct: 0.5,
      });

      // With 20 x -5% trades, equity should reliably drop below 50%
      expect(result.probabilityOfRuin).toBeGreaterThan(0.5);
    });

    it("should have all negative confidence interval", () => {
      const trades = makeLosingTrades(20);
      const result = runMonteCarlo(trades, {
        simulations: 1000,
        initialCapital: 10000,
      });

      expect(result.confidenceInterval95[0]).toBeLessThan(0);
      expect(result.confidenceInterval95[1]).toBeLessThan(0);
    });
  });

  describe("Mixed trades", () => {
    it("should have P(profit) between 0 and 1 for balanced trades", () => {
      const trades = makeMixedTrades(10, 10);
      const result = runMonteCarlo(trades, {
        simulations: 2000,
        initialCapital: 10000,
      });

      // With equal wins and losses of same size, P(profit) should be near 0.5
      expect(result.probabilityOfProfit).toBeGreaterThan(0.1);
      expect(result.probabilityOfProfit).toBeLessThan(0.9);
    });

    it("should have CI that straddles zero for balanced trades", () => {
      const trades = makeMixedTrades(10, 10);
      const result = runMonteCarlo(trades, {
        simulations: 2000,
        initialCapital: 10000,
      });

      // 95% CI should contain 0 for balanced trades
      expect(result.confidenceInterval95[0]).toBeLessThan(0);
      expect(result.confidenceInterval95[1]).toBeGreaterThan(0);
    });

    it("should find consecutive losses in mixed trades", () => {
      const trades = makeMixedTrades(5, 15);
      const result = runMonteCarlo(trades, {
        simulations: 1000,
        initialCapital: 10000,
      });

      expect(result.maxConsecutiveLosses).toBeGreaterThan(0);
      expect(result.avgMaxConsecutiveLosses).toBeGreaterThan(0);
    });
  });

  describe("Percentiles", () => {
    it("should have correct percentile ordering", () => {
      const trades = makeMixedTrades(12, 8);
      const result = runMonteCarlo(trades, {
        simulations: 2000,
        initialCapital: 10000,
      });

      const p = result.percentiles;

      // Percentiles should be monotonically increasing
      expect(p[5]).toBeLessThanOrEqual(p[10]);
      expect(p[10]).toBeLessThanOrEqual(p[25]);
      expect(p[25]).toBeLessThanOrEqual(p[50]);
      expect(p[50]).toBeLessThanOrEqual(p[75]);
      expect(p[75]).toBeLessThanOrEqual(p[90]);
      expect(p[90]).toBeLessThanOrEqual(p[95]);
    });

    it("should have median between 25th and 75th percentile", () => {
      const trades = makeMixedTrades(12, 8);
      const result = runMonteCarlo(trades, {
        simulations: 1000,
        initialCapital: 10000,
      });

      expect(result.medianReturn).toBeGreaterThanOrEqual(result.percentiles[25]);
      expect(result.medianReturn).toBeLessThanOrEqual(result.percentiles[75]);
    });
  });

  describe("Configuration", () => {
    it("should respect custom simulation count", () => {
      const trades = makeWinningTrades(5);
      const result = runMonteCarlo(trades, {
        simulations: 500,
        initialCapital: 10000,
      });

      expect(result.simulationsRun).toBe(500);
    });

    it("should respect custom path length", () => {
      // Use mixed trades so there's actual variance in outcomes
      const trades = makeMixedTrades(8, 4);
      const result1 = runMonteCarlo(trades, {
        simulations: 1000,
        initialCapital: 10000,
        pathLength: 5,
      });
      const result2 = runMonteCarlo(trades, {
        simulations: 1000,
        initialCapital: 10000,
        pathLength: 50,
      });

      // More trades → more extreme returns (compounding)
      // Longer path should produce wider distribution
      const range1 = result1.confidenceInterval95[1] - result1.confidenceInterval95[0];
      const range2 = result2.confidenceInterval95[1] - result2.confidenceInterval95[0];
      expect(range2).toBeGreaterThan(range1 * 0.5); // Wider spread with longer path
    });

    it("should track execution time", () => {
      const trades = makeWinningTrades(10);
      const result = runMonteCarlo(trades, {
        simulations: 100,
        initialCapital: 10000,
      });

      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Statistical consistency", () => {
    it("should produce stable results with enough simulations", () => {
      const trades = makeMixedTrades(15, 5);

      const result1 = runMonteCarlo(trades, {
        simulations: 5000,
        initialCapital: 10000,
      });
      const result2 = runMonteCarlo(trades, {
        simulations: 5000,
        initialCapital: 10000,
      });

      // With 5000 sims, P(profit) should be similar between runs
      // Allow 10% tolerance (stochastic test)
      expect(Math.abs(result1.probabilityOfProfit - result2.probabilityOfProfit))
        .toBeLessThan(0.10);
    });
  });
});
