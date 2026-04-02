/**
 * instrumentation-client.ts
 *
 * Client-side instrumentation entry point.
 * Sentry initialization has moved to sentry.client.config.ts
 * for proper route-gated initialization.
 *
 * This file is kept for Next.js 15+ compatibility but Sentry
 * initialization happens automatically via sentry.client.config.ts
 */

// NO-OP: Sentry initialization moved to sentry.client.config.ts
// which handles route-gated initialization (skips marketing routes)

export const onRouterTransitionStart = () => {};
