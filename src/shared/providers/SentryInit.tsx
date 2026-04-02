/**
 * SentryInit.tsx
 *
 * DEPRECATED: Sentry initialization has moved to sentry.client.config.ts
 * This component is kept for backwards compatibility but renders nothing.
 *
 * The route-gated init logic is now in root sentry.client.config.ts
 * which automatically:
 * - Initializes Sentry on app routes (dashboard, trading, etc.)
 * - Skips initialization on marketing routes to save ~418KB
 */

'use client';

import { useEffect } from 'react';

export function SentryInit() {
  useEffect(() => {
    // NO-OP: Sentry is now initialized by sentry.client.config.ts
    // This component is kept for backwards compatibility
  }, []);

  return null;
}
