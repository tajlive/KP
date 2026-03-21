import { describe, expect, it } from "vitest";
import { aggregateTradeHistoryStats } from "./trade-history-aggregates";

describe("aggregateTradeHistoryStats", () => {
  it("teller vinn, tap og manglende P&L", () => {
    const a = aggregateTradeHistoryStats([
      { realized_pnl: 100 },
      { realized_pnl: -50 },
      { realized_pnl: null },
      { realized_pnl: 0 },
    ]);
    expect(a.rowCount).toBe(4);
    expect(a.winCount).toBe(1);
    expect(a.lossCount).toBe(1);
    expect(a.breakevenCount).toBe(1);
    expect(a.noRealizedPnlCount).toBe(1);
    expect(a.totalRealizedPnl).toBe(50);
    expect(a.winRateRealizedPct).toBe(33); // 1/3
  });

  it("kun egne rader — bevis at aggregering er per liste (bruker filtrert liste fra UI)", () => {
    const mine = aggregateTradeHistoryStats([
      { realized_pnl: 10 },
      { realized_pnl: -5 },
    ]);
    expect(mine.rowCount).toBe(2);
    expect(mine.winRateRealizedPct).toBe(50);
  });
});
