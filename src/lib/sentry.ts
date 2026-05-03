/**
 * 🐛 Sentry Error Tracking Utilities
 *
 * Hjelpefunksjoner for å logge feil til Sentry
 */

import * as Sentry from "@sentry/nextjs";

/**
 * Log en error til Sentry med ekstra kontekst
 */
export function logError(
  error: Error | string,
  context?: Record<string, unknown>,
  level: Sentry.SeverityLevel = "error",
) {
  if (process.env.NODE_ENV !== "production") {
    console.error("[Sentry]", error, context);
    return;
  }

  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    scope.setLevel(level);

    if (typeof error === "string") {
      Sentry.captureMessage(error, level);
    } else {
      Sentry.captureException(error);
    }
  });
}

/**
 * Log en message til Sentry
 */
export function logMessage(
  message: string,
  level: Sentry.SeverityLevel = "info",
  context?: Record<string, unknown>,
) {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    scope.setLevel(level);
    Sentry.captureMessage(message, level);
  });
}

/** Throttle: unngå Sentry-støy ved gjentatte poll-feil (hvert ~28s). */
let lastTradingIntegrityPollFailureAt = 0;
const TRADING_INTEGRITY_POLL_FAILURE_THROTTLE_MS = 5 * 60 * 1000;

/**
 * Dashboard / handelshistorikk: når `getRecentTrades`-poll feiler (Realtime stille, nettverk, RLS).
 * Breadcrumb hver gang (i prod); `captureMessage` maks én gang per 5 min per nettleser-kontekst.
 */
export function reportTradingIntegrityPollFailure(
  context?: Record<string, unknown>,
) {
  if (process.env.NODE_ENV !== "production") return;
  try {
    Sentry.addBreadcrumb({
      category: "trading_integrity",
      message: "trades_poll_failed",
      level: "warning",
      data: context,
    });
    const now = Date.now();
    if (
      now - lastTradingIntegrityPollFailureAt <
      TRADING_INTEGRITY_POLL_FAILURE_THROTTLE_MS
    ) {
      return;
    }
    lastTradingIntegrityPollFailureAt = now;
    const surface =
      typeof context?.surface === "string" ? context.surface : "unknown";
    logMessage(
      `Trading integrity: trades poll failed (${surface})`,
      "warning",
      {
        ...context,
      },
    );
  } catch {
    /* Sentry ikke tilgjengelig */
  }
}

let lastTradeHistoryEmptyReportAt = 0;
const TRADE_HISTORY_EMPTY_THROTTLE_MS = 30 * 60 * 1000;

/**
 * Innlogget bruker, vellykket henting av handler via kanonisk API, men 0 rader (filter «Alle» er implisitt på serversiden).
 * Throttlet for å unngå støy for nye brukere uten handler ennå.
 */
export function reportTradeHistoryEmptyWhileSignedIn(
  context?: Record<string, unknown>,
) {
  if (process.env.NODE_ENV !== "production") return;
  try {
    Sentry.addBreadcrumb({
      category: "trading_integrity",
      message: "trade_history_empty_success",
      level: "info",
      data: context,
    });
    const now = Date.now();
    if (now - lastTradeHistoryEmptyReportAt < TRADE_HISTORY_EMPTY_THROTTLE_MS) {
      return;
    }
    lastTradeHistoryEmptyReportAt = now;
    logMessage(
      "Trading integrity: trade history empty (signed in, API OK)",
      "info",
      {
        ...context,
        trades_row_count: 0,
        filter_effective: "all",
      },
    );
  } catch {
    /* noop */
  }
}

/** Bruker trykket manuell synk på dashboard (observabilitet, ikke PII). */
export function reportTradingIntegrityManualSync() {
  if (process.env.NODE_ENV !== "production") return;
  try {
    Sentry.addBreadcrumb({
      category: "trading_integrity",
      message: "manual_dashboard_sync",
      level: "info",
    });
  } catch {
    /* noop */
  }
}

/**
 * Set user context for Sentry
 */
export function setUser(
  user: { id: string; email?: string; username?: string } | null,
) {
  if (process.env.NODE_ENV !== "production") return;

  Sentry.setUser(user);
}

/**
 * Spor kritiske handlinger for produktinnsikt (audit 4.6).
 * Brukes f.eks. ved registrering, checkout, første trade.
 */
export function trackCriticalAction(
  action: "signup" | "checkout" | "first_trade" | "onboarding_complete",
  context?: { userId?: string; requestId?: string; [key: string]: unknown },
) {
  if (process.env.NODE_ENV !== "production") return;
  try {
    Sentry.addBreadcrumb({
      category: "critical_action",
      message: action,
      level: "info",
      data: context,
    });
    if (context?.userId) {
      Sentry.setTag("critical_action", action);
    }
  } catch {
    // Sentry ikke tilgjengelig
  }
}

/**
 * Test Sentry connection (kun i produksjon)
 */
export function testSentry() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  logMessage("Sentry test triggered", "info", {
    test: true,
    timestamp: new Date().toISOString(),
  });

  // Log en test error (ikke kritisk)
  const testError = new Error("Test error - can be ignored");
  logError(testError, { test: true }, "warning");
}
