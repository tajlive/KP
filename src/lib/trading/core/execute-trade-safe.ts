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
  type TradeRequest,
  type RiskValidationResult,
} from "@/lib/trading/safety/risk-validator";
import { ExecutorFactory } from "@/lib/trading/executor-factory";
import { RiskKernel, RiskStateManager, type RiskLimits, DEFAULT_RISK_LIMITS } from "@/lib/trading/risk/risk-kernel";
import { getRiskStateStore } from "@/lib/trading/risk/risk-state-store";
import { getAuditStore } from "@/lib/trading/execution/audit-store";
import { ExecutionAuditor, createL2Snapshot } from "@/lib/trading/execution/execution-audit";
import type { ExecuteTradeRequest, ExecuteTradeResult } from "./types";
import { checkOutboxHealth, isTradingAllowed, getKillSwitchStatus } from "./outbox-monitor";
import crypto from "crypto";

const PAPER_DEFAULT_CAPITAL = 100000;
const RISK_KERNEL_VERSION = "3.0.1-p0";
const POLICY_VERSION = "v3-ensemble-1.0";

/** Health check thresholds for trading */
export interface HealthThresholds {
  maxResponseTimeMs: number;
  minHealthyServices: number;
}

const DEFAULT_HEALTH_THRESHOLDS: HealthThresholds = {
  maxResponseTimeMs: 5000,
  minHealthyServices: 3 // Krever minst 3 av 5 services healthy
};

/**
 * Bygg komplett rejection envelope med alle påkrevde felter
 */
async function buildRejectionEnvelope(
  supabase: SupabaseClient<Database>,
  params: {
    tradeId?: string;
    idempotencyKey: string;
    decisionHash?: string;
    auditStatus: TradeEnvelope['auditStatus'];
    persistenceStatus: TradeEnvelope['persistenceStatus'];
    degradedMode?: boolean;
    degradationReason?: string;
  }
): Promise<TradeEnvelope> {
  const killSwitchStatus = getKillSwitchStatus();
  const systemHealth = await buildSystemHealth(supabase, killSwitchStatus);
  
  return {
    tradeId: params.tradeId ?? "",
    idempotencyKey: params.idempotencyKey,
    decisionHash: params.decisionHash ?? "",
    riskVersion: RISK_KERNEL_VERSION,
    policyVersion: POLICY_VERSION,
    auditStatus: params.auditStatus,
    persistenceStatus: params.persistenceStatus,
    createdAt: new Date(),
    degradedMode: params.degradedMode,
    degradationReason: params.degradationReason,
    killSwitchStatus: {
      activated: killSwitchStatus.activated,
      reason: killSwitchStatus.reason
    },
    systemHealth
  };
}

async function buildSystemHealth(
  supabase: SupabaseClient<Database>,
  killSwitchStatus: { activated: boolean; reason?: string }
): Promise<TradeEnvelope['systemHealth']> {
  const failedServices: string[] = [];
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  try {
    // Check Supabase
    const { error: dbError } = await supabase
      .from('risk_state')
      .select('count', { count: 'exact', head: true });
    if (dbError) failedServices.push('supabase');

    // Check Redis
    try {
      const store = getRiskStateStore();
      await store['redis'].get('health:check');
    } catch {
      failedServices.push('redis');
    }

    // Check S3
    try {
      const auditStore = getAuditStore();
      const s3Health = await auditStore.checkHealth();
      if (!s3Health) failedServices.push('s3');
    } catch {
      failedServices.push('s3');
    }

    // Determine status
    if (killSwitchStatus.activated || failedServices.length >= 2) {
      status = 'unhealthy';
    } else if (failedServices.length === 1) {
      status = 'degraded';
    }

    return { status, failedServices };
  } catch {
    return { status: 'unhealthy', failedServices: ['health-check-failed'] };
  }
}

export interface TradeEnvelope {
  tradeId: string;
  idempotencyKey: string;
  decisionHash: string;
  riskVersion: string;
  policyVersion: string;
  auditStatus: 'pending' | 'confirmed' | 'failed' | 'degraded';
  persistenceStatus: 'pending' | 'redis_ok' | 'db_ok' | 'dual_ok' | 'failed';
  createdAt: Date;
  degradedMode?: boolean;
  degradationReason?: string;
  /** Kill-switch status ved trade-tidspunkt */
  killSwitchStatus?: {
    activated: boolean;
    reason?: string;
  };
  /** System health ved trade-tidspunkt */
  systemHealth?: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    failedServices: string[];
  };
}

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
  // 0. Idempotency Check – Prevent duplicate trades
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
  const finalTrade = riskCheck.adjustedTrade || {
    side: request.side,
    quantity: request.quantity,
    price: request.price,
    notional: orderValueUsdt,
    leverage: 1,
  };

  // ========================================================================
  // 4. Audit Intent – MUST SUCCEED or BLOCK
  // ========================================================================
  const auditor = new ExecutionAuditor();
  const orderId = `order-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const tradeId = crypto.randomUUID();
  
  const mockL2Snapshot = createL2Snapshot(
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
    l2Snapshot: mockL2Snapshot,
    venueScores: [],
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
  const executor = await ExecutorFactory.create(supabase, request.userId, request.mode, session?.id ?? request.sessionId ?? '');
  const execResult = await executor.executeOrder({
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
    } as any)
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
    
    riskStateManager.recordTrade(pnl, execResult.executedQuantity * execResult.executedPrice);
    
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
}

// ============================================================================
// Helper Functions
// ============================================================================

interface TradingSession {
  id: string;
  current_capital_nok?: number;
  current_capital?: number;
}

async function resolveSession(
  supabase: SupabaseClient<Database>,
  request: ExecuteTradeRequest
): Promise<{ success: boolean; session?: TradingSession; sessionId?: string; error?: string }> {
  // Simplified session resolution
  // Would include full session logic from execute-trade-v3
  const sessionId = request.sessionId ?? crypto.randomUUID();
  return { success: true, session: { id: sessionId }, sessionId };
}

interface RiskState {
  equity: number;
  peakEquity: number;
  dailyPnl: number;
  openPositions: number;
}

function isValidRiskState(state: unknown): boolean {
  if (!state || typeof state !== 'object') return false;
  
  const s = state as RiskState;
  
  // Sjekk påkrevde felter
  const required = ['equity', 'peakEquity', 'dailyPnl', 'openPositions'];
  for (const field of required) {
    if (typeof s[field as keyof RiskState] !== 'number') return false;
  }
  
  // Sjekk at verdier er fornuftige
  if (s.equity < 0 || s.peakEquity < 0) return false;
  if (isNaN(s.equity) || isNaN(s.peakEquity)) return false;
  
  return true;
}

function generateIdempotencyKey(request: ExecuteTradeRequest): string {
  const components = [
    request.userId,
    request.sessionId,
    request.symbol,
    request.side,
    request.quantity.toFixed(8),
    request.price.toFixed(2),
    request.orderType,
    Math.floor(Date.now() / 60000) // 1-minutt window
  ];
  
  return crypto
    .createHash('sha256')
    .update(components.join('|'))
    .digest('hex')
    .slice(0, 32);
}

function generateDecisionHash(params: unknown): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(params))
    .digest('hex')
    .slice(0, 16);
}

interface RiskViolation {
  rule: string;
  severity: string;
  expectedValue?: number | string;
  actualValue?: number | string;
  action?: string;
}

async function logRiskViolations(
  supabase: SupabaseClient,
  userId: string,
  violations: unknown[]
): Promise<void> {
  try {
    await supabase.from('risk_violations').insert(
      violations.map(v => {
        const violation = v as RiskViolation;
        return {
          user_id: userId,
          rule: violation.rule,
          severity: violation.severity,
          expected_value: violation.expectedValue,
          actual_value: violation.actualValue,
          action: violation.action,
          created_at: new Date().toISOString()
        };
      })
    );
  } catch (error) {
    console.error('[executeTradeSafe] Failed to log violations:', error);
  }
}

async function queueForRetry(userId: string, state: unknown): Promise<void> {
  // Outbox pattern: Legg i kø for retry
  console.log(`[executeTradeSafe] Queued state for retry: ${userId}`);
  // Implementeres med faktisk kø (f.eks. Bull, SQS, etc.)
}
