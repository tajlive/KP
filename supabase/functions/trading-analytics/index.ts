/**
 * Trading Analytics Edge Function
 * GET: Henter trades for autentisert bruker og beregner analytics
 *
 * Tabell: trades
 * Columns: id, trading_pair, side, realized_pnl, mode, created_at, executed_at, total_value
 *
 * Inneholder inlinet logikk for:
 * - buildTradingAnalytics — P&L-kurver, daglig P&L, mode-split, top pairs, win/loss slices
 * - aggregateTradeHistoryStats — grunnleggende aggregering av realisert P&L
 * - risk-metrics — Sortino, Calmar, VaR, Expected Shortfall, Omega, Gain/Pain, drawdown
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface TradeRow {
  id: string;
  trading_pair: string;
  side: string;
  realized_pnl: number | null;
  mode: string | null;
  created_at: string;
  executed_at: string | null;
  total_value: number | null;
}

interface TradeAnalyticsAggregates {
  rowCount: number;
  winCount: number;
  lossCount: number;
  breakevenCount: number;
  noRealizedPnlCount: number;
  totalRealizedPnl: number;
  winRateRealizedPct: number | null;
  totalEffectivePnl: number;
  effectiveWinCount: number;
  effectiveLossCount: number;
  effectiveBreakevenCount: number;
}

interface CumulativePnlPoint {
  t: string;
  label: string;
  cumulative: number;
}

interface DailyPnlPoint {
  day: string;
  pnl: number;
}

interface ModeSplitEntry {
  mode: string;
  pnl: number;
  trades: number;
}

interface TopPairEntry {
  pair: string;
  pnl: number;
  trades: number;
}

interface WinLossSlice {
  key: "win" | "loss" | "breakeven" | "unknown";
  value: number;
  fill: string;
}

interface RiskMetrics {
  sortinoRatio: number;
  calmarRatio: number;
  var95: number;
  var99: number;
  expectedShortfall95: number;
  omegaRatio: number;
  maxConsecutiveLosses: number;
  avgTimeToRecovery: number;
  gainPainRatio: number;
}

interface TradingAnalyticsPayload {
  generatedAt: string;
  tradeCount: number;
  aggregates: TradeAnalyticsAggregates;
  cumulativePnl: CumulativePnlPoint[];
  dailyPnl: DailyPnlPoint[];
  modeSplit: ModeSplitEntry[];
  topPairs: TopPairEntry[];
  winLossSlices: WinLossSlice[];
  bestDay: DailyPnlPoint | null;
  worstDay: DailyPnlPoint | null;
  riskMetrics: RiskMetrics;
}

const MAX_TRADES = 4000;

// ──────────────────────────────────────────────
// Analytics Helpers (inlined from lib/trading/)
// ──────────────────────────────────────────────

function normalizeSide(side: string): "buy" | "sell" | "other" {
  const s = side.trim().toLowerCase();
  if (s === "buy" || s === "long" || s === "b") return "buy";
  if (s === "sell" || s === "short" || s === "s") return "sell";
  return "other";
}

function effectivePnlDelta(row: TradeRow): number {
  if (row.realized_pnl != null && Number.isFinite(Number(row.realized_pnl))) {
    return Number(row.realized_pnl);
  }
  const tv = row.total_value;
  if (tv == null || !Number.isFinite(Number(tv))) return 0;
  const abs = Math.abs(Number(tv));
  const leg = normalizeSide(row.side);
  if (leg === "buy") return -abs;
  if (leg === "sell") return abs;
  return 0;
}

function tradeMillis(t: TradeRow): number {
  const s = t.executed_at ?? t.created_at;
  const ms = new Date(s).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function dayKeyUtc(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

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

// Aggregate trade history stats
function aggregateTradeHistoryStats(trades: TradeRow[]): Omit<
  TradeAnalyticsAggregates,
  "totalEffectivePnl" | "effectiveWinCount" | "effectiveLossCount" | "effectiveBreakevenCount"
> {
  let winCount = 0;
  let lossCount = 0;
  let breakevenCount = 0;
  let noRealizedPnlCount = 0;
  let totalRealizedPnl = 0;

  for (const t of trades) {
    const p = t.realized_pnl;
    if (p == null || !Number.isFinite(Number(p))) {
      noRealizedPnlCount += 1;
      continue;
    }
    const n = Number(p);
    totalRealizedPnl += n;
    if (n > 0) winCount += 1;
    else if (n < 0) lossCount += 1;
    else breakevenCount += 1;
  }

  const withRealized = winCount + lossCount + breakevenCount;
  const winRateRealizedPct =
    withRealized > 0 ? Math.round((winCount / withRealized) * 100) : null;

  return {
    rowCount: trades.length,
    winCount,
    lossCount,
    breakevenCount,
    noRealizedPnlCount,
    totalRealizedPnl,
    winRateRealizedPct,
  };
}

// Risk metrics
function calculateSortino(returns: number[], riskFreeRate = 0): number {
  if (returns.length < 2) return 0;
  const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const downsideSquares = returns.map((r) => {
    const diff = r - riskFreeRate;
    return diff < 0 ? diff * diff : 0;
  });
  const meanDownsideSquare =
    downsideSquares.reduce((sum, d) => sum + d, 0) / downsideSquares.length;
  const downsideDeviation = Math.sqrt(meanDownsideSquare);
  if (downsideDeviation === 0) {
    return meanReturn > riskFreeRate ? Infinity : 0;
  }
  return (meanReturn - riskFreeRate) / downsideDeviation;
}

function calculateAnnualizedSortino(dailyReturns: number[], annualRiskFreeRate = 0.03): number {
  const dailyRfr = annualRiskFreeRate / 365;
  const dailySortino = calculateSortino(dailyReturns, dailyRfr);
  return dailySortino * Math.sqrt(365);
}

function calculateCalmar(annualizedReturn: number, maxDrawdown: number): number {
  const absDrawdown = Math.abs(maxDrawdown);
  if (absDrawdown === 0) {
    return annualizedReturn > 0 ? Infinity : 0;
  }
  return annualizedReturn / absDrawdown;
}

function calculateVaR(returns: number[], confidence = 0.95): number {
  if (returns.length < 2) return 0;
  const sorted = [...returns].sort((a, b) => a - b);
  const index = Math.floor((1 - confidence) * sorted.length);
  return sorted[Math.max(index, 0)];
}

function calculateExpectedShortfall(returns: number[], confidence = 0.95): number {
  if (returns.length < 2) return 0;
  const sorted = [...returns].sort((a, b) => a - b);
  const varIndex = Math.floor((1 - confidence) * sorted.length);
  const cutoff = Math.max(varIndex + 1, 1);
  const tailReturns = sorted.slice(0, cutoff);
  if (tailReturns.length === 0) return 0;
  return tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length;
}

function calculateMaxConsecutiveLosses(rows: { pnl: number }[]): number {
  if (rows.length === 0) return 0;
  let maxStreak = 0;
  let currentStreak = 0;
  for (const t of rows) {
    if (t.pnl < 0) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }
  return maxStreak;
}

function calculateTimeToRecovery(equityCurve: number[]): number {
  if (equityCurve.length < 2) return 0;
  let ath = equityCurve[0];
  let drawdownStart: number | null = null;
  const recoveryTimes: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const eq = equityCurve[i];
    if (eq >= ath) {
      if (drawdownStart !== null) {
        recoveryTimes.push(i - drawdownStart);
        drawdownStart = null;
      }
      ath = eq;
    } else if (drawdownStart === null) {
      drawdownStart = i;
    }
  }
  if (recoveryTimes.length === 0) return 0;
  return recoveryTimes.reduce((sum, t) => sum + t, 0) / recoveryTimes.length;
}

function calculateGainPainRatio(returns: number[]): number {
  if (returns.length === 0) return 0;
  const gains = returns.filter((r) => r > 0).reduce((sum, r) => sum + r, 0);
  const pain = Math.abs(returns.filter((r) => r < 0).reduce((sum, r) => sum + r, 0));
  if (pain === 0) return gains > 0 ? Infinity : 0;
  return gains / pain;
}

function calculateOmega(returns: number[], threshold = 0): number {
  if (returns.length === 0) return 0;
  let gains = 0;
  let losses = 0;
  for (const r of returns) {
    if (r > threshold) {
      gains += r - threshold;
    } else {
      losses += threshold - r;
    }
  }
  if (losses === 0) return gains > 0 ? Infinity : 1;
  return gains / losses;
}

function calculateAllRiskMetrics(
  dailyReturns: number[],
  trades: { pnl: number }[],
  equityCurve: number[],
  annualizedReturn: number,
  maxDrawdown: number,
  annualRiskFreeRate = 0.03,
): RiskMetrics {
  return {
    sortinoRatio: calculateAnnualizedSortino(dailyReturns, annualRiskFreeRate),
    calmarRatio: calculateCalmar(annualizedReturn, maxDrawdown),
    var95: calculateVaR(dailyReturns, 0.95),
    var99: calculateVaR(dailyReturns, 0.99),
    expectedShortfall95: calculateExpectedShortfall(dailyReturns, 0.95),
    omegaRatio: calculateOmega(dailyReturns, 0),
    maxConsecutiveLosses: calculateMaxConsecutiveLosses(trades),
    avgTimeToRecovery: calculateTimeToRecovery(equityCurve),
    gainPainRatio: calculateGainPainRatio(dailyReturns),
  };
}

// Main analytics builder
function buildTradingAnalytics(
  trades: TradeRow[],
  generatedAt: string,
  startingCapital = 100000,
): TradingAnalyticsPayload {
  const sorted = [...trades].sort((a, b) => tradeMillis(a) - tradeMillis(b));

  // Cumulative P&L curve
  let run = 0;
  const cumulativePnl: CumulativePnlPoint[] = [];
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

  // Daily P&L
  const dailyMap = new Map<string, number>();
  for (const row of sorted) {
    const ts = row.executed_at ?? row.created_at;
    const day = dayKeyUtc(ts);
    if (!day) continue;
    const delta = effectivePnlDelta(row);
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + delta);
  }
  const dailyPnl: DailyPnlPoint[] = [...dailyMap.entries()]
    .map(([day, pnl]) => ({
      day,
      pnl: Math.round(pnl * 100) / 100,
    }))
    .sort((a, b) => a.day.localeCompare(b.day));

  // Mode split
  const modeMap = new Map<string, { pnl: number; trades: number }>();
  for (const row of sorted) {
    const mode = (row.mode ?? "unknown").toLowerCase();
    const delta = effectivePnlDelta(row);
    const cur = modeMap.get(mode) ?? { pnl: 0, trades: 0 };
    cur.pnl += delta;
    cur.trades += 1;
    modeMap.set(mode, cur);
  }
  const modeSplit: ModeSplitEntry[] = [...modeMap.entries()].map(([mode, v]) => ({
    mode,
    pnl: Math.round(v.pnl * 100) / 100,
    trades: v.trades,
  }));

  // Top pairs
  const pairMap = new Map<string, { pnl: number; trades: number }>();
  for (const row of sorted) {
    const pair = row.trading_pair || "—";
    const delta = effectivePnlDelta(row);
    const cur = pairMap.get(pair) ?? { pnl: 0, trades: 0 };
    cur.pnl += delta;
    cur.trades += 1;
    pairMap.set(pair, cur);
  }
  const topPairs: TopPairEntry[] = [...pairMap.entries()]
    .map(([pair, v]) => ({
      pair,
      pnl: Math.round(v.pnl * 100) / 100,
      trades: v.trades,
    }))
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
    .slice(0, 8);

  // Aggregates
  const baseAggregates = aggregateTradeHistoryStats(sorted);
  const totalEffectivePnl = sorted.reduce((s, row) => s + effectivePnlDelta(row), 0);

  let effectiveWinCount = 0;
  let effectiveLossCount = 0;
  let effectiveBreakevenCount = 0;
  for (const row of sorted) {
    const d = effectivePnlDelta(row);
    if (d > 0) effectiveWinCount += 1;
    else if (d < 0) effectiveLossCount += 1;
    else effectiveBreakevenCount += 1;
  }

  const aggregates: TradeAnalyticsAggregates = {
    ...baseAggregates,
    totalEffectivePnl: Math.round(totalEffectivePnl * 100) / 100,
    effectiveWinCount,
    effectiveLossCount,
    effectiveBreakevenCount,
  };

  // Win/loss slices
  const WIN_COLOR = "#10b981";
  const LOSS_COLOR = "#f43f5e";
  const NEUTRAL_COLOR = "#64748b";

  const winLossSlices = ([
    { key: "win" as const, value: effectiveWinCount, fill: WIN_COLOR },
    { key: "loss" as const, value: effectiveLossCount, fill: LOSS_COLOR },
    { key: "breakeven" as const, value: effectiveBreakevenCount, fill: NEUTRAL_COLOR },
  ] as WinLossSlice[]).filter((s) => s.value > 0);

  // Best/worst day
  let bestDay: DailyPnlPoint | null = null;
  let worstDay: DailyPnlPoint | null = null;
  for (const d of dailyPnl) {
    if (!bestDay || d.pnl > bestDay.pnl) bestDay = d;
    if (!worstDay || d.pnl < worstDay.pnl) worstDay = d;
  }

  // Risk metrics
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

  const riskMetrics: RiskMetrics = {
    sortinoRatio: safeMetric(raw.sortinoRatio),
    calmarRatio: safeMetric(raw.calmarRatio),
    var95: safeMetric(raw.var95),
    var99: safeMetric(raw.var99),
    expectedShortfall95: safeMetric(raw.expectedShortfall95),
    omegaRatio: safeMetric(raw.omegaRatio),
    maxConsecutiveLosses: raw.maxConsecutiveLosses,
    avgTimeToRecovery: Math.round(raw.avgTimeToRecovery * 10) / 10,
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

// ──────────────────────────────────────────────
// Edge Function Handler
// ──────────────────────────────────────────────

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return errorResponse("Missing authorization header", 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse("Unauthorized", 401);
    }

    if (req.method !== "GET") {
      return errorResponse("Method not allowed", 405);
    }

    // Query trades
    const { data: rows, error } = await supabase
      .from("trades")
      .select(
        "id, trading_pair, side, realized_pnl, mode, created_at, executed_at, total_value",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(MAX_TRADES);

    if (error) {
      console.error("[trading-analytics] Query error:", error.message);
      return errorResponse(error.message, 500);
    }

    const trades = (rows ?? []) as TradeRow[];

    // Build analytics
    let built: TradingAnalyticsPayload;
    try {
      built = buildTradingAnalytics(trades, new Date().toISOString());
    } catch (buildErr) {
      const buildMsg = buildErr instanceof Error ? buildErr.message : "Unknown build error";
      console.error("[trading-analytics] buildTradingAnalytics failed:", buildMsg);
      return errorResponse("Failed to compute analytics: " + buildMsg, 500);
    }

    // Format response (mirroring the Next.js API response shape)
    const body = {
      ok: true,
      generatedAt: built.generatedAt,
      tradeCount: built.tradeCount,
      aggregates: built.aggregates,
      cumulativePnl: built.cumulativePnl,
      dailyPnl: built.dailyPnl,
      modeSplit: built.modeSplit,
      topPairs: built.topPairs,
      winLossSlices: built.winLossSlices,
      bestDay: built.bestDay,
      worstDay: built.worstDay,
      riskMetrics: built.riskMetrics,
    };

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, no-store, max-age=0",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type, x-cron-secret, x-api-key",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[trading-analytics] Error:", msg);
    return errorResponse(msg, 500);
  }
});
