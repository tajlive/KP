/**
 * Sentry server — optimalisert for Klarpakke
 * 
 * Strategi:
 * - Capture alle API 500 + SSR crashes
 * - Performance: 5% sample
 * - Release + environment tracking
 */

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN && process.env.NODE_ENV === "production") {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: "production",
    release: process.env.NEXT_PUBLIC_APP_VERSION || "unknown",
    tracesSampleRate: 0.05,
    
    // Server-spesifikk støyfilter
    ignoreErrors: [
      "ECONNRESET",
      "socket hang up",
      "Request aborted",
    ],
    
    beforeSend(event) {
      // Legg til request info
      if (event.request) {
        // Mask sensitiv data
        if (event.request.url) {
          const url = new URL(event.request.url);
          url.search = ""; // Fjern query params
          event.request.url = url.toString();
        }
      }
      return event;
    },
  });
}

/**
 * Capture API error med ekstra kontekst
 */
export function captureApiError(error: Error, context?: Record<string, unknown>) {
  if (!SENTRY_DSN) return;
  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    scope.setTag("type", "api_error");
    Sentry.captureException(error);
  });
}
