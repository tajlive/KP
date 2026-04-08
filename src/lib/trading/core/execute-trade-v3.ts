/**
 * V3 Unified Trade Execution Pipeline with Risk Kernel
 * 
 * KLA-P0: Hardened execution with immutable risk enforcement
 * 
 * Changes from V2:
 * - Risk Kernel integration (hard limits)
 * - Risk State persistence
 * - Audit logging
 * - Regime-aware execution
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { getUsdtToNokRateAsync, usdtToNok } from "@/lib/trading/currency";
import {
  validateTradeAgainstRiskProfile,
  recordTradeRejection,
  recordTradeDecision,
  type TradeRequest,
  type RiskValidationResult,
} from "@/lib/trading/safety/risk-validator";
import { ExecutorFactory } from "@/lib/trading/executor-factory";
import { RiskKernel, RiskStateManager } from "@/lib/trading/risk/risk-kernel";
import { getRiskStateStore } from "@/lib/trading/risk/risk-state-store";
import { getAuditStore } from "@/lib/trading/execution/audit-store";
import { ExecutionAuditor, createL2Snapshot } from "@/lib/trading/execution/execution-audit";
import type { ExecuteTradeRequest, ExecuteTradeResult, TradeSignalContext } from "./types";

export type { ExecuteTradeRequest, ExecuteTradeResult, TradeSignalContext };

const PAPER_DEFAULT_CAPITAL = 100000;

/**
 * V3 Execute Trade – With Risk Kernel Integration
 */
export async function executeTradeV3(
  supabase: SupabaseClient<Database>,
  request: ExecuteTradeRequest,
): Promise<ExecuteTradeResult> {
  const startTime = Date.now();
  const auditor = new ExecutionAuditor();
  
  try {
    // ========================================================================
    // 1. Resolve session
    // ========================================================================
    let sessionId = request.sessionId;

    if (request.mode === "paper") {
      const { data: session, error: sessionError } = sessionId
        ? await supabase
            .from("trading_sessions")
            .select("id, user_id, current_capital_nok, current_capital, status, mode")
            .eq("id", sessionId)
            .eq("user_id", request.userId)
            .eq("mode", "paper")
            .eq("status", "active")
            .maybeSingle()
        : await supabase
            .from("trading_sessions")
            .select("id, user_id, current_capital_nok, current_capital, status, mode")
            .eq("user_id", request.userId)
            .eq("mode", "paper")
            .eq("status", "active")
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

      if (sessionError) {
        return { success: false, error: sessionError.message };
      }

      if (!session) {
        // Auto-create paper session
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
          return { success: false, error: "Failed to create paper session" };
        }
        
        return executeTradeV3(supabase, { ...request, sessionId: newSession.id });
      }

      sessionId = session.id;
    }

    if (request.mode === "live" && !sessionId) {
      return { success: false, error: "Missing session_id for live trading" };
    }

    // ========================================================================
    // 2. Fetch session
    // ========================================================================
    if (!sessionId) {
      return { success: false, error: "Missing session_id" };
    }

    const { data: session, error: sessionError } = await supabase
      .from("trading_sessions")
      .select("id, user_id, current_capital_nok, current_capital, status, mode, strategy_config")
      .eq("id", sessionId)
      .eq("user_id", request.userId)
      .eq("mode", request.mode)
      .single();

    if (sessionError || !session) {
      return { success: false, error: `${request.mode} session not found` };
    }

    if (session.status !== "active") {
      return { success: false, error: `Session is ${session.status}` };
    }

    // ========================================================================
    // 3. Live entitlement check
    // ========================================================================
    if (request.mode === "live") {
      const canTradeLive = await ExecutorFactory.canTradeLive(supabase, request.userId);
      if (!canTradeLive) {
        const rejectionResult: RiskValidationResult = {
          allowed: false,
          rejectionReason: "LIVE_NOT_ALLOWED",
          rejectionDetails: { message: "Live trading requires Bachelor tier and exchange connection" },
        };
        await recordTradeRejection(supabase, { 
          userId: request.userId, sessionId, symbol: request.symbol,
          side: request.side, quantity: request.quantity, price: request.price,
          orderType: request.orderType, tradingMode: "live", botId: request.botId
        }, rejectionResult);
        
        return { success: false, rejectionReason: "LIVE_NOT_ALLOWED", error: "Live trading not allowed" };
      }
    }

    // ========================================================================
    // 4. V2 Risk validation (keep for backward compatibility)
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

    const validationResult = await validateTradeAgainstRiskProfile(supabase, tradeRequest);
    if (!validationResult.allowed) {
      await recordTradeRejection(supabase, tradeRequest, validationResult);
      await recordTradeDecision(supabase, tradeRequest, validationResult);
      return { success: false, rejectionReason: validationResult.rejectionReason, error: "Trade rejected" };
    }

    // ========================================================================
    // 5. V3 Risk Kernel (NEW - P0 hardening)
    // ========================================================================
    const currentBalance = Number(session.current_capital_nok ?? session.current_capital ?? 0);
    
    // Get or initialize risk state
    const riskStore = getRiskStateStore();
    let riskRecovery = await riskStore.getState(request.userId);
    
    if (!riskRecovery) {
      riskRecovery = await riskStore.initializeState(request.userId, currentBalance);
    }
    
    const riskStateManager = new RiskStateManager(riskRecovery.state.equity);
    Object.assign(riskStateManager, riskRecovery.state);
    
    // Check cooldown
    const cooldown = await riskStore.isInCooldown(request.userId);
    if (cooldown.inCooldown) {
      return {
        success: false,
        rejectionReason: "RISK_COOLDOWN",
        error: `Trading blocked: ${cooldown.reason} cooldown until ${cooldown.endsAt}`
      };
    }
    
    // Run Risk Kernel check
    const riskKernel = new RiskKernel(riskRecovery.limits);
    const orderValueUsdt = request.quantity * request.price;
    const notional = orderValueUsdt;
    const leverage = 1; // TODO: Get from request/config
    
    const riskCheck = riskKernel.checkTrade(
      {
        side: request.side,
        quantity: request.quantity,
        price: request.price,
        notional,
        leverage
      },
      riskStateManager.getState()
    );
    
    if (!riskCheck.allowed) {
      // Log violations
      await logRiskViolations(supabase, request.userId, riskCheck.violations);
      
      const violationReason = riskCheck.violations.map(v => v.rule).join(', ');
      return {
        success: false,
        rejectionReason: "RISK_LIMIT_VIOLATION",
        error: `Risk limit violated: ${violationReason}`
      };
    }
    
    // Use adjusted trade if risk kernel reduced size
    const finalTrade = riskCheck.adjustedTrade || {
      side: request.side,
      quantity: request.quantity,
      price: request.price,
      notional,
      leverage
    };

    // ========================================================================
    // 6. Audit: Record intent (NEW - P0 hardening)
    // ========================================================================
    const orderId = `order-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    // Create L2 snapshot (would fetch from exchange)
    const mockL2Snapshot = createL2Snapshot(
      [[request.price * 0.999, 10], [request.price * 0.998, 20]],
      [[request.price * 1.001, 10], [request.price * 1.002, 20]]
    );
    
    const venueScores = [
      { venue: 'Bybit', price: request.price, liquidity: 1000000, fee: 0.00055, latency: 50, reliability: 0.99, totalScore: 85, factors: { priceWeight: 0.3, costWeight: 0.25, speedWeight: 0.2, likelihoodWeight: 0.15, sizeWeight: 0.05, natureWeight: 0.05 } },
      { venue: 'Binance', price: request.price * 1.001, liquidity: 2000000, fee: 0.001, latency: 60, reliability: 0.99, totalScore: 80, factors: { priceWeight: 0.3, costWeight: 0.25, speedWeight: 0.2, likelihoodWeight: 0.15, sizeWeight: 0.05, natureWeight: 0.05 } }
    ];
    
    const auditIntent = auditor.recordIntent({
      orderId,
      clientId: request.userId,
      sessionId: session.id,
      side: request.side,
      type: request.orderType,
      symbol: request.symbol,
      quantity: finalTrade.quantity,
      price: finalTrade.price,
      timeInForce: 'GTC',
      strategy: request.signalContext?.strategy || 'unknown',
      regime: request.signalContext?.regime || 'unknown',
      l2Snapshot: mockL2Snapshot,
      venueScores,
      selectedVenue: 'Bybit',
      expectedFill: {
        price: finalTrade.price,
        quantity: finalTrade.quantity,
        slippageBps: 5,
        fees: finalTrade.notional * 0.00055,
        confidence: 0.95,
        estimatedTime: 100
      }
    });

    // ========================================================================
    // 7. Balance check
    // ========================================================================
    const rate = request.mode === "paper" ? await getUsdtToNokRateAsync(supabase) : null;
    const orderValue = request.mode === "paper" ? usdtToNok(orderValueUsdt, rate ?? undefined) : orderValueUsdt;

    if (request.side === "buy" && orderValue > currentBalance) {
      const rejectionResult: RiskValidationResult = {
        allowed: false,
        rejectionReason: "INSUFFICIENT_BALANCE",
        rejectionDetails: { required: orderValue, available: currentBalance },
      };
      await recordTradeRejection(supabase, tradeRequest, rejectionResult);
      auditor.recordRejection(orderId, 'insufficient_funds');
      await persistAudit(auditIntent);
      
      return { success: false, rejectionReason: "INSUFFICIENT_BALANCE", error: "Insufficient balance" };
    }

    // ========================================================================
    // 8. Execute via adapter
    // ========================================================================
    const executor = await ExecutorFactory.create(supabase, request.userId, request.mode, session.id);
    
    const execResult = await executor.executeOrder({
      symbol: request.symbol,
      side: request.side,
      quantity: finalTrade.quantity,
      orderType: request.orderType,
      price: request.price,
    });

    if (!execResult.success) {
      auditor.recordRejection(orderId, 'system_error', execResult.error);
      await persistAudit(auditIntent);
      return { success: false, error: execResult.error || "Execution failed" };
    }

    // ========================================================================
    // 9. Record trade
    // ========================================================================
    const nowIso = new Date().toISOString();
    const idempotencyKey = `${session.id}-${Date.now()}-${execResult.orderId ?? Math.random()}`;

    const { data: trade, error: tradeError } = await supabase
      .from("trades")
      .insert({
        session_id: session.id,
        user_id: request.userId,
        trading_pair: request.symbol,
        side: request.side,
        quantity: execResult.executedQuantity,
        price: execResult.executedPrice,
        total_value: execResult.executedQuantity * execResult.executedPrice,
        fee: request.mode === "live" ? execResult.fee : 0,
        status: "filled",
        mode: request.mode,
        order_type: request.orderType,
        binance_order_id: request.mode === "live" ? execResult.orderId ?? null : null,
        idempotency_key: idempotencyKey,
        executed_at: execResult.timestamp.toISOString(),
        created_at: nowIso,
        strategy_signal: request.signalContext ? {
          ...request.signalContext.indicators,
          action: request.signalContext.action,
          confidence: request.signalContext.confidence,
          regime: request.signalContext.regime,
          reason: request.signalContext.reason,
        } : null,
      })
      .select()
      .single();

    if (tradeError) {
      console.error("[executeTradeV3] Failed to record trade:", tradeError);
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
      return { success: false, error: "Failed to record trade" };
    }

    // ========================================================================
    // 10. Update risk state (NEW - P0 hardening)
    // ========================================================================
    const pnl = request.side === "sell" 
      ? execResult.executedQuantity * execResult.executedPrice 
      : -(execResult.executedQuantity * execResult.executedPrice);
    
    riskStateManager.recordTrade(pnl, execResult.executedQuantity * execResult.executedPrice);
    await riskStore.saveState(request.userId, riskStateManager.getState(), riskRecovery.limits);

    // ========================================================================
    // 11. Update balance
    // ========================================================================
    if (request.mode === "paper") {
      const { data: sessionAfter } = await supabase
        .from("trading_sessions")
        .select("current_capital")
        .eq("id", session.id)
        .maybeSingle();

      const synced = sessionAfter?.current_capital != null
        ? Number(sessionAfter.current_capital)
        : request.side === "buy"
          ? currentBalance - orderValue
          : currentBalance + orderValue;

      await supabase
        .from("trading_sessions")
        .update({ current_capital_nok: synced, current_capital: synced, updated_at: nowIso })
        .eq("id", session.id);

      await recordTradeDecision(supabase, tradeRequest, validationResult, execResult.executedQuantity, execResult.executedPrice);

      // Record audit fill
      auditor.recordFill(orderId, {
        orderId,
        fillId: trade.id,
        timestamp: new Date(),
        price: execResult.executedPrice,
        quantity: execResult.executedQuantity,
        fees: execResult.fee,
        slippageBps: 5,
        latency: Date.now() - startTime,
        venue: 'Bybit',
        status: 'filled'
      });
      await persistAudit(auditIntent);

      return {
        success: true,
        tradeId: trade.id,
        sessionId: session.id,
        newBalance: synced,
        orderId: execResult.orderId,
        executedPrice: execResult.executedPrice,
        executedQuantity: execResult.executedQuantity,
        fee: execResult.fee,
      };
    }

    // Live mode
    const netValue = request.side === "buy"
      ? execResult.executedQuantity * execResult.executedPrice + (execResult.fee || 0)
      : execResult.executedQuantity * execResult.executedPrice - (execResult.fee || 0);

    await supabase.rpc(request.side === "buy" ? "decrement_capital" : "increment_capital", {
      p_session_id: session.id,
      p_amount: netValue,
      p_user_id: request.userId,
    });

    await recordTradeDecision(supabase, tradeRequest, validationResult, execResult.executedQuantity, execResult.executedPrice);

    // Record audit fill
    auditor.recordFill(orderId, {
      orderId,
      fillId: trade.id,
      timestamp: new Date(),
      price: execResult.executedPrice,
      quantity: execResult.executedQuantity,
      fees: execResult.fee,
      slippageBps: 5,
      latency: Date.now() - startTime,
      venue: 'Bybit',
      status: 'filled'
    });
    await persistAudit(auditIntent);

    return {
      success: true,
      tradeId: trade.id,
      orderId: execResult.orderId,
      executedPrice: execResult.executedPrice,
      executedQuantity: execResult.executedQuantity,
      fee: execResult.fee,
    };

  } catch (error) {
    console.error("[executeTradeV3] Unexpected error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Helper functions

async function logRiskViolations(
  supabase: SupabaseClient,
  userId: string,
  violations: Array<{
    timestamp: Date;
    rule: string;
    severity: 'warning' | 'critical';
    expectedValue: number;
    actualValue: number;
    action: 'blocked' | 'reduced' | 'allowed';
  }>
): Promise<void> {
  try {
    await supabase.from('risk_violations').insert(
      violations.map(v => ({
        user_id: userId,
        rule: v.rule,
        severity: v.severity,
        expected_value: v.expectedValue,
        actual_value: v.actualValue,
        action: v.action,
        created_at: v.timestamp.toISOString()
      }))
    );
  } catch (error) {
    console.error('[executeTradeV3] Failed to log risk violations:', error);
  }
}

async function persistAudit(evidence: unknown): Promise<void> {
  try {
    const store = getAuditStore();
    await (store.persist as unknown as (evidence: unknown) => Promise<void>)(evidence);
  } catch (error) {
    console.error('[executeTradeV3] Failed to persist audit:', error);
  }
}
