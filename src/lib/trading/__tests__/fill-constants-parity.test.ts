/**
 * Fill-constants parity test (C5 parity test plan, Task 1).
 *
 * Ensures all trading modes share the same canonical fill/fee/slippage constants
 * from FILL_CONSTANTS in canonical/execution/fill-constants.ts.
 */

import { describe, it, expect } from "vitest";
import { FILL_CONSTANTS } from "../canonical/execution/fill-constants";
import { PAPER_PARAMS } from "../paper-executor";
import { ESTIMATED_FILL_PARAMS } from "../core/execute-trade";
import {
  FEE_RATE,
  MARKET_SLIPPAGE_RATE,
  MIN_ORDER_VALUE_USDT,
} from "../backtestEngine";

describe("fill constants parity", () => {
  it("paper params match canonical FILL_CONSTANTS", () => {
    expect(PAPER_PARAMS).toEqual(FILL_CONSTANTS);
  });

  it("estimated fill params match canonical FILL_CONSTANTS", () => {
    expect(ESTIMATED_FILL_PARAMS).toEqual(FILL_CONSTANTS);
  });

  it("backtest engine constants match canonical FILL_CONSTANTS", () => {
    expect({
      feeRate: FEE_RATE,
      marketSlippageRate: MARKET_SLIPPAGE_RATE,
      minOrderValue: MIN_ORDER_VALUE_USDT,
    }).toEqual(FILL_CONSTANTS);
  });

  it("all three sources are strictly identical to FILL_CONSTANTS", () => {
    const expectedKeys = Object.keys(FILL_CONSTANTS).sort();
    expect(Object.keys(PAPER_PARAMS).sort()).toEqual(expectedKeys);
    expect(Object.keys(ESTIMATED_FILL_PARAMS).sort()).toEqual(expectedKeys);
    expect([FEE_RATE, MARKET_SLIPPAGE_RATE, MIN_ORDER_VALUE_USDT].sort()).toEqual(
      [FILL_CONSTANTS.feeRate, FILL_CONSTANTS.marketSlippageRate, FILL_CONSTANTS.minOrderValue].sort(),
    );
  });
});
