/**
 * Klarpakke Analytics
 * Provider-agnostisk med typed events. Støtter Plausible nå, enkelt å bytte senere.
 * GDPR-compliant, ingen cookies, EU-server.
 */

export type AnalyticsEvent =
  | { name: 'onboarding_viewed'; props?: Record<string, never> }
  | { name: 'onboarding_step_1_completed'; props?: Record<string, never> }
  | { name: 'onboarding_step_2_completed'; props?: Record<string, never> }
  | { name: 'onboarding_completed'; props?: { risk_level?: string } }
  | { name: 'pricing_viewed'; props?: { plan?: string } }
  | { name: 'checkout_started'; props?: { plan: string; price_id: string } }
  | { name: 'checkout_succeeded'; props?: { plan: string; session_id?: string } }
  | { name: 'checkout_failed'; props?: { plan: string; error?: string } }
  | { name: 'dashboard_viewed'; props?: { source?: string } }
  | { name: 'trade_confirmed'; props?: { symbol: string; direction: 'BUY' | 'SELL'; amount: number } }
  | { name: 'trade_success_viewed'; props?: { symbol: string } }
  | { name: 'subscription_started'; props?: { plan: string } }
  | { name: 'subscription_cancelled'; props?: { plan: string } }
  | { name: 'bot_created'; props?: { mode: 'paper' | 'live' } }
  | { name: 'first_trade'; props?: { mode: 'paper' | 'live' } }
  | { name: 'error'; props?: { context: string; message: string } };

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string | number | boolean> }) => void;
  }
}

const recentEvents = new Map<string, number>();
const DEBOUNCE_MS = 500;

function dedupe(eventKey: string): boolean {
  const now = Date.now();
  const last = recentEvents.get(eventKey);
  if (last && now - last < DEBOUNCE_MS) {
    return false;
  }
  recentEvents.set(eventKey, now);
  
  if (recentEvents.size > 100) {
    const iterator = recentEvents.keys();
    for (let i = 0; i < 100; i++) {
      const value = iterator.next().value;
      if (value) recentEvents.delete(value);
    }
  }
  return true;
}

/** Reset dedupe state - kun for testing */
export function __resetDedupeState(): void {
  recentEvents.clear();
}

export function track<T extends AnalyticsEvent>(event: T): void {
  if (typeof window === 'undefined') return;

  const eventKey = `${event.name}:${JSON.stringify(event.props)}`;
  if (!dedupe(eventKey)) return;

  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics]', event.name, event.props);
  }

  if (window.plausible) {
    window.plausible(event.name, { 
      props: event.props as Record<string, string | number | boolean> 
    });
  }

  try {
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: event.name,
        props: event.props,
        timestamp: new Date().toISOString(),
        url: window.location.href,
      }),
      keepalive: true,
    }).catch(() => {
      // Silent fail
    });
  } catch {
    // Silent fail
  }
}

// Convenience exports for common events
export const trackOnboardingViewed = () => track({ name: 'onboarding_viewed' });
export const trackOnboardingStep1Completed = () => track({ name: 'onboarding_step_1_completed' });
export const trackOnboardingStep2Completed = () => track({ name: 'onboarding_step_2_completed' });
export const trackOnboardingCompleted = (risk_level?: string) => 
  track({ name: 'onboarding_completed', props: risk_level ? { risk_level } : undefined });
export const trackPricingViewed = (plan?: string) => 
  track({ name: 'pricing_viewed', props: plan ? { plan } : undefined });
export const trackCheckoutStarted = (plan: string, price_id: string) => 
  track({ name: 'checkout_started', props: { plan, price_id } });
export const trackCheckoutSucceeded = (plan: string, session_id?: string) => 
  track({ name: 'checkout_succeeded', props: { plan, session_id } });
export const trackCheckoutFailed = (plan: string, error?: string) => 
  track({ name: 'checkout_failed', props: { plan, error } });
export const trackDashboardViewed = (source?: string) => 
  track({ name: 'dashboard_viewed', props: source ? { source } : undefined });
export const trackTradeConfirmed = (symbol: string, direction: 'BUY' | 'SELL', amount: number) => 
  track({ name: 'trade_confirmed', props: { symbol, direction, amount } });
export const trackTradeSuccessViewed = (symbol: string) => 
  track({ name: 'trade_success_viewed', props: { symbol } });
export const trackSubscriptionStarted = (plan: string) => 
  track({ name: 'subscription_started', props: { plan } });
export const trackSubscriptionCancelled = (plan: string) => 
  track({ name: 'subscription_cancelled', props: { plan } });
export const trackError = (context: string, message: string) => 
  track({ name: 'error', props: { context, message: message.slice(0, 100) } });

// Backward compatible exports
export const trackEvent = (name: string, props?: Record<string, unknown>) => {
  track({ name: name as AnalyticsEvent['name'], props: props as never });
};

export const trackOnboardingStep = (step: string, completed: boolean) => 
  track({ name: `onboarding_${step}_${completed ? 'completed' : 'skipped'}` as never });

export const trackBotCreated = (mode: 'paper' | 'live') => 
  track({ name: 'bot_created', props: { mode } });

export const trackFirstTrade = (mode: 'paper' | 'live') => 
  track({ name: 'first_trade', props: { mode } });

export const trackUpgradeClicked = (from: string, to: string) => 
  track({ name: 'pricing_viewed', props: { plan: to, from } as never });

// Legacy exports for backward compatibility
export const initAnalytics = () => {
  // No-op - analytics auto-initializes
};

export default {
  track,
  trackEvent,
  trackOnboardingViewed,
  trackPricingViewed,
  trackCheckoutStarted,
  trackError,
};
