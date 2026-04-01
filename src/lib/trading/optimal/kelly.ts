// KLA-251: Kelly Criterion Position Sizing
import { createClient } from '@/lib/supabase/client';

export interface KellyStats {
  winrate: number;
  avgWin: number;  // %
  avgLoss: number; // %
}

export function calculateKelly(
  stats: KellyStats, 
  riskProfile: 'conservative' | 'balanced' | 'aggressive'
): number {
  const rawKelly = (stats.winrate * stats.avgWin - (1 - stats.winrate) * stats.avgLoss) / stats.avgWin;
  const halfKelly = rawKelly * 0.5; // Risk of ruin protection
  
  const multipliers = {
    conservative: 0.25,
    balanced: 0.50,
    aggressive: 0.75
  };
  
  return Math.max(0, Math.min(halfKelly * multipliers[riskProfile], 0.02)); // Max 2% per trade
}

// Real-time Kelly update from recent trades
export async function updateKellyStats(userId: string, strategy: string): Promise<KellyStats> {
  const supabase = createClient();
  
  // Use auto_trading_trades table with pnl column
  const { data } = await supabase
    .from('auto_trading_trades')
    .select('pnl')
    .eq('user_id', userId)
    .eq('strategy_id', strategy)
    .gte('created_at', new Date(Date.now() - 30*24*60*60*1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(50);
    
  if (!data?.length) {
    return { winrate: 0.5, avgWin: 2, avgLoss: 1 }; // Default fallback
  }
  
  // Convert PnL to percentage (approximate based on avg trade size)
  const avgTradeSize = 10000; // NOK
  const pnlPcts = data.map((t: { pnl: number | null }) => ((t.pnl || 0) / avgTradeSize) * 100);
  
  const wins = pnlPcts.filter((p: number) => p > 0);
  const losses = pnlPcts.filter((p: number) => p < 0);
  
  return {
    winrate: wins.length / data.length,
    avgWin: wins.reduce((sum: number, p: number) => sum + p, 0) / wins.length || 2,
    avgLoss: Math.abs(losses.reduce((sum: number, p: number) => sum + p, 0) / losses.length || 1)
  };
}

// Save Kelly stats to database
export async function saveKellyStats(
  userId: string,
  strategy: string,
  stats: KellyStats,
  kellyFraction: number
) {
  // Skip for now - table not in generated types
  // TODO: Regenerate types after migration
  console.log('Kelly stats save skipped:', { userId, strategy, kellyFraction });
}
