/**
 * simple-backtest — 90 dagers historikk → «du ville hatt X kr» (mega-plan Oppgave 2.3).
 *
 * Krav (López de Prado-standarden fra planen):
 * - Gebyr (0.1 % taker) + slippage (0.2 %) ALLTID i modellen
 * - ≥100 lukkede lots før «bevist»-stempel
 * - DSR ≥ 0.95 (Deflated Sharpe Ratio; PSR ved nTrials=1)
 * - Gjenbruker kanonisk computeFill + FIFO-ledger (samme matte som prod-tick)
 */
import { describe, it, expect } from "vitest";
import {
  runSimpleBacktest,
  formatBacktestBevis,
  SIMPLE_BACKTEST_DEFAULTS,
} from "../simple-backtest";
import type { Candle } from "@/lib/trading/strategies/types";

function candle(close: number, i: number): Candle {
  return { time: 1_800_000_000_000 + i * 300_000, open: close, high: close, low: close, close, volume: 1000 };
}

/** Sidelengs oscillerende marked (grid-vennlig): 100 ± 3 % sinus */
function sidelengs(n: number): Candle[] {
  return Array.from({ length: n }, (_, i) => candle(100 + 3 * Math.sin((i * Math.PI) / 6), i));
}

/** Sterk trend ned (grid-fiendtlig): -0.5 % per candle */
function trendNed(n: number): Candle[] {
  return Array.from({ length: n }, (_, i) => candle(100 * Math.pow(0.995, i), i));
}

describe("runSimpleBacktest", () => {
  it("tom candle-liste → bevist=false, ingen krasj", () => {
    const res = runSimpleBacktest({ candles: [], initialCapital: 10000 });
    expect(res.validation.bevist).toBe(false);
    expect(res.metrics.closedTrades).toBe(0);
  });

  it("sidelengs marked → grid selger med gevinst (PnL > 0, winRate > 50)", () => {
    const res = runSimpleBacktest({ candles: sidelengs(400), initialCapital: 10000 });
    expect(res.metrics.closedTrades).toBeGreaterThan(0);
    expect(res.metrics.totalPnl).toBeGreaterThan(0);
    expect(res.metrics.winRate).toBeGreaterThan(50);
  });

  it("trend ned → ærlig tap (PnL < 0), maxDrawdown > 0", () => {
    const res = runSimpleBacktest({ candles: trendNed(200), initialCapital: 10000 });
    expect(res.metrics.totalPnl).toBeLessThan(0);
    expect(res.metrics.maxDrawdownPct).toBeGreaterThan(0);
  });

  it("gebyr (0.1 %) og slippage (+0.2 % på kjøp) er i modellen per trade", () => {
    const candles = sidelengs(400);
    const res = runSimpleBacktest({ candles, initialCapital: 10000 });
    const kjop = res.trades.filter((t) => t.side === "buy");
    expect(kjop.length).toBeGreaterThan(0);

    const closePerTid = new Map(candles.map((c) => [c.time, c.close]));
    for (const t of kjop.slice(0, 5)) {
      // Gebyr = 0.1 % av fylt verdi
      expect(t.fee).toBeCloseTo(t.quantity * t.price * 0.001, 2);
      // Slippage: kjøpsfyll skjer OVER candle close
      const close = closePerTid.get(t.time)!;
      expect(t.price).toBeGreaterThan(close);
      expect(t.price).toBeCloseTo(close * 1.002, 6);
    }
    // Totalt betalt gebyr er reelt
    expect(res.trades.reduce((s, t) => s + t.fee, 0)).toBeGreaterThan(0);
  });

  it("metrics inneholder sharpe/skewness/kurtosis + DSR mellom 0 og 1", () => {
    const res = runSimpleBacktest({ candles: sidelengs(400), initialCapital: 10000 });
    expect(Number.isFinite(res.metrics.sharpe)).toBe(true);
    expect(Number.isFinite(res.metrics.skewness)).toBe(true);
    expect(Number.isFinite(res.metrics.kurtosis)).toBe(true);
    expect(res.validation.dsr).toBeGreaterThanOrEqual(0);
    expect(res.validation.dsr).toBeLessThanOrEqual(1);
  });

  it("minTradesGate: færre enn 100 lukkede lots → ikke bevist", () => {
    const res = runSimpleBacktest({ candles: sidelengs(60), initialCapital: 10000 });
    expect(res.metrics.closedTrades).toBeLessThan(100);
    expect(res.validation.minTradesGate).toBe(false);
    expect(res.validation.bevist).toBe(false);
  });

  it("nTrials > 1 senker DSR (straff for multipel testing)", () => {
    const enkelt = runSimpleBacktest({ candles: sidelengs(400), initialCapital: 10000, nTrials: 1 });
    const mange = runSimpleBacktest({ candles: sidelengs(400), initialCapital: 10000, nTrials: 20 });
    expect(mange.validation.dsr).toBeLessThanOrEqual(enkelt.validation.dsr);
  });
});

describe("formatBacktestBevis", () => {
  it("formaterer med fortegn og tusenskille", () => {
    expect(formatBacktestBevis(2340)).toBe("+2 340 kr");
    expect(formatBacktestBevis(-1500)).toBe("−1 500 kr");
    expect(formatBacktestBevis(0)).toBe("0 kr");
  });
});

describe("SIMPLE_BACKTEST_DEFAULTS", () => {
  it("har planens kostnadstall: 0.1 % gebyr, 0.2 % slippage", () => {
    expect(SIMPLE_BACKTEST_DEFAULTS.feeRate).toBe(0.001);
    expect(SIMPLE_BACKTEST_DEFAULTS.slippagePct).toBe(0.2);
  });
});
