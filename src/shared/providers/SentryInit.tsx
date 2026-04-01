/**
 * SentryInit.tsx
 * 
 * Client component that initializes Sentry lazily on app routes.
 * This ensures Sentry is only loaded when user navigates to dashboard/trading
 * routes, saving ~418KB on marketing pages.
 * 
 * Usage: Add <SentryInit /> to dashboard/app layouts only.
 * DO NOT add to marketing pages.
 */

'use client';

import { useEffect } from 'react';
import { initSentryLazy } from '@/lib/sentry-lazy';

export function SentryInit() {
  useEffect(() => {
    // Initialize Sentry lazily when component mounts
    // This only runs on app routes (dashboard, trading, etc.)
    initSentryLazy();
  }, []);

  // This component renders nothing
  return null;
}
