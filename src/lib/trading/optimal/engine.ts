// KLA-251: Optimal 2026 Trading Engine
// KLA-255: Early Exit Integration
import { calculateKelly, updateKellyStats, saveKellyStats, KellyStats } from './kelly';
import { calculateOptimalStop, ATRResult } from './atr';
import { evaluateEarlyExit, calculateRMultiple, ExitRecommendation } from './early-exit';
import { createClient } from '@/lib/supabase/client';

export interface OptimalTradeParams {
  userId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  signalStrength: number; // 0.0-1.0
  portfolioValue: number; // In NOK
  riskProfile: 'conservative' | 'balanced' | 'aggressive';
  pyramidLevel?: number;
  entryPrice: number; // Current market price
}

export interface OptimalTradeResult {
  success: boolean;
  positionSizeNOK: number;
  positionSizeUSD: number;
  kellyFraction: number;
  kellyStats: KellyStats;
  atr: ATRResult;
  stopPrice: number;
  targetPrice: number;
  rrRatio: number;
  quantity: number;
  error?: string;
}

export async function executeOptimalTrade(
  params: OptimalTradeParams
): Promise<OptimalTradeResult> {
  const supabase = createClient();
  
  try {
    // 1. Real-time Kelly stats
    const kellyStats = await updateKellyStats(params.userId, params.symbol);
    const kellyFraction = calculateKelly(kellyStats, params.riskProfile);
    
    // Save Kelly stats for analytics
    await saveKellyStats(params.userId, params.symbol, kellyStats, kellyFraction);
    
    // 2. Dynamic position size (max 2% risk per trade)
    const maxPositionNOK = params.portfolioValue * 0.02;
    const kellyPositionNOK = params.portfolioValue * kellyFraction * params.signalStrength;
    const positionSizeNOK = Math.min(kellyPositionNOK, maxPositionNOK);
    
    // Convert to USD (approximate rate)
    const usdNokRate = 10.8;
    const positionSizeUSD = positionSizeNOK / usdNokRate;
    
    // 3. ATR-based stop loss
    const atrResult = await calculateOptimalStop(
      params.symbol,
      params.entryPrice,
      params.side,
      params.riskProfile
    );
    
    // 4. Calculate quantity
    const quantity = positionSizeUSD / params.entryPrice;
    
    // 5. Log optimal trade (skipped - table not in generated types)
    // TODO: Regenerate Supabase types after migration
    console.log('Optimal trade calculated:', {
      userId: params.userId,
      symbol: params.symbol,
      kellyFraction,
      positionSizeNOK
    });
    
    return {
      success: true,
      positionSizeNOK,
      positionSizeUSD,
      kellyFraction,
      kellyStats,
      atr: atrResult,
      stopPrice: atrResult.stopPrice,
      targetPrice: atrResult.targetPrice,
      rrRatio: atrResult.rrRatio,
      quantity
    };
    
  } catch (error) {
    console.error('Optimal trade execution failed:', error);
    return {
      success: false,
      positionSizeNOK: 0,
      positionSizeUSD: 0,
      kellyFraction: 0,
      kellyStats: { winrate: 0.5, avgWin: 2, avgLoss: 1 },
      atr: {
        atr: 0,
        stopPrice: 0,
        targetPrice: 0,
        multiplier: 1.8,
        rrRatio: 3
      },
      stopPrice: 0,
      targetPrice: 0,
      rrRatio: 3,
      quantity: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Calculate preview without logging
export async function calculateOptimalTradePreview(
  params: Omit<OptimalTradeParams, 'userId'> & { userId?: string }
): Promise<OptimalTradeResult> {
  // Use demo user if not provided
  const userId = params.userId || '00000000-0000-0000-0000-000000000000';
  
  // 1. Real-time Kelly stats
  const kellyStats = await updateKellyStats(userId, params.symbol);
  const kellyFraction = calculateKelly(kellyStats, params.riskProfile);
  
  // 2. Dynamic position size
  const maxPositionNOK = params.portfolioValue * 0.02;
  const kellyPositionNOK = params.portfolioValue * kellyFraction * params.signalStrength;
  const positionSizeNOK = Math.min(kellyPositionNOK, maxPositionNOK);
  
  const usdNokRate = 10.8;
  const positionSizeUSD = positionSizeNOK / usdNokRate;
  
  // 3. ATR-based stop loss
  const atrResult = await calculateOptimalStop(
    params.symbol,
    params.entryPrice,
    params.side,
    params.riskProfile
  );
  
  const quantity = positionSizeUSD / params.entryPrice;
  
  return {
    success: true,
    positionSizeNOK,
    positionSizeUSD,
    kellyFraction,
    kellyStats,
    atr: atrResult,
    stopPrice: atrResult.stopPrice,
    targetPrice: atrResult.targetPrice,
    rrRatio: atrResult.rrRatio,
    quantity
  };
}

// Get optimal trade history for a user
export async function getOptimalTradeHistory(userId: string, limit = 10) {
  // TODO: Implement after regenerating types
  console.log('Trade history fetch skipped (table not in types)');
  return [];
}

/**
 * KLA-255: Check early exit conditions for an open position.
 *
 * Integrates Kelly Criterion position sizing with Early Exit System.
 * This is analysis-only - NO automatic order execution.
 *
 * @param entryPrice - Position entry price
 * @param currentPrice - Current market price
 * @param stopPrice - Initial stop loss price
 * @param side - 'LONG' or 'SHORT'
 * @param symbol - Trading pair
 * @param atr - Current ATR value
 * @param atrAvg14 - 14-period average ATR
 * @param fundingTime - Time until next funding (ms)
 * @param fundingRate - Expected funding rate
 * @returns Exit recommendation
 *
 * @example
 * const rec = await checkEarlyExit({
 *   entryPrice: 84000,
 *   currentPrice: 86000,
 *   stopPrice: 82000,
 *   side: 'LONG',
 *   symbol: 'BTCUSDT',
 *   atr: 450,
 *   atrAvg14: 380,
 *   fundingTime: 3600000,
 *   fundingRate: 0.0001
 * });
 */
export async function checkEarlyExit({
  entryPrice,
  currentPrice,
  stopPrice,
  side,
  symbol,
  atr,
  atrAvg14,
  fundingTime,
  fundingRate,
}: {
  entryPrice: number;
  currentPrice: number;
  stopPrice: number;
  side: 'LONG' | 'SHORT';
  symbol: string;
  atr: number;
  atrAvg14: number;
  fundingTime: number;
  fundingRate: number;
}): Promise<ExitRecommendation> {
  // Calculate current R-multiple
  const pnlR = calculateRMultiple(entryPrice, currentPrice, stopPrice, side);

  // Check early exit conditions
  const recommendation = evaluateEarlyExit({
    symbol,
    entryPrice,
    side,
    currentPrice,
    initialStop: stopPrice,
    currentStop: stopPrice, // Could be updated by trailing
    pnlR,
    atr,
    atrAvg14,
    fundingTime,
    fundingRate,
  });

  return recommendation;
}
