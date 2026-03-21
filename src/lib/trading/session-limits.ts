import { TIERS, normalizeTier, type TierSlug } from "@/lib/pricing/tiers";

/**
 * Maks antall samtidige aktive `trading_sessions` per modus (demo + tier).
 * Student paper = 1 (én arbeidsflate: manuell + auto i samme økt / synlige resultater).
 */
export function maxActiveTradingSessions(
  tierRaw: string | null | undefined,
  mode: "paper" | "live",
): number {
  const tier = normalizeTier(tierRaw ?? undefined);

  if (mode === "paper") {
    if (tier === "student") return 1;
    const p = TIERS[tier].paperTradingStrategies;
    return p === -1 ? 999 : Math.max(1, p);
  }

  if (tier === "student") return 0;

  const n = TIERS[tier].autoTradingStrategies;
  return n === -1 ? 999 : Math.max(0, n);
}
