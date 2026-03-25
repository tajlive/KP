import { TIERS, normalizeTier, type TierSlug } from "@/lib/pricing/tiers";

/**
 * Maks antall samtidige aktive `trading_sessions` per modus (demo + tier).
 * Papir følger `TIERS[*].paperTradingStrategies` (–1 = ubegrenset → 999 her).
 */
export function maxActiveTradingSessions(
  tierRaw: string | null | undefined,
  mode: "paper" | "live",
): number {
  const tier = normalizeTier(tierRaw ?? undefined);

  if (mode === "paper") {
    const p = TIERS[tier].paperTradingStrategies;
    return p === -1 ? 999 : Math.max(1, p);
  }

  if (tier === "student") return 0;

  const n = TIERS[tier].autoTradingStrategies;
  return n === -1 ? 999 : Math.max(0, n);
}
