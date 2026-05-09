import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export interface AutopilotMetrics {
  total_pnl_nok: number;
  total_pnl_pct: number;
  max_drawdown_pct: number;
  win_rate: number;
  expectancy: number;
  profit_factor: number;
  sharpe_ratio: number;
  avg_win_nok: number;
  avg_loss_nok: number;
  total_trades: number;
  consecutive_losses: number;
}

/**
 * Calculate professional-grade trading metrics from actual trade history.
 *
 * Research: Stoic.ai targets Sharpe > 2.0, drawdown < 20%.
 * Expectancy < 0 = the bot is losing money over time (regardless of win rate).
 * Profit Factor > 1.5 = robust strategy. < 1.0 = losing strategy.
 */
export async function calculateAutopilotMetrics(
  db: SupabaseClient<Database>,
  userId: string,
  totalInitial: number
): Promise<AutopilotMetrics> {
  // Fetch all realized trades for this user's paper sessions
  const { data: trades } = await db
    .from("trades")
    .select("realized_pnl, side, quantity, price, created_at")
    .eq("user_id", userId)
    .eq("mode", "paper")
    .not("realized_pnl", "is", null)
    .order("created_at", { ascending: true });

  const pnls = (trades ?? [])
    .map((t) => t.realized_pnl ?? 0)
    .filter((p) => p !== 0);

  if (pnls.length === 0) {
    return {
      total_pnl_nok: 0,
      total_pnl_pct: 0,
      max_drawdown_pct: 0,
      win_rate: 0,
      expectancy: 0,
      profit_factor: 0,
      sharpe_ratio: 0,
      avg_win_nok: 0,
      avg_loss_nok: 0,
      total_trades: 0,
      consecutive_losses: 0,
    };
  }

  const wins = pnls.filter((p) => p > 0);
  const losses = pnls.filter((p) => p < 0);

  const totalPnl = pnls.reduce((sum, p) => sum + p, 0);
  const winRate = wins.length / pnls.length;
  const avgWin = wins.length > 0 ? wins.reduce((sum, p) => sum + p, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, p) => sum + p, 0) / losses.length) : 0;

  // Expectancy = (Win% × AvgWin) - (Loss% × AvgLoss)
  const lossRate = 1 - winRate;
  const expectancy = winRate * avgWin - lossRate * avgLoss;

  // Profit Factor = Total Wins / Total Losses
  const totalWins = wins.reduce((sum, p) => sum + p, 0);
  const totalLosses = Math.abs(losses.reduce((sum, p) => sum + p, 0));
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

  // Sharpe Ratio (simplified): mean return / std dev of returns
  // Using daily returns approximation from trade PnLs
  const meanPnl = totalPnl / pnls.length;
  const variance = pnls.reduce((sum, p) => sum + Math.pow(p - meanPnl, 2), 0) / pnls.length;
  const stdDev = Math.sqrt(variance);
  // Approximate: assume each trade is "one day" of return for simplicity
  // In production, group by day for proper Sharpe
  const sharpeRatio = stdDev > 0 ? (meanPnl / stdDev) * Math.sqrt(252) : 0;

  // Max drawdown from cumulative equity curve
  let peak = totalInitial;
  let current = totalInitial;
  let maxDrawdown = 0;
  for (const pnl of pnls) {
    current += pnl;
    if (current > peak) peak = current;
    const dd = ((peak - current) / peak) * 100;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  // Consecutive losses
  let maxConsecutiveLosses = 0;
  let currentStreak = 0;
  for (const pnl of pnls) {
    if (pnl < 0) {
      currentStreak++;
      if (currentStreak > maxConsecutiveLosses) maxConsecutiveLosses = currentStreak;
    } else {
      currentStreak = 0;
    }
  }

  return {
    total_pnl_nok: Math.round(totalPnl * 100) / 100,
    total_pnl_pct: totalInitial > 0 ? Math.round((totalPnl / totalInitial) * 10000) / 100 : 0,
    max_drawdown_pct: Math.round(maxDrawdown * 100) / 100,
    win_rate: Math.round(winRate * 10000) / 100,
    expectancy: Math.round(expectancy * 100) / 100,
    profit_factor: Math.round(profitFactor * 100) / 100,
    sharpe_ratio: Math.round(sharpeRatio * 100) / 100,
    avg_win_nok: Math.round(avgWin * 100) / 100,
    avg_loss_nok: Math.round(avgLoss * 100) / 100,
    total_trades: pnls.length,
    consecutive_losses: maxConsecutiveLosses,
  };
}
