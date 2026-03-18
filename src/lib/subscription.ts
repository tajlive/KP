import type { TierSlug } from "@/lib/pricing/tiers";
import { normalizeTier } from "@/lib/pricing/tiers";
import { getTierDisplayName as getTierDisplayNameFromTypes } from "@/types/subscription";

export type { TierSlug };

export interface SubscriptionStatus {
  tier: TierSlug;
  trialEndsAt: Date | null;
  daysLeft: number;
  isExpired: boolean;
  hasPaidAccess: boolean;
}

interface UserMetadata {
  trial_ends_at?: string;
  tier?: string;
  subscription_status?: string;
}

interface UserWithMetadata {
  user_metadata?: UserMetadata;
}

export function useSubscriptionStatus(
  user: UserWithMetadata | null,
): SubscriptionStatus {
  if (!user) {
    return {
      tier: "student",
      trialEndsAt: null,
      daysLeft: 0,
      isExpired: true,
      hasPaidAccess: false,
    };
  }

  const metadata = user.user_metadata;
  const trialEndsAt = metadata?.trial_ends_at
    ? new Date(metadata.trial_ends_at)
    : null;
  const tier = normalizeTier(metadata?.tier);
  const hasPaidSubscription = metadata?.subscription_status === "active";

  const now = new Date();
  const daysLeft = trialEndsAt
    ? Math.max(
        0,
        Math.ceil(
          (trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        ),
      )
    : 0;
  const isExpired = trialEndsAt ? now > trialEndsAt : true;
  const hasPaidAccess = hasPaidSubscription && tier !== "student";

  return {
    tier,
    trialEndsAt,
    daysLeft,
    isExpired,
    hasPaidAccess,
  };
}

export interface AccessLimits {
  maxModules: number;
  maxQuizzes: number;
  maxTrades: number;
  hasFullAccess: boolean;
  hasCertification: boolean;
  hasWebinars: boolean;
}

export function getAccessLimits(tier: TierSlug): AccessLimits {
  switch (tier) {
    case "student":
      return {
        maxModules: 1,
        maxQuizzes: 1,
        maxTrades: 5,
        hasFullAccess: false,
        hasCertification: false,
        hasWebinars: false,
      };
    case "bachelor":
      return {
        maxModules: Infinity,
        maxQuizzes: Infinity,
        maxTrades: Infinity,
        hasFullAccess: true,
        hasCertification: false,
        hasWebinars: false,
      };
    case "master":
      return {
        maxModules: Infinity,
        maxQuizzes: Infinity,
        maxTrades: Infinity,
        hasFullAccess: true,
        hasCertification: true,
        hasWebinars: true,
      };
    case "phd":
    case "professor":
      return {
        maxModules: Infinity,
        maxQuizzes: Infinity,
        maxTrades: Infinity,
        hasFullAccess: true,
        hasCertification: true,
        hasWebinars: true,
      };
  }
}

export function getTierDisplayName(tier: TierSlug, _locale?: string): string {
  return getTierDisplayNameFromTypes(tier);
}

export function formatTrialText(
  daysLeft: number,
  locale: string = "no",
): string {
  if (locale === "en") {
    if (daysLeft === 0) return "Last day of trial";
    if (daysLeft === 1) return "1 day left of trial";
    return `${daysLeft} days left of trial`;
  }
  if (daysLeft === 0) return "Siste dag av prøveperioden";
  if (daysLeft === 1) return "1 dag igjen av prøveperioden";
  return `${daysLeft} dager igjen av prøveperioden`;
}
