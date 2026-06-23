/**
 * Shared strategy types — used by BOTH tick engine and backtest engine.
 * This ensures backtest results MATCH real bot behavior exactly.
 */

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StrategyPosition {
  side: "long" | "short";
  quantity: number;
  entry_price: number;
  entry_time: string;
  highest_price?: number;
  partial_exits_executed?: number[];
  lots?: Array<{
    id: string;
    quantity: number;
    entryPrice: number;
    timestamp: string;
    originalQuantity: number;
  }>;
}

export interface MinimalSession {
  open_position: StrategyPosition | null;
  last_tick_at: string | null;
  strategy_config: Record<string, unknown>;
}

export interface StrategySignal {
  action: "buy" | "sell" | "hold";
  /** Fraction of capital to allocate (used for buys). */
  positionSize?: number;
  /** Absolute quantity to trade (used for partial sells). Takes precedence over positionSize for sells. */
  quantity?: number;
  indicators?: Record<string, unknown>;
  reason?: string;
}

export interface StrategyInput {
  candles: Candle[];
  session: MinimalSession;
  config: Record<string, unknown>;
  /** Override current time (for backtesting). Defaults to Date.now(). */
  currentTime?: number;
}

export interface StrategyEngine {
  evaluate(input: StrategyInput): StrategySignal;
}

/** Valid engine keys for the tick engine */
export type TickStrategyEngineKey = "dca" | "trend_follow" | "multi_signal" | "grid" | "ai_copy" | "hybrid_arbitrage" | "ensemble_ai";
