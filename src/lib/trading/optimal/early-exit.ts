/**
 * KLA-252 Early Exit System
 *
 * Dynamisk posisjonshåndtering for å beskytte profitt og redusere tap.
 * INGEN auto-execution - kun signaler som må håndteres manuelt eller via OCO.
 *
 * Exit-regler:
 * 1. Trailing stop: Flytt til break-even ved +1R
 * 2. Partial exit: Ta 50% profitt ved +2R
 * 3. Time exit: Exit før funding hvis lav PnL
 * 4. Volatility exit: Exit ved ekstrem ATR-spike
 *
 * DISCLAIMER:
 * - Dette er analyse-only. Ingen automatisk ordreplassering.
 * - Bruker må manuelt utføre exits på egne kontoer.
 * - Historisk Ytelse garanterer ikke fremtidige resultater.
 */

export type ExitSignal = 'hold' | 'trailing' | 'partial' | 'time' | 'volatility' | 'stop' | 'target';

export interface EarlyExitParams {
  /** Trading pair (e.g., 'BTCUSDT') */
  symbol: string;
  /** Entry price for position */
  entryPrice: number;
  /** Position side */
  side: 'LONG' | 'SHORT';
  /** Current market price */
  currentPrice: number;
  /** Initial stop loss price */
  initialStop: number;
  /** Current stop loss price (may be updated by trailing) */
  currentStop: number;
  /** Current PnL in R-multiples (e.g., +2 means +2R) */
  pnlR: number;
  /** Current ATR value */
  atr: number;
  /** Average ATR over last 14 periods (for volatility comparison) */
  atrAvg14: number;
  /** Time until next funding in milliseconds */
  fundingTime: number;
  /** Expected funding rate (positive = longs pay shorts) */
  fundingRate: number;
}

export interface ExitRecommendation {
  signal: ExitSignal;
  /** Percentage of position to close (0-100) */
  closePercent: number;
  /** Reason for exit */
  reason: string;
  /** Suggested new stop price (for trailing stops) */
  newStopPrice?: number;
  /** Priority: higher = more urgent */
  priority: number;
}

/**
 * Evaluate early exit conditions for an open position.
 *
 * This function analyzes current market conditions and returns
 * recommendations for position management. NO trades are executed.
 *
 * @param params - Current position and market data
 * @returns Exit recommendation with action and reasoning
 *
 * @example
 * const rec = evaluateEarlyExit({
 *   symbol: 'BTCUSDT',
 *   entryPrice: 84000,
 *   side: 'LONG',
 *   currentPrice: 86000,
 *   initialStop: 82000,
 *   currentStop: 82000,
 *   pnlR: 2.5,
 *   atr: 450,
 *   atrAvg14: 380,
 *   fundingTime: 3600000, // 1 hour
 *   fundingRate: 0.0001
 * });
 * // Returns: { signal: 'partial', closePercent: 50, ... }
 */
export function evaluateEarlyExit(params: EarlyExitParams): ExitRecommendation {
  const {
    side,
    entryPrice,
    currentPrice,
    initialStop,
    currentStop,
    pnlR,
    atr,
    atrAvg14,
    fundingTime,
    fundingRate,
  } = params;

  const isLong = side === 'LONG';

  // Calculate R-value (1R = distance from entry to initial stop)
  const rValue = Math.abs(entryPrice - initialStop);

  // 1. STOP LOSS HIT - Highest priority
  const stopHit = isLong ? currentPrice <= currentStop : currentPrice >= currentStop;
  if (stopHit) {
    return {
      signal: 'stop',
      closePercent: 100,
      reason: `Stop loss triggered at ${currentStop}`,
      priority: 100,
    };
  }

  // 2. TARGET HIT (+3R) - High priority
  if (pnlR >= 3) {
    return {
      signal: 'target',
      closePercent: 100,
      reason: `Target reached (+${pnlR.toFixed(1)}R). Full exit recommended.`,
      priority: 90,
    };
  }

  // 3. VOLATILITY EXIT - ATR > 3x average (market unstable)
  if (atr > atrAvg14 * 3 && atrAvg14 > 0) {
    return {
      signal: 'volatility',
      closePercent: pnlR > 0 ? 100 : 100, // Exit regardless of PnL
      reason: `Extreme volatility detected (ATR ${atr.toFixed(0)} vs avg ${atrAvg14.toFixed(0)}). Protect capital.`,
      priority: 85,
    };
  }

  // 4. PARTIAL EXIT - Take 50% profit at +2R
  if (pnlR >= 2 && pnlR < 3) {
    return {
      signal: 'partial',
      closePercent: 50,
      reason: `+${pnlR.toFixed(1)}R reached. Take 50% profit, let remainder run to +3R.`,
      priority: 70,
    };
  }

  // 5. TIME EXIT - Before funding if negative expected funding and low profit
  const fundingNegativeForPosition = isLong ? fundingRate > 0.0001 : fundingRate < -0.0001;
  if (fundingTime < 2 * 60 * 60 * 1000 && fundingNegativeForPosition && pnlR < 0.5) {
    return {
      signal: 'time',
      closePercent: 100,
      reason: `Negative funding in ${(fundingTime / 3600000).toFixed(1)}h. Exit to avoid funding cost.`,
      priority: 60,
    };
  }

  // 6. TRAILING STOP - Move to break-even at +1R
  if (pnlR >= 1 && pnlR < 2) {
    const breakEvenStop = entryPrice;
    const shouldUpdateStop = isLong
      ? breakEvenStop > currentStop
      : breakEvenStop < currentStop;

    if (shouldUpdateStop) {
      return {
        signal: 'trailing',
        closePercent: 0,
        reason: `+${pnlR.toFixed(1)}R reached. Move stop to break-even (${breakEvenStop}).`,
        newStopPrice: breakEvenStop,
        priority: 50,
      };
    }
  }

  // Default: HOLD
  return {
    signal: 'hold',
    closePercent: 0,
    reason: `Position at +${pnlR.toFixed(1)}R. No action required.`,
    priority: 0,
  };
}

/**
 * Calculate current R-multiple for a position.
 *
 * @param entryPrice - Position entry price
 * @param currentPrice - Current market price
 * @param stopPrice - Initial stop loss price
 * @param side - LONG or SHORT
 * @returns R-multiple (e.g., +2.0 means 2R profit)
 */
export function calculateRMultiple(
  entryPrice: number,
  currentPrice: number,
  stopPrice: number,
  side: 'LONG' | 'SHORT'
): number {
  const rValue = Math.abs(entryPrice - stopPrice);
  if (rValue === 0) return 0;

  const priceMove = side === 'LONG'
    ? currentPrice - entryPrice
    : entryPrice - currentPrice;

  return priceMove / rValue;
}

/**
 * Check if trailing stop should be updated.
 *
 * @param currentStop - Current stop price
 * @param proposedStop - New proposed stop price
 * @param side - LONG or SHORT
 * @returns True if stop should be moved
 */
export function shouldUpdateTrailingStop(
  currentStop: number,
  proposedStop: number,
  side: 'LONG' | 'SHORT'
): boolean {
  return side === 'LONG'
    ? proposedStop > currentStop
    : proposedStop < currentStop;
}
