/**
 * Multi-Timeframe Analysis for Signal Engine (Deno)
 * Alignment check: daily trend, 4h RSI direction, 1h entry signal
 */

import { rsi } from './strategies.ts';

export type Timeframe = '1h' | '4h' | '1d' | '1w';

const BINANCE_INTERVAL: Record<Timeframe, string> = {
  '1h': '1h',
  '4h': '4h',
  '1d': '1d',
  '1w': '1w',
};

export interface MTFAlignmentResult {
  score: number;       // -3 to +3
  weakAlignment: boolean;
  dailyTrend: 'up' | 'down' | 'sideways';
  rsi4h: number;
  h1Trend: 'up' | 'down' | 'sideways';
}

/**
 * Fetch klines and return close prices
 */
async function fetchTimeframeCloses(symbol: string, tf: Timeframe, limit = 200): Promise<number[]> {
  const interval = BINANCE_INTERVAL[tf];
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance klines HTTP ${res.status} for ${symbol}`);
  const klines = await res.json() as number[][];
  return klines.map((k) => parseFloat(String(k[4])));
}

/**
 * Analyze trend on a specific timeframe
 */
function analyzeTimeframe(prices: number[]): { trend: 'up' | 'down' | 'sideways'; strength: number } {
  if (prices.length < 20) return { trend: 'sideways', strength: 0 };

  const sma20 = prices.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const sma50 = prices.length >= 50 ? prices.slice(-50).reduce((a, b) => a + b, 0) / 50 : sma20;
  const currentPrice = prices[prices.length - 1];
  const priceVsSMA20 = (currentPrice - sma20) / sma20;
  const priceVsSMA50 = (currentPrice - sma50) / sma50;

  let trend: 'up' | 'down' | 'sideways';
  let strength = 0;

  if (priceVsSMA20 > 0.02 && priceVsSMA50 > 0.01) {
    trend = 'up';
    strength = Math.min(100, (priceVsSMA20 + priceVsSMA50) * 1000);
  } else if (priceVsSMA20 < -0.02 && priceVsSMA50 < -0.01) {
    trend = 'down';
    strength = Math.min(100, Math.abs(priceVsSMA20 + priceVsSMA50) * 1000);
  } else {
    trend = 'sideways';
    strength = 50 - Math.abs(priceVsSMA20) * 1000;
  }

  return { trend, strength: Math.max(0, Math.min(100, strength)) };
}

/**
 * Map trend to alignment score: up=+1, down=-1, sideways=0
 */
function trendToScore(trend: 'up' | 'down' | 'sideways'): number {
  if (trend === 'up') return 1;
  if (trend === 'down') return -1;
  return 0;
}

/**
 * Map RSI to momentum score: oversold (<40)=+1, overbought (>60)=-1, else 0
 */
function rsiToScore(rsiVal: number): number {
  if (rsiVal < 40) return 1;
  if (rsiVal > 60) return -1;
  return 0;
}

/**
 * Compute MTF alignment score for signal filtering.
 * - Daily trend (+1/-1/0)
 * - 4h RSI direction (+1 oversold, -1 overbought, 0 neutral)
 * - 1h entry trend (+1/-1/0)
 * BUY if score >= 2, SELL if score <= -2
 */
export async function getMTFAlignmentScore(symbol: string): Promise<MTFAlignmentResult | null> {
  try {
    const [closes1d, closes4h, closes1h] = await Promise.all([
      fetchTimeframeCloses(symbol, '1d'),
      fetchTimeframeCloses(symbol, '4h'),
      fetchTimeframeCloses(symbol, '1h'),
    ]);

    if (closes1d.length < 50 || closes4h.length < 20 || closes1h.length < 20) {
      return null;
    }

    const daily = analyzeTimeframe(closes1d);
    const h1 = analyzeTimeframe(closes1h);
    const rsiArr = rsi(closes4h);
    const rsi4h = rsiArr[closes4h.length - 1];

    const dailyScore = trendToScore(daily.trend);
    const rsiScore = Number.isNaN(rsi4h) ? 0 : rsiToScore(rsi4h);
    const h1Score = trendToScore(h1.trend);

    const score = dailyScore + rsiScore + h1Score;
    // Weak = barely passed threshold (2 or -2), strong = 3 or -3
    const weakAlignment = score === 2 || score === -2;

    return {
      score,
      weakAlignment,
      dailyTrend: daily.trend,
      rsi4h: Number.isNaN(rsi4h) ? 50 : rsi4h,
      h1Trend: h1.trend,
    };
  } catch {
    return null;
  }
}
