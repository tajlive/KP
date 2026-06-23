/**
 * Unified Trading Core Types
 *
 * Shared types for the consolidated paper/live execution pipeline.
 */

import type { TradeReasonCode } from "@/types/trading";

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
  leverage?: number;
  metadata?: {
    maxSlippageBps?: number;
  };
  /** Optional deterministic idempotency key (defaults to runtime-generated). */
  idempotencyKey?: string;
  /** Optional trade explanation reason code for audit/explanation UI. */
  reasonCode?: TradeReasonCode;
  /** Optional trade explanation parameters. */
  reasonParams?: Record<string, unknown>;
  /** Optional indicator snapshot for audit/explanation UI. */
  indicatorSnapshot?: Record<string, unknown>;
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
