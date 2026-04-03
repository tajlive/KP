/**
 * KLA-137: Paper Trade Execution with Safety Layer
 *
 * DEPRECATED WRAPPER: This file is now a thin wrapper around executeTrade.
 * Use executeTrade(supabase, request) directly for new code.
 *
 * PHYSICALLY SEPARATED from live trading path.
 * This function can NEVER send orders to exchange.
 */

import { createClient } from "@/lib/supabase/server";
import { executeTrade } from "@/lib/trading/core/execute-trade";
import type { ExecuteTradeRequest, ExecuteTradeResult } from "@/lib/trading/core/types";

/** @deprecated Use ExecuteTradeRequest from @/lib/trading/core/execute-trade */
export interface PaperTradeRequest {
  userId: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  orderType?: "market" | "limit";
  botId?: string;
  sessionId?: string;
}

/** @deprecated Use ExecuteTradeResult from @/lib/trading/core/execute-trade */
export interface PaperTradeResult {
  success: boolean;
  tradeId?: string;
  sessionId?: string;
  newBalance?: number;
  rejectionReason?: string;
  error?: string;
}

/**
 * Execute a paper trade with full safety validation
 *
 * SAFETY GUARANTEE: This function ONLY interacts with Supabase.
 * It can NEVER send orders to any exchange.
 *
 * @deprecated Use executeTrade(supabase, request) directly. This wrapper maintains
 * backwards compatibility by using service-role client internally.
 */
export async function executePaperTrade(
  request: PaperTradeRequest,
): Promise<PaperTradeResult> {
  const supabase = createClient();

  const execRequest: ExecuteTradeRequest = {
    userId: request.userId,
    sessionId: request.sessionId, // Will be resolved inside executeTrade
    symbol: request.symbol,
    side: request.side,
    quantity: request.quantity,
    price: request.price,
    orderType: request.orderType || "market",
    mode: "paper",
    botId: request.botId,
  };

  const result: ExecuteTradeResult = await executeTrade(supabase, execRequest);

  return {
    success: result.success,
    tradeId: result.tradeId,
    sessionId: result.sessionId,
    newBalance: result.newBalance,
    rejectionReason: result.rejectionReason,
    error: result.error,
  };
}
