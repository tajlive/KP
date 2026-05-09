import type { TradingAgent, AgentFeatures, AgentSignal, AgentState } from './types';

/**
 * Hurst Exponent Agent — uses statistical persistence to detect regime.
 *
 * Research: QuantifiedStrategies 2026 — Bitcoin Hurst ~0.52 on hourly data.
 * Mean reversion dominates on 1h timeframe for crypto.
 *
 * H < 0.45 = strong mean reversion → buy dips, sell spikes
 * H > 0.55 = trending → follow trend
 * 0.45-0.55 = random/sideways → reduce size, wait
 */
export const hurstAgent: TradingAgent = {
  id: 'hurst',
  name: 'Hurst Regime',
  baselineWeight: 0.20,
  run(_symbol: string, features: AgentFeatures, _state?: AgentState): AgentSignal {
    const { prices, rsi, hurst, bbUpper, bbLower } = features;
    if (!prices || prices.length < 30 || hurst == null) {
      return { action: 'hold', confidence: 50, reasoning: 'Insufficient data for Hurst' };
    }

    const price = prices[prices.length - 1];
    let score = 50;

    if (hurst < 0.45) {
      // Strong mean reversion: fade extremes
      if (rsi != null) {
        if (rsi < 30) score += 35; // oversold in MR regime = strong buy
        else if (rsi < 40) score += 20;
        else if (rsi > 70) score -= 35; // overbought in MR regime = strong sell
        else if (rsi > 60) score -= 20;
      }
      // Bollinger band confirmation
      if (bbLower && price <= bbLower) score += 15;
      if (bbUpper && price >= bbUpper) score -= 15;
    } else if (hurst > 0.55) {
      // Trending: follow momentum
      const sma20 = prices.slice(-20).reduce((a, b) => a + b, 0) / 20;
      const sma10 = prices.slice(-10).reduce((a, b) => a + b, 0) / 10;
      if (sma10 > sma20 && price > sma20) score += 30;
      else if (sma10 < sma20 && price < sma20) score -= 30;
    } else {
      // Random walk / sideways: neutral with slight mean reversion bias
      if (rsi != null) {
        if (rsi < 25) score += 20;
        else if (rsi > 75) score -= 20;
      }
    }

    score = Math.max(0, Math.min(100, score));

    let action: AgentSignal['action'] = 'hold';
    // OPTIMIZED: 55/45 threshold aligned with other agents
    if (score >= 55) action = 'buy';
    else if (score <= 45) action = 'sell';

    return {
      action,
      confidence: score,
      reasoning: `Hurst: H=${hurst.toFixed(3)} (${hurst < 0.45 ? 'MR' : hurst > 0.55 ? 'trend' : 'random'}), RSI=${rsi?.toFixed(1) ?? 'N/A'}`,
      meta: { hurst, regime: hurst < 0.45 ? 'mean_reversion' : hurst > 0.55 ? 'trending' : 'random' },
    };
  },
};
