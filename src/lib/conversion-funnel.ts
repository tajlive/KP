/**
 * Unified conversion funnel tracking
 * Tracks the complete user journey across Plausible and Vercel Analytics.
 * Integrates with src/lib/analytics.ts - does not replace existing analytics.
 */


import { trackEvent } from '@/lib/analytics';
// Vercel Analytics removed — bruker kun Plausible (trackEvent) nå

export const FUNNEL_STEPS = [
  'landing_view',
  'signup_click',
  'signup_complete',
  'onboarding_complete',
  'first_lesson',
  'first_trade',
  'upgrade_click',
  'payment_complete',
] as const;

export type FunnelStep = (typeof FUNNEL_STEPS)[number];

/**
 * Track a funnel step to both Plausible and Vercel Analytics.
 * Safe to call from client components. No-op on server.
 */
export function trackFunnelStep(
  step: FunnelStep,
  metadata?: Record<string, string>
): void {
  if (typeof window === 'undefined') return;

  const props = { ...metadata } as Record<string, string | number | boolean>;

  // Plausible (via analytics.ts)
  trackEvent(step, props);
}
