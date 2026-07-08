import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.05, // Edge: veldig lav sample rate (kostnad)
    environment: process.env.NODE_ENV || "production",
    release: process.env.NEXT_PUBLIC_APP_VERSION || "dev",
    
    beforeSend(event) {
      if (process.env.NODE_ENV === "development") return null;
      if (!SENTRY_DSN) return null;
      return event;
    },
  });
}

export const onRequest = Sentry.wrapMiddleware;
