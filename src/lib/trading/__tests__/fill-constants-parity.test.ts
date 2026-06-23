/**
 * Fill-constants parity test (C5 parity test plan, Task 1).
 *
 * Ensures the shared fill/fee/slippage constants used by the paper executor,
 * live/tick pre-trade estimator, and backtest engine do not drift.
 */

import { describe, it, expect } from "vitest";
import { PAPER_PARAMS } from "../paper-executor";
import { ESTIMATED_FILL_PARAMS } from "../core/execute-trade";
import {
  FEE_RATE,
  MARKET_SLIPPAGE_RATE,
  MIN_ORDER_VALUE_USDT,
} from "../backtestEngine";

describe("fill constants parity", () => {
  const backtestFillConstants = {
    feeRate: FEE_RATE,
    marketSlippageRate: MARKET_SLIPPAGE_RATE,
    minOrderValue: MIN_ORDER_VALUE_USDT,
  };

  it("paper params equal estimated fill params", () => {
    expect(PAPER_PARAMS).toEqual(ESTIMATED_FILL_PARAMS);
  });

  it("paper params equal backtest fill constants", () => {
    expect(PAPER_PARAMS).toEqual(backtestFillConstants);
  });

  it("estimated fill params equal backtest fill constants", () => {
    expect(ESTIMATED_FILL_PARAMS).toEqual(backtestFillConstants);
  });

  it("all three constant objects share the exact same key set", () => {
    const expectedKeys = Object.keys(backtestFillConstants).sort();
    expect(Object.keys(PAPER_PARAMS).sort()).toEqual(expectedKeys);
    expect(Object.keys(ESTIMATED_FILL_PARAMS).sort()).toEqual(expectedKeys);
  });
});
