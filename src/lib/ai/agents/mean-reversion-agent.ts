import type { TradingAgent, AgentFeatures, AgentSignal, AgentState } from './types';

export const meanReversionAgent: TradingAgent = {
  id: 'mean_reversion',
  name: 'Mean Reversion',
  baselineWeight: 0.20,
  run(_symbol: string, features: AgentFeatures, _state?: AgentState): AgentSignal {
    const { prices, rsi, bbUpper, bbLower } = features;
    if (!prices || prices.length < 20 || rsi == null || !bbUpper || !bbLower) {
      return { action: 'hold', confidence: 50, reasoning: 'Insufficient data for MR' };
    }

    const price = prices[prices.length - 1];
    let score = 50;

    if (rsi < 30) score += 30;
    else if (rsi > 70) score -= 30;
    else score += (50 - rsi) * 0.5;

    if (price <= bbLower) score += 15;
    if (price >= bbUpper) score -= 15;

    score = Math.max(0, Math.min(100, score));

    let action: AgentSignal['action'] = 'hold';
    if (score >= 65) action = 'buy';
    else if (score <= 35) action = 'sell';

    return {
      action,
      confidence: score,
      reasoning: `MR: RSI=${rsi.toFixed(1)}, price vs BB=[${bbLower.toFixed(0)}, ${bbUpper.toFixed(0)}]`,
      meta: { rsi, bbPosition: price <= bbLower ? 'lower' : price >= bbUpper ? 'upper' : 'middle' },
    };
  },
};
