import { describe, it, expect } from "vitest";
import { allocateCapital, validateAllocations } from "../allocator";

describe("allocateCapital (Task B2 — autopilot allocation engine)", () => {
  it("mikro-konto (<50 USDC) → 1-par BTC-only", () => {
    const a = allocateCapital(30);
    expect(a).toHaveLength(1);
    expect(a[0].pair).toBe("XBTUSDC");
    expect(a[0].capitalUsdc).toBe(30);
  });

  it("basis-konto (50-250 USDC) → 3 par: BTC/ETH/SOL", () => {
    const a = allocateCapital(150);
    expect(a).toHaveLength(3);
    expect(a.map((x) => x.pair)).toEqual(["XBTUSDC", "ETHUSDC", "SOLUSDC"]);
    // BTC skal ha størst andel (edge-vekt 10 vs 9+6=15 → 10/25=40%)
    const btc = a[0].capitalUsdc;
    const eth = a[1].capitalUsdc;
    const sol = a[2].capitalUsdc;
    expect(btc).toBeCloseTo(150 * (10 / 25), 0); // 60
    expect(eth).toBeCloseTo(150 * (9 / 25), 0); // 54
    expect(sol).toBeCloseTo(150 * (6 / 25), 0); // 36
  });

  it("fullt univers (≥250 USDC) → 5 par: BTC/ETH/SOL/ADA/DOT", () => {
    const a = allocateCapital(300);
    expect(a).toHaveLength(5);
    expect(a.map((x) => x.pair)).toEqual([
      "XBTUSDC", "ETHUSDC", "SOLUSDC", "ADAUSDC", "DOTUSDC",
    ]);
    // Alle ≥ 8 USDC (minimum)
    for (const x of a) {
      expect(x.capitalUsdc).toBeGreaterThanOrEqual(8);
    }
  });

  it("edge-vekter gir BTC mest kapital", () => {
    // Uansett beløp: BTC skal ha høyest allokering
    for (const equity of [100, 200, 500]) {
      const a = allocateCapital(equity);
      const btc = a.find((x: { pair: string }) => x.pair === "XBTUSDC")!;
      const eth = a.find((x: { pair: string }) => x.pair === "ETHUSDC");
      if (eth) {
        expect(btc.capitalUsdc).toBeGreaterThan(eth.capitalUsdc);
      }
    }
  });

  it("summen av allokeringer ≈ total equity", () => {
    for (const equity of [30, 150, 300, 1000]) {
      const a = allocateCapital(equity);
      const sum = a.reduce((s: number, x: { capitalUsdc: number }) => s + x.capitalUsdc, 0);
      expect(sum).toBeLessThanOrEqual(equity + 1); // avrundingstoleranse
      expect(sum).toBeGreaterThanOrEqual(equity - 2); // avrundingstoleranse
    }
  });
});

describe("validateAllocations", () => {
  it("godkjenner gyldig allokering", () => {
    const a = allocateCapital(300);
    expect(validateAllocations(a, 300)).toEqual({ valid: true });
  });

  it("avviser hvis et par får for lite", () => {
    const result = validateAllocations(
      [{ pair: "SOLUSDC", capitalUsdc: 5 }],
      50,
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("8 USDC");
    }
  });

  it("avviser hvis summen overstiger total (utenfor toleranse)", () => {
    const result = validateAllocations(
      [
        { pair: "XBTUSDC", capitalUsdc: 80 },
        { pair: "ETHUSDC", capitalUsdc: 80 },
      ],
      100,
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("160");
    }
  });
});
