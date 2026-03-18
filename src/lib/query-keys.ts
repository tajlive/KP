/**
 * Felles query keys for TanStack Query (audit 4.2).
 * Invalider ved login/logout og webhook-oppdateringer.
 */

export const queryKeys = {
  all: ["klarpakke"] as const,
  profile: (userId: string | null) =>
    userId
      ? [...queryKeys.all, "profile", userId]
      : [...queryKeys.all, "profile"],
  /** Brukerens tier / abonnement (user_profiles.subscription_tier eller subscriptions) */
  tier: (userId: string | null) =>
    userId ? [...queryKeys.all, "tier", userId] : [...queryKeys.all, "tier"],
  /** Trading sessions for bruker */
  tradingSessions: (userId: string | null) =>
    userId
      ? [...queryKeys.all, "tradingSessions", userId]
      : [...queryKeys.all, "tradingSessions"],
} as const;
