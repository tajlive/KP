import type { TradingAgent, AgentFeatures, AgentSignal, AgentState } from './types';

/**
 * Grid Trading Agent — profits from range-bound markets.
 *
 * Research: Pionex grid bots return 2.5-4%/month in sideways BTC.
 * Strategy: Buy near support, sell near resistance.
 * ONLY activates when Hurst < 0.5 (mean-reverting regime).
 *
 * This is the single biggest gap vs leading competitors.
 */
export const gridAgent: TradingAgent = {
  id: 'grid',
  name: 'Grid Range',
  baselineWeight: 0.25,
  run(_symbol: string, features: AgentFeatures, _state?: AgentState): AgentSignal {
    const { prices, hurst, rsi, bbUpper, bbLower } = features;
    if (!prices || prices.length < 20) {
      return { action: 'hold', confidence: 50, reasoning: 'Insufficient data for grid' };
    }

    // Grid ONLY works in mean-reverting markets
    if (hurst == null || hurst >= 0.5) {
      return {
        action: 'hold',
        confidence: 50,
        reasoning: `Grid inactive: H=${hurst?.toFixed(2) ?? 'N/A'} (needs H<0.5)`,
      };
    }

    const price = prices[prices.length - 1];

    // Calculate 20-period range (support/resistance)
    const lookback = 20;
    const recent = prices.slice(-lookback);
    const high20 = Math.max(...recent.slice(0, -1));
    const low20 = Math.min(...recent.slice(0, -1));
    const range = high20 - low20;
    const mid = low20 + range / 2;

    // Grid is ineffective if range is too tight (< 1%)
    const rangePct = range / mid;
    if (rangePct < 0.01) {
      return { action: 'hold', confidence: 50, reasoning: `Grid inactive: range ${(rangePct * 100).toFixed(2)}% < 1%` };
    }

    let score = 50;

    // Distance from support/resistance as signal strength
    const distFromLow = (price - low20) / range; // 0 = at support, 1 = at resistance
    const distFromHigh = (high20 - price) / range; // 0 = at resistance, 1 = at support

    // Buy near support (distFromLow < 0.15)
    if (distFromLow < 0.15) {
      score += 40;
      // RSI confirmation: oversold = stronger buy
      if (rsi != null && rsi < 35) score += 10;
    }
    // Sell near resistance (distFromHigh < 0.15)
    else if (distFromHigh < 0.15) {
      score -= 40;
      // RSI confirmation: overbought = stronger sell
      if (rsi != null && rsi > 65) score -= 10;
    }
    // Middle of range = hold (no edge)
    else {
      score = 50;
    }

    // Bollinger Band confirmation
    if (bbLower && price <= bbLower * 1.01) score += 10;
    if (bbUpper && price >= bbUpper * 0.99) score -= 10;

    score = Math.max(0, Math.min(100, score));

    let action: AgentSignal['action'] = 'hold';
    // OPTIMIZED: 55/45 threshold aligned with other agents
    if (score >= 55) action = 'buy';
    else if (score <= 45) action = 'sell';

    const zone = distFromLow < 0.15 ? 'support' : distFromHigh < 0.15 ? 'resistance' : 'middle';

    return {
      action,
      confidence: score,
      reasoning: `Grid: ${zone}, range [$${low20.toFixed(0)}-$${high20.toFixed(0)}], H=${hurst.toFixed(2)}, dist=${(distFromLow * 100).toFixed(0)}%`,
      meta: { high20, low20, mid, rangePct, distFromLow, zone },
    };
  },
};
