import { createBrowserClient } from '@supabase/ssr'

// KLARPAKKE UNIVERSITET - 4-nivå modell
export type TierName = 'gratis' | 'basis' | 'komplett' | 'pro'

export interface SubscriptionStatus {
  tier: TierName
  trialEndsAt: Date | null
  daysLeft: number
  isExpired: boolean
  hasPaidAccess: boolean
}

interface UserMetadata {
  trial_ends_at?: string
  tier?: string
  subscription_status?: string
}

interface UserWithMetadata {
  user_metadata?: UserMetadata
}

export function useSubscriptionStatus(user: UserWithMetadata | null): SubscriptionStatus {
  // Default: gratis tier
  if (!user) {
    return {
      tier: 'gratis',
      trialEndsAt: null,
      daysLeft: 0,
      isExpired: true,
      hasPaidAccess: false
    }
  }

  // Check user metadata for subscription status
  const metadata = user.user_metadata;
  const trialEndsAt = metadata?.trial_ends_at 
    ? new Date(metadata.trial_ends_at)
    : null
  
  const userTier = metadata?.tier || 'gratis'
  const hasPaidSubscription = metadata?.subscription_status === 'active'
  
  // Calculate days left in trial
  const now = new Date()
  const daysLeft = trialEndsAt 
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0
  
  const isExpired = trialEndsAt ? now > trialEndsAt : true

  // Determine tier - validate it's one of the 4 valid tiers
  let tier: TierName = 'gratis'
  if (['gratis', 'basis', 'komplett', 'pro'].includes(userTier)) {
    tier = userTier as TierName
  }
  
  // Has paid access if active subscription and tier is paid
  const hasPaidAccess = hasPaidSubscription && tier !== 'gratis'

  return {
    tier,
    trialEndsAt,
    daysLeft,
    isExpired,
    hasPaidAccess
  }
}

export function getAccessLimits(tier: TierName) {
  switch (tier) {
    case 'gratis':
      return {
        maxModules: 1,  // Only Krypto 101 module 1
        maxQuizzes: 1,  // Only 1 quiz
        maxTrades: 5,   // Only 5 simulator trades
        hasFullAccess: false,
        hasCertification: false,
        hasWebinars: false
      }
    case 'basis':
      return {
        maxModules: Infinity,  // All basic courses
        maxQuizzes: Infinity,
        maxTrades: Infinity,
        hasFullAccess: true,
        hasCertification: false,
        hasWebinars: false
      }
    case 'komplett':
      return {
        maxModules: Infinity,  // All courses
        maxQuizzes: Infinity,
        maxTrades: Infinity,
        hasFullAccess: true,
        hasCertification: true,
        hasWebinars: true
      }
    case 'pro':
      return {
        maxModules: Infinity,  // All courses + extras
        maxQuizzes: Infinity,
        maxTrades: Infinity,
        hasFullAccess: true,
        hasCertification: true,
        hasWebinars: true
      }
  }
}

export function getTierDisplayName(tier: TierName, locale: string = 'no'): string {
  const names: Record<TierName, Record<string, string>> = {
    'gratis': { no: 'Gratis', en: 'Free' },
    'basis': { no: 'Basis', en: 'Starter' },
    'komplett': { no: 'Komplett', en: 'Complete' },
    'pro': { no: 'Pro', en: 'Pro' }
  }
  return names[tier][locale] || names[tier]['no']
}

export function formatTrialText(daysLeft: number, locale: string = 'no'): string {
  if (locale === 'en') {
    if (daysLeft === 0) return 'Last day of trial'
    if (daysLeft === 1) return '1 day left of trial'
    return `${daysLeft} days left of trial`
  }
  if (daysLeft === 0) return 'Siste dag av prøveperioden'
  if (daysLeft === 1) return '1 dag igjen av prøveperioden'
  return `${daysLeft} dager igjen av prøveperioden`
}
