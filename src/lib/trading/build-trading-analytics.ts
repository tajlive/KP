import {
  aggregateTradeHistoryStats,
  type TradeHistoryAggregates,
} from "@/lib/trading/trade-history-aggregates";
import { calculateAllRiskMetrics } from "./risk-metrics";

export type TradeAnalyticsInput = {
  id: string;
  trading_pair: string;
  side: string;
  realized_pnl: number | null;
  mode: string | null;
  created_at: string;
  executed_at: string | null;
  total_value: number | null;
};

/** Aggregates from closed-position P&L; open fills (no realized_pnl) contribute 0. */
export type TradingAnalyticsAggregates = TradeHistoryAggregates & {
  totalEffectivePnl: number;
  /** Taps-/gevinst-rader blant lukkede handler (realized_pnl satt). */
  effectiveWinCount: number;
  effectiveLossCount: number;
  effectiveBreakevenCount: number;
};

/**
 * Per-trade contribution for charts and headline totals.
 * Only realized P&L counts: an open buy is a cash→asset conversion, NOT a
 * loss. The old fallback (signed notional) treated every open buy as a loss,
 * which produced nonsense like "−564 901 kr" on a 100k paper account
 * (cf. trade-effective-pnl.ts, which already works around that bug).
 */
export function effectivePnlDelta(row: TradeAnalyticsInput): number {
  if (row.realized_pnl != null && Number.isFinite(Number(row.realized_pnl))) {
    return Number(row.realized_pnl);
  }
  return 0;
}

function tradeMillis(t: TradeAnalyticsInput): number {
  const s = t.executed_at ?? t.created_at;
  const ms = new Date(s).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function dayKeyUtc(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export type TradingAnalyticsPayload = {
  generatedAt: string;
  tradeCount: number;
  aggregates: TradingAnalyticsAggregates;
  cumulativePnl: { t: string; label: string; cumulative: number }[];
  dailyPnl: { day: string; pnl: number }[];
  modeSplit: { mode: string; pnl: number; trades: number }[];
  topPairs: { pair: string; pnl: number; trades: number }[];
  winLossSlices: {
    key: "win" | "loss" | "breakeven" | "unknown";
    value: number;
    fill: string;
  }[];
  bestDay: { day: string; pnl: number } | null;
  worstDay: { day: string; pnl: number } | null;
  riskMetrics: {
    sortinoRatio: number;
    calmarRatio: number;
    var95: number;
    var99: number;
    expectedShortfall95: number;
    omegaRatio: number;
    maxConsecutiveLosses: number;
    avgTimeToRecovery: number;
    gainPainRatio: number;
  };
};

const WIN_COLOR = "#10b981";
const LOSS_COLOR = "#f43f5e";
const NEUTRAL_COLOR = "#64748b";
const UNKNOWN_COLOR = "#475569";

function safeMetric(n: number): number {
  if (!Number.isFinite(n)) return n > 0 ? 99.99 : 0;
  return Math.round(n * 1000) / 1000;
}

function computeMaxDrawdown(equityCurve: number[]): number {
  if (equityCurve.length < 2) return 0;
  let peak = equityCurve[0];
  let maxDD = 0;
  for (const eq of equityCurve) {
    if (eq > peak) peak = eq;
    const dd = (peak - eq) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}

export function buildTradingAnalytics(
  trades: TradeAnalyticsInput[],
  generatedAt = new Date().toISOString(),
  startingCapital = 100000,
): TradingAnalyticsPayload {
  const sorted = [...trades].sort((a, b) => tradeMillis(a) - tradeMillis(b));

  let run = 0;
  const cumulativePnl: TradingAnalyticsPayload["cumulativePnl"] = [];
  for (const row of sorted) {
    const delta = effectivePnlDelta(row);
    run += delta;
    const ts = row.executed_at ?? row.created_at;
    const d = new Date(ts);
    const label = Number.isFinite(d.getTime())
      ? d.toISOString().slice(0, 16).replace("T", " ")
      : row.id.slice(0, 8);
    cumulativePnl.push({
      t: ts,
      label,
      cumulative: Math.round(run * 100) / 100,
    });
  }

  const dailyMap = new Map<string, number>();
  for (const row of sorted) {
    const ts = row.executed_at ?? row.created_at;
    const day = dayKeyUtc(ts);
    if (!day) continue;
    const delta = effectivePnlDelta(row);
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + delta);
  }
  const dailyPnl = [...dailyMap.entries()]
    .map(([day, pnl]) => ({
      day,
      pnl: Math.round(pnl * 100) / 100,
    }))
    .sort((a, b) => a.day.localeCompare(b.day));

  const modeMap = new Map<string, { pnl: number; trades: number }>();
  for (const row of sorted) {
    const mode = (row.mode ?? "unknown").toLowerCase();
    const delta = effectivePnlDelta(row);
    const cur = modeMap.get(mode) ?? { pnl: 0, trades: 0 };
    cur.pnl += delta;
    cur.trades += 1;
    modeMap.set(mode, cur);
  }
  const modeSplit = [...modeMap.entries()].map(([mode, v]) => ({
    mode,
    pnl: Math.round(v.pnl * 100) / 100,
    trades: v.trades,
  }));

  const pairMap = new Map<string, { pnl: number; trades: number }>();
  for (const row of sorted) {
    const pair = row.trading_pair || "—";
    const delta = effectivePnlDelta(row);
    const cur = pairMap.get(pair) ?? { pnl: 0, trades: 0 };
    cur.pnl += delta;
    cur.trades += 1;
    pairMap.set(pair, cur);
  }
  const topPairs = [...pairMap.entries()]
    .map(([pair, v]) => ({
      pair,
      pnl: Math.round(v.pnl * 100) / 100,
      trades: v.trades,
    }))
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
    .slice(0, 8);

  const baseAggregates = aggregateTradeHistoryStats(sorted);
  const totalEffectivePnl = sorted.reduce(
    (s, row) => s + effectivePnlDelta(row),
    0,
  );

  let effectiveWinCount = 0;
  let effectiveLossCount = 0;
  let effectiveBreakevenCount = 0;
  for (const row of sorted) {
    // Kun lukkede handler (realized_pnl satt) teller som vinn/tap/break-even.
    // Åpne handler uten resultat regnes som "ukjent" (tradeCount - kjente).
    if (row.realized_pnl == null || !Number.isFinite(Number(row.realized_pnl))) {
      continue;
    }
    const d = effectivePnlDelta(row);
    if (d > 0) effectiveWinCount += 1;
    else if (d < 0) effectiveLossCount += 1;
    else effectiveBreakevenCount += 1;
  }

  const aggregates: TradingAnalyticsAggregates = {
    ...baseAggregates,
    totalEffectivePnl: Math.round(totalEffectivePnl * 100) / 100,
    effectiveWinCount,
    effectiveLossCount,
    effectiveBreakevenCount,
  };

  /** Kake-diagram: vinn/tap/break-even blant lukkede handler. */
  const winLossSlices = [
    { key: "win" as const, value: effectiveWinCount, fill: WIN_COLOR },
    { key: "loss" as const, value: effectiveLossCount, fill: LOSS_COLOR },
    {
      key: "breakeven" as const,
      value: effectiveBreakevenCount,
      fill: NEUTRAL_COLOR,
    },
  ].filter((s) => s.value > 0);

  let bestDay: { day: string; pnl: number } | null = null;
  let worstDay: { day: string; pnl: number } | null = null;
  for (const d of dailyPnl) {
    if (!bestDay || d.pnl > bestDay.pnl) bestDay = d;
    if (!worstDay || d.pnl < worstDay.pnl) worstDay = d;
  }

  // Build daily equity curve and returns for risk metrics
  const dailyEquity: number[] = [];
  let equity = startingCapital;
  for (const d of dailyPnl) {
    equity += d.pnl;
    dailyEquity.push(Math.round(equity * 100) / 100);
  }

  const dailyReturns = dailyPnl.map((d, i) => {
    const prevEquity = i === 0 ? startingCapital : dailyEquity[i - 1];
    return prevEquity !== 0 ? Math.round((d.pnl / prevEquity) * 1e6) / 1e6 : 0;
  });

  const maxDrawdown = computeMaxDrawdown(dailyEquity);
  const finalEquity = dailyEquity[dailyEquity.length - 1] ?? startingCapital;
  const numDays = Math.max(dailyPnl.length, 1);
  const totalReturn = (finalEquity - startingCapital) / startingCapital;
  const annualizedReturn = totalReturn * (365 / numDays);

  const tradePnls = sorted.map((row) => ({ pnl: effectivePnlDelta(row) }));

  const raw = calculateAllRiskMetrics(
    dailyReturns,
    tradePnls,
    dailyEquity,
    annualizedReturn,
    maxDrawdown,
    0.03,
  );

  const riskMetrics = {
    sortinoRatio: safeMetric(raw.sortinoRatio),
    calmarRatio: safeMetric(raw.calmarRatio),
    var95: safeMetric(raw.var95),
    var99: safeMetric(raw.var99),
    expectedShortfall95: safeMetric(raw.expectedShortfall95),
    omegaRatio: safeMetric(raw.omegaRatio),
    maxConsecutiveLosses: raw.maxConsecutiveLosses,
    avgTimeToRecovery: Math.round(raw.avgTimeToRecoveryPeriods * 10) / 10,
    gainPainRatio: safeMetric(raw.gainPainRatio),
  };

  return {
    generatedAt,
    tradeCount: sorted.length,
    aggregates,
    cumulativePnl,
    dailyPnl,
    modeSplit,
    topPairs,
    winLossSlices,
    bestDay,
    worstDay,
    riskMetrics,
  };
}
