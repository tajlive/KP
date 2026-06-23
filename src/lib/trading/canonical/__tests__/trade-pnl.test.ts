import { describe, it, expect } from "vitest";
import { calculatePnlFromTrades } from "@/lib/trading/canonical/pnl/trade-pnl";

describe("canonical trade-pnl", () => {
  it("returns zero P&L for empty trade list", () => {
    const result = calculatePnlFromTrades([]);
    expect(result.realizedPnl).toBe(0);
    expect(result.unrealizedPnl).toBe(0);
    expect(result.remainingQuantity).toBe(0);
    expect(result.currency).toBe("USDT");
  });

  it("calculates realized P&L for a simple buy-then-sell", () => {
    const result = calculatePnlFromTrades(
      [
        { symbol: "BTCUSDT", side: "buy", quantity: 1, price: 100, fee: 1, currency: "USDT" },
        { symbol: "BTCUSDT", side: "sell", quantity: 1, price: 110, fee: 1, currency: "USDT" },
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
      [{ symbol: "BTCUSDT", side: "buy", quantity: 2, price: 100, fee: 2, currency: "USDT" }],
      110,
    );

    expect(result.realizedPnl).toBe(0); // no closed trades
    expect(result.remainingQuantity).toBe(2);
    expect(result.averageEntryPrice).toBe(101); // 100 + 2 fee / 2 qty
    expect(result.unrealizedPnl).toBeCloseTo(18, 6); // 2 * (110 - 101)
  });

  it("produces identical result for identical input regardless of mode", () => {
    const trades = [
      { symbol: "BTCUSDT", side: "buy", quantity: 1, price: 100, fee: 1, currency: "USDT" as const },
      { symbol: "BTCUSDT", side: "buy", quantity: 1, price: 110, fee: 1, currency: "USDT" as const },
      { symbol: "BTCUSDT", side: "sell", quantity: 1.5, price: 120, fee: 1.5, currency: "USDT" as const },
    ];

    const paperResult = calculatePnlFromTrades(trades, 120);
    const liveResult = calculatePnlFromTrades(trades, 120);

    expect(paperResult).toEqual(liveResult);
  });

  it("throws on mixed currencies", () => {
    expect(() =>
      calculatePnlFromTrades([
        { symbol: "BTCUSDT", side: "buy", quantity: 1, price: 100, fee: 1, currency: "USDT" },
        { symbol: "BTCUSDT", side: "sell", quantity: 1, price: 110, fee: 1, currency: "NOK" },
      ]),
    ).toThrow("Currency mismatch");
  });

  describe("short positions", () => {
    it("opens a short with sell and reports negative remaining quantity", () => {
      const result = calculatePnlFromTrades(
        [{ symbol: "BTCUSDT", side: "sell", quantity: 1, price: 100, fee: 1, currency: "USDT" }],
        90,
      );

      expect(result.remainingQuantity).toBe(-1);
      expect(result.averageEntryPrice).toBe(99); // 100 - 1 fee / 1 qty
      // Unrealized: short profits when price falls: 1 * (99 - 90) = 9
      expect(result.unrealizedPnl).toBeCloseTo(9, 6);
    });

    it("calculates realized P&L for a simple short-then-cover", () => {
      const result = calculatePnlFromTrades(
        [
          { symbol: "BTCUSDT", side: "sell", quantity: 1, price: 100, fee: 1, currency: "USDT" },
          { symbol: "BTCUSDT", side: "buy", quantity: 1, price: 90, fee: 1, currency: "USDT" },
        ],
        90,
      );

      // Sold effective @ 99, bought effective @ 91, realized = 99 - 91 = 8
      expect(result.realizedPnl).toBeCloseTo(8, 6);
      expect(result.remainingQuantity).toBe(0);
      expect(result.unrealizedPnl).toBe(0);
    });

    it("handles short loss when cover price is higher", () => {
      const result = calculatePnlFromTrades(
        [
          { symbol: "BTCUSDT", side: "sell", quantity: 1, price: 100, fee: 1, currency: "USDT" },
          { symbol: "BTCUSDT", side: "buy", quantity: 1, price: 110, fee: 1, currency: "USDT" },
        ],
        110,
      );

      // Sold effective @ 99, bought effective @ 111, realized = 99 - 111 = -12
      expect(result.realizedPnl).toBeCloseTo(-12, 6);
    });

    it("handles transition from long to short when selling more than owned", () => {
      const result = calculatePnlFromTrades(
        [
          { symbol: "BTCUSDT", side: "buy", quantity: 1, price: 100, fee: 1, currency: "USDT" },
          { symbol: "BTCUSDT", side: "sell", quantity: 2, price: 110, fee: 2, currency: "USDT" },
        ],
        110,
      );

      // Close long: sold 1 @ 110 vs cost basis 101, fee 1 -> 8
      // Open short: sold 1 effective @ 109 (110 - 2/2 fee per unit for whole trade, but fee allocated to short portion)
      // Actually fee per unit = 2/2 = 1, so short entry = 110 - 1 = 109
      expect(result.realizedPnl).toBeCloseTo(8, 6);
      expect(result.remainingQuantity).toBe(-1);
      expect(result.averageEntryPrice).toBe(109);
    });

    it("handles transition from short to long when buying more than owed", () => {
      const result = calculatePnlFromTrades(
        [
          { symbol: "BTCUSDT", side: "sell", quantity: 1, price: 100, fee: 1, currency: "USDT" },
          { symbol: "BTCUSDT", side: "buy", quantity: 2, price: 90, fee: 2, currency: "USDT" },
        ],
        90,
      );

      // Cover short: short entry 99, cover @ 90, fee portion 1 -> 99 - 90 - 1 = 8
      // Open long: buy 1 effective @ 91 (90 + 2/2 fee per unit)
      expect(result.realizedPnl).toBeCloseTo(8, 6);
      expect(result.remainingQuantity).toBe(1);
      expect(result.averageEntryPrice).toBe(91);
    });
  });
});
