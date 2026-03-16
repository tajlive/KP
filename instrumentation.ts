import * as Sentry from "@sentry/nextjs";

export const onRequestError = Sentry.captureRequestError;

const sentryEnabled =
  process.env.NODE_ENV === "production" &&
  !!process.env.NEXT_PUBLIC_SENTRY_DSN;

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      enabled: sentryEnabled,
      tracesSampleRate: 0.1,
      debug: false,
      beforeSend(event) {
        if (event.extra?.api_key) delete event.extra.api_key;
        if (event.extra?.api_secret) delete event.extra.api_secret;
        if (event.extra?.SUPABASE_SERVICE_ROLE_KEY)
          delete event.extra.SUPABASE_SERVICE_ROLE_KEY;
        return event;
      },
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      enabled: sentryEnabled,
      tracesSampleRate: 0.1,
      debug: false,
    });
  }
}
