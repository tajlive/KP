/**
 * Paper Trading Types for Klarpakke
 * 1M USD simulator with 5 risk levels
 */

export type RiskLevel = 'auto_low' | 'low' | 'standard' | 'high' | 'extreme';

export type StrategyType = 'ma_crossover' | 'rsi' | 'macd' | 'bollinger' | 'breakout' | 'ai_ml';

export interface Strategy {
  id: StrategyType;
  name: string;
  nameEn: string;
  description: string;
  complexity: 'simple' | 'medium' | 'advanced';
}

export interface RiskPreset {
  id: RiskLevel;
  name: string;
  nameEn: string;
  description: string;
  color: string;
  icon: string;
  position_pct: number;        // % of portfolio per trade (0.02 = 2%)
  max_drawdown_pct: number;    // Max allowed drawdown before stop
  atr_mult: number;            // ATR multiplier for stop-loss
  volatility_scale: number;    // Volatility scaling factor
  max_positions: number;       // Max concurrent positions
  leverage_max: number;        // Max leverage allowed
  stop_loss_pct: number;       // Default stop-loss %
  take_profit_pct: number;     // Default take-profit %
  trailing_stop: boolean;      // Enable trailing stop
  rebalance_freq: 'daily' | 'weekly' | 'monthly';
}

export interface PaperSimulation {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  preset: RiskLevel;
  initial_balance: number;     // Always 1_000_000 for consistency
  current_balance: number;
  total_pnl: number;
  total_pnl_pct: number;
  max_drawdown: number;
  sharpe_ratio: number | null;
  win_rate: number | null;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  avg_trade_return: number;
  is_active: boolean;
  started_at: string | null;
  ended_at: string | null;
  settings: RiskPreset;
}

export interface PaperTrade {
  id: string;
  simulation_id: string;
  created_at: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  position_value: number;
  leverage: number;
  stop_loss: number;
  take_profit: number;
  pnl: number | null;
  pnl_pct: number | null;
  status: 'OPEN' | 'CLOSED' | 'STOPPED';
  opened_at: string;
  closed_at: string | null;
  close_reason: 'TAKE_PROFIT' | 'STOP_LOSS' | 'MANUAL' | 'LIQUIDATED' | null;
  metadata: {
    signal_id?: string;
    risk_level: RiskLevel;
    notes?: string;
  };
}

export interface LeaderboardEntry {
  id: string;
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
  user_id: string;
  user_display_name: string;
  avatar_url: string | null;
  simulation_id: string;
  return_pct: number;
  sharpe_ratio: number;
  win_rate: number;
  total_trades: number;
  rank: number;
  previous_rank: number | null;
  created_at: string;
  updated_at?: string;
  risk_level: RiskLevel;
  is_public: boolean;
}

export interface BacktestResult {
  symbol: string;
  start_date: string;
  end_date: string;
  initial_balance: number;
  final_balance: number;
  total_return_pct: number;
  max_drawdown_pct: number;
  sharpe_ratio: number;
  win_rate: number;
  total_trades: number;
  avg_trade_return: number;
  profit_factor: number;
  trades: BacktestTrade[];
  strategy?: string;
}

export interface BacktestTrade {
  entry_time: string;
  exit_time: string;
  side: 'LONG' | 'SHORT';
  entry_price: number;
  exit_price: number;
  quantity: number;
  pnl: number;
  pnl_pct: number;
  exit_reason: 'TAKE_PROFIT' | 'STOP_LOSS' | 'SIGNAL';
}

export interface BacktestParams {
  symbol: string;
  coinId?: string;
  startDate: string;
  endDate: string;
  riskPreset: RiskLevel;
  initialBalance: number;
  strategyId?: StrategyType;
  strategyParams?: Record<string, number | string>;
}

// WebWorker message types
export type WorkerMessage =
  | { type: 'START_BACKTEST'; params: BacktestParams }
  | { type: 'CANCEL' }
  | { type: 'PROGRESS'; data: { current: number; total: number; trade?: BacktestTrade } }
  | { type: 'COMPLETE'; result: BacktestResult }
  | { type: 'ERROR'; error: string };
