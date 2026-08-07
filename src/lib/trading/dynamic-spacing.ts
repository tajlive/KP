/**
 * Dynamisk grid-spacing basert på 24h high/low-volatilitet.
 * Justerer spacing proporsjonalt med markedsbevegelser så nivåene treffes oftere.
 *
 * Regler:
 * - Lav volatilitet (< 1%): spacing reduseres mot fee_guard (aldri under 1.0%)
 * - Normal volatilitet (2%): uendret konfigurert spacing
 * - Høy volatilitet (3%+): spacing økes lineært (capped ved 1.5x)
 *
 * Fee-guard: spacing >= 2 × taker_fee × 1.9 = 0.988% ≈ 1.0%
 * Dette sikrer at hver grid-syklus har positiv netto etter Kraken fees (0.26% × 2).
 */

export interface DynamicSpacingInput {
  /** Konfigurert base-spacing fra PAIR_CFG (f.eks. 0.01 = 1%) */
  baseSpacing: number;
  /** 24h høyeste pris */
  high24h: number;
  /** 24h laveste pris */
  low24h: number;
  /** Minimum spacing for positiv fee-økonomi (default 0.01 = 1.0%) */
  feeGuardPct?: number;
  /** Maks multiplikator for bred spacing (default 1.5) */
  maxMultiplier?: number;
  /** Baseline 24h-range der spacing = baseSpacing (default 0.02 = 2%) */
  baselineRangePct?: number;
}

/**
 * Beregn dynamisk spacing basert på 24h-volatilitet.
 *
 * @returns spacing som desimal (f.eks. 0.01 = 1%)
 *
 * Eksempler (med baseSpacing=0.01, baselineRangePct=0.02):
 *   BTC: high=65100 low=63700 → range 2.2% → ratio 1.1 → spacing 0.011
 *   ETH: high=1920 low=1880  → range 2.1% → ratio 1.05 → spacing 0.0105
 *   SOL: high=73.5 low=71.5  → range 2.8% → ratio 1.4 → spacing 0.014
 */
export function computeDynamicSpacing(input: DynamicSpacingInput): number {
  const {
    baseSpacing,
    high24h,
    low24h,
    feeGuardPct = 0.01,
    maxMultiplier = 1.5,
    baselineRangePct = 0.02,
  } = input;

  // Fallback: ingen eller ugyldige 24h-data
  if (!high24h || !low24h || high24h <= 0 || low24h <= 0 || high24h <= low24h) {
    return baseSpacing;
  }

  const currentRangePct = (high24h - low24h) / low24h;
  const volatilityRatio = currentRangePct / baselineRangePct;

  // Clamp ratio: tillater 0.5x–1.5x justering (aldri under 50% eller over 150%)
  const clampedRatio = Math.max(0.5, Math.min(maxMultiplier, volatilityRatio));
  const spacing = Math.max(feeGuardPct, baseSpacing * clampedRatio);

  // Avrund til 4 desimaler (0.0001 = 0.01%)
  return Math.round(spacing * 10000) / 10000;
}
