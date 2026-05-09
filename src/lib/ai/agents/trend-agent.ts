import type { TradingAgent, AgentFeatures, AgentSignal, AgentState } from './types';

export const trendAgent: TradingAgent = {
  id: 'trend',
  name: 'Trend Follower',
  baselineWeight: 0.25,
  run(_symbol: string, features: AgentFeatures, _state?: AgentState): AgentSignal {
    const { prices, sma20, sma50 } = features;
    if (!prices || prices.length < 50 || !sma20 || !sma50) {
      return { action: 'hold', confidence: 50, reasoning: 'Insufficient data for trend' };
    }

    const price = prices[prices.length - 1];
    const prevPrice = prices[prices.length - 2];
    const slope = price - prevPrice;

    let score = 50;
    if (price > sma20 && sma20 > sma50) score += 25;
    else if (price < sma20 && sma20 < sma50) score -= 25;
    else score = 50;

    // Momentum adjustment
    if (slope > 0) score += 10;
    if (slope < 0) score -= 10;

    score = Math.max(0, Math.min(100, score));

    let action: AgentSignal['action'] = 'hold';
    // OPTIMIZED: Lowered from 65/35 → 55/45 for more signal generation
    if (score >= 55) action = 'buy';
    else if (score <= 45) action = 'sell';

    return {
      action,
      confidence: score,
      reasoning: `Trend: price=${price.toFixed(0)} vs SMA20=${sma20.toFixed(0)}, SMA50=${sma50.toFixed(0)}`,
      meta: { slope },
    };
  },
};
