/**
 * Unified Trading Types - Single Source of Truth
 * All trading operations use trading_sessions and trades tables only
 */

export type TradingMode = "paper" | "live";
export type SessionStatus = "active" | "paused" | "crashed" | "stopped";
export type TradeSide = "buy" | "sell";
export type TradeStatus =
  | "pending"
  | "filled"
  | "partially_filled"
  | "cancelled"
  | "failed";
export type OrderType = "market" | "limit" | "stop_loss" | "take_profit";
export type TradingPhase = "paper" | "micro" | "small" | "full";

/**
 * Risk Configuration - embedded in trading_sessions.risk_config
 */
export interface RiskConfig {
  maxPositionSizePercent: number;
  stopLossPercent: number;
  trailingStopLossPercent?: number;
  maxDailyLossPercent: number;
  maxDailyTrades: number;
  maxDrawdownPercent: number;
  maxLeverage: number;
}

/**
 * Unified Trading Session - Single source of truth
 * Maps 1:1 with trading_sessions table
 */
export interface TradingSession {
  id: string;
  user_id: string;
  mode: TradingMode;
  status: SessionStatus;

  // Strategy
  strategy_id: string;
  strategy_config: {
    phase?: TradingPhase;
    original_strategy_name?: string;
    [key: string]: unknown;
  };
  trading_pair: string;

  // Capital & Risk
  current_capital: number;
  initial_capital: number;
  allocated_capital_pct: number;
  phase: TradingPhase;
  risk_config: RiskConfig;

  // Position State
  open_position: OpenPosition | null;

  // Performance
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  total_pnl: number;
  max_drawdown_pct: number;

  // Recovery
  last_heartbeat: string;
  last_tick_at: string | null;
  crash_count: number;

  // References
  config_id?: string;
  copy_source_session_id?: string; // If this is a copy trading session, link to source

  // Lifecycle
  started_at: string;
  stopped_at: string | null;
  ended_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Open Position - stored as JSONB in trading_sessions.open_position
 */
export interface OpenPosition {
  side: "long" | "short";
  quantity: number;
  entry_price: number;
  entry_time: string;
  highest_price?: number; // Trailing TP: tracks peak price since entry
}

/**
 * Unified Trade - Single source of truth
 * Maps 1:1 with trades table
 */
export interface Trade {
  id: string;
  session_id: string;
  user_id: string;
  idempotency_key: string;

  // Trade Details
  mode: TradingMode;
  trading_pair: string;
  side: TradeSide;
  order_type: OrderType;

  // Quantities
  quantity: number;
  price: number;
  exit_price?: number;
  total_value: number;
  fee: number;

  // Status
  status: TradeStatus;

  // PnL
  realized_pnl: number | null;

  // Risk Management
  stop_loss_price?: number;
  take_profit_price?: number;
  close_reason?: string;

  // Copy Trading
  leader_trade_id: string | null;
  is_copy: boolean;

  // External
  binance_order_id: string | null;

  // Metadata
  strategy_signal: Record<string, unknown> | null;

  // Timestamps
  opened_at?: string;
  closed_at?: string;
  executed_at: string;
  created_at: string;
}

/**
 * API Request/Response Types
 */
export interface StartSessionRequest {
  strategy_id: string;
  trading_pair: string;
  mode: TradingMode;
  initial_capital: number;
  strategy_config?: Record<string, unknown>;
}

export interface StartSessionResponse {
  session: TradingSession;
}

export interface ExecuteTradeRequest {
  session_id: string;
  side: TradeSide;
  quantity: number;
  price: number;
  order_type?: OrderType;
  idempotency_key: string;
  strategy_signal?: Record<string, unknown>;
}

export interface RiskCheckResult {
  allowed: boolean;
  reason?: string;
  suggestedAmount?: number;
  currentExposure?: number;
}

// ============================================================================
// LEGACY TYPES (for backward compatibility during migration)
// ============================================================================

/**
 * Trading Mode State - UI state management
 * @deprecated Use TradingSession instead
 */
export interface TradingModeState {
  mode: TradingMode;
  canSwitchToLive: boolean;
  paperBalance: number;
  liveBalance: number | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Binance Connection Status
 */
export interface BinanceConnection {
  isConnected: boolean;
  apiKeyLast4: string | null;
  connectedAt: string | null;
  balance: number | null;
}

/**
 * Copy Trading Requirements
 */
export interface CopyTradingRequirements {
  minPaperTrades: number;
  minSubscriptionTier: "student" | "bachelor" | "master" | "phd" | "professor";
  allowedModes: TradingMode[];
}

/**
 * Copy Trading Status
 */
export interface CopyTradingStatus {
  canCopyTrade: boolean;
  reason?: string;
  paperTradesCount: number;
  currentMode: TradingMode;
  subscriptionTier: string;
}

/**
 * Auto Trading Configuration
 */
export interface AutoTradingConfig {
  enabled: boolean;
  strategy: "conservative" | "moderate" | "aggressive";
  maxPositionSize: number;
  maxDailyTrades: number;
  stopLossPercent: number;
  takeProfitPercent: number;
}

// ============================================================================
// Zod Schemas for validation (re-exported from shared)
// ============================================================================

export {
  ExecuteTradeSchema,
  StartSessionSchema,
  StopSessionSchema,
} from "@/lib/shared";

/**
 * Leaderboard Trader (KLA-6)
 */
export interface LeaderboardTrader {
  id: string;
  rank: number;
  name: string;
  pnl_percent: number;
  trades_count: number;
  win_rate: number;
  is_user?: boolean;
  risk_score: "Lav" | "Medium" | "Høy";
  sharpe_ratio: number;
  sparkline_data: number[];
}
