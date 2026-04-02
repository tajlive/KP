import * as Sentry from "@sentry/nextjs";

// Client-side instrumentation
// Route-gated initialization: Only init on app routes (dashboard, trading, etc.)
// Marketing routes get the SDK bundled but never initialized to save ~418KB

const pathname = typeof window !== "undefined" ? window.location.pathname : "";

const isMarketingRoute =
  pathname === "/" ||
  pathname === "" ||
  pathname.startsWith("/priser") ||
  pathname.startsWith("/om-oss") ||
  pathname.startsWith("/kontakt") ||
  pathname.startsWith("/blog") ||
  pathname.startsWith("/en") ||
  pathname.startsWith("/th") ||
  pathname.startsWith("/zh");

if (!isMarketingRoute) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    debug: false,
    enabled: process.env.NODE_ENV === "production",
    integrations: [],
    beforeSend(event, hint) {
      const error = hint?.originalException;
      if (error && typeof error === "object" && "name" in error) {
        if ((error as { name: string }).name === "AbortError") return null;
      }
      if (event.exception?.values?.[0]?.type === "AuthError") {
        const message = event.exception.values[0].value;
        if (message?.includes("session_not_found")) return null;
        if (message?.includes("refresh_token_not_found")) return null;
      }
      // Sanitize sensitive data
      if (event.extra?.api_key) delete event.extra.api_key;
      if (event.extra?.api_secret) delete event.extra.api_secret;
      if (event.extra?.balance) delete event.extra.balance;
      if (event.extra?.password) delete event.extra.password;
      if (event.extra?.token) delete event.extra.token;
      if (event.user?.email) delete event.user.email;
      return event;
    },
    ignoreErrors: [
      "top.GLOBALS",
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      "NetworkError",
      "Failed to fetch",
      "Hydration",
      "Multiple Sentry Session Replay instances are not supported",
    ],
  });
}
