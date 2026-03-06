import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Environment and release tracking
  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  
  // Performance monitoring
  tracesSampleRate: 0.1, // 10% of transactions
  
  // Only enable in production
  enabled: process.env.NODE_ENV === "production",
  
  // Server-specific integrations
  integrations: [
    Sentry.httpIntegration(),
  ],
  
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
  ignoreErrors: [
    "ECONNRESET",
    "ETIMEDOUT",
    "ENOTFOUND",
  ],
});
