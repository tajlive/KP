/**
 * Paper Trading Supabase Service
 * Handles persistent storage of simulations, trades, and strategies
 */

import { createClient } from '@supabase/supabase-js';
import {
  PaperSimulation, PaperTrade, LeaderboardEntry,
  RiskLevel, BacktestResult
} from '@/types/paper-trading';
import { RISK_PRESETS } from './presets';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Create a new paper trading simulation
 */
export async function createSimulation(
  userId: string,
  riskLevel: RiskLevel,
  initialBalance: number = 1_000_000
): Promise<PaperSimulation | null> {
  const preset = RISK_PRESETS[riskLevel];

  const { data, error } = await supabase
    .from('paper_simulations')
    .insert({
      user_id: userId,
      preset_id: riskLevel,
      initial_balance: initialBalance,
      current_balance: initialBalance,
      settings: preset,
      is_active: true,
      started_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating simulation:', error);
    return null;
  }

  return data;
}

/**
 * Get user's active simulation
 */
export async function getActiveSimulation(userId: string): Promise<PaperSimulation | null> {
  const { data, error } = await supabase
    .from('paper_simulations')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Get all user's simulations
 */
export async function getUserSimulations(userId: string): Promise<PaperSimulation[]> {
  const { data, error } = await supabase
    .from('paper_simulations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching simulations:', error);
    return [];
  }

  return data || [];
}

/**
 * Update simulation stats
 */
export async function updateSimulation(
  simulationId: string,
  updates: Partial<PaperSimulation>
): Promise<boolean> {
  const { error } = await supabase
    .from('paper_simulations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', simulationId);

  if (error) {
    console.error('Error updating simulation:', error);
    return false;
  }

  return true;
}

/**
 * End simulation (close it)
 */
export async function endSimulation(simulationId: string): Promise<boolean> {
  return updateSimulation(simulationId, {
    is_active: false,
    ended_at: new Date().toISOString()
  });
}

/**
 * Create a new paper trade
 */
export async function createTrade(
  simulationId: string,
  trade: Omit<PaperTrade, 'id' | 'created_at' | 'updated_at'>
): Promise<PaperTrade | null> {
  const { data, error } = await supabase
    .from('trades')
    .insert({
      simulation_id: simulationId,
      symbol: trade.symbol,
      side: trade.side,
      entry_price: trade.entry_price,
      exit_price: trade.exit_price,
      quantity: trade.quantity,
      position_value: trade.position_value,
      leverage: trade.leverage,
      stop_loss: trade.stop_loss,
      take_profit: trade.take_profit,
      pnl: trade.pnl,
      pnl_pct: trade.pnl_pct,
      status: trade.status,
      opened_at: trade.opened_at,
      closed_at: trade.closed_at,
      close_reason: trade.close_reason,
      metadata: trade.metadata
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating trade:', error);
    return null;
  }

  return data;
}

/**
 * Close a trade
 */
export async function closeTrade(
  tradeId: string,
  exitPrice: number,
  pnl: number,
  reason: PaperTrade['close_reason']
): Promise<boolean> {
  const { error } = await supabase
    .from('trades')
    .update({
      exit_price: exitPrice,
      pnl: pnl,
      pnl_pct: (pnl / (exitPrice * 1)) * 100, // Approximate
      status: 'CLOSED',
      closed_at: new Date().toISOString(),
      close_reason: reason,
      updated_at: new Date().toISOString()
    })
    .eq('id', tradeId);

  if (error) {
    console.error('Error closing trade:', error);
    return false;
  }

  return true;
}

/**
 * Get trades for a simulation
 */
export async function getSimulationTrades(simulationId: string): Promise<PaperTrade[]> {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('simulation_id', simulationId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching trades:', error);
    return [];
  }

  return data || [];
}

/**
 * Save backtest result as simulation
 */
export async function saveBacktestResult(
  userId: string,
  riskLevel: RiskLevel,
  backtestResult: BacktestResult,
  strategyId: string
): Promise<PaperSimulation | null> {
  const preset = RISK_PRESETS[riskLevel];

  const winningTrades = backtestResult.trades.filter(t => t.pnl > 0).length;
  const losingTrades = backtestResult.trades.filter(t => t.pnl <= 0).length;

  const { data, error } = await supabase
    .from('paper_simulations')
    .insert({
      user_id: userId,
      preset_id: riskLevel,
      initial_balance: backtestResult.initial_balance,
      current_balance: backtestResult.final_balance,
      total_pnl: backtestResult.final_balance - backtestResult.initial_balance,
      total_pnl_pct: backtestResult.total_return_pct,
      max_drawdown: backtestResult.max_drawdown_pct,
      sharpe_ratio: backtestResult.sharpe_ratio,
      win_rate: backtestResult.win_rate,
      total_trades: backtestResult.total_trades,
      winning_trades: winningTrades,
      losing_trades: losingTrades,
      avg_trade_return: backtestResult.avg_trade_return,
      is_active: false,
      settings: { ...preset, strategy: strategyId },
      started_at: backtestResult.start_date,
      ended_at: backtestResult.end_date
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving backtest:', error);
    return null;
  }

  // Insert trades
  if (data) {
    const trades = backtestResult.trades.map(trade => ({
      simulation_id: data.id,
      symbol: backtestResult.symbol,
      side: trade.side,
      entry_price: trade.entry_price,
      exit_price: trade.exit_price,
      quantity: trade.quantity,
      position_value: trade.entry_price * trade.quantity,
      pnl: trade.pnl,
      pnl_pct: trade.pnl_pct,
      status: 'CLOSED',
      opened_at: trade.entry_time,
      closed_at: trade.exit_time,
      close_reason: trade.exit_reason,
      metadata: { strategy: strategyId }
    }));

    await supabase.from('trades').insert(trades);
  }

  return data;
}

/**
 * Get leaderboard
 */
export async function getLeaderboard(
  period: 'daily' | 'weekly' | 'monthly' | 'all_time' = 'weekly',
  limit: number = 50
): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('leaderboard_entries')
    .select('*')
    .eq('period', period)
    .eq('is_public', true)
    .order('rank', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }

  return data || [];
}

/**
 * Get user's rank
 */
export async function getUserRank(
  userId: string,
  period: 'daily' | 'weekly' | 'monthly' | 'all_time' = 'weekly'
): Promise<LeaderboardEntry | null> {
  const { data, error } = await supabase
    .from('leaderboard_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('period', period)
    .single();

  if (error) return null;
  return data;
}

/**
 * Save saved strategy
 */
export interface SavedStrategy {
  id?: string;
  user_id: string;
  name: string;
  risk_level: RiskLevel;
  strategy_type: string;
  strategy_params: Record<string, number | string>;
  backtest_result?: BacktestResult;
  is_favorite: boolean;
  created_at?: string;
}

export async function saveStrategy(strategy: SavedStrategy): Promise<SavedStrategy | null> {
  const { data, error } = await supabase
    .from('saved_strategies')
    .insert(strategy)
    .select()
    .single();

  if (error) {
    console.error('Error saving strategy:', error);
    return null;
  }

  return data;
}

export async function getSavedStrategies(userId: string): Promise<SavedStrategy[]> {
  const { data, error } = await supabase
    .from('saved_strategies')
    .select('*')
    .eq('user_id', userId)
    .order('is_favorite', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching strategies:', error);
    return [];
  }

  return data || [];
}

export async function deleteStrategy(strategyId: string): Promise<boolean> {
  const { error } = await supabase
    .from('saved_strategies')
    .delete()
    .eq('id', strategyId);

  if (error) {
    console.error('Error deleting strategy:', error);
    return false;
  }

  return true;
}

/**
 * Subscribe to simulation updates
 */
export function subscribeToSimulation(
  simulationId: string,
  callback: (payload: unknown) => void
) {
  return supabase
    .channel(`simulation:${simulationId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'trades',
        filter: `simulation_id=eq.${simulationId}`
      },
      callback
    )
    .subscribe();
}

/**
 * Get simulation statistics
 */
export async function getSimulationStats(simulationId: string) {
  const { data: trades, error } = await supabase
    .from('trades')
    .select('*')
    .eq('simulation_id', simulationId)
    .eq('status', 'CLOSED');

  if (error || !trades) return null;

  const winningTrades = trades.filter(t => (t.pnl || 0) > 0);
  const losingTrades = trades.filter(t => (t.pnl || 0) <= 0);

  const totalProfit = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));

  return {
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
    avgWin: winningTrades.length > 0 ? totalProfit / winningTrades.length : 0,
    avgLoss: losingTrades.length > 0 ? totalLoss / losingTrades.length : 0,
    profitFactor: totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0,
    totalProfit,
    totalLoss
  };
}
