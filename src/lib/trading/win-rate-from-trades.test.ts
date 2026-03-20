import { describe, expect, it } from "vitest";
import { winRateFromRealizedTrades } from "./win-rate-from-trades";

describe("winRateFromRealizedTrades", () => {
  it("returns null when no paper trades with realized_pnl", () => {
    expect(winRateFromRealizedTrades([])).toBeNull();
    expect(
      winRateFromRealizedTrades([
        { mode: "paper", realized_pnl: null },
        { mode: "live", realized_pnl: 10 },
      ]),
    ).toBeNull();
  });

  it("computes win % from paper closed trades", () => {
    expect(
      winRateFromRealizedTrades([
        { mode: "paper", realized_pnl: 10 },
        { mode: "paper", realized_pnl: -5 },
        { mode: "paper", realized_pnl: 0 },
      ]),
    ).toBe(33);
  });

  it("ignores non-paper rows", () => {
    expect(
      winRateFromRealizedTrades([
        { mode: "paper", realized_pnl: 1 },
        { mode: "live", realized_pnl: -999 },
      ]),
    ).toBe(100);
  });
});
