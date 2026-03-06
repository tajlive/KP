import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn:
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    "https://e32d54d01cf6b772939b62144762ea8b@o4509555622608896.ingest.de.sentry.io/4509555628638288",
  
  // Send personlig info (GDPR-compliant med consent)
  sendDefaultPii: true,

  // Environment tracking
  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Performance monitoring
  tracesSampleRate: 0.1, // 10% av transaksjoner
  replaysSessionSampleRate: 0.05, // 5% session replay
  replaysOnErrorSampleRate: 0.25, // 25% ved errors

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Client-side integrations
  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
    Sentry.browserTracingIntegration(),
  ],

  // Filter out expected errors
  beforeSend(event, hint) {
    const error = hint.originalException;

    if (error && typeof error === "object") {
      if ("message" in error && typeof error.message === "string") {
        // Ignorer vanlige ikke-kritiske feil
        if (error.message.includes("JWT expired")) return null;
        if (error.message.includes("Invalid Refresh Token")) return null;
        if (error.message.includes("ResizeObserver loop")) return null;
        if (error.message.includes(" hydration ")) return null;
      }
    }

    return event;
  },

  // Ignore specific errors
  ignoreErrors: [
    "ECONNRESET",
    "ETIMEDOUT",
    "ENOTFOUND",
    "ResizeObserver loop limit exceeded",
    "Network request failed",
  ],

  // URL filtering
  denyUrls: [
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
  ],
});
