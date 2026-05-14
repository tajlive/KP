import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn:
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    "https://e32d54d01cf6b772939b62144762ea8b@o4509555622608896.ingest.de.sentry.io/4509555628638288",
  sendDefaultPii: true,

  // Environment and release tracking
  environment: process.env.NODE_ENV,
  release:
    process.env.FLY_ALLOC_ID ||
    process.env.GITHUB_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA,

  // Performance monitoring
  tracesSampleRate: 0.1, // 10% of transactions

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Server-specific integrations
  integrations: [Sentry.httpIntegration()],

  // Filter out expected errors
  beforeSend(event, hint) {
    const error = hint.originalException;

    // Filter out expected API errors
    if (error && typeof error === "object") {
      // Supabase auth errors
      if ("message" in error && typeof error.message === "string") {
        if (error.message.includes("JWT expired")) return null;
        if (error.message.includes("Invalid Refresh Token")) return null;
      }
    }

    return event;
  },

  // Ignore specific errors
  ignoreErrors: ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND"],
});
