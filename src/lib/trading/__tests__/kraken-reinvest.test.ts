import { describe, it, expect } from "vitest";
import { computeReinvest } from "../kraken-reinvest";

describe("computeReinvest (Task B3 — ren reinvesterings-logikk)", () => {
  it("under terskel (10 USDC) → ingen reinvestering", () => {
    expect(computeReinvest(9)).toEqual({
      shouldReinvest: false,
      amount: 0,
      kept: 9,
    });
    expect(computeReinvest(10)).toEqual({
      shouldReinvest: false,
      amount: 0,
      kept: 10,
    });
    expect(computeReinvest(0)).toEqual({
      shouldReinvest: false,
      amount: 0,
      kept: 0,
    });
  });

  it("over terskel — 80% reinvesteres, 20% beholdes", () => {
    const r = computeReinvest(20);
    expect(r.shouldReinvest).toBe(true);
    expect(r.amount).toBeCloseTo(16, 1); // 80% av 20
    expect(r.kept).toBeCloseTo(4, 1);   // 20% av 20
  });

  it("roundes til 2 desimaler", () => {
    const r = computeReinvest(11.11);
    expect(r.amount).toBeCloseTo(8.89, 2);
    expect(r.kept).toBeCloseTo(2.22, 2);
  });

  it("stor gevinst (100+) — 80/20 deling", () => {
    const r = computeReinvest(150);
    expect(r.shouldReinvest).toBe(true);
    expect(r.amount).toBe(120); // 80% av 150
    expect(r.kept).toBe(30);    // 20% beholdes
  });

  it("nøyaktig sum = amount + kept", () => {
    for (const profit of [11, 50, 123.45]) {
      const r = computeReinvest(profit);
      expect(r.amount + r.kept).toBeCloseTo(profit, 4);
    }
  });

  it("negativ profit → ingen reinvestering", () => {
    const r = computeReinvest(-5);
    expect(r.shouldReinvest).toBe(false);
    expect(r.amount).toBe(0);
    expect(r.kept).toBe(-5);
  });
});
