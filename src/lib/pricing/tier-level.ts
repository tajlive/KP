/**
 * Edge/middleware-vennlig: kun slug-order og nivå — ingen store TIERS-objekter med tekst/features.
 */

export const VALID_TIER_SLUGS = [
  "student",
  "bachelor",
  "master",
  "phd",
  "professor",
] as const;

export type TierSlug = (typeof VALID_TIER_SLUGS)[number];

/** Nivå for tier-gate (0=student … 4=professor) */
const TIER_LEVEL_ORDER: Record<TierSlug, number> = {
  student: 0,
  bachelor: 1,
  master: 2,
  phd: 3,
  professor: 4,
};

export function getTierLevel(slug: string): number {
  if (VALID_TIER_SLUGS.includes(slug as TierSlug)) {
    return TIER_LEVEL_ORDER[slug as TierSlug];
  }
  return 0;
}

/** Normaliserer DB/string tier til gyldig TierSlug (ukjente → student) */
export function normalizeTier(tier: string | null | undefined): TierSlug {
  if (tier && VALID_TIER_SLUGS.includes(tier as TierSlug)) {
    return tier as TierSlug;
  }
  return "student";
}
