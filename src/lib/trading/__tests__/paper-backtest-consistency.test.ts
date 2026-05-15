import { describe, it, expect } from "vitest";
import { calculatePaperTradeStats } from "../paper-trade-simulator";
import type { PaperTrade } from "../paper-trade-simulator";

describe("Paper vs Backtest Metric Consistency", () => {
  const createTrades = (): PaperTrade[] => [
    {
      id: "t1",
      symbol: "BTCUSDT",
      side: "buy",
      quantity: 0.1,
      entryPrice: 50000,
      exitPrice: 55000,
      stopLoss: 48000,
      takeProfit: 60000,
      entryFee: 5,
      exitFee: 5.5,
      slippageCost: 2,
      pnl: 487.5,
      pnlPercent: 9.75,
      openedAt: new Date("2026-01-01"),
      closedAt: new Date("2026-01-02"),
      status: "closed",
    },
    {
      id: "t2",
      symbol: "BTCUSDT",
      side: "buy",
      quantity: 0.1,
      entryPrice: 55000,
      exitPrice: 52000,
      stopLoss: 50000,
      takeProfit: 60000,
      entryFee: 5.5,
      exitFee: 5.2,
      slippageCost: 2,
      pnl: -312.7,
      pnlPercent: -5.69,
      openedAt: new Date("2026-01-03"),
      closedAt: new Date("2026-01-04"),
      status: "closed",
    },
    {
      id: "t3",
      symbol: "BTCUSDT",
      side: "buy",
      quantity: 0.1,
      entryPrice: 52000,
      exitPrice: 58000,
      stopLoss: 50000,
      takeProfit: 60000,
      entryFee: 5.2,
      exitFee: 5.8,
      slippageCost: 2,
      pnl: 586.8,
      pnlPercent: 11.28,
      openedAt: new Date("2026-01-05"),
      closedAt: new Date("2026-01-06"),
      status: "closed",
    },
  ];

  it("winRate is on 0-100 scale (not 0-1)", () => {
    const stats = calculatePaperTradeStats(createTrades(), 100000);
    expect(stats.winRate).toBeGreaterThan(1); // Should be 66.67, not 0.6667
    expect(stats.winRate).toBeCloseTo(66.67, 1);
  });

  it("totalPnlPercent is calculated from starting balance", () => {
    const stats = calculatePaperTradeStats(createTrades(), 100000);
    // totalPnl = 487.5 - 312.7 + 586.8 = 761.6
    // totalPnlPercent = (761.6 / 100000) * 100 = 0.7616%
    expect(stats.totalPnl).toBeCloseTo(761.6, 1);
    expect(stats.totalPnlPercent).toBeCloseTo(0.7616, 2);
  });

  it("maxDrawdownPercent is calculated from starting balance", () => {
    const stats = calculatePaperTradeStats(createTrades(), 100000);
    // Running PnL: +487.5, +174.8, +761.6
    // Peak after t1: 487.5, then t2 drops to 174.8 → drawdown = 312.7
    // Peak after t3: 761.6 (no drawdown)
    // maxDrawdownPercent = (312.7 / 100000) * 100 = 0.3127%
    expect(stats.maxDrawdownPercent).toBeGreaterThan(0);
    expect(stats.maxDrawdownPercent).toBeCloseTo(0.3127, 2);
  });

  it("uses provided starting balance (not hardcoded 100k)", () => {
    const stats50k = calculatePaperTradeStats(createTrades(), 50000);
    const stats200k = calculatePaperTradeStats(createTrades(), 200000);

    // Same absolute PnL
    expect(stats50k.totalPnl).toBe(stats200k.totalPnl);

    // Different percentages (2x and 0.5x)
    expect(stats50k.totalPnlPercent).toBeCloseTo(stats200k.totalPnlPercent * 4, 2);
    expect(stats50k.maxDrawdownPercent).toBeCloseTo(stats200k.maxDrawdownPercent * 4, 2);
  });

  it("falls back to 100000 when starting balance is 0 or negative", () => {
    const stats = calculatePaperTradeStats(createTrades(), 0);
    expect(stats.totalPnlPercent).toBeCloseTo(0.7616, 2);
  });
});
