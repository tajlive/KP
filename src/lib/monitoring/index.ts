

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
 * @deprecated Tabell health_check_metrics finnes ikke i DB ennå - midlertidig deaktivert
 */
export async function logHealthMetrics(
  _supabase: ReturnType<typeof import("@/lib/supabase/server").createClient>,
  _healthData: {
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
  // TODO: KLA-XXX - Opprett health_check_metrics tabell i Supabase
  // Deaktivert midlertidig pga manglende DB-tabell
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
