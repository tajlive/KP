/**
 * Klarpakke Analytics
 * Bruker plausible-tracker (allerede installert)
 * GDPR-compliant, ingen cookies, EU-server
 */

import Plausible from 'plausible-tracker'

let plausible: ReturnType<typeof Plausible> | null = null

export const initAnalytics = () => {
  if (typeof window === 'undefined') return
  if (process.env.NODE_ENV !== 'production') return

  plausible = Plausible({
    domain: 'klarpakke.no',
    apiHost: 'https://plausible.io',
    trackLocalhost: false,
  })

  plausible.enableAutoPageviews()
  plausible.enableAutoOutboundTracking()
}

const track = (event: string, props?: Record<string, string | number | boolean>) => {
  if (!plausible) return
  plausible.trackEvent(event, { props })
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

export default track
