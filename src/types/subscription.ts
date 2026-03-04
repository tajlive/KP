// src/types/subscription.ts
import { TIERS, TierSlug } from '@/lib/pricing/tiers'

export type { TierSlug }

// Sjekk om tier har tilgang til live auto-trading (ikke bare trial)
export function canAccessLiveAutoTrading(tier: TierSlug): boolean {
  return TIERS[tier].liveTrading
}

// Sjekk om tier har tilgang til paper trading
export function canAccessPaperTrading(tier: TierSlug): boolean {
  // Alle tiers har ubegrenset paper trading (-1 = ubegrenset, alltid > 0)
  const strategies = TIERS[tier].paperTradingStrategies
  return strategies === -1 || strategies > 0
}

// Re-eksporter TierSlug som SubscriptionTier for bakoverkompatibilitet
export type SubscriptionTier = TierSlug

// Antall samtidige auto-trading strategier (-1 = ubegrenset)
export function maxAutoTradingStrategies(tier: TierSlug): number {
  return TIERS[tier].autoTradingStrategies
}

// Sjekk om student-trial fremdeles er aktiv
// trialStartedAt: ISO-string for når bruker registrerte seg
export function isTrialActive(tier: TierSlug, trialStartedAt: string | null): boolean {
  if (tier !== 'student') return false
  if (!trialStartedAt) return false
  const trialDays = TIERS[tier].trialDays
  const trialEnd = new Date(trialStartedAt)
  trialEnd.setDate(trialEnd.getDate() + trialDays)
  return new Date() < trialEnd
}

// Returnerer true hvis bruker kan bruke auto-trading akkurat nå
// (enten via live-tilgang eller aktiv trial)
export function canUseAutoTradingNow(
  tier: TierSlug,
  trialStartedAt: string | null
): boolean {
  return canAccessLiveAutoTrading(tier) || isTrialActive(tier, trialStartedAt)
}

// Antall dager igjen av trial (0 hvis ikke i trial)
export function trialDaysRemaining(tier: TierSlug, trialStartedAt: string | null): number {
  if (!isTrialActive(tier, trialStartedAt) || !trialStartedAt) return 0
  const trialDays = TIERS[tier].trialDays
  const trialEnd = new Date(trialStartedAt)
  trialEnd.setDate(trialEnd.getDate() + trialDays)
  const msLeft = trialEnd.getTime() - Date.now()
  return Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)))
}

// Visningstekst for tier
export function getTierDisplayName(tier: TierSlug): string {
  const names: Record<TierSlug, string> = {
    student: 'Student',
    bachelor: 'Bachelor',
    master: 'Master',
    phd: 'PhD',
    professor: 'Professor',
  }
  return names[tier]
}

// Badge-emoji for tier
export function getTierBadge(tier: TierSlug): string {
  return TIERS[tier].badge
}

/** @deprecated Use canUseAutoTradingNow() instead */
export function canAccessAutoTrading(tier: TierSlug): boolean {
  return tier === 'bachelor' || tier === 'master' || tier === 'phd' || tier === 'professor'
}

// Subscription status type
export type SubscriptionStatus = 'active' | 'inactive' | 'cancelled' | 'past_due' | 'trialing'

// Sjekk om subscription er aktiv
export function isSubscriptionActive(status: SubscriptionStatus): boolean {
  return status === 'active' || status === 'trialing'
}
