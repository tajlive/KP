import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn:
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    "https://e32d54d01cf6b772939b62144762ea8b@o4509555622608896.ingest.de.sentry.io/4509555628638288",
  sendDefaultPii: true,

  // Environment and release tracking
  environment: process.env.NODE_ENV,
  release:
    process.env.NEXT_PUBLIC_APP_VERSION ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    "unknown",

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session Replay - disabled for privacy, enabled on errors
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Client-side integrations
  integrations: [Sentry.browserTracingIntegration()],

  // Filter out localhost errors
  beforeSend(event) {
    if (event.request?.url?.includes("localhost")) {
      return null;
    }
    return event;
  },
});
