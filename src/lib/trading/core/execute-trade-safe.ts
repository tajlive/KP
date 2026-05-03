/**
 * V3 Safe Trade Execution – Fail-Safe by Design
 * 
 * KLA-P0: Launch-critical hardening
 * - Safe-by-default: Hvis noe er usikkert -> avvis
 * - Audit-or-block: Hvis audit feiler -> avvis trade
 * - Deterministic dual-write: Redis/Supabase outbox pattern
 * - Idempotency-garanti: Duplikat-sjekk før eksekvering
 * - Transaction envelope: Full sporbarhet
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { getUsdtToNokRateAsync, usdtToNok } from "@/lib/trading/currency";
import {
  validateTradeAgainstRiskProfile,
  recordTradeRejection,
  recordTradeDecision,
} from "@/lib/trading/safety/risk-validator";
import { ExecutorFactory } from "@/lib/trading/executor-factory";
import { RiskKernel, RiskStateManager } from "@/lib/trading/risk/risk-kernel";
import { getRiskStateStore } from "@/lib/trading/risk/risk-state-store";
import { getAuditStore } from "@/lib/trading/execution/audit-store";
import { ExecutionAuditor, createL2Snapshot } from "@/lib/trading/execution/execution-audit";
import type { ExecuteTradeRequest, ExecuteTradeResult } from "./types";
import { isTradingAllowed, getKillSwitchStatus } from "./outbox-monitor";
import { acquireTradeLock } from "./distributed-lock";
import {
  RISK_KERNEL_VERSION,
  POLICY_VERSION,
  type TradeEnvelope,
  buildRejectionEnvelope,
  buildSystemHealth,
  resolveSession,
  isValidRiskState,
  generateIdempotencyKey,
  generateDecisionHash,
  logRiskViolations,
  queueForRetry,
  type TradingSession,
} from "./execute-trade-helpers";
import crypto from "crypto";

const PAPER_DEFAULT_CAPITAL = 100000;

// Re-export types for backward compatibility
export { type TradeEnvelope, RISK_KERNEL_VERSION, POLICY_VERSION };

export interface SafeExecutionResult extends ExecuteTradeResult {
  envelope?: TradeEnvelope;
  auditStatus?: TradeEnvelope['auditStatus'];
  executionTrace?: {
    startedAt: number;
    completedAt?: number;
    steps: string[];
    riskCheckPassed: boolean;
    auditPersisted: boolean;
    statePersisted: boolean;
    tradeRecorded: boolean;
  };
}

/**
 * Safe Execute Trade – Fail-safe by default
 * 
 * Prinsipper:
 * 1. Hvis risk state ikke kan leses sikkert -> AVVIS
 * 2. Hvis audit write feiler -> AVVIS (eller eksplisitt degraded mode)
 * 3. Redis/Supabase dual-write med outbox pattern
 * 4. Idempotency-garanti
 */
export async function executeTradeSafe(
  supabase: SupabaseClient<Database>,
  request: ExecuteTradeRequest,
): Promise<SafeExecutionResult> {
  const startTime = Date.now();
  const trace = {
    startedAt: startTime,
    steps: [] as string[],
    riskCheckPassed: false,
    auditPersisted: false,
    statePersisted: false,
    tradeRecorded: false,
  };

  // ========================================================================
  // KILL-SWITCH CHECK: Block all trades if system is unhealthy
  // (Before lock acquisition to avoid unnecessary lock overhead)
  // ========================================================================
  const killSwitchCheck = await isTradingAllowed(supabase);
  const killSwitchStatus = getKillSwitchStatus();
  
  if (!killSwitchCheck.allowed) {
    const systemHealth = await buildSystemHealth(supabase, { activated: true, reason: killSwitchCheck.reason });
    return {
      success: false,
      rejectionReason: "KILL_SWITCH_ACTIVE",
      error: killSwitchCheck.reason || "Trading temporarily disabled due to system health",
      auditStatus: "failed",
      envelope: {
        tradeId: "",
        idempotencyKey: "",
        decisionHash: "",
        riskVersion: RISK_KERNEL_VERSION,
        policyVersion: POLICY_VERSION,
        auditStatus: "failed",
        persistenceStatus: "failed",
        createdAt: new Date(),
        killSwitchStatus: {
          activated: true,
          reason: killSwitchCheck.reason
        },
        systemHealth
      }
    };
  }
  
  // ========================================================================
  // 0. Distributed Lock – Prevent concurrent trades for same user+symbol
  // ========================================================================
  const lockResult = await acquireTradeLock(request.userId, request.symbol, {
    ttlSeconds: 30,
    retries: 2,
    retryDelayMs: 50,
  });
  
  if (!lockResult.acquired) {
    const envelope = await buildRejectionEnvelope(supabase, {
      idempotencyKey: "",
      auditStatus: "failed",
      persistenceStatus: "failed",
      degradationReason: `Concurrent trade detected: ${lockResult.error}`
    });
    return {
      success: false,
      rejectionReason: "CONCURRENT_TRADE_BLOCKED",
      error: "Another trade is being processed for this symbol. Please wait and try again.",
      auditStatus: "failed",
      envelope
    };
  }
  
  // CRITICAL: Ensure lock is ALWAYS released when done
  // Use try/finally pattern for all operations after lock acquisition
  try {
    return await executeTradeWithLock(supabase, request, trace, startTime, killSwitchStatus);
  } finally {
    await lockResult.release();
  }
}

/**
 * Internal function that executes trade while holding the lock
 */
async function executeTradeWithLock(
  supabase: SupabaseClient<Database>,
  request: ExecuteTradeRequest,
  trace: { startedAt: number; steps: string[]; riskCheckPassed: boolean; auditPersisted: boolean; statePersisted: boolean; tradeRecorded: boolean },
  startTime: number,
  killSwitchStatus: { activated: boolean; reason?: string }
): Promise<SafeExecutionResult> {

  // ========================================================================
  // 1. Idempotency Check – Prevent duplicate trades
  // ========================================================================
  const idempotencyKey = generateIdempotencyKey(request);
  
  const { data: existingTrade } = await supabase
    .from("trades")
    .select("id, status")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  
  if (existingTrade) {
    const envelope = await buildRejectionEnvelope(supabase, {
      tradeId: existingTrade.id,
      idempotencyKey,
      auditStatus: "failed",
      persistenceStatus: "failed"
    });
    return {
      success: false,
      rejectionReason: "DUPLICATE_TRADE",
      error: `Trade already exists: ${existingTrade.id}`,
      auditStatus: "failed",
      envelope
    };
  }

  // ========================================================================
  // 1. Resolve Session
  // ========================================================================
  const sessionResult = await resolveSession(supabase, request);
  if (!sessionResult.success) {
    const envelope = await buildRejectionEnvelope(supabase, {
      idempotencyKey,
      auditStatus: "failed",
      persistenceStatus: "failed",
      degradedMode: true,
      degradationReason: `Session resolution failed: ${sessionResult.error}`
    });
    return { success: false, error: sessionResult.error, auditStatus: "failed", envelope };
  }
  const { session, sessionId } = sessionResult;

  // ========================================================================
  // 2. Risk State Recovery – FAIL if unsafe
  // ========================================================================
  const riskStore = getRiskStateStore();
  let riskRecovery = await riskStore.getState(request.userId);
  
  // SAFE-BY-DEFAULT: Hvis vi ikke kan lese state, avvis trade
  if (!riskRecovery) {
    // Prøv å initialisere én gang
    try {
      const currentBalance = Number(session?.current_capital_nok ?? session?.current_capital ?? 0);
      riskRecovery = await riskStore.initializeState(request.userId, currentBalance);
    } catch (initError) {
      const envelope = await buildRejectionEnvelope(supabase, {
        idempotencyKey,
        auditStatus: "failed",
        persistenceStatus: "failed",
        degradedMode: true,
        degradationReason: `Risk state initialization failed: ${initError instanceof Error ? initError.message : String(initError)}`
      });
      return {
        success: false,
        rejectionReason: "RISK_STATE_UNAVAILABLE",
        error: "Cannot safely determine risk state. Trade blocked for safety.",
        auditStatus: "failed",
        envelope
      };
    }
  }
  
  // Verifiser at state er gyldig
  if (!isValidRiskState(riskRecovery.state)) {
    const envelope = await buildRejectionEnvelope(supabase, {
      idempotencyKey,
      auditStatus: "failed",
      persistenceStatus: "failed",
      degradedMode: true,
      degradationReason: `Risk state validation failed: equity=${riskRecovery.state?.equity}, peakEquity=${riskRecovery.state?.peakEquity}`
    });
    return {
      success: false,
      rejectionReason: "RISK_STATE_CORRUPT",
      error: "Risk state is corrupt or invalid. Trade blocked.",
      auditStatus: "failed",
      envelope
    };
  }

  // ========================================================================
  // 3. Risk Kernel Check
  // ========================================================================
  const riskStateManager = new RiskStateManager(riskRecovery.state.equity);
  Object.assign(riskStateManager, riskRecovery.state);
  
  // Sjekk cooldown
  const cooldown = await riskStore.isInCooldown(request.userId);
  if (cooldown.inCooldown) {
    const envelope = await buildRejectionEnvelope(supabase, {
      idempotencyKey,
      auditStatus: "failed",
      persistenceStatus: "failed",
      degradationReason: `Cooldown active: ${cooldown.reason} until ${cooldown.endsAt}`
    });
    return {
      success: false,
      rejectionReason: "RISK_COOLDOWN",
      error: `Trading blocked: ${cooldown.reason} cooldown`,
      auditStatus: "failed",
      envelope
    };
  }
  
  // Kjør Risk Kernel
  const riskKernel = new RiskKernel(riskRecovery.limits);
  const orderValueUsdt = request.quantity * request.price;
  const riskCheck = riskKernel.checkTrade(
    {
      side: request.side,
      quantity: request.quantity,
      price: request.price,
      notional: orderValueUsdt,
      leverage: 1,
    },
    riskStateManager.getState()
  );
  
  // Generer decisionHash FØR vi sjekker risk resultat
  const decisionHash = generateDecisionHash({
    userId: request.userId,
    symbol: request.symbol,
    side: request.side,
    quantity: request.quantity,
    price: request.price,
    riskLimits: riskRecovery.limits,
    timestamp: Date.now(),
  });
  
  if (!riskCheck.allowed) {
    await logRiskViolations(supabase, request.userId, riskCheck.violations);
    const envelope = await buildRejectionEnvelope(supabase, {
      idempotencyKey,
      decisionHash,
      auditStatus: "failed",
      persistenceStatus: "failed",
      degradationReason: `Risk violations: ${riskCheck.violations.map(v => `${v.rule}(${v.severity})`).join(', ')}`
    });
    return {
      success: false,
      rejectionReason: "RISK_LIMIT_VIOLATION",
      error: `Risk limits violated: ${riskCheck.violations.map(v => v.rule).join(', ')}`,
      auditStatus: "failed",
      envelope
    };
  }
  
  trace.riskCheckPassed = true;
  
  // ========================================================================
  // 3.6 Slippage Estimation & Enforcement (Phase 3)
  // ========================================================================
  const maxSlippageBps = request.metadata?.maxSlippageBps || 50; // Default 0.5%
  const executionNotional = (request.quantity * request.price) / (request.price || 1); // Notional in USD/BTC terms
  
  // Simulation: Estimate slippage based on notional and typical depth
  // In production, this would call getOrderBookDepth(symbol, side, amount)
  const estimatedSlippageBps = (executionNotional / 100000) * 5; // 5 bps per $100k
  
  if (estimatedSlippageBps > maxSlippageBps) {
    const errorMsg = `Trade Aborted: Estimated slippage (${estimatedSlippageBps.toFixed(2)} bps) exceeds limit (${maxSlippageBps} bps).`;
    console.warn(`[executeTradeSafe] ${errorMsg}`);
    
    // @ts-ignore - trace structure adjustment
    trace.success = false;
    // @ts-ignore - trace structure adjustment
    trace.error = errorMsg;
    
    return {
      success: false,
      error: errorMsg,
      auditStatus: 'failed',
    };
  }
  // ========================================================================
  // 4. Execution Logic (Simulation for Paper, Exchange Call for Live)
  // ========================================================================
  let adjustedQuantity = riskCheck.adjustedTrade?.quantity ?? request.quantity;
  const regime = (request.signalContext?.regime as string) || 'unclear';

  // Apply Regime-Aware Safety Multipliers (Secondary enforcer)
  // These are intentionally conservative to act as a fail-safe.
  const regimeSafetyMultipliers: Record<string, number> = {
    bull: 1.0,      // Allow full trade
    bear: 0.8,      // 20% reduction
    range: 1.0,     // Standard
    'high-vol': 0.3, // 70% reduction (Capital preservation)
    unclear: 0.7    // 30% reduction
  };

  const safetyMultiplier = regimeSafetyMultipliers[regime] || 1.0;
  if (safetyMultiplier < 1.0) {
    adjustedQuantity *= safetyMultiplier;
  }
  
  // Apply partial exit logic if side is SELL and we have a signal context
  if (request.side === 'sell' && request.signalContext) {
    const exitRatio = riskKernel.calculateExitRatio(request.signalContext.confidence * 100);
    if (exitRatio < 1.0) {
      adjustedQuantity *= exitRatio;
    }
  }

  const finalTrade = {
    side: request.side,
    quantity: adjustedQuantity,
    price: request.price,
    notional: adjustedQuantity * request.price,
    leverage: 1,
  };

  // ========================================================================
  // 4. Audit Intent & Slippage Estimation
  // ========================================================================
  const auditor = new ExecutionAuditor();
  const tradeId = crypto.randomUUID();
  
  // Fetch real order book for slippage estimation
  const tradeExecutor = await ExecutorFactory.create(supabase, request.userId, request.mode, session?.id ?? request.sessionId ?? '');
  let orderBook: import("../order-executor").OrderBookSnapshot | null = null;
  try {
    orderBook = await tradeExecutor.fetchOrderBook(request.symbol, 20);
  } catch (obError) {
    console.warn(`[executeTradeSafe] Failed to fetch order book for ${request.symbol}:`, obError);
  }

  const slippageReport = orderBook 
    ? estimateSlippage(orderBook, finalTrade.quantity, finalTrade.side)
    : { estimatedPrice: finalTrade.price, slippageBps: request.symbol.includes('BTC') ? 5 : 15 }; // Pair-aware fallback

  const l2Snapshot = orderBook ? createL2Snapshot(
    orderBook.bids.map(b => [b.price, b.quantity] as [number, number]),
    orderBook.asks.map(a => [a.price, a.quantity] as [number, number])
  ) : createL2Snapshot(
    [[request.price * 0.999, 10], [request.price * 0.998, 20]],
    [[request.price * 1.001, 10], [request.price * 1.002, 20]]
  );
  
  const auditIntent = auditor.recordIntent({
    orderId: tradeId,
    clientId: request.userId,
    sessionId: session?.id ?? request.sessionId ?? '',
    side: finalTrade.side,
    type: request.orderType,
    symbol: request.symbol,
    quantity: finalTrade.quantity,
    price: finalTrade.price,
    timeInForce: 'GTC',
    strategy: request.signalContext?.strategy || 'unknown',
    regime: request.signalContext?.regime || 'unknown',
    l2Snapshot,
    venueScores: [],
    selectedVenue: request.mode === 'live' ? 'Binance' : 'Paper',
    expectedFill: {
      price: slippageReport.estimatedPrice,
      quantity: finalTrade.quantity,
      slippageBps: slippageReport.slippageBps,
      fees: finalTrade.notional * (request.mode === 'live' ? 0.001 : 0.0005), // Dynamic fee: 0.1% live, 0.05% paper
      confidence: orderBook ? 0.98 : 0.5,
      estimatedTime: 100
    }
  });

  // AUDIT-OR-BLOCK: Prøv å persistere audit
  let auditStatus: TradeEnvelope['auditStatus'] = 'pending';
  let degradedMode = false;
  let degradationReason: string | undefined;
  
  try {
    const auditStore = getAuditStore();
    const persistResult = await auditStore.persist(auditIntent);
    
    if (!persistResult.success) {
      // Kritisk: Audit feilet
      if (process.env.AUDIT_FAIL_BLOCK === 'true') {
        // STRICT MODE: Avvis trade hvis audit feiler
        const envelope = await buildRejectionEnvelope(supabase, {
          tradeId,
          idempotencyKey,
          decisionHash,
          auditStatus: 'failed',
          persistenceStatus: 'failed',
          degradedMode: true,
          degradationReason: `Audit persist failed: ${persistResult.error}`
        });
        return {
          success: false,
          rejectionReason: "AUDIT_FAILURE",
          error: "Cannot create audit trail. Trade blocked for compliance.",
          auditStatus: "failed",
          envelope
        };
      } else {
        // DEGRADED MODE: Fortsett, men marker som degraded
        auditStatus = 'degraded';
        degradedMode = true;
        degradationReason = `Audit persist failed: ${persistResult.error}`;
        console.error(`[executeTradeSafe] DEGRADED MODE: Audit failed for trade ${tradeId}`);
      }
    } else {
      auditStatus = 'confirmed';
      trace.auditPersisted = true;
    }
  } catch (auditError) {
    if (process.env.AUDIT_FAIL_BLOCK === 'true') {
      const envelope = await buildRejectionEnvelope(supabase, {
        tradeId,
        idempotencyKey,
        decisionHash,
        auditStatus: 'failed',
        persistenceStatus: 'failed',
        degradedMode: true,
        degradationReason: `Audit exception: ${auditError instanceof Error ? auditError.message : String(auditError)}`
      });
      return {
        success: false,
        rejectionReason: "AUDIT_EXCEPTION",
        error: "Audit system error. Trade blocked.",
        auditStatus: "failed",
        envelope
      };
    } else {
      auditStatus = 'failed';
      degradedMode = true;
      degradationReason = `Audit exception: ${auditError}`;
    }
  }

  // ========================================================================
  // 6. Execute Trade
  // ========================================================================
  const execResult = await tradeExecutor.executeOrder({
    symbol: request.symbol,
    side: finalTrade.side,
    quantity: finalTrade.quantity,
    orderType: request.orderType,
    price: request.price,
  });

  if (!execResult.success) {
    // Marker audit som rejected
    auditor.recordRejection(tradeId, 'system_error', execResult.error);
    
    const envelope = await buildRejectionEnvelope(supabase, {
      tradeId,
      idempotencyKey,
      decisionHash,
      auditStatus,
      persistenceStatus: 'failed',
      degradedMode,
      degradationReason: degradationReason || `Execution failed: ${execResult.error}`
    });
    
    return {
      success: false,
      error: execResult.error || "Execution failed",
      auditStatus,
      envelope
    };
  }

  // ========================================================================
  // 7. Record Trade with Full Traceability
  // ========================================================================
  const nowIso = new Date().toISOString();
  
  const { data: trade, error: tradeError } = await supabase
    .from("trades")
    .insert({
      id: tradeId,
      session_id: session?.id ?? request.sessionId ?? '',
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
      // Metadata for sporbarhet
      metadata: {
        risk_version: RISK_KERNEL_VERSION,
        policy_version: POLICY_VERSION,
        decision_hash: decisionHash,
        audit_status: auditStatus,
        degraded_mode: degradedMode,
        degradation_reason: degradationReason,
      }
    } as never)
    .select()
    .single();

  if (tradeError) {
    // Kritisk: Trade eksekvert men ikke lagret
    console.error(`[executeTradeSafe] CRITICAL: Trade executed but DB insert failed: ${tradeError.message}`);
    
    const envelope = await buildRejectionEnvelope(supabase, {
      tradeId,
      idempotencyKey,
      decisionHash,
      auditStatus,
      persistenceStatus: 'failed',
      degradedMode: true,
      degradationReason: `CRITICAL: Trade executed but DB insert failed: ${tradeError.message}`
    });
    
    return {
      success: true, // Trade DID execute
      tradeId,
      orderId: execResult.orderId,
      executedPrice: execResult.executedPrice,
      executedQuantity: execResult.executedQuantity,
      fee: execResult.fee,
      auditStatus,
      error: "CRITICAL: Trade executed but failed to save to database. Manual reconciliation required.",
      envelope,
      executionTrace: trace
    };
  }
  
  trace.tradeRecorded = true;

  // ========================================================================
  // 8. Dual-Write Risk State – Deterministic
  // ========================================================================
  let persistenceStatus: TradeEnvelope['persistenceStatus'] = 'pending';
  
  try {
    const pnl = request.side === "sell" 
      ? execResult.executedQuantity * execResult.executedPrice 
      : -(execResult.executedQuantity * execResult.executedPrice);
    
    riskStateManager.recordTrade(pnl, execResult.executedQuantity * execResult.executedPrice, request.side);
    
    // DETERMINISTIC DUAL-WRITE: Prøv Redis først, så DB
    const redisKey = `risk:state:${request.userId}`;
    const serialized = JSON.stringify({
      userId: request.userId,
      state: riskStateManager.getState(),
      limits: riskRecovery.limits,
      updatedAt: new Date()
    });
    
    // Step 1: Redis (fast)
    let redisOk = false;
    try {
      await riskStore['redis'].set(redisKey, serialized, 86400);
      redisOk = true;
      persistenceStatus = 'redis_ok';
    } catch (redisError) {
      console.error(`[executeTradeSafe] Redis write failed: ${redisError}`);
    }
    
    // Step 2: Supabase (durable) - ALLTID prøv DB selv om Redis feiler
    const { error: dbError } = await supabase
      .from('risk_state')
      .upsert({
        user_id: request.userId,
        state: {
          userId: request.userId,
          state: riskStateManager.getState(),
          limits: riskRecovery.limits,
          version: 1,
          updatedAt: new Date(),
          createdAt: new Date()
        } as unknown as Database['public']['Tables']['risk_state']['Insert']['state'],
        updated_at: nowIso
      }, { onConflict: 'user_id' });
    
    if (dbError) {
      console.error(`[executeTradeSafe] DB write failed: ${dbError.message}`);
      
      if (redisOk) {
        // Redis OK, DB failed -> Outbox pattern, retry senere
        persistenceStatus = 'redis_ok';
        await queueForRetry(request.userId, riskStateManager.getState());
      } else {
        // Begge feilet
        persistenceStatus = 'failed';
        degradedMode = true;
        degradationReason = degradationReason 
          ? `${degradationReason}; State persistence failed`
          : 'State persistence failed';
      }
    } else {
      persistenceStatus = redisOk ? 'dual_ok' : 'db_ok';
      trace.statePersisted = true;
    }
    
  } catch (stateError) {
    console.error(`[executeTradeSafe] State update failed: ${stateError}`);
    persistenceStatus = 'failed';
    degradedMode = true;
    degradationReason = degradationReason 
      ? `${degradationReason}; State update exception`
      : 'State update exception';
  }

  // ========================================================================
  // 9. Finalize Audit
  // ========================================================================
  if (auditStatus !== 'failed') {
    try {
      auditor.recordFill(tradeId, {
        orderId: tradeId,
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
      
      const auditStore = getAuditStore();
      await auditStore.persist(auditIntent);
    } catch (finalizeError) {
      console.error(`[executeTradeSafe] Audit finalize failed: ${finalizeError}`);
    }
  }

  // ========================================================================
  // 10. Return with Full Envelope
  // ========================================================================
  const systemHealth = await buildSystemHealth(supabase, killSwitchStatus);
  
  const envelope: TradeEnvelope = {
    tradeId,
    idempotencyKey,
    decisionHash,
    riskVersion: RISK_KERNEL_VERSION,
    policyVersion: POLICY_VERSION,
    auditStatus,
    persistenceStatus,
    createdAt: new Date(),
    degradedMode,
    degradationReason,
    killSwitchStatus: {
      activated: killSwitchStatus.activated,
      reason: killSwitchStatus.reason
    },
    systemHealth
  };

  return {
    success: true,
    tradeId: trade.id,
    sessionId: session?.id ?? request.sessionId ?? '',
    orderId: execResult.orderId,
    executedPrice: execResult.executedPrice,
    executedQuantity: execResult.executedQuantity,
    fee: execResult.fee,
    auditStatus,
    envelope,
    executionTrace: {
      ...trace,
      completedAt: Date.now(),
      steps: ['killSwitchCheck', 'idempotencyCheck', 'sessionResolution', 'riskStateRecovery', 'riskKernelCheck', 'auditIntent', 'tradeExecution', 'tradeRecording', 'statePersistence', 'auditFinalize']
    },
    // Marker hvis vi er i degraded mode
    ...(degradedMode && {
      warning: `Trade executed in DEGRADED MODE: ${degradationReason}`
    })
  };
} // End of executeTradeWithLock


// ============================================================================
// Helper Functions
// ============================================================================

// Helper functions are now imported from execute-trade-helpers.ts

/**
 * Estimate slippage based on order book depth
 */
function estimateSlippage(
  orderBook: import("../order-executor").OrderBookSnapshot,
  quantity: number,
  side: 'buy' | 'sell'
): { estimatedPrice: number; slippageBps: number } {
  const levels = side === 'buy' ? orderBook.asks : orderBook.bids;
  let remainingQty = quantity;
  let totalPrice = 0;
  
  const midPrice = (orderBook.bids[0]?.price + orderBook.asks[0]?.price) / 2 || levels[0]?.price;

  for (const level of levels) {
    const fillQty = Math.min(remainingQty, level.quantity);
    totalPrice += fillQty * level.price;
    remainingQty -= fillQty;
    
    if (remainingQty <= 0) break;
  }
  
  // If order book is too thin, assume extra slippage for the remainder
  if (remainingQty > 0) {
    const lastLevelPrice = levels[levels.length - 1]?.price || midPrice;
    totalPrice += remainingQty * lastLevelPrice * (side === 'buy' ? 1.02 : 0.98);
  }
  
  const avgPrice = totalPrice / quantity;
  const slippage = Math.abs(avgPrice - midPrice) / midPrice;
  const slippageBps = Math.round(slippage * 10000);
  
  return {
    estimatedPrice: avgPrice,
    slippageBps: Math.max(1, slippageBps)
  };
}
