/**
 * KLA-137: Live Trade Execution with Safety Layer
 *
 * DEPRECATED WRAPPER: This file is now a thin wrapper around executeTrade.
 * Use executeTrade(supabase, request) directly for new code.
 *
 * PHYSICALLY SEPARATED from paper trading path.
 * Can ONLY execute if ALL safety checks pass.
 * Requires explicit tier/permission verification.
 */

import { createClient } from "@/lib/supabase/server";
import { executeTrade } from "@/lib/trading/core/execute-trade";
import type { ExecuteTradeRequest, ExecuteTradeResult } from "@/lib/trading/core/types";

/** @deprecated Use ExecuteTradeRequest from @/lib/trading/core/execute-trade */
export interface LiveTradeRequest {
  userId: string;
  sessionId: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price?: number;
  orderType: "market" | "limit";
  botId?: string;
}

/** @deprecated Use ExecuteTradeResult from @/lib/trading/core/execute-trade */
export interface LiveTradeResult {
  success: boolean;
  tradeId?: string;
  orderId?: string;
  executedPrice?: number;
  executedQuantity?: number;
  fee?: number;
  rejectionReason?: string;
  error?: string;
}

/**
 * Execute a live trade with full safety validation
 *
 * SAFETY REQUIREMENTS:
 * - User must have Bachelor tier or higher
 * - Binance must be connected
 * - All risk limits must be satisfied
 * - Session must be active
 * - Bot must be healthy (if specified)
 *
 * @deprecated Use executeTrade(supabase, request) directly. This wrapper maintains
 * backwards compatibility by using service-role client internally.
 */
export async function executeLiveTrade(
  request: LiveTradeRequest,
): Promise<LiveTradeResult> {
  const supabase = createClient();

  const execRequest: ExecuteTradeRequest = {
    userId: request.userId,
    sessionId: request.sessionId,
    symbol: request.symbol,
    side: request.side,
    quantity: request.quantity,
    price: request.price || 0,
    orderType: request.orderType,
    mode: "live",
    botId: request.botId,
  };

  const result: ExecuteTradeResult = await executeTrade(supabase, execRequest);

  return {
    success: result.success,
    tradeId: result.tradeId,
    orderId: result.orderId,
    executedPrice: result.executedPrice,
    executedQuantity: result.executedQuantity,
    fee: result.fee,
    rejectionReason: result.rejectionReason,
    error: result.error,
  };
}
