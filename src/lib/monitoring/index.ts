// ═══════════════════════════════════════════════════════════════
// KLARPAKKE — Monitoring Module
// Samlet eksport av monitoring-funksjoner
// ═══════════════════════════════════════════════════════════════

export {
  SENTRY_ALERT_RULES,
  sendMonitoringAlert,
  trackWebhookProcessing,
  trackHealthCheckFailure,
} from "./sentry-alerts";

/**
 * Log health check metrics til DB for historisk analyse
 */
export async function logHealthMetrics(
  supabase: ReturnType<typeof import("@/lib/supabase/server").createClient>,
  healthData: {
    status: string;
    checks: {
      database?: { status: string; latency?: number };
      tradingSignals?: { status: string; latency?: number };
      kv?: { status: string; latency?: number };
      environment?: { status: string };
    };
    version: string;
    uptime: number;
  }
) {
  try {
    await supabase.from("health_check_metrics").insert({
      overall_status: healthData.status,
      database_status: healthData.checks.database?.status,
      database_latency_ms: healthData.checks.database?.latency,
      trading_signals_status: healthData.checks.tradingSignals?.status,
      trading_signals_latency_ms: healthData.checks.tradingSignals?.latency,
      kv_status: healthData.checks.kv?.status,
      kv_latency_ms: healthData.checks.kv?.latency,
      environment_status: healthData.checks.environment?.status,
      version: healthData.version,
      uptime_seconds: healthData.uptime,
      raw_response: healthData,
    });
  } catch (error) {
    console.error("[Monitoring] Failed to log health metrics:", error);
  }
}

/**
 * Track API response tid for performance monitoring
 */
export function trackApiPerformance(
  endpoint: string,
  durationMs: number,
  statusCode: number
) {
  // Log til console for nå - kan utvides til å sende til Datadog/ Grafana
  console.log(`[API Performance] ${endpoint}: ${durationMs}ms (HTTP ${statusCode})`);
  
  // Alert hvis veldig treg
  if (durationMs > 5000) {
    console.warn(`[API Performance] SLOW: ${endpoint} took ${durationMs}ms`);
  }
}

/**
 * Track database query performance
 */
export function trackDbPerformance(
  table: string,
  operation: string,
  durationMs: number
) {
  if (durationMs > 1000) {
    console.warn(`[DB Performance] SLOW QUERY: ${operation} on ${table} took ${durationMs}ms`);
  }
}
