/**
 * Shared Risk Engine for Edge Functions
 * 
 * Centralizes SL/TP and Trailing Stop logic across:
 * - position-monitor
 * - strategy-runner
 * - trade-executor
 */

export interface PositionExitInput {
  side: 'long' | 'short';
  entryPrice: number;
  currentPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  trailingStop: number | null;
  highestPrice: number; // Watermark for trailing stop (long)
  lowestPrice: number;  // Watermark for trailing stop (short)
}

export interface PositionExitResult {
  shouldExit: boolean;
  reason: string;
  pnlPercent: number;
}

/**
 * Evaluates if a position should be closed based on price action and risk rules.
 */
export function evaluatePositionExits(input: PositionExitInput): PositionExitResult {
  const { 
    side, 
    entryPrice, 
    currentPrice, 
    stopLoss, 
    takeProfit, 
    trailingStop,
    highestPrice,
    lowestPrice 
  } = input;

  const pnlPercent = side === 'long'
    ? ((currentPrice - entryPrice) / entryPrice) * 100
    : ((entryPrice - currentPrice) / entryPrice) * 100;

  // 1. Check Stop Loss
  if (stopLoss !== null) {
    const stopLossHit = side === 'long' 
      ? currentPrice <= stopLoss 
      : currentPrice >= stopLoss;
      
    if (stopLossHit) {
      return { 
        shouldExit: true, 
        reason: `STOP-LOSS: ${currentPrice.toFixed(2)} hit level ${stopLoss}`, 
        pnlPercent 
      };
    }
  }

  // 2. Check Take Profit
  if (takeProfit !== null) {
    const takeProfitHit = side === 'long'
      ? currentPrice >= takeProfit
      : currentPrice <= takeProfit;
      
    if (takeProfitHit) {
      return { 
        shouldExit: true, 
        reason: `TAKE-PROFIT: ${currentPrice.toFixed(2)} hit level ${takeProfit}`, 
        pnlPercent 
      };
    }
  }

  // 3. Check Trailing Stop (Dynamic Profit Locking)
  if (trailingStop !== null) {
    // Only engage trailing stop if we are in profit
    const isProfitable = side === 'long' 
      ? currentPrice > entryPrice 
      : currentPrice < entryPrice;
      
    if (isProfitable) {
      // For long: exit if drop from highest > X
      // For short: exit if rise from lowest > X
      if (side === 'long') {
        const dropFromPeak = ((highestPrice - currentPrice) / highestPrice) * 100;
        if (dropFromPeak >= trailingStop) {
          return { 
            shouldExit: true, 
            reason: `TRAILING-STOP: ${currentPrice.toFixed(2)} dropped ${dropFromPeak.toFixed(2)}% from peak ${highestPrice.toFixed(2)}`, 
            pnlPercent 
          };
        }
      } else {
        const riseFromLow = ((currentPrice - lowestPrice) / lowestPrice) * 100;
        if (riseFromLow >= trailingStop) {
          return { 
            shouldExit: true, 
            reason: `TRAILING-STOP: ${currentPrice.toFixed(2)} rose ${riseFromLow.toFixed(2)}% from low ${lowestPrice.toFixed(2)}`, 
            pnlPercent 
          };
        }
      }
    }
  }

  return { shouldExit: false, reason: 'none', pnlPercent };
}

// ============================================================================
// Kelly Criterion & Position Sizing
// ============================================================================

export type MarketRegime = 'bull' | 'bear' | 'range' | 'high-vol' | 'unclear';

export interface KellyStats {
  winrate: number;
  avgWin: number;  // %
  avgLoss: number; // %
  sampleSize: number;
}

/**
 * Calculates the optimal fraction of equity to risk per trade.
 * Uses Half-Kelly for safety and clamps to a maximum of 2%.
 * Dynamic multipliers applied based on Market Regime.
 */
export function calculateKelly(
  stats: KellyStats, 
  riskProfile: 'conservative' | 'balanced' | 'aggressive' = 'balanced',
  regime: MarketRegime = 'unclear'
): number {
  if (stats.avgLoss === 0) return 0.01; // Avoid division by zero
  
  // Kelly % = W - [(1 - W) / (AvgWin / AvgLoss)]
  const winLossRatio = stats.avgWin / stats.avgLoss;
  const rawKelly = stats.winrate - (1 - stats.winrate) / winLossRatio;
  
  const profileMultipliers = {
    conservative: 0.25, // 1/4 Kelly
    balanced: 0.50,     // 1/2 Kelly
    aggressive: 0.75    // 3/4 Kelly
  };
  
  // Regime Multipliers: Dynamic risk shifting based on market environment
  const regimeMultipliers: Record<MarketRegime, number> = {
    bull: 1.2,      // Trend following: lean in
    bear: 0.8,      // Downtrend: defensive
    range: 1.0,     // Neutral: standard Kelly
    'high-vol': 0.3, // Chaos: preservation mode
    unclear: 0.5    // Uncertainty: conservative
  };

  const pMultiplier = profileMultipliers[riskProfile] || 0.5;
  const rMultiplier = regimeMultipliers[regime] || regimeMultipliers.unclear;
  
  const fraction = rawKelly * pMultiplier * rMultiplier;
  
  // Safety guardrails: Max 2% per trade, minimum 0.5% if winrate > 55%
  const upperLimit = 0.02;
  const lowerLimit = stats.winrate > 0.55 ? 0.005 : 0;
  
  return Math.max(lowerLimit, Math.min(fraction, upperLimit));
}
