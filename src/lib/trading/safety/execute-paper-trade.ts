/**
 * KLA-137: Paper Trade Execution with Safety Layer
 * 
 * PHYSICALLY SEPARATED from live trading path.
 * This function can NEVER send orders to exchange.
 */

import { createClient } from "@/lib/supabase/server";
import { 
  validateTradeAgainstRiskProfile, 
  recordTradeRejection, 
  recordTradeDecision,
  type TradeRequest 
} from "./risk-validator";

export interface PaperTradeRequest {
  userId: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  orderType?: "market" | "limit";
  botId?: string;
}

export interface PaperTradeResult {
  success: boolean;
  tradeId?: string;
  newBalance: number;
  rejectionReason?: string;
  error?: string;
}

/**
 * Execute a paper trade with full safety validation
 * 
 * SAFETY GUARANTEE: This function ONLY interacts with Supabase.
 * It can NEVER send orders to any exchange.
 */
export async function executePaperTrade(
  request: PaperTradeRequest
): Promise<PaperTradeResult> {
  const supabase = await createClient();

  try {
    // 1. Get or create paper trading session
    const { data: session, error: sessionError } = await supabase
      .from("trading_sessions")
      .select("id, user_id, current_capital_nok, status, mode")
      .eq("user_id" as unknown, request.userId)
      .eq("mode", "paper")
      .eq("status", "active")
      .single() as unknown;

    if (sessionError || !session) {
      // Auto-create session if none exists
      const { data: newSession, error: createError } = await supabase
        .from("trading_sessions")
        .insert({
          user_id: request.userId,
          mode: "paper",
          status: "active",
          strategy: "manual",
          trading_pair: request.symbol,
          starting_capital_nok: 100000,
          current_capital_nok: 100000,
          started_at: new Date().toISOString(),
        })
        .select()
        .single() as unknown;

      if (createError || !newSession) {
        return {
          success: false,
          error: "Failed to create paper trading session",
        };
      }

      // Retry with new session
      return executePaperTrade(request);
    }

    // 2. Build trade request for validation
    const tradeRequest: TradeRequest = {
      userId: request.userId,
      sessionId: session.id,
      symbol: request.symbol,
      side: request.side,
      quantity: request.quantity,
      price: request.price,
      orderType: request.orderType || "market",
      tradingMode: "paper",
      botId: request.botId,
    };

    // 3. VALIDATE against risk profile (CRITICAL SAFETY CHECK)
    const validationResult = await validateTradeAgainstRiskProfile(tradeRequest);

    if (!validationResult.allowed) {
      // Record rejection for audit
      await recordTradeRejection(tradeRequest, validationResult);
      await recordTradeDecision(tradeRequest, validationResult);

      return {
        success: false,
        rejectionReason: validationResult.rejectionReason,
        error: `Trade rejected: ${validationResult.rejectionReason}`,
      };
    }

    // 4. Calculate trade value
    const orderValue = request.quantity * request.price;
    const currentBalance = Number(session.current_capital_nok);

    // Double-check balance (defense in depth)
    if (request.side === "buy" && orderValue > currentBalance) {
      const rejectionResult = {
        allowed: false as const,
        rejectionReason: "INSUFFICIENT_BALANCE" as const,
        rejectionDetails: { required: orderValue, available: currentBalance },
      };
      await recordTradeRejection(tradeRequest, rejectionResult);
      
      return {
        success: false,
        rejectionReason: "INSUFFICIENT_BALANCE",
        error: "Insufficient balance for this trade",
      };
    }

    // 5. Calculate new balance (paper simulation)
    const newBalance = request.side === "buy"
      ? currentBalance - orderValue
      : currentBalance + orderValue;

    // 6. Record trade in database
    const { data: trade, error: tradeError } = await supabase
      .from("trades")
      .insert({
        session_id: session.id,
        user_id: request.userId,
        trading_pair: request.symbol,
        side: request.side,
        amount: request.quantity,
        price: request.price,
        total_value: orderValue,
        fee: 0, // Paper trading has no fees
        status: "executed",
        mode: "paper",
        idempotency_key: `${session.id}-${Date.now()}-${Math.random()}`,
        executed_at: new Date().toISOString(),
      })
      .select()
      .single() as unknown;

    if (tradeError) {
      console.error("[PaperTrade] Failed to record trade:", tradeError);
      return {
        success: false,
        error: "Failed to record paper trade",
      };
    }

    // 7. Update session balance
    const { error: updateError } = await supabase
      .from("trading_sessions")
      .update({
        current_capital_nok: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id);

    if (updateError) {
      console.error("[PaperTrade] Failed to update balance:", updateError);
      // Don't fail - trade is already recorded
    }

    // 8. Record successful decision
    await recordTradeDecision(tradeRequest, validationResult, request.quantity, request.price);

    return {
      success: true,
      tradeId: trade.id,
      newBalance,
    };

  } catch (error) {
    console.error("[PaperTrade] Unexpected error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error executing paper trade",
    };
  }
}
