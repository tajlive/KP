// ═══════════════════════════════════════════════════════════════
// KLARPAKKE — Monitoring Alert Configuration (GlitchTip-kompatibel)
// Alert-regler for produksjonsovervåkning
// ═══════════════════════════════════════════════════════════════

import { captureException, captureMessage, withScope } from "@/lib/sentry";

/**
 * Konfigurer overvåkingsregler for produksjon.
 * Merk: Sentry-spesifikke query-syntakser er forenklet; tilpass til
 * GlitchTip-dashboard etter migrering.
 */
export const MONITORING_ALERT_RULES = {
  // 1. Health API Downtime Alert
  healthApiDowntime: {
    name: "🩺 Health API Downtime",
    environment: "production",
    dataset: "errors",
    query: "url:https://www.klarpakke.no/api/health http.status_code:[500 503 504]",
    threshold: {
      type: "count",
      interval: "2m",
      value: 1,
    },
    actions: {
      slack: {
        channel: "#ops",
        message: "🚨 Health API returning errors for > 2 minutes",
      },
      email: ["ops@klarpakke.no"],
    },
  },

  // 2. Stripe Webhook Failure Alert
  stripeWebhookFailures: {
    name: "💳 Stripe Webhook Failures",
    environment: "production",
    dataset: "errors",
    query: "url:https://www.klarpakke.no/api/webhooks/stripe http.status_code:[500 502 503 504]",
    threshold: {
      type: "count",
      interval: "5m",
      value: 3,
    },
    actions: {
      slack: {
        channel: "#ops",
        message: "💳 Stripe webhook failing repeatedly — check payment processing!",
      },
      email: ["ops@klarpakke.no", "billing@klarpakke.no"],
    },
  },

  // 3. Edge Function Cold Start Alert
  edgeFunctionColdStart: {
    name: "❄️ Edge Function Cold Start",
    environment: "production",
    dataset: "transactions",
    query: "event.type:transaction transaction.op:functions transaction.duration:>60000",
    threshold: {
      type: "count",
      interval: "10m",
      value: 5,
    },
    actions: {
      slack: {
        channel: "#ops",
        message: "❄️ Edge Functions experiencing slow cold starts (>60s)",
      },
    },
  },

  // 4. Auto Trade Failure Alert
  autoTradeFailureAlert: {
    name: "🤖 Auto Trade Failures",
    environment: "production",
    dataset: "errors",
    query: "auto_trade failed status:failed",
    threshold: {
      type: "count",
      interval: "1h",
      value: 10,
    },
    actions: {
      slack: {
        channel: "#ops",
        message: "🤖 Auto trading experiencing high failure rate — investigate immediately!",
      },
      email: ["ops@klarpakke.no", "trading@klarpakke.no"],
      pagerduty: true,
    },
  },

  // 5. Database Connection Pool Exhaustion
  dbPoolExhaustion: {
    name: "🗄️ Database Connection Pool",
    environment: "production",
    dataset: "errors",
    query: "connection pool exhausted OR too many connections",
    threshold: {
      type: "count",
      interval: "5m",
      value: 1,
    },
    actions: {
      slack: {
        channel: "#ops",
        message: "🗄️ Database connection pool issues detected",
      },
    },
  },

  // 6. Trading Signal Engine Down
  tradingSignalEngineDown: {
    name: "📡 Trading Signal Engine",
    environment: "production",
    dataset: "errors",
    query: "signal-engine OR trading_signals error",
    threshold: {
      type: "count",
      interval: "5m",
      value: 3,
    },
    actions: {
      slack: {
        channel: "#ops",
        message: "📡 Trading signal engine experiencing issues",
      },
      email: ["ops@klarpakke.no"],
    },
  },
};

/** @deprecated Bruk MONITORING_ALERT_RULES. */
export const SENTRY_ALERT_RULES = MONITORING_ALERT_RULES;

/**
 * Send custom monitoring alert
 */
export function sendMonitoringAlert(
  category: string,
  message: string,
  severity: "critical" | "warning" | "info" = "warning",
  metadata?: Record<string, unknown>
) {
  const level = severity === "critical" ? "error" : severity === "warning" ? "warning" : "info";
  withScope((scope) => {
    scope.setTag("monitoring_category", category);
    scope.setTag("severity", severity);
    scope.setLevel(level);

    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }

    captureMessage(`[${category.toUpperCase()}] ${message}`, level);
  });
}

/**
 * Track webhook processing time for alerting
 */
export function trackWebhookProcessing(
  eventType: string,
  processingTimeMs: number,
  success: boolean
) {
  captureMessage(`Stripe webhook ${eventType} processed`, "info");

  if (processingTimeMs > 3000) {
    sendMonitoringAlert(
      "webhook_performance",
      `Stripe webhook ${eventType} took ${processingTimeMs}ms (threshold: 3000ms)`,
      "warning",
      { event_type: eventType, processing_time_ms: processingTimeMs }
    );
  }
}

/**
 * Track health check failures
 */
export function trackHealthCheckFailure(checkName: string, error: Error) {
  withScope((scope) => {
    scope.setTag("health_check", checkName);
    scope.setTag("monitoring_category", "health_check_failure");
    captureException(error);
  });

  sendMonitoringAlert(
    "health_check_failure",
    `Health check '${checkName}' failed: ${error.message}`,
    "critical"
  );
}
