/**
 * Tester for kanonisk fill-modell.
 *
 * Verifiserer at fill-beregningen er deterministisk og modus-uavhengig;
 * adapterene står for modusspesifikke parametere.
 */

import { describe, it, expect } from "vitest";
import { computeFill } from "@/lib/trading/canonical/execution/fill-model";

describe("canonical fill-model", () => {
  it("fills a market buy at market price with slippage and fee", () => {
    const result = computeFill({
      side: "buy",
      quantity: 1,
      orderType: "market",
      marketPrice: 100,
      feeRate: 0.001,
      marketSlippageRate: 0.0005,
      minOrderValue: 10,
      availableCapital: 200,
      quoteCurrency: "USDT",
    });

    expect(result.success).toBe(true);
    expect(result.executedPrice).toBe(100.05); // 100 * 1.0005
    expect(result.executedQuantity).toBe(1);
    expect(result.fee).toBeCloseTo(0.10005, 5); // 100.05 * 0.001
    expect(result.slippagePct).toBe(0.05);
    expect(result.quoteCurrency).toBe("USDT");
  });

  it("fills a market sell with negative slippage", () => {
    const result = computeFill({
      side: "sell",
      quantity: 1,
      orderType: "market",
      marketPrice: 100,
      feeRate: 0.001,
      marketSlippageRate: 0.0005,
      minOrderValue: 10,
      quoteCurrency: "USDT",
    });

    expect(result.success).toBe(true);
    expect(result.executedPrice).toBe(99.95); // 100 * 0.9995
  });

  it("fills a buy limit when limit >= market", () => {
    const result = computeFill({
      side: "buy",
      quantity: 1,
      orderType: "limit",
      limitPrice: 105,
      marketPrice: 100,
      feeRate: 0.001,
      marketSlippageRate: 0,
      minOrderValue: 10,
      availableCapital: 200,
      quoteCurrency: "USDT",
    });

    expect(result.success).toBe(true);
    expect(result.executedPrice).toBe(105);
    expect(result.slippagePct).toBe(0);
  });

  it("rejects a buy limit below market", () => {
    const result = computeFill({
      side: "buy",
      quantity: 1,
      orderType: "limit",
      limitPrice: 95,
      marketPrice: 100,
      feeRate: 0.001,
      marketSlippageRate: 0,
      minOrderValue: 10,
      availableCapital: 200,
      quoteCurrency: "USDT",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Limit price not reachable");
  });

  it("rejects a sell limit above market", () => {
    const result = computeFill({
      side: "sell",
      quantity: 1,
      orderType: "limit",
      limitPrice: 105,
      marketPrice: 100,
      feeRate: 0.001,
      marketSlippageRate: 0,
      minOrderValue: 10,
      quoteCurrency: "USDT",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Limit price not reachable");
  });

  it("rejects buy with insufficient capital", () => {
    const result = computeFill({
      side: "buy",
      quantity: 2,
      orderType: "market",
      marketPrice: 100,
      feeRate: 0,
      marketSlippageRate: 0,
      minOrderValue: 10,
      availableCapital: 150, // trenger 200
      quoteCurrency: "USDT",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Insufficient capital");
  });

  it("rejects order below minimum value", () => {
    const result = computeFill({
      side: "buy",
      quantity: 0.01,
      orderType: "market",
      marketPrice: 100,
      feeRate: 0.001,
      marketSlippageRate: 0.0005,
      minOrderValue: 10,
      availableCapital: 200,
      quoteCurrency: "USDT",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("below minimum");
  });

  it("produces identical pre-execution output for same inputs regardless of caller", () => {
    const params = {
      side: "buy" as const,
      quantity: 0.5,
      orderType: "market" as const,
      marketPrice: 200,
      feeRate: 0.001,
      marketSlippageRate: 0.0005,
      minOrderValue: 10,
      availableCapital: 500,
      quoteCurrency: "USDT" as const,
    };

    const r1 = computeFill(params);
    const r2 = computeFill(params);
    expect(r1).toEqual(r2);
  });

  it("rejects invalid quote currency", () => {
    const result = computeFill({
      side: "buy",
      quantity: 1,
      orderType: "market",
      marketPrice: 100,
      feeRate: 0.001,
      marketSlippageRate: 0.0005,
      minOrderValue: 10,
      availableCapital: 200,
      quoteCurrency: "EUR" as any,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid or missing quote currency");
  });
});
