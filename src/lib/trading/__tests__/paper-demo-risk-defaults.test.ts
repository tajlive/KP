import { describe, it, expect } from "vitest";
import {
  SYMBOL_RISK_PARAMS,
  getSymbolRiskParams,
  type SymbolRiskParams,
} from "../paper-demo-risk-defaults";

describe("SYMBOL_RISK_PARAMS (NY 2026-07-28)", () => {
  it("har alle definerte symbols", () => {
    const symbols = Object.keys(SYMBOL_RISK_PARAMS);
    expect(symbols).toContain("BTCUSDT");
    expect(symbols).toContain("ETHUSDT");
    expect(symbols).toContain("SOLUSDT");
  });

  it("BTCUSDT har maxPositionPct 10", () => {
    expect(SYMBOL_RISK_PARAMS.BTCUSDT.maxPositionPct).toBe(10);
  });

  it("ETHUSDT har stram SL pa 3% og max posisjon 3%", () => {
    const params = SYMBOL_RISK_PARAMS.ETHUSDT;
    expect(params.maxPositionPct).toBe(3);
    expect(params.stopLossPct).toBe(3);
    expect(params.takeProfitPct).toBe(6);
    expect(params.targetRR).toBeCloseTo(2.0);
    expect(params.minSellIntervalMs).toBe(30 * 60 * 1000); // 30 min
  });

  it("SOLUSDT har aggressivt RR=2.5 og liten posisjon", () => {
    const params = SYMBOL_RISK_PARAMS.SOLUSDT;
    expect(params.maxPositionPct).toBe(2);
    expect(params.stopLossPct).toBe(2);
    expect(params.takeProfitPct).toBe(5);
    expect(params.targetRR).toBe(2.5);
    expect(params.minSellIntervalMs).toBe(30 * 60 * 1000);
  });

  it("mindre symbols (DOTUSDT, BNBUSDT) har max 1% posisjon", () => {
    expect(SYMBOL_RISK_PARAMS.DOTUSDT.maxPositionPct).toBe(1);
    expect(SYMBOL_RISK_PARAMS.BNBUSDT.maxPositionPct).toBe(1);
  });

  it("alle symbols har takeProfit > stopLoss (positiv RR)", () => {
    for (const [symbol, params] of Object.entries(SYMBOL_RISK_PARAMS)) {
      expect(params.takeProfitPct).toBeGreaterThan(
        params.stopLossPct,
        `${symbol}: takeProfit (${params.takeProfitPct}) must be > stopLoss (${params.stopLossPct})`
      );
    }
  });

  it("alle symbols har gyldig minSellIntervalMs", () => {
    for (const [symbol, params] of Object.entries(SYMBOL_RISK_PARAMS)) {
      expect(params.minSellIntervalMs).toBeGreaterThanOrEqual(15 * 60 * 1000);
      expect(params.minSellIntervalMs).toBeLessThanOrEqual(60 * 60 * 1000);
    }
  });

  it("alle symbols har maxPositionPct > 0", () => {
    for (const [symbol, params] of Object.entries(SYMBOL_RISK_PARAMS)) {
      expect(params.maxPositionPct).toBeGreaterThan(0);
    }
  });
});

describe("getSymbolRiskParams", () => {
  it("returnerer BTCUSDT params for btcusdt (case-insensitive)", () => {
    const params = getSymbolRiskParams("btcusdt");
    expect(params.maxPositionPct).toBe(10);
  });

  it("returnerer default for ukjent symbol", () => {
    const params = getSymbolRiskParams("XRPUSDT");
    expect(params.maxPositionPct).toBe(5);
    expect(params.takeProfitPct).toBe(5);
    expect(params.stopLossPct).toBe(3);
    expect(params.targetRR).toBeCloseTo(1.67, 1);
    expect(params.minSellIntervalMs).toBe(15 * 60 * 1000);
  });

  it("returnerer ETHUSDT params for ethusdt", () => {
    const params = getSymbolRiskParams("ETHUSDT");
    expect(params.maxPositionPct).toBe(3);
    expect(params.stopLossPct).toBe(3);
  });
});
