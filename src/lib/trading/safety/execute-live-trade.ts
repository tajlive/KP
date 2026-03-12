/**
 * KLA-137: Live Trade Execution with Safety Layer
 * 
 * PHYSICALLY SEPARATED from paper trading path.
 * Can ONLY execute if ALL safety checks pass.
 * Requires explicit tier/permission verification.
 */

import { createClient } from "@/lib/supabase/server";
import { ExecutorFactory } from "../executor-factory";
import { 
  validateTradeAgainstRiskProfile, 
  recordTradeRejection, 
  recordTradeDecision,
  type TradeRequest,
  type RejectionReason
} from "./risk-validator";

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

export interface LiveTradeResult {
  success: boolean;
  tradeId?: string;
  orderId?: string;
  executedPrice?: number;
  executedQuantity?: number;
  fee?: number;
  rejectionReason?: RejectionReason | "LIVE_NOT_ALLOWED";
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
 */
export async function executeLiveTrade(
  request: LiveTradeRequest
): Promise<LiveTradeResult> {
  const supabase = await createClient();

  try {
    // 1. VERIFISER live trading tillatelse (EKSTRA SIKKERHET)
    const canTradeLive = await ExecutorFactory.canTradeLive(request.userId);
    
    if (!canTradeLive) {
      const rejectionResult = {
        allowed: false as const,
        rejectionReason: "LIVE_NOT_ALLOWED" as const,
        rejectionDetails: { 
          message: "Live trading requires Bachelor tier and Binance connection" 
        },
      };
      
      // Record as trade rejection for audit
      const tradeRequest: TradeRequest = {
        userId: request.userId,
        sessionId: request.sessionId,
        symbol: request.symbol,
        side: request.side,
        quantity: request.quantity,
        price: request.price || 0,
        orderType: request.orderType,
        tradingMode: "live",
        botId: request.botId,
      };
      await recordTradeRejection(tradeRequest, rejectionResult);

      return {
        success: false,
        rejectionReason: "LIVE_NOT_ALLOWED",
        error: "Live trading requires Bachelor tier or higher and connected exchange",
      };
    }

    // 2. Hent session og verifiser
    const { data: session, error: sessionError } = await supabase
      .from("trading_sessions")
      .select("id, user_id, current_capital_nok, status, mode, risk_config")
      .eq("id", request.sessionId)
      .eq("user_id" as any, request.userId)
      .eq("mode", "live")
      .single() as any;

    if (sessionError || !session) {
      return {
        success: false,
        error: "Live trading session not found",
      };
    }

    if (session.status !== "active") {
      return {
        success: false,
        error: `Session is ${session.status}, cannot execute live trades`,
      };
    }

    // 3. Build trade request for validation
    const currentPrice = request.price || await fetchQuickPrice(request.symbol);
    
    const tradeRequest: TradeRequest = {
      userId: request.userId,
      sessionId: session.id,
      symbol: request.symbol,
      side: request.side,
      quantity: request.quantity,
      price: currentPrice,
      orderType: request.orderType,
      tradingMode: "live",
      botId: request.botId,
    };

    // 4. VALIDATE against risk profile (CRITICAL SAFETY CHECK)
    const validationResult = await validateTradeAgainstRiskProfile(tradeRequest);

    if (!validationResult.allowed) {
      await recordTradeRejection(tradeRequest, validationResult);
      await recordTradeDecision(tradeRequest, validationResult);

      return {
        success: false,
        rejectionReason: validationResult.rejectionReason,
        error: `Live trade rejected: ${validationResult.rejectionReason}`,
      };
    }

    // 5. Pre-flight balance check
    const orderValue = request.quantity * currentPrice;
    const currentBalance = Number(session.current_capital_nok);
    const estimatedFee = orderValue * 0.001; // 0.1%
    const totalCost = orderValue + estimatedFee;

    if (request.side === "buy" && totalCost > currentBalance) {
      const rejectionResult = {
        allowed: false as const,
        rejectionReason: "INSUFFICIENT_BALANCE" as const,
        rejectionDetails: { required: totalCost, available: currentBalance },
      };
      await recordTradeRejection(tradeRequest, rejectionResult);

      return {
        success: false,
        rejectionReason: "INSUFFICIENT_BALANCE",
        error: `Insufficient balance. Required: ${totalCost.toFixed(2)}, Available: ${currentBalance.toFixed(2)}`,
      };
    }

    // 6. Kjør risk config fra session hvis finnes
    const riskConfig = session.risk_config as Record<string, number> | null;
    if (riskConfig?.maxPositionSizePercent) {
      const maxPositionValue = currentBalance * (riskConfig.maxPositionSizePercent / 100);
      if (orderValue > maxPositionValue) {
        const rejectionResult = {
          allowed: false as const,
          rejectionReason: "POSITION_LIMIT_EXCEEDED" as const,
          rejectionDetails: { maxAllowed: maxPositionValue, requested: orderValue },
        };
        await recordTradeRejection(tradeRequest, rejectionResult);

        return {
          success: false,
          rejectionReason: "POSITION_LIMIT_EXCEEDED",
          error: `Order exceeds max position size: ${maxPositionValue.toFixed(2)}`,
        };
      }
    }

    // 7. EXECUTE via BinanceExecutor
    const executor = await ExecutorFactory.createFromSession(session.id);

    const execResult = await executor.executeOrder({
      symbol: request.symbol,
      side: request.side,
      quantity: request.quantity,
      orderType: request.orderType,
      price: request.price,
    });

    if (!execResult.success) {
      return {
        success: false,
        error: execResult.error || "Live execution failed",
      };
    }

    // 8. Record trade in database
    const idempotencyKey = `${session.id}-${Date.now()}-${execResult.orderId}`;
    
    const { data: trade, error: tradeError } = await supabase
      .from("trades")
      .insert({
        session_id: session.id,
        user_id: request.userId,
        trading_pair: request.symbol,
        side: request.side,
        amount: execResult.executedQuantity,
        price: execResult.executedPrice,
        total_value: (execResult.executedQuantity || 0) * (execResult.executedPrice || 0),
        fee: execResult.fee,
        status: "filled",
        mode: "live",
        binance_order_id: execResult.orderId,
        idempotency_key: idempotencyKey,
        executed_at: execResult.timestamp.toISOString(),
      })
      .select()
      .single() as any;

    if (tradeError) {
      console.error("[LiveTrade] Failed to record trade:", tradeError);
      // Trade executed but not recorded - critical error
      return {
        success: true, // Trade DID execute on exchange
        orderId: execResult.orderId,
        executedPrice: execResult.executedPrice,
        executedQuantity: execResult.executedQuantity,
        fee: execResult.fee,
        error: "Trade executed but failed to save to database",
      };
    }

    // 9. Record successful decision
    await recordTradeDecision(
      tradeRequest, 
      validationResult, 
      execResult.executedQuantity, 
      execResult.executedPrice
    );

    // 10. Update balance atomically
    const netValue = request.side === "buy"
      ? (execResult.executedQuantity || 0) * (execResult.executedPrice || 0) + (execResult.fee || 0)
      : (execResult.executedQuantity || 0) * (execResult.executedPrice || 0) - (execResult.fee || 0);

    const { error: balanceError } = await supabase.rpc(
      request.side === "buy" ? "decrement_capital" : "increment_capital",
      {
        p_session_id: session.id,
        p_amount: netValue,
        p_user_id: request.userId,
      }
    );

    if (balanceError) {
      console.error("[LiveTrade] Failed to update balance:", balanceError);
    }

    return {
      success: true,
      tradeId: trade.id,
      orderId: execResult.orderId,
      executedPrice: execResult.executedPrice,
      executedQuantity: execResult.executedQuantity,
      fee: execResult.fee,
    };

  } catch (error) {
    console.error("[LiveTrade] Unexpected error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error executing live trade",
    };
  }
}

/**
 * Fetch quick price from Binance for validation
 */
async function fetchQuickPrice(symbol: string): Promise<number> {
  try {
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) return 0;
    const data = await res.json();
    return parseFloat(data.price);
  } catch {
    return 0;
  }
}
