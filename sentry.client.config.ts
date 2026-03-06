import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn:
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    "https://e32d54d01cf6b772939b62144762ea8b@o4509555622608896.ingest.de.sentry.io/4509555628638288",
  sendDefaultPii: true,

  // Environment and release tracking
  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Performance monitoring
  tracesSampleRate: 0.1, // 10% of transactions (cost-effective for startup)

  // Session replay for debugging
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Integration configuration
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration(),
  ],

  // Filter out expected errors
  beforeSend(event, hint) {
    const error = hint.originalException;

    // Filter out AbortError (user navigation)
    if (error && typeof error === "object" && "name" in error) {
      if (error.name === "AbortError") return null;
    }

    // Filter out expected Supabase auth errors
    if (event.exception?.values?.[0]?.type === "AuthError") {
      const message = event.exception.values[0].value;
      if (message?.includes("session_not_found")) return null;
      if (message?.includes("refresh_token_not_found")) return null;
    }

    return event;
  },

  // Ignore specific errors
  ignoreErrors: [
    // Browser extensions
    "top.GLOBALS",
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    // Network errors
    "NetworkError",
    "Failed to fetch",
    // React hydration (common in dev, fixed in prod)
    "Hydration",
  ],
});
