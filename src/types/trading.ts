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

// ============================================================================
// TRADE REASON CODES - For brukerforklaringer
// ============================================================================

export type TradeReasonCode =
  // Kjøp-reasons
  | "RSI_DIP_BUY"           // RSI falt under terskel -> kjøp
  | "SMA_CROSSOVER_BUY"     // SMA kort krysset over lang -> kjøp
  | "TREND_BREAKOUT_BUY"    // Pris brøt over trendlinje -> kjøp
  | "GRID_BUY"              // Pris falt til grid-nivå -> kjøp
  | "DCA_INTERVAL_BUY"      // DCA interval nådd -> kjøp
  | "MULTI_SIGNAL_BUY"      // Flere signaler alignet -> kjøp
  | "MEAN_REVERSION_BUY"    // Pris under gjennomsnitt -> kjøp
  // Salg-reasons
  | "TAKE_PROFIT_SELL"      // Målpris nådd -> selg
  | "STOP_LOSS_SELL"        // Stoploss nådd -> selg
  | "TRAILING_TP_SELL"      // Trailing take profit -> selg
  | "PARTIAL_TP_SELL"       // Delvis gevinstsikring -> selg
  | "TREND_REVERSAL_SELL"   // Trend reversering -> selg
  | "SMA_CROSSOVER_SELL"    // SMA kort krysset under lang -> selg
  // Risk/Guardrail blocks
  | "DAILY_DRAWDOWN_HIT"    // Daglig tapsgrense nådd -> blokker
  | "EDGE_FILTER_SKIP"      // For lav forventet edge -> skip
  | "GLOBAL_RISK_LIMIT_HIT" // Global risiko-limit nådd -> blokker
  | "MANUAL_SELL"           // Bruker solgte manuelt
  // Dark Fleet AI/ML reasons
  | "DARK_FLEET_ENSEMBLE_BUY"   // AI ensemble ga kjøpssignal
  | "DARK_FLEET_ENSEMBLE_SELL"  // AI ensemble ga salgssignal
  | "DARK_FLEET_REGIME_HOLD"    // Regime usikkert -> hold
  | "DARK_FLEET_ML_RISK_BLOCKED" // ML risk for høy -> blokker
  | "UNKNOWN";              // Ukjent årsak (fallback)

export interface TradeReasonParams {
  rsi?: number;                    // RSI verdi ved trade
  smaFast?: number;               // Kort SMA verdi
  smaSlow?: number;               // Lang SMA verdi
  priceChange24h?: number;        // Prisendring siste 24t (%)
  dropFromPeak?: number;          // Fall fra topp (%)
  gridLevel?: number;             // Grid nivå
  intervalMinutes?: number;       // DCA interval
  profitPct?: number;             // Gevinst prosent
  lossPct?: number;               // Tap prosent
  drawdownPct?: number;           // Drawdown prosent
  expectedEdge?: number;          // Forventet edge etter fees
  confidence?: number;            // Signal konfidens
  [key: string]: number | string | undefined;
}

export interface IndicatorSnapshot {
  rsi?: number;
  macd?: number;
  macd_signal?: number;
  sma_20?: number;
  sma_50?: number;
  price?: number;
  price_24h_ago?: number;
  volatility?: number;
  timestamp: string;
}

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
  /** NOK-konvertert kapital (live: USDC→NOK, paper: lik current_capital). */
  current_capital_nok?: number | null;
  /** NOK-denominert startkapital — riktig baseline for drawdown-beregning. */
  starting_capital_nok?: number | null;
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
  /** FIFO lot-tracking for correct cost basis (added 2026-04) */
  lots?: Array<{
    id: string;
    quantity: number;
    entryPrice: number;
    timestamp: string;
    originalQuantity: number;
  }>;
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

  // Explanation & Reasoning (Nytt for trade forklaring)
  reason_code?: TradeReasonCode;
  reason_params?: TradeReasonParams;
  indicator_snapshot?: IndicatorSnapshot;

  // Timestamps
  opened_at?: string;
  closed_at?: string;
  executed_at: string;
  created_at: string;

  // 🎭 PilotTrade
  pilot_trade?: boolean;
  pilot_explanation?: string | null;
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
 * Kraken Connection Status
 */
export interface KrakenConnection {
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
