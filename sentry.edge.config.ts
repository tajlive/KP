import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn:
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    "https://e32d54d01cf6b772939b62144762ea8b@o4509555622608896.ingest.de.sentry.io/4509555628638288",
  sendDefaultPii: true,

  // Environment and release tracking
  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Performance monitoring (lower for edge due to cost)
  tracesSampleRate: 0.05, // 5% of transactions

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Edge runtime has limited integrations
  integrations: [],

  // Filter out expected errors
  beforeSend(event) {
    // Filter out middleware redirects (expected behavior)
    if (event.exception?.values?.[0]?.type === "Error") {
      const message = event.exception.values[0].value;
      if (message?.includes("NEXT_REDIRECT")) return null;
    }

    return event;
  },
});
