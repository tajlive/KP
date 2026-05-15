/**
 * Backtest vs Live Gap Analysis
 * Compares backtest results with live trading outcomes per strategy.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export interface GapMetrics {
  period: { hours: number; start: string; end: string };
  strategies: StrategyGap[];
  summary: {
    worstGapPct: number;
    avgGapPct: number;
    totalLiveReturn: number;
    totalBacktestReturn: number;
    overallGapPct: number;
    alertTriggered: boolean;
  };
}

export interface StrategyGap {
  strategyId: string;
  liveReturnPct: number;
  backtestReturnPct: number;
  gapPct: number;
  liveTrades: number;
  backtestTrades: number;
  attribution: {
    slippage: number;
    fees: number;
    latency: number;
    other: number;
  };
}

export async function calculateBacktestLiveGap(
  supabase: ReturnType<typeof createClient<Database>>,
  hours: number = 24,
): Promise<GapMetrics> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  // Fetch live trades with strategy info
  const { data: liveTrades, error } = await supabase
    .from("trades")
    .select("realized_pnl, total_value, fee, strategy_signal, trading_sessions(strategy_id)")
    .gte("executed_at", since)
    .eq("status", "filled")
    .eq("mode", "paper");

  if (error) throw new Error(`Gap query failed: ${error.message}`);
  if (!liveTrades || liveTrades.length === 0) {
    return emptyGap(hours, since);
  }

  // Group by strategy
  const byStrategy: Record<string, { live: typeof liveTrades; backtestPnL: number }> = {};

  for (const t of liveTrades) {
    const sid = (t as any).strategy_id ?? (t as any).strategy_signal?.regime ?? "unknown";
    byStrategy[sid] = byStrategy[sid] ?? { live: [], backtestPnL: 0 };
    byStrategy[sid].live.push(t);
  }

  // Fetch backtest results for same strategies
  const { data: backtests } = await supabase
    .from("backtest_results")
    .select("strategy_id, total_return_pct, total_trades")
    .in("strategy_id", Object.keys(byStrategy))
    .order("created_at", { ascending: false })
    .limit(1);

  const backtestMap = new Map((backtests as any ?? []).map((b: any) => [b.strategy_id, b]));

  const strategies: StrategyGap[] = [];
  let totalLiveReturn = 0;
  let totalBacktestReturn = 0;
  let totalLiveVolume = 0;

  for (const [strategyId, data] of Object.entries(byStrategy)) {
    const livePnL = data.live.reduce((sum, t) => sum + Number(t.realized_pnl ?? 0), 0);
    const liveVolume = data.live.reduce((sum, t) => sum + Number(t.total_value ?? 0), 0);
    const liveFees = data.live.reduce((sum, t) => sum + Number(t.fee ?? 0), 0);
    const liveReturnPct = liveVolume > 0 ? (livePnL / liveVolume) * 100 : 0;

    const bt = backtestMap.get(strategyId);
    const backtestReturnPct = (bt as any)?.total_return_pct ?? 0;
    const backtestVolume = (bt as any)?.total_trades ? (bt as any).total_trades * 1000 : 0;

    const gapPct = backtestReturnPct !== 0
      ? ((liveReturnPct - backtestReturnPct) / Math.abs(backtestReturnPct)) * 100
      : 0;

    // Attribution: estimate where the gap comes from
    const slippageEstimate = liveFees * 0.5; // Assume half of fee excess is slippage
    const feeAttribution = liveFees;
    const latencyEstimate = gapPct > 0 ? 0 : Math.abs(gapPct) * 0.2; // 20% of gap from latency
    const other = Math.max(0, Math.abs(gapPct) - (feeAttribution / liveVolume) * 100 - latencyEstimate);

    totalLiveReturn += livePnL;
    totalBacktestReturn += backtestReturnPct * (backtestVolume / 100);
    totalLiveVolume += liveVolume;

    strategies.push({
      strategyId,
      liveReturnPct,
      backtestReturnPct,
      gapPct,
      liveTrades: data.live.length,
      backtestTrades: (bt as any)?.total_trades ?? 0,
      attribution: {
        slippage: (slippageEstimate / liveVolume) * 100,
        fees: (feeAttribution / liveVolume) * 100,
        latency: latencyEstimate,
        other,
      },
    });
  }

  const overallGapPct = totalBacktestReturn !== 0
    ? ((totalLiveReturn - totalBacktestReturn) / Math.abs(totalBacktestReturn)) * 100
    : 0;

  const gaps = strategies.map((s) => s.gapPct);
  const worstGapPct = gaps.length > 0 ? Math.min(...gaps) : 0;
  const avgGapPct = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;

  return {
    period: { hours, start: since, end: new Date().toISOString() },
    strategies: strategies.sort((a, b) => a.gapPct - b.gapPct),
    summary: {
      worstGapPct,
      avgGapPct,
      totalLiveReturn: totalLiveReturn,
      totalBacktestReturn: totalBacktestReturn,
      overallGapPct,
      alertTriggered: worstGapPct < -20 || avgGapPct < -10,
    },
  };
}

function emptyGap(hours: number, since: string): GapMetrics {
  return {
    period: { hours, start: since, end: new Date().toISOString() },
    strategies: [],
    summary: {
      worstGapPct: 0,
      avgGapPct: 0,
      totalLiveReturn: 0,
      totalBacktestReturn: 0,
      overallGapPct: 0,
      alertTriggered: false,
    },
  };
}
