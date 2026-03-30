// ═══════════════════════════════════════════════════════════════
// KLARPAKKE — Sentry Alert Configuration
// Alert-regler for produksjonsovervåkning
// ═══════════════════════════════════════════════════════════════

import * as Sentry from "@sentry/nextjs";

/**
 * Konfigurer Sentry alerts for produksjon
 * Må kopieres til Sentry Dashboard → Alerts → Create Alert
 */

export const SENTRY_ALERT_RULES = {
  // 1. Health API Downtime Alert
  // Alert hvis /api/health returnerer != 200 i mer enn 2 minutter
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
  // Alert hvis Stripe webhook feiler (5xx) mer enn 3 ganger på 5 min
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
  // Alert hvis Edge Function uptime < 60 sekunder (cold start varsel)
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
  // Alert hvis auto_trade_log har status='failed' > 10 rader siste time
  // (Håndteres av DB trigger, men vi logger også til Sentry)
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

/**
 * Send custom Sentry alert for monitoring events
 */
export function sendMonitoringAlert(
  category: string,
  message: string,
  severity: "critical" | "warning" | "info" = "warning",
  metadata?: Record<string, unknown>
) {
  Sentry.withScope((scope) => {
    scope.setTag("monitoring_category", category);
    scope.setTag("severity", severity);
    scope.setLevel(severity === "critical" ? "fatal" : severity === "warning" ? "warning" : "info");
    
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    
    Sentry.captureMessage(`[${category.toUpperCase()}] ${message}`, severity === "critical" ? "fatal" : severity);
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
  // Log to Sentry for performance monitoring
  Sentry.captureMessage(`Stripe webhook ${eventType} processed`, "info");
  
  // Add performance breadcrumb
  Sentry.addBreadcrumb({
    category: "webhook",
    message: `${eventType} processed in ${processingTimeMs}ms`,
    level: processingTimeMs > 3000 ? "warning" : "info",
    data: {
      event_type: eventType,
      processing_time_ms: processingTimeMs,
      success,
      threshold_ms: 3000,
    },
  });
  
  // Alert if slow
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
  Sentry.withScope((scope) => {
    scope.setTag("health_check", checkName);
    scope.setTag("monitoring_category", "health_check_failure");
    Sentry.captureException(error);
  });
  
  sendMonitoringAlert(
    "health_check_failure",
    `Health check '${checkName}' failed: ${error.message}`,
    "critical"
  );
}
