import type { TradingAgent, AgentFeatures, AgentSignal, AgentState } from './types';

export const breakoutAgent: TradingAgent = {
  id: 'breakout',
  name: 'Breakout Scout',
  baselineWeight: 0.20,
  run(_symbol: string, features: AgentFeatures, _state?: AgentState): AgentSignal {
    const { prices, volatility14 } = features;
    if (!prices || prices.length < 30) {
      return { action: 'hold', confidence: 50, reasoning: 'Insufficient data for breakout' };
    }

    const lookback = 20;
    const recent = prices.slice(-lookback);
    const high20 = Math.max(...recent.slice(0, -1));
    const low20 = Math.min(...recent.slice(0, -1));
    const price = prices[prices.length - 1];
    const prev = prices[prices.length - 2];

    let score = 50;
    if (price > high20 && prev <= high20) score += 30;
    if (price < low20 && prev >= low20) score -= 30;

    // Volatility filter: require some vol for conviction
    if (volatility14 && volatility14 < 0.005) score = 50;

    score = Math.max(0, Math.min(100, score));

    let action: AgentSignal['action'] = 'hold';
    // OPTIMIZED: Lowered from 65/35 → 55/45 for more signal generation
    if (score >= 55) action = 'buy';
    else if (score <= 45) action = 'sell';

    return {
      action,
      confidence: score,
      reasoning: `Breakout: price=${price.toFixed(0)} vs 20d range=[${low20.toFixed(0)}, ${high20.toFixed(0)}]`,
      meta: { high20, low20, volatility14 },
    };
  },
};
