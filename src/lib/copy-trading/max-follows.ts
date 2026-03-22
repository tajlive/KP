import { TIERS, normalizeTier, type TierSlug } from "@/lib/pricing/tiers";

/**
 * Maks aktive copy-follows per tier — i tråd med TIERS.canCopyTraders og produktmatrise.
 */
export function maxActiveCopyFollowsForTier(
  tierRaw: string | null | undefined,
): number {
  const slug: TierSlug = normalizeTier(tierRaw ?? undefined);
  const config = TIERS[slug];
  if (!config.canCopyTraders) {
    return 0;
  }
  if (slug === "bachelor") {
    return 1;
  }
  if (slug === "master") {
    return 3;
  }
  if (slug === "phd" || slug === "professor") {
    return 999;
  }
  return 0;
}
