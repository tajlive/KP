/**
 * Regime-Aware Safety Multipliers for trade execution.
 * These are intentionally conservative to act as a fail-safe.
 */
export const REGIME_SAFETY_MULTIPLIERS: Record<string, number> = {
  bull: 1.0, // Allow full trade
  bear: 0.8, // 20% reduction
  range: 1.0, // Standard
  "high-vol": 0.3, // 70% reduction (Capital preservation)
  unclear: 0.7, // 30% reduction
};

/**
 * Apply regime safety multiplier to trade quantity.
 * Returns adjusted quantity and the multiplier used.
 */
export function applyRegimeMultiplier(
  quantity: number,
  regime: string
): { adjustedQuantity: number; multiplier: number } {
  const multiplier = REGIME_SAFETY_MULTIPLIERS[regime] ?? 1.0;
  return {
    adjustedQuantity: multiplier < 1.0 ? quantity * multiplier : quantity,
    multiplier,
  };
}
