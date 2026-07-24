import { describe, expect, it } from "vitest";
import {
  buildTradingAnalytics,
  effectivePnlDelta,
} from "./build-trading-analytics";

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
    expect(payload.aggregates.totalEffectivePnl).toBe(7);
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

  it("effectivePnlDelta uses realized_pnl only; open fills count as 0", () => {
    const base = {
      id: "x",
      trading_pair: "X",
      mode: "paper" as const,
      created_at: "2026-01-01T00:00:00.000Z",
      executed_at: "2026-01-01T00:00:00.000Z",
    };
    // Åpent kjøp er en kontant→aktiva-konvertering, ikke et tap.
    expect(
      effectivePnlDelta({
        ...base,
        side: "buy",
        realized_pnl: null,
        total_value: 100,
      }),
    ).toBe(0);
    expect(
      effectivePnlDelta({
        ...base,
        side: "sell",
        realized_pnl: 7,
        total_value: 999,
      }),
    ).toBe(7);
  });

  it("fills without realized_pnl do not move P/L charts", () => {
    const payload = buildTradingAnalytics([
      {
        id: "a",
        trading_pair: "BTCUSDT",
        side: "buy",
        realized_pnl: null,
        mode: "paper",
        created_at: "2026-03-02T10:00:00.000Z",
        executed_at: "2026-03-02T10:00:00.000Z",
        total_value: 5000,
      },
      {
        id: "b",
        trading_pair: "BTCUSDT",
        side: "sell",
        realized_pnl: null,
        mode: "paper",
        created_at: "2026-03-02T11:00:00.000Z",
        executed_at: "2026-03-02T11:00:00.000Z",
        total_value: 5200,
      },
    ]);

    expect(payload.aggregates.totalRealizedPnl).toBe(0);
    expect(payload.aggregates.noRealizedPnlCount).toBe(2);
    expect(payload.aggregates.totalEffectivePnl).toBe(0);
    expect(payload.cumulativePnl[1]?.cumulative).toBe(0);
    expect(payload.dailyPnl).toEqual([{ day: "2026-03-02", pnl: 0 }]);
    // Uten lukkede handler: ingen vinn/tap/break-even — alt er "ukjent".
    expect(payload.aggregates.effectiveWinCount).toBe(0);
    expect(payload.aggregates.effectiveLossCount).toBe(0);
    expect(payload.aggregates.effectiveBreakevenCount).toBe(0);
    expect(payload.winLossSlices).toEqual([]);
  });
});
