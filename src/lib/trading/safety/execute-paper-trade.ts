/**
 * KLA-137: Paper Trade Execution with Safety Layer
 *
 * PHYSICALLY SEPARATED from live trading path.
 * This function can NEVER send orders to exchange.
 */

import { createClient } from "@/lib/supabase/server";
import { getUsdtToNokRateAsync, usdtToNok } from "@/lib/trading/currency";
import {
  validateTradeAgainstRiskProfile,
  recordTradeRejection,
  recordTradeDecision,
  type TradeRequest,
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
  /** Present when success is true; can be 0 on error for convenience */
  newBalance?: number;
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
  request: PaperTradeRequest,
): Promise<PaperTradeResult> {
  const supabase = createClient();

  try {
    // 1. Get or create paper trading session (én rad: .single() feiler ved flere aktive)
    const { data: session, error: sessionError } = await supabase
      .from("trading_sessions")
      .select("id, user_id, current_capital_nok, current_capital, status, mode")
      .eq("user_id", request.userId)
      .eq("mode", "paper")
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionError || !session) {
      const now = new Date().toISOString();
      const capital = 100000;
      const { data: newSession, error: createError } = await supabase
        .from("trading_sessions")
        .insert({
          user_id: request.userId,
          mode: "paper",
          status: "active",
          strategy_id: "dca",
          strategy_config: {},
          trading_pair: request.symbol.toUpperCase(),
          starting_capital_nok: capital,
          current_capital_nok: capital,
          initial_capital: capital,
          current_capital: capital,
          total_pnl: 0,
          winning_trades: 0,
          losing_trades: 0,
          total_trades: 0,
          started_at: now,
          last_heartbeat: now,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (createError || !newSession) {
        return {
          success: false,
          error: "Failed to create paper trading session",
        };
      }

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
    const validationResult =
      await validateTradeAgainstRiskProfile(tradeRequest);

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

    // 4. Calculate trade value (Binance price is USDT; session balance is NOK)
    const rate = await getUsdtToNokRateAsync(supabase);
    const orderValueUsdt = request.quantity * request.price;
    const orderValueNok = usdtToNok(orderValueUsdt, rate);
    const currentBalance = Number(
      session.current_capital_nok ?? session.current_capital ?? 0,
    );

    // Double-check balance (defense in depth)
    if (request.side === "buy" && orderValueNok > currentBalance) {
      const rejectionResult = {
        allowed: false as const,
        rejectionReason: "INSUFFICIENT_BALANCE" as const,
        rejectionDetails: {
          required: orderValueNok,
          available: currentBalance,
        },
      };
      await recordTradeRejection(tradeRequest, rejectionResult);

      return {
        success: false,
        rejectionReason: "INSUFFICIENT_BALANCE",
        error: "Insufficient balance for this trade",
      };
    }

    // 5. Calculate new balance (paper simulation, in NOK)
    const newBalance =
      request.side === "buy"
        ? currentBalance - orderValueNok
        : currentBalance + orderValueNok;

    // 6. Record trade (total_value i NOK). status må være gyldig enum/text (filled).
    const { data: trade, error: tradeError } = await supabase
      .from("trades")
      .insert({
        session_id: session.id,
        user_id: request.userId,
        trading_pair: request.symbol,
        side: request.side,
        quantity: request.quantity,
        price: request.price,
        total_value: orderValueNok,
        fee: 0, // Paper trading has no fees
        status: "filled",
        mode: "paper",
        order_type: request.orderType ?? "market",
        idempotency_key: `${session.id}-${Date.now()}-${Math.random()}`,
        executed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (tradeError) {
      console.error("[PaperTrade] Failed to record trade:", tradeError);
      return {
        success: false,
        error: "Failed to record paper trade",
      };
    }

    // 7. Synkroniser NOK-felt med current_capital etter DB-trigger (trigger oppdaterer current_capital)
    const { data: sessionAfter, error: readErr } = await supabase
      .from("trading_sessions")
      .select("current_capital")
      .eq("id", session.id)
      .maybeSingle();

    if (readErr) {
      console.error(
        "[PaperTrade] Failed to read session after trade:",
        readErr,
      );
    }

    const synced =
      sessionAfter?.current_capital != null
        ? Number(sessionAfter.current_capital)
        : newBalance;

    const { error: updateError } = await supabase
      .from("trading_sessions")
      .update({
        current_capital_nok: synced,
        current_capital: synced,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id);

    if (updateError) {
      console.error(
        "[PaperTrade] Failed to sync session capital:",
        updateError,
      );
    }

    // 8. Record successful decision
    await recordTradeDecision(
      tradeRequest,
      validationResult,
      request.quantity,
      request.price,
    );

    return {
      success: true,
      tradeId: trade.id,
      newBalance: synced,
    };
  } catch (error) {
    console.error("[PaperTrade] Unexpected error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error executing paper trade",
    };
  }
}
