/**
 * Auto-Trading System Types
 * Defines all types for the automated trading system
 */

export type RiskLevel =
  | "conservative"
  | "balanced"
  | "aggressive"
  | "custom"
  | "dynamic";

export type TradingPhase = "paper" | "micro" | "small" | "full";

export type TradeStatus = "OPEN" | "CLOSED" | "STOPPED" | "LIQUIDATED";

export type SessionStatus = "ACTIVE" | "PAUSED" | "STOPPED" | "ERROR";

export type TradeSide = "LONG" | "SHORT";

export type CloseReason =
  | "take_profit"
  | "stop_loss"
  | "trailing_stop"
  | "partial_take_profit"
  | "manual"
  | "circuit_breaker"
  | "daily_limit"
  | "timeout";

export type StrategyType = "trend" | "grid" | "dca" | "momentum";

export type CircuitBreakerTrigger =
  | "daily_loss_limit"
  | "consecutive_losses"
  | "high_volatility"
  | "flash_crash"
  | "low_liquidity"
  | "api_error"
  | "manual";

export type CircuitBreakerAction = "pause" | "stop" | "reduce_position";

export interface AutoTradingStrategy {
  id: string;
  name: string;
  risk_level: RiskLevel;
  description: string;
  timeframe?: string; // '1m', '5m', '15m', '1h', '4h', '1d'
  max_position_size_pct: number;
  stop_loss_pct: number;
  take_profit_pct?: number;
  daily_loss_limit_pct: number;
  max_trades_per_day: number;
  allow_long: boolean;
  allow_short: boolean;
  max_leverage: number;
  allowed_symbols: string[];
  expected_annual_return_pct?: number;
  is_active: boolean;
}

export interface UserAutoTradingConfig {
  id: string;
  user_id: string;
  strategy_id: string;

  // Aliases for backward compatibility with existing code
  selected_strategy?: string; // alias for strategy_id
  risk_level?: RiskLevel; // from related strategy
  max_capital?: number; // alias for trading_capital_nok
  daily_loss_limit?: number; // percentage
  max_position_size?: number; // percentage
  auto_rebalance?: boolean;

  is_enabled: boolean;
  is_paper_trading: boolean;
  trading_capital_nok: number;

  // Phase progression
  phase: TradingPhase;
  phase_started_at: string;
  phase_min_days: number;
  phase_profitable: boolean;
  allocated_capital_pct: number;

  // Custom parameters
  custom_params?: Record<string, unknown>;

  // Overrides
  override_stop_loss_pct?: number;
  override_daily_loss_limit_pct?: number;
  override_max_trades_per_day?: number;

  // Auto profit extraction
  auto_extract_profit_enabled: boolean;
  auto_extract_profit_threshold_pct: number;
  auto_extract_profit_amount_pct: number;

  // Timestamps
  created_at: string;
  updated_at: string;
  last_trade_at?: string;
}

export interface AutoTradingSession {
  id: string;
  user_id: string;
  config_id: string;
  strategy_name: string;
  is_paper_trading: boolean;
  phase: TradingPhase;

  // Capital tracking
  starting_capital_nok: number;
  current_capital_nok: number;
  allocated_capital_pct: number;

  // Aliases for backward compatibility
  initial_balance?: number; // alias for starting_capital_nok
  current_balance?: number; // alias for current_capital_nok
  peak_balance?: number; // peak capital tracking
  total_pnl?: number; // total pnl tracking

  // Performance
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  total_pnl_nok: number;
  total_pnl_pct: number;
  max_drawdown_pct: number;

  // Position tracking (FIFO ledger, same as paper trading)
  open_position?: {
    side: "long" | "short";
    quantity: number;
    entry_price: number;
    entry_time: string;
    highest_price?: number;
    lowest_price?: number;
    lots?: Array<{
      id: string;
      quantity: number;
      entryPrice: number;
      timestamp: string;
      originalQuantity: number;
    }>;
  } | null;

  // Status
  status: SessionStatus;
  pause_reason?: string;
  paused_reason?: string; // alias
  paused_at?: string;
  stopped_at?: string;
  stop_reason?: string;

  // Timestamps
  started_at: string;
  ended_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AutoTradingTrade {
  id: string;
  session_id: string;
  user_id: string;

  // Trade details
  symbol: string;
  side: TradeSide;
  entry_price: number;
  exit_price?: number;
  quantity: number;
  position_value_nok: number;
  leverage: number;
  
  // Paper trading flag
  is_paper?: boolean;

  // Aliases for backward compatibility
  amount?: number; // alias for position_value_nok
  price?: number; // alias for entry_price
  current_price?: number; // current market price
  direction?: TradeSide; // alias for side

  // Risk management
  stop_loss_price?: number;
  take_profit_price?: number;
  stop_loss_pct?: number;

  // Trailing stop
  trailing_stop_enabled?: boolean;
  trailing_stop_activation_pct?: number; // Når trailing starter (f.eks. 5%)
  trailing_stop_distance_pct?: number; // Avstand fra høyeste (f.eks. 3%)
  highest_price?: number; // Høyeste pris nådd (for LONG)
  lowest_price?: number; // Laveste pris nådd (for SHORT)

  // Partial profit taking
  partial_tp_enabled?: boolean;
  partial_tp_levels?: Array<{
    target_pct: number; // F.eks. 8%
    sell_pct: number; // F.eks. 30% (selg 30% av posisjon)
    executed: boolean;
  }>;

  // Aliases
  stop_loss?: number; // alias for stop_loss_price
  take_profit?: number; // alias for take_profit_price

  // Performance
  pnl_nok?: number;
  pnl_pct?: number;
  fees_nok: number;

  // Aliases
  realized_pnl?: number; // alias for pnl_nok
  realized_pnl_percent?: number; // alias for pnl_pct
  unrealized_pnl?: number; // unrealized pnl
  unrealized_pnl_percent?: number;

  // Status
  status: TradeStatus;
  close_reason?: CloseReason;

  // Aliases
  closed_reason?: CloseReason; // alias for close_reason
  binance_order_id?: string;
  binance_close_order_id?: string;

  // Risk metrics
  risk_score?: number;
  market_volatility_pct?: number;

  // Strategy info
  strategy_used?: string;
  risk_level?: RiskLevel;
  market_regime?: string;
  ml_confidence?: number;
  kelly_percentage?: number;
  referral_code?: string;

  // Timestamps
  opened_at: string;
  closed_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface TradingSignal {
  symbol: string;
  side: TradeSide;

  // Aliases for backward compatibility
  direction?: TradeSide; // alias for side
  price?: number; // alias for entry_price

  confidence: number; // 0-100
  entry_price: number;
  stop_loss_price: number;
  take_profit_price?: number;
  position_size_pct: number;
  leverage: number;
  risk_score: number; // 0-100
  market_volatility_pct: number;
  reason: string;

  // Trailing stop configuration
  trailing_stop?: {
    enabled: boolean;
    activation_pct: number; // F.eks. 5% - når trailing starter
    distance_pct: number; // F.eks. 3% - avstand fra høyeste
  };

  // Partial profit taking configuration
  partial_tp_levels?: Array<{
    target_pct: number;
    sell_pct: number;
  }>;
}

export interface RiskMetrics {
  daily_pnl_nok: number;
  daily_pnl_pct: number;
  daily_trades: number;
  consecutive_losses: number;
  market_volatility: number;
  current_drawdown_pct: number;
  can_trade: boolean;
  warnings: string[];
}

export interface PhaseProgressionStatus {
  current_phase: TradingPhase;
  days_in_phase: number;
  days_required: number;
  is_profitable: boolean;
  can_advance: boolean;
  next_phase?: TradingPhase;
  reason?: string;
}

export interface TradingAlert {
  id: string;
  user_id: string;
  session_id?: string;
  trade_id?: string;
  category: string;
  priority: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  message: string;
  explanation: {
    what: string;
    why: string;
    impact: string;
  };
  data?: {
    pnl?: number;
    pnlPercent?: number;
    portfolioValue?: number;
    currentPrice?: number;
    entryPrice?: number;
    symbol?: string;
    side?: "LONG" | "SHORT";
    stopLoss?: number;
    takeProfit?: number;
    currentDrawdown?: number;
    dailyPnl?: number;
  };
  actions: AlertAction[];
  lesson?: {
    topic: string;
    content: string;
    keyTakeaway: string;
  };
  created_at: string;
  expires_at?: string;
  acknowledged: boolean;
}

export interface AlertAction {
  id: string;
  label: string;
  description: string;
  type: "primary" | "secondary" | "danger" | "link";
  action: string;
  data?: Record<string, unknown>;
}
