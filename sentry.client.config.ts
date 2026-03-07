import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ||
    "https://e32d54d01cf6b772939b62144762ea8b@o4509555622608896.ingest.de.sentry.io/4509555628638288",
  
  environment: process.env.NODE_ENV,
  
  // Performance monitoring - disabled to reduce noise
  tracesSampleRate: 0,
  
  // Session replay - DISABLED to prevent "Multiple instances" error
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  
  debug: false,
  enabled: process.env.NODE_ENV === "production",
  
  // No replay integration to avoid conflicts
  integrations: [],
  
  // Filter out expected errors
  beforeSend(event, hint) {
    const error = hint?.originalException;

    if (error && typeof error === "object" && "name" in error) {
      if (error.name === "AbortError") return null;
    }

    if (event.exception?.values?.[0]?.type === "AuthError") {
      const message = event.exception.values[0].value;
      if (message?.includes("session_not_found")) return null;
      if (message?.includes("refresh_token_not_found")) return null;
    }
    
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
