// KLA-251: Optimal 2026 Trading Engine
import { calculateKelly, updateKellyStats, saveKellyStats, KellyStats } from './kelly';
import { calculateOptimalStop, ATRResult } from './atr';
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
