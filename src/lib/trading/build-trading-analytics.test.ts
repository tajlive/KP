import { describe, expect, it } from "vitest";
import { buildTradingAnalytics } from "./build-trading-analytics";

describe("buildTradingAnalytics", () => {
  it("computes cumulative P&L in chronological order", () => {
    const payload = buildTradingAnalytics(
      [
        {
          id: "1",
          trading_pair: "BTCUSDT",
          side: "buy",
          realized_pnl: 10,
          mode: "paper",
          created_at: "2026-01-01T10:00:00.000Z",
          executed_at: "2026-01-01T10:00:00.000Z",
          total_value: 100,
        },
        {
          id: "2",
          trading_pair: "BTCUSDT",
          side: "sell",
          realized_pnl: -3,
          mode: "paper",
          created_at: "2026-01-02T10:00:00.000Z",
          executed_at: "2026-01-02T10:00:00.000Z",
          total_value: 50,
        },
      ],
      "2026-01-03T00:00:00.000Z",
    );

    expect(payload.tradeCount).toBe(2);
    expect(payload.aggregates.totalRealizedPnl).toBe(7);
    expect(payload.cumulativePnl).toHaveLength(2);
    expect(payload.cumulativePnl[1]?.cumulative).toBe(7);
    expect(payload.dailyPnl).toHaveLength(2);
  });

  it("sorts trades by executed_at when present", () => {
    const payload = buildTradingAnalytics([
      {
        id: "late",
        trading_pair: "ETHUSDT",
        side: "sell",
        realized_pnl: 5,
        mode: "paper",
        created_at: "2026-01-05T12:00:00.000Z",
        executed_at: "2026-01-01T12:00:00.000Z",
        total_value: 1,
      },
      {
        id: "early",
        trading_pair: "ETHUSDT",
        side: "buy",
        realized_pnl: 1,
        mode: "paper",
        created_at: "2026-01-01T08:00:00.000Z",
        executed_at: "2026-01-02T12:00:00.000Z",
        total_value: 1,
      },
    ]);

    expect(payload.cumulativePnl[0]?.cumulative).toBe(5);
    expect(payload.cumulativePnl[1]?.cumulative).toBe(6);
  });
});
