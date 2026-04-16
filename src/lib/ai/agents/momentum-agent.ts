import type { TradingAgent, AgentFeatures, AgentSignal, AgentState } from './types';

export const momentumAgent: TradingAgent = {
  id: 'momentum',
  name: 'MACD Momentum',
  baselineWeight: 0.20,
  run(_symbol: string, features: AgentFeatures, _state?: AgentState): AgentSignal {
    const { prices, macdHistogram } = features;
    if (!prices || prices.length < 30 || macdHistogram == null) {
      return { action: 'hold', confidence: 50, reasoning: 'Insufficient data for MACD' };
    }

    // We only have last histogram here; in real use we'd pass the series.
    // Approximate previous histogram from price curvature if not provided.
    const price = prices[prices.length - 1];
    const prev = prices[prices.length - 2];
    const prev2 = prices[prices.length - 3];
    const approxPrevHist = (price - prev) - (prev - prev2);

    let score = 50;
    if (macdHistogram > 0 && macdHistogram > approxPrevHist) score += 25;
    else if (macdHistogram < 0 && macdHistogram < approxPrevHist) score -= 25;
    else if (macdHistogram > 0) score += 10;
    else if (macdHistogram < 0) score -= 10;

    score = Math.max(0, Math.min(100, score));

    let action: AgentSignal['action'] = 'hold';
    if (score >= 65) action = 'buy';
    else if (score <= 35) action = 'sell';

    return {
      action,
      confidence: score,
      reasoning: `Momentum: MACD hist=${macdHistogram.toFixed(2)}, trend=${approxPrevHist > 0 ? 'up' : 'down'}`,
      meta: { macdHistogram, approxPrevHist },
    };
  },
};
