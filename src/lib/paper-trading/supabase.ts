/**
 * Paper Trading Supabase Service
 * Handles persistent storage of simulations, trades, and strategies
 * 
 * MIGRATION NOTE: This file now uses trading_sessions table (unified schema)
 * instead of the deprecated paper_simulations table.
 * 
 * Column Mapping:
 * - trading_sessions.initial_capital → PaperSimulation.initial_balance
 * - trading_sessions.current_capital → PaperSimulation.current_balance
 * - trading_sessions.status === 'active' → PaperSimulation.is_active = true
 * - trading_sessions.strategy_id → PaperSimulation.preset
 * - trading_sessions.strategy_config → PaperSimulation.settings
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
 * Map trading_sessions row to PaperSimulation type
 */
function mapToPaperSimulation(data: Record<string, unknown>): PaperSimulation {
  return {
    id: data.id as string,
    user_id: data.user_id as string,
    created_at: data.created_at as string,
    updated_at: (data.updated_at as string) || (data.created_at as string),
    preset: (data.strategy_id as RiskLevel) || 'standard',
    initial_balance: (data.initial_capital as number) || (data.starting_capital_nok as number) || 100000,
    current_balance: (data.current_capital as number) || (data.current_capital_nok as number) || 100000,
    total_pnl: (data.total_pnl as number) || 0,
    total_pnl_pct: data.total_pnl 
      ? (((data.total_pnl as number) / ((data.initial_capital as number) || 100000)) * 100)
      : 0,
    max_drawdown: (data.max_drawdown as number) || 0,
    sharpe_ratio: (data.sharpe_ratio as number) || null,
    win_rate: data.winning_trades && data.total_trades
      ? ((data.winning_trades as number) / (data.total_trades as number)) * 100
      : null,
    total_trades: (data.total_trades as number) || 0,
    winning_trades: (data.winning_trades as number) || 0,
    losing_trades: (data.losing_trades as number) || 0,
    avg_trade_return: (data.avg_trade_return as number) || 0,
    is_active: (data.status as string) === 'active',
    started_at: (data.started_at as string) || (data.created_at as string),
    ended_at: (data.stopped_at as string) || null,
    settings: (data.strategy_config as Record<string, unknown>) || RISK_PRESETS[(data.strategy_id as RiskLevel) || 'standard'],
  };
}

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
    .from('trading_sessions')
    .insert({
      user_id: userId,
      strategy_id: riskLevel,
      initial_capital: initialBalance,
      current_capital: initialBalance,
      strategy_config: preset,
      mode: 'paper',
      status: 'active',
      started_at: new Date().toISOString(),
      trading_pair: 'BTC/USDT',
    })
    .select()
    .single() as any;

  if (error) {
    console.error('Error creating simulation:', error);
    return null;
  }

  return mapToPaperSimulation(data);
}

/**
 * Get user's active simulation
 */
export async function getActiveSimulation(userId: string): Promise<PaperSimulation | null> {
  const { data, error } = await supabase
    .from('trading_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('mode', 'paper')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single() as any;

  if (error || !data) return null;
  return mapToPaperSimulation(data);
}

/**
 * Get all user's simulations
 */
export async function getUserSimulations(userId: string): Promise<PaperSimulation[]> {
  const { data, error } = await supabase
    .from('trading_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('mode', 'paper')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching simulations:', error);
    return [];
  }

  return (data || []).map(mapToPaperSimulation);
}

/**
 * Update simulation stats
 */
export async function updateSimulation(
  simulationId: string,
  updates: Partial<PaperSimulation>
): Promise<boolean> {
  // Map PaperSimulation fields to trading_sessions fields
  const dbUpdates: Record<string, unknown> = {};
  
  if (updates.current_balance !== undefined) dbUpdates.current_capital = updates.current_balance;
  if (updates.total_pnl !== undefined) dbUpdates.total_pnl = updates.total_pnl;
  if (updates.total_trades !== undefined) dbUpdates.total_trades = updates.total_trades;
  if (updates.winning_trades !== undefined) dbUpdates.winning_trades = updates.winning_trades;
  if (updates.losing_trades !== undefined) dbUpdates.losing_trades = updates.losing_trades;
  if (updates.is_active !== undefined) dbUpdates.status = updates.is_active ? 'active' : 'stopped';
  
  const { error } = await supabase
    .from('trading_sessions')
    .update({ ...dbUpdates, updated_at: new Date().toISOString() })
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
  const { error } = await supabase
    .from('trading_sessions')
    .update({
      status: 'stopped',
      stopped_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', simulationId);

  if (error) {
    console.error('Error ending simulation:', error);
    return false;
  }

  return true;
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
      session_id: simulationId,
      user_id: trade.metadata?.user_id,
      trading_pair: trade.symbol,
      side: trade.side === 'LONG' ? 'buy' : 'sell',
      amount: trade.quantity,
      price: trade.entry_price,
      fee: 0,
      status: trade.status === 'OPEN' ? 'pending' : 'executed',
      idempotency_key: `${Date.now()}-${Math.random()}`,
      executed_at: trade.opened_at,
    })
    .select()
    .single() as any;

  if (error) {
    console.error('Error creating trade:', error);
    return null;
  }

  return data as PaperTrade;
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
      status: 'executed',
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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
    .eq('session_id', simulationId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching trades:', error);
    return [];
  }

  return data as PaperTrade[] || [];
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
    .from('trading_sessions')
    .insert({
      user_id: userId,
      strategy_id: riskLevel,
      mode: 'paper',
      initial_capital: backtestResult.initial_balance,
      current_capital: backtestResult.final_balance,
      total_pnl: backtestResult.final_balance - backtestResult.initial_balance,
      winning_trades: winningTrades,
      losing_trades: losingTrades,
      total_trades: backtestResult.total_trades,
      status: 'stopped',
      strategy_config: { ...preset, strategy: strategyId },
      started_at: backtestResult.start_date,
      stopped_at: backtestResult.end_date,
      trading_pair: backtestResult.symbol,
    })
    .select()
    .single() as any;

  if (error) {
    console.error('Error saving backtest:', error);
    return null;
  }

  // Insert trades
  if (data) {
    const trades = backtestResult.trades.map(trade => ({
      session_id: data.id,
      trading_pair: backtestResult.symbol,
      side: trade.side === 'LONG' ? 'buy' : 'sell',
      price: trade.entry_price,
      amount: trade.quantity,
      fee: 0,
      pnl: trade.pnl,
      status: 'executed',
      executed_at: trade.entry_time,
      idempotency_key: `${Date.now()}-${Math.random()}`,
    }));

    await supabase.from('trades').insert(trades);
  }

  return mapToPaperSimulation(data);
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
    .single() as any;

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
    .single() as any;

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
        filter: `session_id=eq.${simulationId}`
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
    .eq('session_id', simulationId)
    .eq('status', 'executed');

  if (error || !trades) return null;

  const winningTrades = trades.filter((t: Record<string, unknown>) => ((t.pnl as number) || 0) > 0);
  const losingTrades = trades.filter((t: Record<string, unknown>) => ((t.pnl as number) || 0) <= 0);

  const totalProfit = winningTrades.reduce((sum: number, t: Record<string, unknown>) => sum + ((t.pnl as number) || 0), 0);
  const totalLoss = Math.abs(losingTrades.reduce((sum: number, t: Record<string, unknown>) => sum + ((t.pnl as number) || 0), 0));

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
