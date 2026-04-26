import { type MarketRegime } from '@/lib/ai/sonar';
import { createClient } from '@/lib/supabase/client';

export interface KellyStats {
  winrate: number;
  avgWin: number;  // %
  avgLoss: number; // %
  sampleSize: number;
}

/**
 * Calculates the optimal fraction of equity to risk per trade.
 * Uses Half-Kelly for safety and clamps to a maximum of 2%.
 * Now takes MarketRegime into account for secondary risk modulation.
 */
export function calculateKelly(
  stats: KellyStats, 
  riskProfile: 'conservative' | 'balanced' | 'aggressive' = 'balanced',
  regime: MarketRegime | 'high-vol' | 'unclear' = 'unclear'
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
  
  // Regime Multipliers: Protect capital in chop/high-vol, maximize in bull
  const regimeMultipliers: Record<string, number> = {
    bull: 1.2,      // Trend is your friend
    bear: 0.8,      // Defensive trend
    range: 1.0,     // Standard mean reversion
    'high-vol': 0.3, // Maximum caution (Paper hands mode)
    unclear: 0.5    // Lower risk when unsure
  };

  const pMultiplier = profileMultipliers[riskProfile] || 0.5;
  const rMultiplier = regimeMultipliers[regime] || regimeMultipliers.unclear;
  
  const fraction = rawKelly * pMultiplier * rMultiplier;
  
  // Safety guardrails: Max 2% per trade, minimum 0.5% if winrate > 50%
  const upperLimit = 0.02;
  const lowerLimit = stats.winrate > 0.55 ? 0.005 : 0;
  
  return Math.max(lowerLimit, Math.min(fraction, upperLimit));
}

/**
 * Real-time Kelly update from recent trades.
 * Calculates Win/Loss using actual trade values for high precision.
 */
export async function updateKellyStats(userId: string, strategy?: string): Promise<KellyStats> {
  const supabase = createClient();
  
  const query = supabase
    .from('trades')
    .select('realized_pnl, quantity, price')
    .eq('user_id', userId)
    .not('realized_pnl', 'is', null)
    .gte('created_at', new Date(Date.now() - 30*24*60*60*1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(50);

  if (strategy) {
    // If trade metadata contains strategy info, we could filter here. 
    // Currently, we look at global user performance for the core Kelly stat.
  }

  const { data } = await query;
    
  if (!data?.length || data.length < 5) {
    return { winrate: 0.52, avgWin: 2.5, avgLoss: 1.5, sampleSize: data?.length || 0 }; // Conservative defaults
  }
  
  // Calculate PnL as % of individual trade notional
  const pnlPcts = data.map(t => {
    const notional = (t.quantity || 0) * (t.price || 0);
    if (notional === 0) return 0;
    return ((t.realized_pnl || 0) / notional) * 100;
  }).filter(p => p !== 0);
  
  const wins = pnlPcts.filter(p => p > 0);
  const losses = pnlPcts.filter(p => p < 0);
  
  const stats = {
    winrate: wins.length / pnlPcts.length,
    avgWin: wins.length ? wins.reduce((sum, p) => sum + p, 0) / wins.length : 2.5,
    avgLoss: losses.length ? Math.abs(losses.reduce((sum, p) => sum + p, 0) / losses.length) : 1.5,
    sampleSize: pnlPcts.length
  };

  return stats;
}

/**
 * Persists calculated stats to the performance tracking layer.
 */
export async function saveKellyStats(
  userId: string,
  strategy: string,
  stats: KellyStats,
  kellyFraction: number
) {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('strategy_performance')
    .upsert({
      user_id: userId,
      strategy_id: strategy,
      win_rate: stats.winrate,
      avg_win_pct: stats.avgWin,
      avg_loss_pct: stats.avgLoss,
      kelly_fraction: kellyFraction,
      sample_size: stats.sampleSize,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id, strategy_id' });

  if (error) {
    console.error('[kelly] Failed to save performance stats:', error.message);
  }
}
