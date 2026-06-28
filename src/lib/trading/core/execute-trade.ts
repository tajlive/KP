/**
 * Unified Trade Execution Pipeline
 *
 * KLA-P0: Single shared execution path for both paper and live trading.
 * The only differences are:
 *  - execution adapter (PaperExecutor vs BinanceExecutor)
 *  - exchange credentials / endpoint
 *  - fill policy / simulation
 *  - balance update mechanism
 *
 * CRITICAL: This function expects an authenticated SupabaseClient.
 * User-bound routes MUST pass createServerClient(request, response).
 * System/cron routes MAY pass createClient() (service-role).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";
import { getUsdtToNokRateAsync, usdtToNok } from "@/lib/trading/currency";
import {
  validateTradeAgainstRiskProfile,
  recordTradeRejection,
  recordTradeDecision,
  type TradeRequest,
  type RiskValidationResult,
} from "@/lib/trading/safety/risk-validator";
import { ExecutorFactory } from "@/lib/trading/executor-factory";
import { computeFill } from "@/lib/trading/canonical/execution/fill-model";
import { calculatePnlFromTrades, type TradePnlInput } from "@/lib/trading/canonical/pnl/trade-pnl";
import { acquireTradeLock } from "./distributed-lock";
import { makeIdempotencyKey, withIdempotency } from "@/lib/trading/idempotency";
import type { ExecuteTradeRequest, ExecuteTradeResult, TradeSignalContext } from "./types";

export type { ExecuteTradeRequest, ExecuteTradeResult, TradeSignalContext };

const PAPER_DEFAULT_CAPITAL = 100000;

/** Estimerte fill-parametere brukt til forhåndsvalidering av kapital/kostnad. */
export const ESTIMATED_FILL_PARAMS = {
  feeRate: 0.001, // 0.1%
  marketSlippageRate: 0.0005, // 0.05%
  minOrderValue: 10,
};

export async function executeTrade(
  supabase: SupabaseClient<Database>,
  request: ExecuteTradeRequest,
): Promise<ExecuteTradeResult> {
  // Acquire distributed lock to prevent concurrent trades for same user+symbol
  const lockResult = await acquireTradeLock(request.userId, request.symbol, {
    ttlSeconds: 35,
    retries: 2,
    retryDelayMs: 50,
  });

  if (!lockResult.acquired) {
    return {
      success: false,
      rejectionReason: "CONCURRENT_TRADE_BLOCKED",
      error: "Another trade is being processed for this symbol. Please wait and try again.",
    };
  }

  try {
    return await executeTradeWithLock(supabase, request);
  } finally {
    await lockResult.release();
  }
}

async function executeTradeWithLock(
  supabase: SupabaseClient<Database>,
  request: ExecuteTradeRequest,
): Promise<ExecuteTradeResult> {
  try {
    // ========================================================================
    // 1. Resolve session
    // ========================================================================
    let sessionId = request.sessionId;

    if (request.mode === "paper") {
      // Paper: use explicit session or latest active paper session
      const { data: session, error: sessionError } = sessionId
        ? await supabase
            .from("trading_sessions")
            .select(
              "id, user_id, current_capital_nok, current_capital, status, mode, open_position",
            )
            .eq("id", sessionId)
            .eq("user_id", request.userId)
            .eq("mode", "paper")
            .eq("status", "active")
            .maybeSingle()
        : await supabase
            .from("trading_sessions")
            .select(
              "id, user_id, current_capital_nok, current_capital, status, mode, open_position",
            )
            .eq("user_id", request.userId)
            .eq("mode", "paper")
            .eq("status", "active")
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

      if (sessionError) {
        return {
          success: false,
          error:
            sessionError.message ??
            "Fant ikke aktiv paper-sesjon (eller sesjonen tilhører ikke deg).",
        };
      }

      if (!session) {
        if (sessionId) {
          return {
            success: false,
            error:
              "Fant ikke aktiv paper-sesjon for denne ID-en (eller sesjonen tilhører ikke deg).",
          };
        }

        // Auto-create default paper session
        const now = new Date().toISOString();
        const { data: newSession, error: createError } = await supabase
          .from("trading_sessions")
          .insert({
            user_id: request.userId,
            mode: "paper",
            status: "active",
            strategy_id: "dca",
            strategy_config: {},
            trading_pair: request.symbol.toUpperCase(),
            starting_capital_nok: PAPER_DEFAULT_CAPITAL,
            current_capital_nok: PAPER_DEFAULT_CAPITAL,
            initial_capital: PAPER_DEFAULT_CAPITAL,
            current_capital: PAPER_DEFAULT_CAPITAL,
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

        // Recurse with resolved sessionId (safe because we now have a session)
        return executeTrade(supabase, {
          ...request,
          sessionId: newSession.id,
        });
      }

      sessionId = session.id;
    }

    // For live, require explicit sessionId
    if (request.mode === "live" && !sessionId) {
      return { success: false, error: "Missing session_id for live trading" };
    }

    // ========================================================================
    // 2. Fetch session row (both modes)
    // ========================================================================
    if (!sessionId) {
      return { success: false, error: "Missing session_id" };
    }

    const { data: session, error: sessionError } = await supabase
      .from("trading_sessions")
      .select(
        "id, user_id, current_capital_nok, current_capital, status, mode, strategy_config, open_position",
      )
      .eq("id", sessionId)
      .eq("user_id", request.userId)
      .eq("mode", request.mode)
      .single();

    if (sessionError || !session) {
      return {
        success: false,
        error: `${request.mode} trading session not found`,
      };
    }

    if (session.status !== "active") {
      return {
        success: false,
        error: `Session is ${session.status}, cannot execute trades`,
      };
    }

    // ========================================================================
    // 3. Live-only entitlement check
    // ========================================================================
    if (request.mode === "live") {
      const canTradeLive = await ExecutorFactory.canTradeLive(
        supabase,
        request.userId,
      );
      if (!canTradeLive) {
        const rejectionResult: RiskValidationResult = {
          allowed: false,
          rejectionReason: "LIVE_NOT_ALLOWED",
          rejectionDetails: {
            message:
              "Live trading requires Bachelor tier and Binance connection",
          },
        };
        const tradeRequest: TradeRequest = {
          userId: request.userId,
          sessionId: session.id,
          symbol: request.symbol,
          side: request.side,
          quantity: request.quantity,
          price: request.price,
          orderType: request.orderType,
          tradingMode: "live",
          botId: request.botId,
        };
        await recordTradeRejection(supabase, tradeRequest, rejectionResult);
        return {
          success: false,
          rejectionReason: "LIVE_NOT_ALLOWED",
          error:
            "Live trading requires Bachelor tier or higher and connected exchange",
        };
      }
    }

    // ========================================================================
    // 4. Risk validation
    // ========================================================================
    const tradeRequest: TradeRequest = {
      userId: request.userId,
      sessionId: session.id,
      symbol: request.symbol,
      side: request.side,
      quantity: request.quantity,
      price: request.price,
      orderType: request.orderType,
      tradingMode: request.mode,
      botId: request.botId,
    };

    const validationResult = await validateTradeAgainstRiskProfile(
      supabase,
      tradeRequest,
    );

    if (!validationResult.allowed) {
      await recordTradeRejection(supabase, tradeRequest, validationResult);
      await recordTradeDecision(supabase, tradeRequest, validationResult);
      return {
        success: false,
        rejectionReason: validationResult.rejectionReason,
        error: `Trade rejected: ${validationResult.rejectionReason}`,
      };
    }

    // ========================================================================
    // 5. Balance check (use canonical fill model for market-order estimates)
    // ========================================================================
    const rate = await getUsdtToNokRateAsync(supabase);

    const tradeCurrency: "USDT" | "NOK" = request.mode === "paper" ? "NOK" : "USDT";

    let orderValueUsdt: number;
    if (request.orderType === "market") {
      const estimatedFill = computeFill({
        side: request.side,
        quantity: request.quantity,
        orderType: request.orderType,
        marketPrice: request.price,
        feeRate: ESTIMATED_FILL_PARAMS.feeRate,
        marketSlippageRate: ESTIMATED_FILL_PARAMS.marketSlippageRate,
        minOrderValue: ESTIMATED_FILL_PARAMS.minOrderValue,
        quoteCurrency: "USDT",
      });
      if (!estimatedFill.success) {
        const rejectionResult: RiskValidationResult = {
          allowed: false,
          rejectionReason: "ESTIMATED_FILL_FAILED",
          rejectionDetails: { reason: estimatedFill.error },
        };
        await recordTradeRejection(supabase, tradeRequest, rejectionResult);
        await recordTradeDecision(supabase, tradeRequest, rejectionResult);
        return {
          success: false,
          rejectionReason: "ESTIMATED_FILL_FAILED",
          error: estimatedFill.error || "Estimated fill validation failed",
        };
      }
      orderValueUsdt = estimatedFill.totalCost;
    } else {
      orderValueUsdt = request.quantity * request.price;
    }

    const orderValueNok = usdtToNok(orderValueUsdt, rate ?? undefined);

    const currentBalance = Number(
      session.current_capital_nok ?? session.current_capital ?? 0,
    );

    if (request.side === "buy" && orderValueNok > currentBalance) {
      const rejectionResult: RiskValidationResult = {
        allowed: false,
        rejectionReason: "INSUFFICIENT_BALANCE",
        rejectionDetails: { required: orderValueNok, available: currentBalance },
      };
      await recordTradeRejection(supabase, tradeRequest, rejectionResult);
      await recordTradeDecision(supabase, tradeRequest, rejectionResult);
      return {
        success: false,
        rejectionReason: "INSUFFICIENT_BALANCE",
        error: "Insufficient balance for this trade",
      };
    }

    // ========================================================================
    // 6. Execute via adapter (idempotently)
    // ========================================================================
    // NOTE: Callers that need true cross-request deduplication should pass a
    // deterministic `request.idempotencyKey`. The runtime fallback below uses
    // `Date.now()` and is intended mainly for local/manual calls.
    const idempotencyKey =
      request.idempotencyKey ??
      makeIdempotencyKey([
        request.userId,
        request.botId ?? request.signalContext?.strategy ?? "manual",
        request.symbol,
        request.signalContext?.action ?? request.reasonCode ?? "trade",
        request.side,
        Date.now(),
      ]);

    const requestHash = makeIdempotencyKey([
      request.userId,
      request.sessionId ?? "",
      request.symbol,
      request.side,
      String(request.quantity),
      String(request.price),
      request.orderType,
      request.mode,
      request.botId ?? request.signalContext?.strategy ?? "manual",
      request.signalContext?.action ?? request.reasonCode ?? "trade",
    ]);

    return await withIdempotency(
      supabase,
      idempotencyKey,
      "trade",
      requestHash,
      async () => {
        const executor = await ExecutorFactory.create(
          supabase,
          request.userId,
          request.mode,
          session.id,
        );

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
            error: execResult.error || "Execution failed",
          };
        }

        // ========================================================================
        // 7. Calculate realized P&L for sell trades (canonical FIFO)
        // ========================================================================
        let realizedPnl: number | undefined;
        const openPosition = session.open_position as {
          side?: "long" | "short";
          quantity?: number;
          entry_price?: number;
          entry_time?: string;
          lots?: Array<{ quantity: number; entryPrice: number; timestamp?: string }>;
        } | null;

        if (
          request.side === "sell" &&
          openPosition &&
          (openPosition.quantity ?? 0) > 0
        ) {
          const positionQty = openPosition.quantity ?? 0;
          const matchedQty = Math.min(execResult.executedQuantity, positionQty);
          if (matchedQty > 0) {
            // Convert sell-side fill to the same currency as the cost basis
            // (paper stores NOK, live stores USDT).
            const sellPrice =
              request.mode === "paper"
                ? usdtToNok(execResult.executedPrice, rate ?? undefined)
                : execResult.executedPrice;
            const sellFee =
              request.mode === "paper"
                ? usdtToNok(execResult.fee || 0, rate ?? undefined)
                : execResult.fee || 0;

            const priorBuys: TradePnlInput[] =
              openPosition.lots && openPosition.lots.length > 0
                ? openPosition.lots.map((lot) => ({
                    symbol: request.symbol,
                    side: "buy" as const,
                    quantity: lot.quantity,
                    price: lot.entryPrice,
                    fee: 0,
                    timestamp: lot.timestamp,
                    currency: tradeCurrency,
                  }))
                : [
                    {
                      symbol: request.symbol,
                      side: "buy" as const,
                      quantity: positionQty,
                      price: openPosition.entry_price ?? 0,
                      fee: 0,
                      timestamp: openPosition.entry_time,
                      currency: tradeCurrency,
                    },
                  ];

            const currentSell: TradePnlInput = {
              symbol: request.symbol,
              side: "sell",
              quantity: matchedQty,
              price: sellPrice,
              fee: sellFee,
              timestamp: execResult.timestamp.toISOString(),
              currency: tradeCurrency,
            };

            const pnlResult = calculatePnlFromTrades([...priorBuys, currentSell]);
            realizedPnl = Math.round(pnlResult.realizedPnl * 100) / 100;
          }
        }

        // ========================================================================
        // 8. Record trade
        // ========================================================================
        const nowIso = new Date().toISOString();

        const tradeInsert: Database["public"]["Tables"]["trades"]["Insert"] & {
          usdt_nok_rate?: number;
          idempotency_scope?: string;
        } = {
          session_id: session.id,
          user_id: request.userId,
          trading_pair: request.symbol,
          side: request.side,
          quantity: execResult.executedQuantity,
          price:
            request.mode === "paper"
              ? usdtToNok(execResult.executedPrice, rate ?? undefined)
              : execResult.executedPrice,
          total_value:
            request.mode === "paper"
              ? usdtToNok(execResult.executedQuantity * execResult.executedPrice, rate ?? undefined)
              : execResult.executedQuantity * execResult.executedPrice,
          fee:
            request.mode === "live"
              ? execResult.fee
              : usdtToNok(execResult.fee || 0, rate ?? undefined),
          status: "filled",
          mode: request.mode,
          order_type: request.orderType,
          realized_pnl: realizedPnl,
          binance_order_id:
            request.mode === "live" ? execResult.orderId ?? null : null,
          idempotency_key: idempotencyKey,
          idempotency_scope: "trade",
          usdt_nok_rate: rate,
          executed_at: execResult.timestamp.toISOString(),
          created_at: nowIso,
          strategy_signal: request.signalContext
            ? {
                ...request.signalContext.indicators,
                action: request.signalContext.action,
                confidence: request.signalContext.confidence,
                regime: request.signalContext.regime,
                reason: request.signalContext.reason,
              }
            : null,
          reason_code: request.reasonCode ?? null,
          reason_params: (request.reasonParams ?? null) as Json,
          indicator_snapshot: (request.indicatorSnapshot ?? null) as Json,
        };

        const { data: trade, error: tradeError } = await supabase
          .from("trades")
          .insert(tradeInsert as any)
          .select()
          .single();

        if (tradeError) {
          console.error("[executeTrade] Failed to record trade:", tradeError);
          // For live, the trade DID execute on exchange — return critical warning
          if (request.mode === "live") {
            return {
              success: true,
              tradeId: undefined,
              orderId: execResult.orderId,
              executedPrice: execResult.executedPrice,
              executedQuantity: execResult.executedQuantity,
              fee: execResult.fee,
              error: "Trade executed but failed to save to database",
            };
          }
          return {
            success: false,
            error: "Failed to record trade",
          };
        }

        // ========================================================================
        // 9. Update balance
        // ========================================================================
        if (request.mode === "paper") {
          // Paper capital is updated by DB trigger (trigger_update_session_state)
          // which reads total_value (now stored in NOK for paper trades).
          // Record successful decision
          await recordTradeDecision(
            supabase,
            tradeRequest,
            validationResult,
            execResult.executedQuantity,
            execResult.executedPrice,
          );

          return {
            success: true,
            tradeId: trade.id,
            sessionId: session.id,
            newBalance: currentBalance, // Balance updated by DB trigger only
            orderId: execResult.orderId,
            executedPrice: execResult.executedPrice,
            executedQuantity: execResult.executedQuantity,
            fee: execResult.fee,
          };
        }

        // Live mode: update balance atomically via RPC (amount must be in NOK)
        const netValueUsdt =
          request.side === "buy"
            ? execResult.executedQuantity * execResult.executedPrice +
              (execResult.fee || 0)
            : execResult.executedQuantity * execResult.executedPrice -
              (execResult.fee || 0);
        const netValueNok = usdtToNok(netValueUsdt, rate ?? undefined);

        const { error: balanceError } = await supabase.rpc(
          request.side === "buy" ? "decrement_capital" : "increment_capital",
          {
            p_session_id: session.id,
            p_amount: netValueNok,
            p_user_id: request.userId,
          },
        );

        if (balanceError) {
          console.error("[executeTrade] Failed to update balance:", balanceError);
        }

        await recordTradeDecision(
          supabase,
          tradeRequest,
          validationResult,
          execResult.executedQuantity,
          execResult.executedPrice,
        );

        return {
          success: true,
          tradeId: trade.id,
          orderId: execResult.orderId,
          executedPrice: execResult.executedPrice,
          executedQuantity: execResult.executedQuantity,
          fee: execResult.fee,
        };
      },
    );
  } catch (error) {
    console.error("[executeTrade] Unexpected error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error executing trade",
    };
  }
}
