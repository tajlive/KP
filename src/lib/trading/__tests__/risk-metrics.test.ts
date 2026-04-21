/**
 * Tests for Advanced Risk Metrics
 */

import { describe, it, expect } from "vitest";
import {
  calculateSortino,
  calculateAnnualizedSortino,
  calculateCalmar,
  calculateVaR,
  calculateExpectedShortfall,
  calculateMaxConsecutiveLosses,
  calculateMaxConsecutiveWins,
  calculateTimeToRecovery,
  calculateMaxTimeToRecovery,
  calculateGainPainRatio,
  calculateOmega,
  calculateAllRiskMetrics,
} from "../risk-metrics";

describe("Risk Metrics", () => {
  describe("Sortino Ratio", () => {
    it("should return 0 for insufficient data", () => {
      expect(calculateSortino([])).toBe(0);
      expect(calculateSortino([0.01])).toBe(0);
    });

    it("should return Infinity for all positive returns", () => {
      const returns = [0.01, 0.02, 0.015, 0.03, 0.01];
      expect(calculateSortino(returns)).toBe(Infinity);
    });

    it("should handle mixed returns correctly", () => {
      const returns = [0.02, -0.01, 0.03, -0.02, 0.01];
      const sortino = calculateSortino(returns);
      // Mean = (0.02 - 0.01 + 0.03 - 0.02 + 0.01) / 5 = 0.006
      // Downside squares: [0, 0.0001, 0, 0.0004, 0]
      // Mean downside = 0.0001
      // Downside dev = sqrt(0.0001) = 0.01
      // Sortino = 0.006 / 0.01 = 0.6
      expect(sortino).toBeCloseTo(0.6, 1);
    });

    it("should return 0 for all negative returns with high risk-free rate", () => {
      const returns = [-0.01, -0.02, -0.03];
      const sortino = calculateSortino(returns, 0.05);
      expect(sortino).toBeLessThan(0);
    });

    it("annualized Sortino should scale correctly", () => {
      const dailyReturns = Array(100).fill(0.001); // Consistent small gains
      const result = calculateAnnualizedSortino(dailyReturns, 0);
      expect(result).toBe(Infinity); // All positive returns, no downside
    });
  });

  describe("Calmar Ratio", () => {
    it("should calculate correctly", () => {
      // 15% annual return, 20% max drawdown
      expect(calculateCalmar(0.15, 0.20)).toBeCloseTo(0.75, 2);
    });

    it("should return Infinity for zero drawdown with positive return", () => {
      expect(calculateCalmar(0.10, 0)).toBe(Infinity);
    });

    it("should return 0 for zero drawdown with zero return", () => {
      expect(calculateCalmar(0, 0)).toBe(0);
    });

    it("should handle negative returns", () => {
      expect(calculateCalmar(-0.10, 0.20)).toBeCloseTo(-0.5, 2);
    });

    it("should handle negative maxDrawdown (pass as is)", () => {
      // Some systems report drawdown as negative, Calmar should abs() it
      expect(calculateCalmar(0.15, -0.20)).toBeCloseTo(0.75, 2);
    });
  });

  describe("Value at Risk (VaR)", () => {
    it("should return 0 for insufficient data", () => {
      expect(calculateVaR([])).toBe(0);
      expect(calculateVaR([0.01])).toBe(0);
    });

    it("should calculate 95% VaR correctly", () => {
      // 20 returns sorted: index for 5% = floor(0.05 * 20) = 1
      const returns = [
        -0.10, -0.05, -0.03, -0.02, -0.01,
        0.00, 0.01, 0.01, 0.02, 0.02,
        0.03, 0.03, 0.04, 0.04, 0.05,
        0.05, 0.06, 0.07, 0.08, 0.10,
      ];
      const var95 = calculateVaR(returns, 0.95);
      // Index = floor(0.05 * 20) = 1 → sorted[1] = -0.05
      expect(var95).toBe(-0.05);
    });

    it("should calculate 99% VaR correctly", () => {
      const returns = [
        -0.10, -0.05, -0.03, -0.02, -0.01,
        0.00, 0.01, 0.01, 0.02, 0.02,
        0.03, 0.03, 0.04, 0.04, 0.05,
        0.05, 0.06, 0.07, 0.08, 0.10,
      ];
      const var99 = calculateVaR(returns, 0.99);
      // Index = floor(0.01 * 20) = 0 → sorted[0] = -0.10
      expect(var99).toBe(-0.10);
    });

    it("should work with unsorted input", () => {
      const returns = [0.05, -0.10, 0.02, -0.05, 0.03];
      const var95 = calculateVaR(returns, 0.95);
      // sorted: [-0.10, -0.05, 0.02, 0.03, 0.05]
      // index = floor(0.05 * 5) = 0 → -0.10
      expect(var95).toBe(-0.10);
    });
  });

  describe("Expected Shortfall (CVaR)", () => {
    it("should return 0 for insufficient data", () => {
      expect(calculateExpectedShortfall([])).toBe(0);
    });

    it("should be <= VaR (more conservative)", () => {
      const returns = [
        -0.10, -0.05, -0.03, -0.02, -0.01,
        0.00, 0.01, 0.01, 0.02, 0.02,
        0.03, 0.03, 0.04, 0.04, 0.05,
        0.05, 0.06, 0.07, 0.08, 0.10,
      ];
      const var95 = calculateVaR(returns, 0.95);
      const es95 = calculateExpectedShortfall(returns, 0.95);

      // ES should be ≤ VaR (both negative, ES more negative = worse)
      expect(es95).toBeLessThanOrEqual(var95);
    });

    it("should calculate average of tail returns", () => {
      const returns = [
        -0.10, -0.08, -0.03, -0.01,
        0.00, 0.02, 0.04, 0.05, 0.06, 0.10,
      ];
      // sorted: [-0.10, -0.08, -0.03, -0.01, 0.00, 0.02, 0.04, 0.05, 0.06, 0.10]
      // VaR(95%): index = floor(0.05 * 10) = 0 → -0.10
      // ES = avg of [0..1] = avg of [-0.10] = -0.10
      const es = calculateExpectedShortfall(returns, 0.95);
      expect(es).toBeCloseTo(-0.10, 2);
    });
  });

  describe("Max Consecutive Losses", () => {
    it("should return 0 for empty trades", () => {
      expect(calculateMaxConsecutiveLosses([])).toBe(0);
    });

    it("should find longest losing streak", () => {
      const trades = [
        { pnl: 100 },
        { pnl: -50 },
        { pnl: -30 },
        { pnl: -20 },
        { pnl: 80 },
        { pnl: -10 },
      ];
      expect(calculateMaxConsecutiveLosses(trades)).toBe(3);
    });

    it("should return 0 for all winning trades", () => {
      const trades = [{ pnl: 100 }, { pnl: 50 }, { pnl: 30 }];
      expect(calculateMaxConsecutiveLosses(trades)).toBe(0);
    });

    it("should count single loss", () => {
      const trades = [{ pnl: 100 }, { pnl: -50 }, { pnl: 100 }];
      expect(calculateMaxConsecutiveLosses(trades)).toBe(1);
    });
  });

  describe("Max Consecutive Wins", () => {
    it("should find longest winning streak", () => {
      const trades = [
        { pnl: 100 },
        { pnl: 50 },
        { pnl: 30 },
        { pnl: -20 },
        { pnl: 80 },
      ];
      expect(calculateMaxConsecutiveWins(trades)).toBe(3);
    });
  });

  describe("Time to Recovery", () => {
    it("should return 0 for insufficient data", () => {
      expect(calculateTimeToRecovery([])).toBe(0);
      expect(calculateTimeToRecovery([100])).toBe(0);
    });

    it("should return 0 for monotonically increasing equity", () => {
      expect(calculateTimeToRecovery([100, 110, 120, 130])).toBe(0);
    });

    it("should calculate recovery time correctly", () => {
      const equity = [100, 110, 105, 108, 112]; // Drawdown at [2], Recovery at [4]
      // ATH after [0] = 100, [1] = 110
      // Drawdown starts at [2] (105 < 110)
      // Recovery at [4] (112 >= 110)
      // Recovery time = 4 - 2 = 2
      expect(calculateTimeToRecovery(equity)).toBe(2);
    });

    it("should handle multiple drawdowns", () => {
      const equity = [100, 110, 105, 112, 108, 115];
      // Drawdown 1: starts at 2, recovers at 3 → time = 1
      // Drawdown 2: starts at 4, recovers at 5 → time = 1
      // Average = 1
      expect(calculateTimeToRecovery(equity)).toBe(1);
    });

    it("maxTimeToRecovery should return longest drawdown", () => {
      const equity = [100, 110, 105, 112, 108, 106, 107, 115];
      // Drawdown 1: 2→3, time = 1
      // Drawdown 2: 4→7, time = 3
      expect(calculateMaxTimeToRecovery(equity)).toBe(3);
    });
  });

  describe("Gain/Pain Ratio", () => {
    it("should return 0 for empty returns", () => {
      expect(calculateGainPainRatio([])).toBe(0);
    });

    it("should return Infinity for all gains", () => {
      expect(calculateGainPainRatio([0.01, 0.02, 0.03])).toBe(Infinity);
    });

    it("should calculate correctly for mixed returns", () => {
      const returns = [0.10, -0.05, 0.08, -0.03];
      // Gains = 0.10 + 0.08 = 0.18
      // Pain = |(-0.05) + (-0.03)| = 0.08
      // Ratio = 0.18 / 0.08 = 2.25
      expect(calculateGainPainRatio(returns)).toBeCloseTo(2.25, 2);
    });
  });

  describe("Omega Ratio", () => {
    it("should return 0 for empty returns", () => {
      expect(calculateOmega([])).toBe(0);
    });

    it("should calculate at threshold 0", () => {
      const returns = [0.05, -0.02, 0.03, -0.01, 0.04];
      // Gains above 0: 0.05 + 0.03 + 0.04 = 0.12
      // Losses below 0: 0.02 + 0.01 = 0.03
      // Omega = 0.12 / 0.03 = 4.0
      expect(calculateOmega(returns, 0)).toBeCloseTo(4.0, 2);
    });

    it("should return 1 for all returns equal to threshold", () => {
      expect(calculateOmega([0, 0, 0], 0)).toBe(1);
    });

    it("should handle custom threshold", () => {
      const returns = [0.05, 0.02, 0.03, 0.01, 0.04];
      // Threshold = 0.03
      // Gains: (0.05-0.03) + (0.04-0.03) = 0.02 + 0.01 = 0.03
      // Losses: (0.03-0.02) + (0.03-0.01) = 0.01 + 0.02 = 0.03
      // Omega = 0.03 / 0.03 = 1.0
      expect(calculateOmega(returns, 0.03)).toBeCloseTo(1.0, 2);
    });
  });

  describe("calculateAllRiskMetrics (composite)", () => {
    it("should return all metrics without errors", () => {
      const dailyReturns = [0.01, -0.005, 0.015, -0.01, 0.02, -0.003, 0.008];
      const trades = dailyReturns.map((r) => ({ pnl: r * 10000 }));
      const equityCurve = [10000, 10100, 10050, 10200, 10100, 10300, 10270, 10350];

      const result = calculateAllRiskMetrics(
        dailyReturns,
        trades,
        equityCurve,
        0.35,
        0.02,
      );

      expect(result).toHaveProperty("sortinoRatio");
      expect(result).toHaveProperty("calmarRatio");
      expect(result).toHaveProperty("var95");
      expect(result).toHaveProperty("var99");
      expect(result).toHaveProperty("expectedShortfall95");
      expect(result).toHaveProperty("expectedShortfall99");
      expect(result).toHaveProperty("maxConsecutiveLosses");
      expect(result).toHaveProperty("maxConsecutiveWins");
      expect(result).toHaveProperty("avgTimeToRecoveryPeriods");
      expect(result).toHaveProperty("maxTimeToRecoveryPeriods");
      expect(result).toHaveProperty("gainPainRatio");
      expect(result).toHaveProperty("omegaRatio");

      expect(result.calmarRatio).toBeCloseTo(0.35 / 0.02, 1);
    });
  });
});
