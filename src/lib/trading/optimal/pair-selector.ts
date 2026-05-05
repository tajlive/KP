/**
 * Pair Selector — Momentum-based asset selection
 *
 * Selects the best trading pair from a strategy's preferred pairs
 * based on recent momentum. This reduces correlation between bots
 * by assigning different assets to different strategies.
 */

import type { Candle } from "../strategies/types";

export interface PairSelection {
  pair: string;
  momentum24h: number;
  momentum7d: number;
  score: number;
  reason: string;
}

/**
 * Calculate momentum score for a pair based on candles.
 */
function calculateMomentum(candles: Candle[]): { momentum24h: number; momentum7d: number } {
  if (candles.length < 168) { // 7 days of 1h candles
    return { momentum24h: 0, momentum7d: 0 };
  }
  const current = candles[candles.length - 1].close;
  const price24h = candles[candles.length - 24].close;
  const price7d = candles[candles.length - 168].close;

  return {
    momentum24h: ((current - price24h) / price24h) * 100,
    momentum7d: ((current - price7d) / price7d) * 100,
  };
}

/**
 * Select the best pair from preferred pairs based on momentum.
 *
 * Rules:
 * 1. Prefer pairs with positive 24h momentum
 * 2. Rank by combined 24h + 7d momentum score
 * 3. If all pairs have negative momentum, select the least negative (or BTC as safe haven)
 */
export function selectBestPair(
  preferredPairs: string[],
  candlesMap: Map<string, Candle[]>,
  currentPair?: string,
): PairSelection {
  const scores: PairSelection[] = [];

  for (const pair of preferredPairs) {
    const candles = candlesMap.get(pair);
    if (!candles || candles.length < 24) {
      scores.push({
        pair,
        momentum24h: 0,
        momentum7d: 0,
        score: -999, // No data = last resort
        reason: "No candle data",
      });
      continue;
    }

    const { momentum24h, momentum7d } = calculateMomentum(candles);
    // Weight recent momentum higher
    const score = momentum24h * 0.7 + momentum7d * 0.3;

    scores.push({
      pair,
      momentum24h: Math.round(momentum24h * 100) / 100,
      momentum7d: Math.round(momentum7d * 100) / 100,
      score: Math.round(score * 100) / 100,
      reason: `24h: ${momentum24h.toFixed(1)}%, 7d: ${momentum7d.toFixed(1)}%`,
    });
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  const best = scores[0];

  // Avoid frequent pair switching (hold current pair if it's in top 2 and score difference is small)
  if (currentPair && currentPair !== best.pair) {
    const currentIdx = scores.findIndex((s) => s.pair === currentPair);
    if (currentIdx >= 0 && currentIdx <= 1 && Math.abs(best.score - scores[currentIdx].score) < 2) {
      return scores[currentIdx]; // Stay with current pair
    }
  }

  return best;
}
