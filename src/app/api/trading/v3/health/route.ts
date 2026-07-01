/**
 * V3 Trading Health Check API
 * 
 * Verifiserer at alle komponenter i V3 trading pipeline fungerer:
 * - Supabase connection
 * - Redis (Risk State Store)
 * - S3 (Audit storage)
 * - Risk Kernel
 * - Outbox recovery
 * 
 * P0 Hardening: Eksplisitte thresholds for healthy/degraded/unhealthy
 */

import { createClient } from "@/lib/supabase/server";
import { getRiskStateStore } from "@/lib/trading/risk/risk-state-store";
import { getAuditStore } from "@/lib/trading/execution/audit-store";
import { OutboxRecovery } from "@/lib/trading/core/outbox-recovery";
import { getKillSwitchStatus, getThresholds } from "@/lib/trading/core/outbox-monitor";
import { createRiskKernel } from "@/lib/trading/risk/risk-kernel";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

/** Health thresholds – P0 hardening */
const HEALTH_THRESHOLDS = {
  // Response time thresholds (ms)
  latency: {
    warning: 500,    // > 500ms = degraded
    critical: 2000,  // > 2000ms = unhealthy
  },
  // Outbox thresholds
  outbox: {
    pendingWarning: 50,      // > 50 = degraded
    pendingCritical: 100,    // > 100 = unhealthy
    failedCritical: 1,       // > 0 = unhealthy (any failed items)
    interventionCritical: 1, // > 0 = unhealthy
  },
  // Service availability
  services: {
    minHealthy: 4, // Krever minst 4 av 5 services (80%)
  },
  // Trading status
  trading: {
    maxDegradedRatio: 0.1, // Maks 10% degraded trades
  }
};

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  /** Årsak til unhealthy/degraded status */
  reason?: string;
  /** Trading tillatt? */
  tradingEnabled: boolean;
  /** Kill-switch status */
  killSwitch: {
    activated: boolean;
    reason?: string;
  };
  thresholds: typeof HEALTH_THRESHOLDS;
  checks: {
    supabase: { ok: boolean; latency: number; error?: string };
    redis: { ok: boolean; latency: number; error?: string };
    s3: { ok: boolean; latency: number; error?: string };
    riskKernel: { ok: boolean; latency: number; error?: string };
    outbox: { 
      ok: boolean; 
      pending: number; 
      failed: number;
      requiringIntervention: number;
      error?: string;
      status: 'healthy' | 'degraded' | 'unhealthy';
    };
  };
  summary: {
    totalServices: number;
    healthyServices: number;
    degradedServices: number;
    unhealthyServices: number;
  };
  degradedReasons?: string[];
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  const results: HealthCheckResult = {
    status: 'healthy',
    version: '3.0.1-p0',
    timestamp: new Date().toISOString(),
    tradingEnabled: true,
    killSwitch: { activated: false },
    thresholds: HEALTH_THRESHOLDS,
    checks: {
      supabase: { ok: false, latency: 0 },
      redis: { ok: false, latency: 0 },
      s3: { ok: false, latency: 0 },
      riskKernel: { ok: false, latency: 0 },
      outbox: { ok: true, pending: 0, failed: 0, requiringIntervention: 0, status: 'healthy' },
    },
    summary: {
      totalServices: 5,
      healthyServices: 0,
      degradedServices: 0,
      unhealthyServices: 0,
    }
  };

  const degradedReasons: string[] = [];
  const unhealthyReasons: string[] = [];

  // 1. Supabase Check
  try {
    const checkStart = Date.now();
    const supabase = await createClient();
    const { error } = await supabase
      .from('risk_state')
      .select('count', { count: 'exact', head: true });
    
    results.checks.supabase.latency = Date.now() - checkStart;
    
    if (error) {
      results.checks.supabase.ok = false;
      results.checks.supabase.error = error.message;
      unhealthyReasons.push('Supabase connection failed');
    } else {
      results.checks.supabase.ok = true;
      if (results.checks.supabase.latency > HEALTH_THRESHOLDS.latency.critical) {
        degradedReasons.push(`Supabase latency high: ${results.checks.supabase.latency}ms`);
      }
    }
  } catch (error) {
    results.checks.supabase.ok = false;
    results.checks.supabase.error = error instanceof Error ? error.message : String(error);
    unhealthyReasons.push('Supabase exception');
  }

  // 2. Redis Check
  try {
    const checkStart = Date.now();
    const store = getRiskStateStore();
    results.checks.redis.ok = await store.isHealthy();
    results.checks.redis.latency = Date.now() - checkStart;
    
    if (!results.checks.redis.ok) {
      unhealthyReasons.push('Redis read/write failed');
    } else if (results.checks.redis.latency > HEALTH_THRESHOLDS.latency.critical) {
      degradedReasons.push(`Redis latency high: ${results.checks.redis.latency}ms`);
    }
  } catch (error) {
    results.checks.redis.ok = false;
    results.checks.redis.error = error instanceof Error ? error.message : String(error);
    unhealthyReasons.push('Redis unavailable');
  }

  // 3. S3 Check
  try {
    const checkStart = Date.now();
    const auditStore = getAuditStore();
    const accessible = await auditStore.checkHealth();
    
    results.checks.s3.latency = Date.now() - checkStart;
    results.checks.s3.ok = accessible;
    
    if (!results.checks.s3.ok) {
      degradedReasons.push('S3 audit storage unavailable');
    } else if (results.checks.s3.latency > HEALTH_THRESHOLDS.latency.critical) {
      degradedReasons.push(`S3 latency high: ${results.checks.s3.latency}ms`);
    }
  } catch (error) {
    results.checks.s3.ok = false;
    results.checks.s3.error = error instanceof Error ? error.message : String(error);
    unhealthyReasons.push('S3 exception');
  }

  // 4. Risk Kernel Check
  try {
    const checkStart = Date.now();
    
    const limits = {
      maxPositionSize: 10000,
      maxDailyLoss: 1000,
      maxLeverage: 5,
      maxDrawdown: 0.1,
      maxOpenPositions: 5
    };
    
    // Use factory function for production bundle compatibility
    const kernel = createRiskKernel(limits);
    const result = kernel.checkTrade(
      { side: 'buy', quantity: 100, price: 100, notional: 10000, leverage: 1 },
      { equity: 100000, peakEquity: 100000, dailyPnl: 0, openPositions: 0, openNotional: 0, currentNotional: 0, currentLeverage: 0, consecutiveLosses: 0, tradesToday: 0, tradesThisHour: 0, volatilitySpikeActive: false, volatilityCooldownEnd: null, consecutiveLossCooldownEnd: null, manualBlock: false, lastTradeTime: null, currentTime: new Date() }
    );
    
    results.checks.riskKernel.latency = Date.now() - checkStart;
    results.checks.riskKernel.ok = result.allowed === true;
    
    if (!results.checks.riskKernel.ok) {
      degradedReasons.push('Risk kernel calculation returned disallowed');
    }
  } catch (error) {
    results.checks.riskKernel.ok = false;
    results.checks.riskKernel.error = error instanceof Error ? error.message : String(error);
    unhealthyReasons.push('Risk kernel exception');
  }

  // 5. Outbox Check med eksplisitte thresholds
  try {
    const supabase = await createClient();
    const outbox = new OutboxRecovery(supabase);
    const stats = await outbox.getStats();
    const thresholds = getThresholds();
    
    results.checks.outbox.pending = stats.pending;
    results.checks.outbox.failed = stats.failed;
    results.checks.outbox.requiringIntervention = stats.requiringIntervention;
    
    // Determine outbox status based on thresholds
    if (stats.failed > HEALTH_THRESHOLDS.outbox.failedCritical ||
        stats.requiringIntervention > HEALTH_THRESHOLDS.outbox.interventionCritical) {
      // UNHEALTHY: Any failed items or items requiring intervention
      results.checks.outbox.status = 'unhealthy';
      results.checks.outbox.ok = false;
      unhealthyReasons.push(
        stats.failed > 0 
          ? `Outbox has ${stats.failed} failed items`
          : `Outbox has ${stats.requiringIntervention} items requiring manual intervention`
      );
    } else if (stats.pending > HEALTH_THRESHOLDS.outbox.pendingCritical) {
      // UNHEALTHY: Too many pending items
      results.checks.outbox.status = 'unhealthy';
      results.checks.outbox.ok = false;
      unhealthyReasons.push(`Outbox backlog critical: ${stats.pending} pending items`);
    } else if (stats.pending > HEALTH_THRESHOLDS.outbox.pendingWarning) {
      // DEGRADED: Warning level
      results.checks.outbox.status = 'degraded';
      results.checks.outbox.ok = true; // Still functional
      degradedReasons.push(`Outbox backlog high: ${stats.pending} pending items`);
    } else {
      // HEALTHY
      results.checks.outbox.status = 'healthy';
      results.checks.outbox.ok = true;
    }
  } catch (error) {
    results.checks.outbox.ok = false;
    results.checks.outbox.status = 'unhealthy';
    results.checks.outbox.error = error instanceof Error ? error.message : String(error);
    unhealthyReasons.push('Outbox check failed');
  }

  // Calculate summary
  const serviceChecks = [
    results.checks.supabase,
    results.checks.redis,
    results.checks.s3,
    results.checks.riskKernel,
    results.checks.outbox,
  ];
  
  results.summary.healthyServices = serviceChecks.filter(c => c.ok && !degradedReasons.some(r => r.includes('latency'))).length;
  results.summary.degradedServices = serviceChecks.filter(c => c.ok && degradedReasons.some(r => r.toLowerCase().includes('latency'))).length;
  results.summary.unhealthyServices = serviceChecks.filter(c => !c.ok).length;

  // Check kill-switch status
  const killSwitchStatus = getKillSwitchStatus();
  results.killSwitch = {
    activated: killSwitchStatus.activated,
    reason: killSwitchStatus.reason
  };

  // Determine overall status
  const healthyServicesCount = results.summary.healthyServices + results.summary.degradedServices;
  
  if (unhealthyReasons.length > 0 || 
      healthyServicesCount < HEALTH_THRESHOLDS.services.minHealthy ||
      killSwitchStatus.activated) {
    // UNHEALTHY: Trading must stop
    results.status = 'unhealthy';
    results.tradingEnabled = false;
    results.reason = killSwitchStatus.activated 
      ? `Kill-switch active: ${killSwitchStatus.reason}`
      : unhealthyReasons.join('; ') || 'Insufficient healthy services';
    results.degradedReasons = degradedReasons.length > 0 ? degradedReasons : undefined;
  } else if (degradedReasons.length > 0) {
    // DEGRADED: Trading allowed but monitored
    results.status = 'degraded';
    results.tradingEnabled = true;
    results.reason = degradedReasons.join('; ');
    results.degradedReasons = degradedReasons;
  } else {
    // HEALTHY
    results.status = 'healthy';
    results.tradingEnabled = true;
  }

  const totalLatency = Date.now() - startTime;

  // HTTP status: 200 = healthy, 503 = degraded/unhealthy
  const statusCode = results.status === 'healthy' ? 200 : 503;

  return NextResponse.json(
    { ...results, totalLatency },
    { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'X-Trading-Enabled': String(results.tradingEnabled),
        'X-Health-Status': results.status
      }
    }
  );
}
