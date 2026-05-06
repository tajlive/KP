import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn:
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    "https://e32d54d01cf6b772939b62144762ea8b@o4509555622608896.ingest.de.sentry.io/4509555628638288",
  sendDefaultPii: true,

  // Environment and release tracking
  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Performance monitoring — Core Web Vitals + navigation
  tracesSampleRate: 0.1, // 10% of transactions

  // Session Replay — catch user interactions leading to errors
  replaysSessionSampleRate: 0.01, // 1% of sessions
  replaysOnErrorSampleRate: 0.5, // 50% of error sessions

  // Only enable in production (reduces noise in dev)
  enabled: process.env.NODE_ENV === "production",

  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: true,
    }),
  ],

  // Filter out expected errors before sending
  beforeSend(event, hint) {
    const error = hint.originalException;

    if (error && typeof error === "object") {
      if ("message" in error && typeof error.message === "string") {
        const msg = error.message;
        // Auth errors are handled gracefully by UI
        if (msg.includes("JWT expired")) return null;
        if (msg.includes("Invalid Refresh Token")) return null;
        if (msg.includes("Auth session missing")) return null;
        // Network errors that are retried
        if (msg.includes("fetch failed")) return null;
        if (msg.includes("NetworkError")) return null;
      }
    }

    return event;
  },

  // Ignore common non-actionable errors
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection captured",
    "undefined is not an object",
    "cancelled",
  ],

  // Deny URLs that are known to be noisy
  denyUrls: [
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
  ],
});
