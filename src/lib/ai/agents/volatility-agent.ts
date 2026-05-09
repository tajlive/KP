import type { TradingAgent, AgentFeatures, AgentSignal, AgentState } from './types';

export const volatilityAgent: TradingAgent = {
  id: 'volatility',
  name: 'Volatility Harvest',
  baselineWeight: 0.15,
  run(_symbol: string, features: AgentFeatures, _state?: AgentState): AgentSignal {
    const { prices, volatility14, atr14 } = features;
    if (!prices || prices.length < 20) {
      return { action: 'hold', confidence: 50, reasoning: 'Insufficient data for vol' };
    }

    const price = prices[prices.length - 1];
    const change24h = prices.length >= 24
      ? ((price - prices[prices.length - 24]) / prices[prices.length - 24]) * 100
      : 0;

    let score = 50;
    // Big dip → buy
    if (change24h <= -5) score += 35;
    else if (change24h <= -3) score += 20;
    // Big spike → sell / reduce
    else if (change24h >= 5) score -= 25;
    else if (change24h >= 3) score -= 10;

    // ATR confirmation
    if (atr14 && atr14 > price * 0.03) {
      score = score > 50 ? score + 10 : score < 50 ? score - 10 : score;
    }

    score = Math.max(0, Math.min(100, score));

    let action: AgentSignal['action'] = 'hold';
    // OPTIMIZED: Lowered from 65/35 → 55/45 for more signal generation
    if (score >= 55) action = 'buy';
    else if (score <= 45) action = 'sell';

    return {
      action,
      confidence: score,
      reasoning: `Vol: 24h change=${change24h.toFixed(2)}%, ATR=${atr14?.toFixed(0) ?? 'N/A'}`,
      meta: { change24h, volatility14, atr14 },
    };
  },
};
