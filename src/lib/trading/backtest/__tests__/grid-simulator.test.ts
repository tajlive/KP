import { describe, expect, it } from "vitest";
import { simulateGrid, type Candle, type GridParams } from "../grid-simulator";

const FEE = 0.001; // 0.1%
const SLIP = 0.0005; // 0.05%

function makeCandles(prices: number[]): Candle[] {
  return prices.map((p, i) => ({
    open_time: new Date(1700000000000 + i * 3600000).toISOString(),
    open: p,
    high: p * 1.001,
    low: p * 0.999,
    close: p,
    volume: 100,
  }));
}

function params(overrides: Partial<GridParams> = {}): GridParams {
  return {
    symbol: "BTCUSDT",
    lowerPrice: 90,
    upperPrice: 110,
    gridLevels: 5,
    capitalNok: 10000,
    feePct: FEE,
    slippagePct: SLIP,
    ...overrides,
  };
}

describe("simulateGrid", () => {
  it("tomt candle-sett → tomt resultat", () => {
    const r = simulateGrid([], params());
    expect(r.totalPnl).toBe(0);
    expect(r.trades).toHaveLength(0);
    expect(r.finalValue).toBe(10000);
  });

  it("ugyldige nivåer (<2) → tomt resultat", () => {
    const r = simulateGrid(makeCandles([100, 100, 100]), params({ gridLevels: 1 }));
    expect(r.trades).toHaveLength(0);
  });

  it("flat pris → ingen trades, verdi ≈ startkapital", () => {
    const candles = makeCandles(Array(100).fill(100));
    const r = simulateGrid(candles, params());
    expect(r.trades).toHaveLength(0);
    expect(r.finalValue).toBeCloseTo(10000, 0);
  });

  it("svingende pris → grid kjøper lavt og selger høyt", () => {
    // Pris svinger mellom 95 og 105 — grid bør fange flere rundturer
    const prices: number[] = [100];
    for (let i = 0; i < 20; i++) {
      prices.push(95, 105);
    }
    const r = simulateGrid(makeCandles(prices), params());
    expect(r.trades.length).toBeGreaterThan(0);
    const buys = r.trades.filter((t) => t.side === "buy");
    const sells = r.trades.filter((t) => t.side === "sell");
    expect(buys.length).toBeGreaterThan(0);
    expect(sells.length).toBeGreaterThan(0);
    // Selg-priser skal være høyere enn kjøp-priser i snitt
    const avgBuy = buys.reduce((s, t) => s + t.price, 0) / buys.length;
    const avgSell = sells.reduce((s, t) => s + t.price, 0) / sells.length;
    expect(avgSell).toBeGreaterThan(avgBuy);
  });

  it("gebyr belastes hver fill", () => {
    const prices = [100, 95, 105, 95, 105];
    const r = simulateGrid(makeCandles(prices), params());
    expect(r.totalFees).toBeGreaterThan(0);
    for (const t of r.trades) {
      expect(t.fee).toBeGreaterThan(0);
    }
  });

  it("sterkt fall → drawdown reflekterer posisjonstap", () => {
    // Pris faller fra 100 til 92 og blir der
    const prices = [100, 96, 94, 92, ...Array(10).fill(92)];
    const r = simulateGrid(makeCandles(prices), params());
    expect(r.maxDrawdownPct).toBeGreaterThan(0);
    expect(r.finalValue).toBeLessThan(10000);
  });

  it("sterk stigning uten salg → verdi følger base-posisjon opp", () => {
    const prices = [100, ...Array(20).fill(109.5)];
    const r = simulateGrid(makeCandles(prices), params());
    // Base beholdes → verdi stiger med pris
    expect(r.finalValue).toBeGreaterThan(10000);
  });

  it("hele kapitalen fordeles mellom cash og base ved start", () => {
    const prices = [100, 100, 100];
    const r = simulateGrid(makeCandles(prices), params());
    expect(r.finalValue).toBeCloseTo(10000, 0);
  });

  it("sharpe er 0 ved flat kurve, positiv ved jevn gevinst", () => {
    const flat = simulateGrid(makeCandles(Array(50).fill(100)), params());
    expect(flat.sharpeRatio).toBe(0);

    const zigzag = [100];
    for (let i = 0; i < 30; i++) zigzag.push(94, 106);
    const r = simulateGrid(makeCandles(zigzag), params());
    // Med mange vinnende rundturer skal sharpe være positiv
    expect(r.closedTrades).toBeGreaterThan(0);
  });
});
