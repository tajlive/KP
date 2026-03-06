import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ||
    "https://e32d54d01cf6b772939b62144762ea8b@o4509555622608896.ingest.de.sentry.io/4509555628638288",
  environment: process.env.NODE_ENV,
  
  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  
  // Session replay
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
  
  debug: false,
  enabled: process.env.NODE_ENV === "production",
  
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration(),
  ],
  
  // Filter out expected errors
  beforeSend(event, hint) {
    const error = hint?.originalException;

    // Filter out AbortError (user navigation)
    if (error && typeof error === "object" && "name" in error) {
      if (error.name === "AbortError") return null;
    }

    // Filter out expected Supabase auth errors
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

  // Ignore specific errors
  ignoreErrors: [
    // Browser extensions
    "top.GLOBALS",
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    // Network errors
    "NetworkError",
    "Failed to fetch",
    // React hydration
    "Hydration",
    // Multiple instances error (temporary fix)
    "Multiple Sentry Session Replay instances are not supported",
  ],
});

// Required by Sentry to instrument client-side navigations
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
