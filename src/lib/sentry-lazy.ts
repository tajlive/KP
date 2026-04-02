/**
 * sentry-lazy.ts
 *
 * DEPRECATED: Sentry initialization has moved to sentry.client.config.ts
 * This file is kept for backwards compatibility but does nothing.
 *
 * The route-gated init logic is now in root sentry.client.config.ts
 * which automatically skips initialization on marketing routes.
 */

let initialized = false;

export async function initSentryLazy(): Promise<void> {
  // NO-OP: Sentry is now initialized in sentry.client.config.ts
  // This function is kept for backwards compatibility
  if (!initialized) {
    initialized = true;
    // Silent no-op - Sentry already initialized by sentry.client.config.ts
  }
}
