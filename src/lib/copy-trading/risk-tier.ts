export type RiskTier = "low" | "medium" | "high";

/**
 * Forenklet risikoetikett fra Sharpe og win rate — tydelig merket som heuristikk i UI.
 */
export function inferRiskTier(
  sharpe: number | null | undefined,
  winRate: number | null | undefined,
): RiskTier {
  const s = sharpe ?? 0;
  const w = winRate ?? 0;
  if (s >= 1.2 && w >= 55) return "low";
  if (s <= 0 || w < 45) return "high";
  return "medium";
}
