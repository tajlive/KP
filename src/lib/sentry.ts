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
  level: Sentry.SeverityLevel = "error"
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
  context?: Record<string, unknown>
) {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[Sentry ${level}]`, message, context);
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

/**
 * Set user context for Sentry
 */
export function setUser(user: { id: string; email?: string; username?: string } | null) {
  if (process.env.NODE_ENV !== "production") return;
  
  Sentry.setUser(user);
}

/**
 * Start en performance transaction
 */
export function startTransaction(name: string, op: string) {
  if (process.env.NODE_ENV !== "production") return null;
  
  return Sentry.startTransaction({ name, op });
}

/**
 * Test Sentry connection (kun i produksjon)
 */
export function testSentry() {
  if (process.env.NODE_ENV !== "production") {
    console.log("🧪 Sentry test: Skippet (ikke produksjon)");
    return;
  }

  logMessage("Sentry test triggered", "info", {
    test: true,
    timestamp: new Date().toISOString(),
  });

  // Log en test error (ikke kritisk)
  const testError = new Error("Test error - can be ignored");
  logError(testError, { test: true }, "warning");

  console.log("✅ Sentry test sent! Check your Sentry dashboard.");
}
