/**
 * Klarpakke Analytics
 * Bruker Plausible via offisielt script (PlausibleScript.tsx). Ingen deprecated npm-pakke.
 * GDPR-compliant, ingen cookies, EU-server.
 */

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string | number | boolean> }) => void;
  }
}

export const initAnalytics = () => {
  // Script lastes av PlausibleScript; ingen init nødvendig
}

const track = (event: string, props?: Record<string, string | number | boolean>) => {
  if (typeof window === 'undefined' || !window.plausible) return
  window.plausible(event, { props })
}

// ── Onboarding ────────────────────────────────────────────────
export const trackOnboardingStep = (
  step: 'signup' | 'profile' | 'exchange_connected' | 'first_bot' | 'first_trade',
  completed: boolean
) => track('onboarding_step', { step, completed })

export const trackOnboardingCompleted = () => track('onboarding_completed')

// ── Bot ────────────────────────────────────────────────────────
export const trackBotCreated = (mode: 'paper' | 'live') =>
  track('bot_created', { mode })

export const trackBotStarted = (mode: 'paper' | 'live') =>
  track('bot_started', { mode })

export const trackBotStopped = (mode: 'paper' | 'live', reason: string) =>
  track('bot_stopped', { mode, reason })

export const trackFirstTrade = (mode: 'paper' | 'live') =>
  track('first_trade', { mode })

// ── Subscription ──────────────────────────────────────────────
export const trackSubscriptionStarted = (plan: 'starter' | 'pro' | 'enterprise') =>
  track('subscription_started', { plan })

export const trackSubscriptionCancelled = (plan: string) =>
  track('subscription_cancelled', { plan })

export const trackUpgradeClicked = (from: string, to: string) =>
  track('upgrade_clicked', { from, to })

// ── Strategi marketplace ──────────────────────────────────────
export const trackStrategyViewed = (strategyId: string) =>
  track('strategy_viewed', { strategy_id: strategyId })

export const trackStrategyCopied = (strategyId: string) =>
  track('strategy_copied', { strategy_id: strategyId })

export const trackStrategyPublished = () => track('strategy_published')

// ── Exchange ──────────────────────────────────────────────────
export const trackExchangeConnected = (exchange: string) =>
  track('exchange_connected', { exchange })

// ── Feil ──────────────────────────────────────────────────────
export const trackError = (context: string, message: string) =>
  track('client_error', { context, message: message.slice(0, 100) })

/** Generic event tracking for Plausible (used by conversion-funnel, etc.) */
export const trackEvent = track

export default track
