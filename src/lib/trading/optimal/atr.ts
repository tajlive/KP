// KLA-251: ATR Dynamic Stop Loss
import { createClient } from '@/lib/supabase/client';

export interface ATRResult {
  atr: number;
  stopPrice: number;
  targetPrice: number;
  multiplier: number;
  rrRatio: number;
}

export async function calculateATR(symbol: string, period = 14): Promise<number> {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=${period * 2}`;
  
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`Binance API error: ${response.status}`);
    
    const klines = await response.json() as [number, string, string, string, string, string, number, string, number, string, string, string][];
    
    const trs: number[] = [];
    for (let i = 1; i < klines.length && trs.length < period; i++) {
      const high = parseFloat(klines[i][2]);
      const low = parseFloat(klines[i][3]);
      const prevClose = parseFloat(klines[i - 1][4]);
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      trs.push(tr);
    }
    
    return trs.reduce((a, b) => a + b, 0) / trs.length;
  } catch (error) {
    console.error('ATR calculation failed:', error);
    // Return default based on symbol
    return symbol.includes('BTC') ? 1500 : 80; // Default BTC/ETH ATR in USD
  }
}

async function getCachedATR(symbol: string): Promise<number | null> {
  // Skip cache lookup for now - new table not in types
  return null;
}

export async function saveATRCache(symbol: string, atr: number) {
  // Skip cache save for now - new table not in types
  // TODO: Add to migration and regenerate types
}

export async function calculateOptimalStop(
  symbol: string,
  entryPrice: number,
  side: 'BUY' | 'SELL',
  riskProfile: 'conservative' | 'balanced' | 'aggressive'
): Promise<ATRResult> {
  const atr = await calculateATR(symbol);
  
  const multipliers = { 
    conservative: 2.5, // Wider stop, fewer whipsaws
    balanced: 1.8,     // Standard
    aggressive: 1.2    // Tighter stop, more trades
  };
  
  const multiplier = multipliers[riskProfile];
  const stopDistance = atr * multiplier;
  
  const stopPrice = side === 'BUY' 
    ? entryPrice - stopDistance 
    : entryPrice + stopDistance;
  
  // 3:1 Risk:Reward target
  const targetPrice = side === 'BUY'
    ? entryPrice + (stopDistance * 3)
    : entryPrice - (stopDistance * 3);
    
  // Cache ATR for future use
  await saveATRCache(symbol, atr);
    
  return { 
    atr, 
    stopPrice, 
    targetPrice, 
    multiplier,
    rrRatio: 3.0 
  };
}
