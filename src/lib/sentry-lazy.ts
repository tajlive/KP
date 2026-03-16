/**
 * sentry-lazy.ts
 *
 * Lazy Sentry initialization for app routes.
 * Import this in dashboard layout, not in marketing pages.
 *
 * This module provides a way to initialize Sentry only when the user
 * navigates to an app route (dashboard, trading, etc.), avoiding the
 * ~418KB bundle cost on marketing pages.
 *
 * Usage:
 *   import { initSentryLazy } from '@/lib/sentry-lazy';
 *   // Call once in dashboard layout useEffect
 *   useEffect(() => { initSentryLazy(); }, []);
 */

let initialized = false;

export async function initSentryLazy(): Promise<void> {
  // Skip if already initialized or not in production
  if (initialized) return;
  if (process.env.NODE_ENV !== 'production') {
    initialized = true;
    return;
  }

  // Double-check we're on an app route
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
    // Skip Sentry on marketing routes
    return;
  }

  initialized = true;

  try {
    const Sentry = await import('@sentry/nextjs');
    
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
      enabled: process.env.NODE_ENV === 'production',
      
      // No replay integration to avoid conflicts
      integrations: [],
      
      beforeSend(event, hint) {
        const error = hint?.originalException;

        if (error && typeof error === 'object' && 'name' in error) {
          if (error.name === 'AbortError') return null;
        }

        if (event.exception?.values?.[0]?.type === 'AuthError') {
          const message = event.exception.values[0].value;
          if (message?.includes('session_not_found')) return null;
          if (message?.includes('refresh_token_not_found')) return null;
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
        'top.GLOBALS',
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications',
        'NetworkError',
        'Failed to fetch',
        'Hydration',
        'Multiple Sentry Session Replay instances are not supported',
      ],
    });
  } catch (e) {
    // Silent fail - don't break the app if Sentry fails to load
    if (String(process.env.NODE_ENV) === 'development') {
      console.error('[Sentry Lazy] Failed to initialize:', e);
    }
  }
}
