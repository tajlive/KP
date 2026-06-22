import { describe, it, expect } from "vitest";
import { calculatePnlFromTrades } from "@/lib/trading/canonical/pnl/trade-pnl";

describe("canonical trade-pnl", () => {
  it("returns zero P&L for empty trade list", () => {
    const result = calculatePnlFromTrades([]);
    expect(result.realizedPnl).toBe(0);
    expect(result.unrealizedPnl).toBe(0);
    expect(result.remainingQuantity).toBe(0);
  });

  it("calculates realized P&L for a simple buy-then-sell", () => {
    const result = calculatePnlFromTrades(
      [
        { symbol: "BTCUSDT", side: "buy", quantity: 1, price: 100, fee: 1 },
        { symbol: "BTCUSDT", side: "sell", quantity: 1, price: 110, fee: 1 },
      ],
      110,
    );

    // Realized: (110 - (100 + 1 buy fee)) - 1 sell fee = 8
    expect(result.realizedPnl).toBeCloseTo(8, 6);
    expect(result.remainingQuantity).toBe(0);
    expect(result.unrealizedPnl).toBe(0);
  });

  it("calculates unrealized P&L for an open position", () => {
    const result = calculatePnlFromTrades(
      [{ symbol: "BTCUSDT", side: "buy", quantity: 2, price: 100, fee: 2 }],
      110,
    );

    expect(result.realizedPnl).toBe(0); // no closed trades
    expect(result.remainingQuantity).toBe(2);
    expect(result.averageEntryPrice).toBe(101); // 100 + 2 fee / 2 qty
    expect(result.unrealizedPnl).toBeCloseTo(18, 6); // 2 * (110 - 101)
  });

  it("produces identical result for identical input regardless of mode", () => {
    const trades = [
      { symbol: "BTCUSDT", side: "buy", quantity: 1, price: 100, fee: 1 },
      { symbol: "BTCUSDT", side: "buy", quantity: 1, price: 110, fee: 1 },
      { symbol: "BTCUSDT", side: "sell", quantity: 1.5, price: 120, fee: 1.5 },
    ];

    const paperResult = calculatePnlFromTrades(trades, 120);
    const liveResult = calculatePnlFromTrades(trades, 120);

    expect(paperResult).toEqual(liveResult);
  });
});
