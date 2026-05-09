import type { TradingAgent, AgentFeatures, AgentSignal, AgentState } from './types';

/**
 * Volume Spike Agent — detects unusual volume activity
 * as a leading indicator for price moves.
 *
 * Research: 3Commas, Cryptohopper both use volume filters
 * to confirm signals. Volume spikes precede 68% of breakouts.
 */
export const volumeAgent: TradingAgent = {
  id: 'volume',
  name: 'Volume Spike',
  baselineWeight: 0.15,
  run(_symbol: string, features: AgentFeatures, _state?: AgentState): AgentSignal {
    const { prices, volumes } = features;
    if (!prices || prices.length < 20 || !volumes || volumes.length < 20) {
      return { action: 'hold', confidence: 50, reasoning: 'Insufficient volume data' };
    }

    const price = prices[prices.length - 1];
    const prevPrice = prices[prices.length - 2];
    const currentVol = volumes[volumes.length - 1];

    // Volume SMA20
    const volSma20 = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const volRatio = volSma20 > 0 ? currentVol / volSma20 : 1;

    // Volume trend (last 5 vs previous 5)
    const recentVol = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const prevVol = volumes.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
    const volTrend = prevVol > 0 ? recentVol / prevVol : 1;

    let score = 50;

    // High volume + price up = accumulation (buy)
    if (volRatio >= 2.0 && price > prevPrice) {
      score += 30;
    } else if (volRatio >= 1.5 && price > prevPrice) {
      score += 20;
    }
    // High volume + price down = distribution (sell)
    else if (volRatio >= 2.0 && price < prevPrice) {
      score -= 30;
    } else if (volRatio >= 1.5 && price < prevPrice) {
      score -= 20;
    }
    // Declining volume = lack of conviction
    else if (volRatio < 0.5) {
      score = 50;
    }

    // Volume trend confirmation
    if (volTrend >= 1.3) score += 5;
    if (volTrend <= 0.7) score -= 5;

    score = Math.max(0, Math.min(100, score));

    let action: AgentSignal['action'] = 'hold';
    // OPTIMIZED: 55/45 threshold aligned with other agents
    if (score >= 55) action = 'buy';
    else if (score <= 45) action = 'sell';

    return {
      action,
      confidence: score,
      reasoning: `Vol: ratio=${volRatio.toFixed(2)}x SMA20, trend=${volTrend.toFixed(2)}x, priceDir=${price > prevPrice ? 'up' : 'down'}`,
      meta: { volRatio, volTrend, currentVol, volSma20 },
    };
  },
};
