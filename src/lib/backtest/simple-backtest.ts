/**
 * simple-backtest — kjører `simple_grid` (COMBO) mot historiske candles
 * og svarer på: «Hva hadde 100 000 kr blitt til?»
 *
 * Mega-plan Oppgave 2.3 (2026-08-10). López de Prado-standarden:
 * - Gebyr (0.1 % OKX taker) + slippage (0.2 %) ALLTID i modellen
 * - ≥100 lukkede lots før «bevist»-stempel
 * - DSR ≥ 0.95 (Deflated Sharpe Ratio; PSR når nTrials=1)
 * - ALDRI data-mining: strategiens parametre er låst a priori
 *
 * Design: gjenbruker de KANONISKE komponentene fra prod — computeFill
 * (utførelsesmatte) og FIFO position-ledger — slik at backtest matcher
 * live-oppførsel. Simuleringsløkken speiler tick: strategien kalles per
 * candle med voksende candle-historikk, og session.open_position.lots
 * vedlikeholdes på samme måte som tick gjør.
 */

import { computeFill } from "@/lib/trading/canonical/execution/fill-model";
import {
  addLot,
  createLedger,
  getTotalQuantity,
  getWeightedEntryPrice,
  sellFIFO,
  type LedgerState,
} from "@/lib/trading/position-ledger";
import {
  SIMPLE_GRID_DEFAULTS,
  SimpleGridStrategy,
} from "@/lib/trading/strategies/simple-grid";
import type { Candle, MinimalSession } from "@/lib/trading/strategies/types";

export const SIMPLE_BACKTEST_DEFAULTS = {
  /** 0.1 % OKX taker-gebyr (planens tall) */
  feeRate: 0.001,
  /** 0.2 % slippage — samme som paper-executor i prod */
  slippagePct: 0.2,
  /** Minimum ordreverdi i quote-valuta */
  minOrderValue: 10,
  /** DSR-terskel for «bevist»-stempel (planen) */
  dsrTerskel: 0.95,
  /** Minimum lukkede lots for «bevist»-stempel (planen) */
  minLukkedeLots: 100,
} as const;

export interface SimpleBacktestOptions {
  candles: Candle[];
  /** Startkapital i quote-valuta (f.eks. 10000 USDT eller 100000 NOK) */
  initialCapital: number;
  /** Overstyr simple_grid-parametre (default: SIMPLE_GRID_DEFAULTS) */
  config?: Record<string, unknown>;
  feeRate?: number;
  slippagePct?: number;
  minOrderValue?: number;
  quoteCurrency?: "USDT" | "NOK";
  /** Antall strategi-varianter vurdert (DSR-straff for multipel testing). Default 1. */
  nTrials?: number;
}

export interface BacktestTrade {
  side: "buy" | "sell";
  time: number;
  price: number;
  quantity: number;
  fee: number;
  /** Netto realisert PnL (kun sell) — gebyr trukket fra */
  realizedPnl?: number;
  reason?: string;
}

export interface SimpleBacktestMetrics {
  totalPnl: number;
  totalReturnPct: number;
  closedTrades: number;
  totalBuys: number;
  winRate: number;
  profitFactor: number;
  maxDrawdownPct: number;
  /** Annualisert Sharpe fra daglige equity-avkastninger (sqrt 365) */
  sharpe: number;
  skewness: number;
  kurtosis: number;
}

export interface BacktestValidation {
  nTrials: number;
  /** Deflated Sharpe Ratio ∈ [0,1]. PSR når nTrials=1. */
  dsr: number;
  dsrGate: boolean;
  minTradesGate: boolean;
  /** «Bevist»-stempel: DSR-gate + ≥100 lukkede lots */
  bevist: boolean;
}

export interface SimpleBacktestResult {
  metrics: SimpleBacktestMetrics;
  trades: BacktestTrade[];
  equityCurve: { time: number; equity: number }[];
  validation: BacktestValidation;
}

// ── Statistikk-hjelpere ─────────────────────────────────────────────────────

/** Abramowitz–Stegun 7.1.26 erf-approksimasjon */
function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return Math.sign(x) * y;
}

function normalCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

/** Acklams invers normaltilnærmelse (for E[max_N] i DSR) */
function normalInv(p: number): number {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0, -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0, 3.754408661907416e0];
  const plow = 0.02425, phigh = 1 - plow;
  if (p <= 0 || p >= 1) return 0;
  if (p < plow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > phigh) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const q = p - 0.5;
  const r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/**
 * Deflated Sharpe Ratio (Bailey & López de Prado).
 * srDaily = daglig Sharpe (ikke annualisert), nObs = antall dags-observasjoner.
 * nTrials=1 → SR*=0 → ren PSR.
 */
export function deflatedSharpeRatio(
  srDaily: number,
  nObs: number,
  skewness: number,
  kurtosis: number,
  nTrials: number,
): number {
  if (nObs < 2) return 0;
  let srStar = 0;
  if (nTrials > 1) {
    const eulerGamma = 0.5772156649;
    const eMaxN =
      (1 - eulerGamma) * normalInv(1 - 1 / nTrials) +
      eulerGamma * normalInv(1 - 1 / (nTrials * Math.E));
    // Antatt varians av SR-estimatoren: 1/T (konservativ standardtilnærmelse)
    srStar = Math.sqrt(1 / nObs) * eMaxN;
  }
  const varians =
    1 - skewness * srDaily + ((kurtosis - 1) / 4) * srDaily * srDaily;
  const denom = Math.sqrt(Math.max(1e-12, varians));
  const z = ((srDaily - srStar) * Math.sqrt(nObs - 1)) / denom;
  return Math.min(1, Math.max(0, normalCdf(z)));
}

function dagligeAvkastninger(equityCurve: { time: number; equity: number }[]): number[] {
  if (equityCurve.length < 2) return [];
  const perDag = new Map<number, number>();
  for (const punkt of equityCurve) {
    const dag = Math.floor(punkt.time / 86_400_000);
    perDag.set(dag, punkt.equity);
  }
  const daglig = [...perDag.values()];
  const avkastning: number[] = [];
  for (let i = 1; i < daglig.length; i++) {
    if (daglig[i - 1] > 0) avkastning.push(daglig[i] / daglig[i - 1] - 1);
  }
  return avkastning;
}

function statMomenter(data: number[]): { mean: number; std: number; skew: number; kurt: number } {
  const n = data.length;
  if (n < 3) return { mean: 0, std: 0, skew: 0, kurt: 3 };
  const mean = data.reduce((a, b) => a + b, 0) / n;
  const m2 = data.reduce((s, x) => s + (x - mean) ** 2, 0) / n;
  const std = Math.sqrt(m2);
  if (std === 0) return { mean, std: 0, skew: 0, kurt: 3 };
  const m3 = data.reduce((s, x) => s + ((x - mean) / std) ** 3, 0) / n;
  const m4 = data.reduce((s, x) => s + ((x - mean) / std) ** 4, 0) / n;
  return { mean, std, skew: m3, kurt: m4 };
}

// ── Hovedsimulering ─────────────────────────────────────────────────────────

export function runSimpleBacktest(options: SimpleBacktestOptions): SimpleBacktestResult {
  const {
    candles,
    initialCapital,
    config,
    feeRate = SIMPLE_BACKTEST_DEFAULTS.feeRate,
    slippagePct = SIMPLE_BACKTEST_DEFAULTS.slippagePct,
    minOrderValue = SIMPLE_BACKTEST_DEFAULTS.minOrderValue,
    quoteCurrency = "USDT",
    nTrials = 1,
  } = options;

  const trades: BacktestTrade[] = [];
  const equityCurve: { time: number; equity: number }[] = [];
  const lukkedeLots: { pnl: number }[] = [];

  const tomValidering: BacktestValidation = {
    nTrials, dsr: 0, dsrGate: false, minTradesGate: false, bevist: false,
  };

  if (!candles || candles.length < 2 || initialCapital <= 0) {
    return {
      metrics: {
        totalPnl: 0, totalReturnPct: 0, closedTrades: 0, totalBuys: 0,
        winRate: 0, profitFactor: 0, maxDrawdownPct: 0, sharpe: 0,
        skewness: 0, kurtosis: 3,
      },
      trades,
      equityCurve,
      validation: tomValidering,
    };
  }

  const strategy = new SimpleGridStrategy();
  const strategiConfig = { ...SIMPLE_GRID_DEFAULTS, ...config };
  let cash = initialCapital;
  let ledger: LedgerState = createLedger("long");
  let topp = initialCapital;
  let maksDrawdown = 0;

  const session: MinimalSession = {
    open_position: null,
    last_tick_at: null,
    strategy_config: {},
  };

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    const pris = candle.close;
    const kvantum = getTotalQuantity(ledger);
    const equity = cash + kvantum * pris;

    const signal = strategy.evaluate({
      candles: candles.slice(0, i + 1),
      session,
      config: strategiConfig,
      currentTime: candle.time,
    });

    if (signal.action === "buy" && signal.positionSize && signal.positionSize > 0) {
      const belop = signal.positionSize * equity;
      const fill = computeFill({
        side: "buy",
        quantity: belop / pris,
        orderType: "market",
        marketPrice: pris,
        feeRate,
        marketSlippageRate: slippagePct / 100,
        minOrderValue,
        availableCapital: cash,
        quoteCurrency,
      });
      if (fill.success) {
        cash -= fill.totalCost;
        ledger = addLot(
          ledger,
          fill.executedQuantity,
          fill.executedPrice,
          new Date(candle.time).toISOString(),
        );
        trades.push({
          side: "buy", time: candle.time, price: fill.executedPrice,
          quantity: fill.executedQuantity, fee: fill.fee, reason: signal.reason,
        });
      }
    } else if (
      signal.action === "sell" &&
      signal.quantity &&
      signal.quantity > 0 &&
      kvantum > 0
    ) {
      const selgKvantum = Math.min(signal.quantity, kvantum);
      const fill = computeFill({
        side: "sell",
        quantity: selgKvantum,
        orderType: "market",
        marketPrice: pris,
        feeRate,
        marketSlippageRate: slippagePct / 100,
        minOrderValue,
        quoteCurrency,
      });
      if (fill.success) {
        const sellResult = sellFIFO(ledger, selgKvantum, fill.executedPrice);
        ledger = { ...ledger, lots: sellResult.remainingLots };

        // Fordel gebyret pro-rata på lot-matches for netto realisert PnL per lot
        const totalMatch = sellResult.lotMatches.reduce((s, m) => s + m.matchedQuantity, 0);
        let nettoRealisert = 0;
        for (const match of sellResult.lotMatches) {
          const gebyrAndel = totalMatch > 0 ? (match.matchedQuantity / totalMatch) * fill.fee : 0;
          const netto = match.pnl - gebyrAndel;
          nettoRealisert += netto;
          lukkedeLots.push({ pnl: netto });
        }

        cash += fill.totalCost - fill.fee;
        trades.push({
          side: "sell", time: candle.time, price: fill.executedPrice,
          quantity: fill.executedQuantity, fee: fill.fee,
          realizedPnl: nettoRealisert, reason: signal.reason,
        });
      }
    }

    // Oppdater session-position (speiler tick sin FIFO-vedlikehold)
    const nyKvantum = getTotalQuantity(ledger);
    session.open_position =
      nyKvantum > 0
        ? {
            side: "long",
            quantity: nyKvantum,
            entry_price: getWeightedEntryPrice(ledger),
            entry_time: ledger.lots[0]?.timestamp ?? new Date(candle.time).toISOString(),
            lots: ledger.lots,
          }
        : null;

    const nyEquity = cash + nyKvantum * pris;
    equityCurve.push({ time: candle.time, equity: nyEquity });
    if (nyEquity > topp) topp = nyEquity;
    const drawdown = topp > 0 ? ((topp - nyEquity) / topp) * 100 : 0;
    if (drawdown > maksDrawdown) maksDrawdown = drawdown;
  }

  // ── Metrics ──
  const sluttEquity = equityCurve[equityCurve.length - 1]?.equity ?? initialCapital;
  const totalPnl = sluttEquity - initialCapital;
  const totalBuys = trades.filter((t) => t.side === "buy").length;
  const vinnende = lukkedeLots.filter((l) => l.pnl > 0);
  const tapende = lukkedeLots.filter((l) => l.pnl <= 0);
  const bruttoGevinst = vinnende.reduce((s, l) => s + l.pnl, 0);
  const bruttoTap = Math.abs(tapende.reduce((s, l) => s + l.pnl, 0));

  const daglige = dagligeAvkastninger(equityCurve);
  const { mean, std, skew, kurt } = statMomenter(daglige);
  const sharpeDaglig = std > 0 ? mean / std : 0;

  const dsr = deflatedSharpeRatio(sharpeDaglig, daglige.length, skew, kurt, nTrials);
  const dsrGate = dsr >= SIMPLE_BACKTEST_DEFAULTS.dsrTerskel;
  const minTradesGate = lukkedeLots.length >= SIMPLE_BACKTEST_DEFAULTS.minLukkedeLots;

  return {
    metrics: {
      totalPnl,
      totalReturnPct: (totalPnl / initialCapital) * 100,
      closedTrades: lukkedeLots.length,
      totalBuys,
      winRate: lukkedeLots.length > 0 ? (vinnende.length / lukkedeLots.length) * 100 : 0,
      profitFactor: bruttoTap > 0 ? bruttoGevinst / bruttoTap : bruttoGevinst > 0 ? Infinity : 0,
      maxDrawdownPct: maksDrawdown,
      sharpe: sharpeDaglig * Math.sqrt(365),
      skewness: skew,
      kurtosis: kurt,
    },
    trades,
    equityCurve,
    validation: {
      nTrials,
      dsr,
      dsrGate,
      minTradesGate,
      bevist: dsrGate && minTradesGate,
    },
  };
}

/**
 * Formater backtest-resultat for visning («+2 340 kr»).
 * Landing-integrasjon: mates som `resultat`-prop til BacktestBevisSection.
 * Fakta-regel: vis KUN med data fra runSimpleBacktest — aldri hardkod.
 */
export function formatBacktestBevis(totalPnl: number): string {
  const avrundet = Math.round(totalPnl);
  // no-NO tusenskille er non-breaking space (U+00A0/U+202F) — normaliser til vanlig space
  const tall = Math.abs(avrundet).toLocaleString("no-NO").replace(/[\u00A0\u202F]/g, " ");
  if (avrundet > 0) return `+${tall} kr`;
  if (avrundet < 0) return `−${tall} kr`;
  return "0 kr";
}
