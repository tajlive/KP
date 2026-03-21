import {
  aggregateTradeHistoryStats,
  type TradeHistoryAggregates,
} from "@/lib/trading/trade-history-aggregates";

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

/** Aggregates from closed-position P&L plus net settlement flow for fills without realized_pnl. */
export type TradingAnalyticsAggregates = TradeHistoryAggregates & {
  totalEffectivePnl: number;
};

function normalizeSide(side: string): "buy" | "sell" | "other" {
  const s = side.trim().toLowerCase();
  if (s === "buy" || s === "long" || s === "b") return "buy";
  if (s === "sell" || s === "short" || s === "s") return "sell";
  return "other";
}

/**
 * Per-trade contribution for charts and headline totals.
 * Prefer DB `realized_pnl` when set; otherwise approximate with signed notional
 * (buy = cash out, sell = cash in) so paper fills without closed-loop P&L still move charts.
 */
export function effectivePnlDelta(row: TradeAnalyticsInput): number {
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
};

const WIN_COLOR = "#10b981";
const LOSS_COLOR = "#f43f5e";
const NEUTRAL_COLOR = "#64748b";
const UNKNOWN_COLOR = "#475569";

export function buildTradingAnalytics(
  trades: TradeAnalyticsInput[],
  generatedAt = new Date().toISOString(),
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
  const aggregates: TradingAnalyticsAggregates = {
    ...baseAggregates,
    totalEffectivePnl: Math.round(totalEffectivePnl * 100) / 100,
  };

  const winLossSlices = [
    { key: "win" as const, value: aggregates.winCount, fill: WIN_COLOR },
    { key: "loss" as const, value: aggregates.lossCount, fill: LOSS_COLOR },
    {
      key: "breakeven" as const,
      value: aggregates.breakevenCount,
      fill: NEUTRAL_COLOR,
    },
    {
      key: "unknown" as const,
      value: aggregates.noRealizedPnlCount,
      fill: UNKNOWN_COLOR,
    },
  ].filter((s) => s.value > 0);

  let bestDay: { day: string; pnl: number } | null = null;
  let worstDay: { day: string; pnl: number } | null = null;
  for (const d of dailyPnl) {
    if (!bestDay || d.pnl > bestDay.pnl) bestDay = d;
    if (!worstDay || d.pnl < worstDay.pnl) worstDay = d;
  }

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
  };
}
