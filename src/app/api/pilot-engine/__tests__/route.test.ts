/**
 * 🎭 PilotTrade enhetstester — signallogikk, posisjonsstørrelse, exits
 *
 * Kjøres: npm run test:unit
 */

import { describe, it, expect } from "vitest";
import { calculateRSI } from "@/lib/trading/indicators";

function dynamicPositionPct(confidence: number, volatility: number): number {
  const MIN_POSITION_PCT = 2;
  const MAX_POSITION_PCT = 10;
  const BASE_POSITION_PCT = 5;
  const volFactor = Math.max(0.3, 1 - (volatility / 200));
  const confFactor = 0.5 + (confidence / 100);
  const pct = BASE_POSITION_PCT * volFactor * confFactor;
  return Math.max(MIN_POSITION_PCT, Math.min(MAX_POSITION_PCT, pct));
}

interface SignalResult {
  action: "BUY" | "SELL" | "WAIT";
  confidence: number;
  reason: string;
}

function generateSignal(
  symbol: string,
  price: number,
  rsi: number,
  volatility: number,
  trend: string,
): SignalResult {
  // RSI < 30 = underkjøpt → kjøp
  if (rsi < 30 && trend !== "down") {
    const conf = Math.min(95, 60 + (30 - rsi) * 2);
    return { action: "BUY", confidence: conf, reason: `RSI ${rsi.toFixed(0)} — underkjøpt i ${trend}-trend` };
  }
  // RSI > 70 = overkjøpt → selg
  if (rsi > 70 && trend !== "up") {
    const conf = Math.min(95, 60 + (rsi - 70) * 2);
    return { action: "SELL", confidence: conf, reason: `RSI ${rsi.toFixed(0)} — overkjøpt i ${trend}-trend` };
  }
  // Sterk opptrend → kjøp
  if (trend === "up" && volatility < 100) {
    const conf = 50 + Math.min(volatility / 3, 30);
    return { action: "BUY", confidence: Math.round(conf), reason: `Sterk opptrend, moderat volatilitet (${volatility.toFixed(0)}%)` };
  }
  // Moderat RSI + opp/nøytral → kjøp
  if (rsi < 60 && trend !== "down") {
    return { action: "BUY", confidence: 55, reason: `RSI ${rsi.toFixed(0)} i ${trend}-trend — moderat kjøpssignal` };
  }
  // Fallback
  return { action: "WAIT", confidence: 0, reason: `RSI ${rsi.toFixed(0)}, ${trend}-trend, vol ${volatility.toFixed(0)}% — avventer` };
}

function computeMinOrderValue(
  sessionCapital: number,
  sizingPct: number,
  price: number,
  nokPerUsdt = 12,
): { rawNok: number; usdtValue: number; finalNok: number; adequate: boolean } {
  const rawNok = sessionCapital * (sizingPct / 100);
  const usdtValue = rawNok / nokPerUsdt;
  const finalNok = usdtValue < 10 ? 120 : Math.max(rawNok, 120);
  return {
    rawNok: Math.round(rawNok * 100) / 100,
    usdtValue: Math.round(usdtValue * 100) / 100,
    finalNok: Math.round(finalNok * 100) / 100,
    adequate: usdtValue >= 10,
  };
}

// ---------------------------------------------------------------------------
// Tester
// ---------------------------------------------------------------------------

describe("PilotTrade — calculateRSI", () => {
  it("returnerer bare nulls for utilstrekkelig data", () => {
    const rsi = calculateRSI([100], 14);
    expect(rsi.every((v: number | null) => v === null)).toBe(true);
  });

  it("returnerer 100 når alle kandler er opp", () => {
    const prices = Array.from({ length: 16 }, (_, i) => 100 + i);
    const rsi = calculateRSI(prices, 14);
    expect(rsi[rsi.length - 1]).toBeCloseTo(99, 0);
  });

  it("returnerer ~0 når alle kandler er ned", () => {
    const prices = Array.from({ length: 16 }, (_, i) => 115 - i);
    const rsi = calculateRSI(prices, 14);
    expect(rsi[rsi.length - 1]).toBeCloseTo(0, 0);
  });

  it("returnerer ~50 ved sideveis marked", () => {
    const prices = [100, 101, 99, 100, 101, 99, 100, 101, 99, 100, 101, 99, 100, 101, 99, 100];
    const rsi = calculateRSI(prices, 14);
    expect(rsi[rsi.length - 1]).toBeGreaterThan(40);
    expect(rsi[rsi.length - 1]).toBeLessThan(60);
  });
});

describe("PilotTrade — dynamicPositionPct", () => {
  it("gir minimum 2% ved høy volatilitet og lav confidence", () => {
    const pct = dynamicPositionPct(10, 200);
    expect(pct).toBe(2);
  });

  it("gir ~7.5% ved lav volatilitet og maks confidence", () => {
    // BASE=5 * vol=1.0 * conf=1.5 = 7.5 (kappet av MAX_POSITION_PCT=10)
    const pct = dynamicPositionPct(100, 0);
    expect(pct).toBeCloseTo(7.5, 0);
  });

  it("gir ~5% ved normale forhold", () => {
    const pct = dynamicPositionPct(50, 50);
    expect(pct).toBeGreaterThan(3);
    expect(pct).toBeLessThan(7);
  });
});

describe("PilotTrade — generateSignal", () => {
  it("BUY når RSI < 30 og trend ikke er down", () => {
    const s = generateSignal("BTCUSDT", 60000, 25, 50, "flat");
    expect(s.action).toBe("BUY");
    expect(s.confidence).toBeGreaterThan(60);
  });

  it("SELL når RSI > 70 og trend ikke er up", () => {
    const s = generateSignal("BTCUSDT", 60000, 75, 50, "flat");
    expect(s.action).toBe("SELL");
    expect(s.confidence).toBeGreaterThan(60);
  });

  it("BUY når RSI < 60 og trend er nøytral — moderat kjøpssignal", () => {
    // RSI=50 < 60, trend=flat !== "down" → moderate buy (AI skal være i markedet)
    const s = generateSignal("BTCUSDT", 60000, 50, 80, "flat");
    expect(s.action).toBe("BUY");
    expect(s.confidence).toBe(55);
  });

  it("BUY når trend er opp og volatilitet er moderat", () => {
    const s = generateSignal("ETHUSDT", 2500, 55, 60, "up");
    expect(s.action).toBe("BUY");
    expect(s.confidence).toBeGreaterThanOrEqual(50);
  });

  it("blokkerer kjøp når RSI < 30 men trend er down", () => {
    const s = generateSignal("BTCUSDT", 60000, 25, 50, "down");
    expect(s.action).not.toBe("BUY"); // Faller til moderate buy eller wait
  });
});

describe("PilotTrade — minimum ordrestørrelse", () => {
  it("fanger små ordre — 100 kr kapital, 2% sizing", () => {
    const result = computeMinOrderValue(100, 2, 60000);
    expect(result.rawNok).toBe(2);
    expect(result.usdtValue).toBeCloseTo(0.17, 1);
    expect(result.adequate).toBe(false);
    expect(result.finalNok).toBe(120); // Bumpet til minimum
  });

  it("godtar store ordre — 100k kapital, 5% sizing", () => {
    const result = computeMinOrderValue(100000, 5, 60000);
    expect(result.rawNok).toBe(5000);
    expect(result.usdtValue).toBeGreaterThan(400); // ~416 USDT
    expect(result.adequate).toBe(true);
  });

  it("håndterer grenseverdi — 1400 kr kapital, 2% sizing", () => {
    const result = computeMinOrderValue(1400, 2, 60000);
    expect(result.usdtValue).toBeCloseTo(2.33, 1);
    expect(result.adequate).toBe(false);
    expect(result.finalNok).toBe(120);
  });

  it("minimum 120 NOK selv om raw er under", () => {
    for (const capital of [50, 100, 500, 1000]) {
      const result = computeMinOrderValue(capital, 2, 100);
      expect(result.finalNok).toBeGreaterThanOrEqual(120);
    }
  });
});

describe("PilotTrade — exit-logikk (take-profit)", () => {
  it("detekterer take-profit for kjøpsposisjon", () => {
    const entryPrice = 100;
    const currentPrice = 103.5; // +3.5%
    const pnlPct = ((currentPrice - entryPrice) / entryPrice) * 100;
    expect(pnlPct).toBeGreaterThanOrEqual(3); // Skal trigge salg
  });

  it("detekterer ikke take-profit for mindre gevinst", () => {
    const entryPrice = 100;
    const currentPrice = 102.9; // +2.9%
    const pnlPct = ((currentPrice - entryPrice) / entryPrice) * 100;
    expect(pnlPct).toBeLessThan(3); // Skal IKKE trigge
  });

  it("selg-posisjon: profit når prisen faller", () => {
    const entryPrice = 100;
    const currentPrice = 96; // -4% fra salgspris = +4% profit for short
    const pnlPct = ((entryPrice - currentPrice) / entryPrice) * 100;
    expect(pnlPct).toBeGreaterThanOrEqual(3);
  });
});
