/**
 * Unified Trading Core Types
 *
 * Shared types for the consolidated paper/live execution pipeline.
 */

export type TradingMode = "paper" | "live";

export interface TradeSignalContext {
  action: "buy" | "sell" | "hold";
  confidence: number;
  regime?: string;
  strategy?: string;
  sizingPct?: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  trailingStopPct?: number;
  reason?: string;
  narrative?: string;
  indicators?: Record<string, unknown>;
}

export interface ExecuteTradeRequest {
  userId: string;
  sessionId?: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  orderType: "market" | "limit";
  mode: TradingMode;
  botId?: string;
  signalContext?: TradeSignalContext;
  metadata?: {
    maxSlippageBps?: number;
  };
}

export interface ExecuteTradeResult {
  success: boolean;
  tradeId?: string;
  sessionId?: string;
  orderId?: string;
  executedPrice?: number;
  executedQuantity?: number;
  fee?: number;
  newBalance?: number;
  rejectionReason?: string;
  error?: string;
}

export interface TradingApiError {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}
