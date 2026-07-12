/**
 * Sentry client — optimalisert for Klarpakke
 * 
 * Strategi:
 * - Kun capture errors (ikke spam)
 * - Auto-attach bruker-info (email, tier)
 * - Release tracking (git SHA)
 * - Performance: 5% sample (gratis tier safe)
 * - Session replay: kun ved feil (sparer events)
 */

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN && process.env.NODE_ENV === "production") {
  Sentry.init({
    dsn: SENTRY_DSN,
    
    // 🎯 Kun production
    environment: "production",
    
    // 📊 Performance: 5% (spar events)
    tracesSampleRate: 0.05,

    // Ikke injiser <meta name="sentry-trace"> i HTML (unngår meta foran DOCTYPE på root-sider uten locale layout)
    tracePropagationTargets: [],

    // 🎬 Session replay: kun når feil oppstår
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    
    // 🏷️ Release tracking
    release: process.env.NEXT_PUBLIC_APP_VERSION || "unknown",
    
    // 🔇 Støyfilter
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      "Non-Error promise rejection captured with keys",
      "Non-Error promise rejection",
      "AbortError: The operation was aborted",
      "NetworkError: Failed to fetch",
      "Request failed with status code 401",  // Auth redirects — forventet
      "Request failed with status code 403",  // RLS — forventet
      "top.GLOBALS",                          // Chrome extension
      "chrome-extension",
      "moz-extension",
    ],
    
    // 🚫 Ikke send i dev/test
    beforeSend(event) {
      if (typeof window !== "undefined" && window.location.hostname === "localhost") {
        return null;
      }
      return event;
    },
    
    // 🏷️ Auto-tag alle feil med side-url
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === "navigation") {
        Sentry.setTag("page", typeof window !== "undefined" ? window.location.pathname : "unknown");
      }
      return breadcrumb;
    },
  });
}

/**
 * Set user context — kall etter login
 */
export function setSentryUser(user: { email: string; id: string; tier?: string }) {
  if (!SENTRY_DSN) return;
  Sentry.setUser({
    email: user.email,
    id: user.id,
  });
  if (user.tier) {
    Sentry.setTag("tier", user.tier);
  }
}

/**
 * Clear user context — kall ved logout
 */
export function clearSentryUser() {
  Sentry.setUser(null);
}
