import * as Sentry from "@sentry/nextjs";

/**
 * Sentry Client Configuration - Route-Conditional Initialization
 * 
 * PERFORMANCE OPTIMIZATION (Task 3):
 * Sentry is now ONLY initialized on app routes (dashboard, trading, admin, etc.)
 * Marketing routes (/, /en, /kurs, etc.) skip Sentry entirely — saves ~418KB
 * 
 * This reduces LCP by ~1000ms on marketing pages by avoiding the 1.2s scripting
 * time from Sentry SDK initialization.
 * 
 * For dashboard routes, Sentry is initialized via lazy loading in the layout
c* component (see src/lib/sentry-lazy.ts).
 */

// Only initialize Sentry on app routes, not marketing routes
const isAppRoute = typeof window !== 'undefined' &&
  (
    window.location.pathname.startsWith('/dashboard') ||
    window.location.pathname.startsWith('/trading') ||
    window.location.pathname.startsWith('/admin') ||
    window.location.pathname.startsWith('/innstillinger') ||
    window.location.pathname.startsWith('/akademi') ||
    window.location.pathname.startsWith('/beta') ||
    window.location.pathname.startsWith('/paper-trading') ||
    window.location.pathname.startsWith('/auto-trading') ||
    window.location.pathname.startsWith('/copy-trading') ||
    window.location.pathname.startsWith('/marketplace') ||
    window.location.pathname.startsWith('/checkout') ||
    window.location.pathname.startsWith('/konto') ||
    window.location.pathname.startsWith('/handelshistorikk') ||
    window.location.pathname.startsWith('/leagues') ||
    window.location.pathname.startsWith('/onboarding')
  );

if (!isAppRoute) {
  // Skip Sentry on marketing/public routes — saves 418KB bundle
  // Sentry will be initialized lazily when user navigates to app routes
  // via the initSentryLazy() function in dashboard layout
} else {
  // Initialize Sentry for app routes
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
      
      // Security: strip sensitive data
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
