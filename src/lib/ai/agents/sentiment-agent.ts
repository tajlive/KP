import type { TradingAgent, AgentFeatures, AgentSignal, AgentState } from './types';

interface FearGreedData {
  value: number;
  value_classification: string;
  timestamp: string;
}

let cachedSentiment: { data: FearGreedData; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min cache

/**
 * Fear & Greed Sentiment Agent — contrarian crypto strategy.
 *
 * Research: Crypto Fear & Greed Index (alternative.me) is a leading
 * sentiment indicator. Extreme fear (<25) often marks bottoms.
 * Extreme greed (>75) often marks tops.
 *
 * Used by: 3Commas, Cryptohopper, and most pro traders as a
 * secondary confirmation filter.
 *
 * Strategy: BE greedy when others are fearful. Be FEARFUL when
 * others are greedy. (Warren Buffett, crypto edition)
 */
export const sentimentAgent: TradingAgent = {
  id: 'sentiment',
  name: 'Fear & Greed',
  baselineWeight: 0.15,
  async run(_symbol: string, _features: AgentFeatures, _state?: AgentState): Promise<AgentSignal> {
    try {
      // Use cached data if fresh
      if (cachedSentiment && Date.now() - cachedSentiment.fetchedAt < CACHE_TTL_MS) {
        return buildSignal(cachedSentiment.data);
      }

      const res = await fetch('https://api.alternative.me/fng/?limit=1', {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`Fear/Greed API error: ${res.status}`);

      const json = (await res.json()) as { data: FearGreedData[] };
      const data = json.data[0];

      cachedSentiment = { data, fetchedAt: Date.now() };
      return buildSignal(data);
    } catch (err) {
      console.warn('[SentimentAgent] Failed to fetch fear/greed:', (err as Error).message);
      return { action: 'hold', confidence: 50, reasoning: 'Fear/Greed data unavailable' };
    }
  },
};

function buildSignal(data: FearGreedData): AgentSignal {
  const value = parseInt(String(data.value), 10);
  const classification = data.value_classification;

  let score = 50;

  // Contrarian strategy:
  // Extreme Fear (0-24)  → STRONG BUY (capitulation = bottom)
  // Fear (25-49)         → BUY (accumulation zone)
  // Neutral (50)         → HOLD
  // Greed (51-74)        → SELL (take profits)
  // Extreme Greed (75-100) → STRONG SELL (euphoria = top)

  if (value <= 20) {
    score += 40; // Extreme fear = strong contrarian buy
  } else if (value <= 30) {
    score += 25; // Fear = moderate buy
  } else if (value <= 40) {
    score += 10; // Mild fear = slight buy
  } else if (value >= 80) {
    score -= 40; // Extreme greed = strong contrarian sell
  } else if (value >= 70) {
    score -= 25; // Greed = moderate sell
  } else if (value >= 60) {
    score -= 10; // Mild greed = slight sell
  }

  score = Math.max(0, Math.min(100, score));

  let action: AgentSignal['action'] = 'hold';
  if (score >= 55) action = 'buy';
  else if (score <= 45) action = 'sell';

  return {
    action,
    confidence: score,
    reasoning: `F&G: ${value}/100 (${classification}) → ${action.toUpperCase()} (contrarian)`,
    meta: { fearGreedValue: value, classification },
  };
}
