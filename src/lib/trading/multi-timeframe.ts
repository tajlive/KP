/**
 * Multi-Timeframe Filter — 4h Trend + 1h Signal + 15m Entry Confirmation
 *
 * Combines three timeframes for higher-quality signals:
 * - 4h: Trend direction (SMA20 + ADX)
 * - 1h: Signal generation (from strategy)
 * - 15m: Entry confirmation (momentum + volume)
 *
 * Final score = trendScore(4h) * signalScore(1h) * entryConfirm(15m)
 * Require: trendScore > 0.6 && entryConfirm > 0.8
 */

import type { Candle } from "./strategies/types";
import { sma, adx, rsi } from "./strategies/indicators";

export interface MultiTimeframeResult {
  score: number;
  trendScore: number;
  signalScore: number;
  entryConfirm: number;
  trendDirection: "bullish" | "bearish" | "neutral";
  reason: string;
  passed: boolean;
}

/**
 * Fetch candles for multiple timeframes from Binance
 */
export async function fetchMultiTimeframeCandles(
  pair: string,
  timeframes: string[] = ["4h", "1h", "15m"],
  limit: number = 100,
): Promise<Record<string, Candle[]>> {
  const baseUrl = "https://api.binance.com";
  const symbol = pair.replace("/", "");
  const result: Record<string, Candle[]> = {};

  await Promise.all(
    timeframes.map(async (tf) => {
      try {
        const res = await fetch(
          `${baseUrl}/api/v3/klines?symbol=${symbol}&interval=${tf}&limit=${limit}`,
          { next: { revalidate: 30 } },
        );
        if (!res.ok) throw new Error(`Binance ${tf}: ${res.status}`);
        const data = await res.json();
        result[tf] = data.map((k: number[]) => ({
          time: k[0],
          open: parseFloat(String(k[1])),
          high: parseFloat(String(k[2])),
          low: parseFloat(String(k[3])),
          close: parseFloat(String(k[4])),
          volume: parseFloat(String(k[5])),
        }));
      } catch (err) {
        console.error(`[MTF] Failed to fetch ${tf} for ${symbol}:`, err);
        result[tf] = [];
      }
    }),
  );

  return result;
}

/**
 * Calculate 4h trend score (0-1)
 */
function calcTrendScore(candles4h: Candle[]): { score: number; direction: "bullish" | "bearish" | "neutral" } {
  if (candles4h.length < 20) return { score: 0.5, direction: "neutral" };

  const closes = candles4h.map((c) => c.close);
  const highs = candles4h.map((c) => c.high);
  const lows = candles4h.map((c) => c.low);
  const currentPrice = closes[closes.length - 1];

  const sma20 = sma(closes, 20);
  const adxValue = adx(highs, lows, closes, 14);

  const aboveSMA = currentPrice > sma20;
  const strongTrend = adxValue >= 25;

  if (aboveSMA && strongTrend) {
    return { score: 1.0, direction: "bullish" };
  } else if (aboveSMA && !strongTrend) {
    return { score: 0.7, direction: "bullish" };
  } else if (!aboveSMA && strongTrend) {
    return { score: 0.2, direction: "bearish" };
  } else {
    return { score: 0.4, direction: "bearish" };
  }
}

/**
 * Calculate 15m entry confirmation score (0-1)
 */
function calcEntryConfirm(candles15m: Candle[], signalAction: "buy" | "sell" | "hold"): { score: number; reason: string } {
  if (candles15m.length < 14 || signalAction === "hold") {
    return { score: 1.0, reason: "No entry filter for hold" };
  }

  const closes = candles15m.map((c) => c.close);
  const volumes = candles15m.map((c) => c.volume);
  const currentPrice = closes[closes.length - 1];

  // RSI for timing
  const rsiValue = rsi(closes, 14);

  // Volume confirmation: last 3 candles avg vs previous 10
  const recentVolume = volumes.slice(-3).reduce((a, b) => a + b, 0) / 3;
  const prevVolume = volumes.slice(-13, -3).reduce((a, b) => a + b, 0) / 10;
  const volumeConfirm = recentVolume > prevVolume * 0.8;

  // Momentum: price direction last 3 candles
  const momentum = ((closes[closes.length - 1] - closes[closes.length - 4]) / closes[closes.length - 4]) * 100;

  if (signalAction === "buy") {
    // For buys: want RSI < 65 (not overbought), positive momentum, volume confirmation
    let score = 0.5;
    if (rsiValue < 65) score += 0.2;
    if (rsiValue < 50) score += 0.1; // Extra point for oversold bounce
    if (momentum > 0) score += 0.1;
    if (volumeConfirm) score += 0.1;

    const reasons: string[] = [];
    if (rsiValue >= 65) reasons.push(`RSI ${rsiValue.toFixed(0)} overbought`);
    if (momentum <= 0) reasons.push("negative momentum");
    if (!volumeConfirm) reasons.push("low volume");

    return {
      score: Math.min(1, score),
      reason: reasons.length > 0 ? reasons.join(", ") : "RSI/momentum/volume OK",
    };
  } else {
    // For sells: want RSI > 35 (not oversold), negative momentum
    let score = 0.5;
    if (rsiValue > 35) score += 0.2;
    if (rsiValue > 50) score += 0.1;
    if (momentum < 0) score += 0.1;
    if (volumeConfirm) score += 0.1;

    const reasons: string[] = [];
    if (rsiValue <= 35) reasons.push(`RSI ${rsiValue.toFixed(0)} oversold`);
    if (momentum >= 0) reasons.push("positive momentum");
    if (!volumeConfirm) reasons.push("low volume");

    return {
      score: Math.min(1, score),
      reason: reasons.length > 0 ? reasons.join(", ") : "RSI/momentum/volume OK",
    };
  }
}

/**
 * Main multi-timeframe filter
 */
export interface MTFFilterOptions {
  strategyKey?: string;
  trendThreshold?: number;
  entryThreshold?: number;
}

export function applyMultiTimeframeFilter(
  candles1h: Candle[],
  candles4h: Candle[],
  candles15m: Candle[],
  signalAction: "buy" | "sell" | "hold",
  signalScore: number = 0.8,
  options?: MTFFilterOptions,
): MultiTimeframeResult {
  // Skip MTF for time-based strategies (DCA) and grid (has own regime detection)
  const strategyKey = options?.strategyKey ?? "";
  const skipMtf = strategyKey === "dca" || strategyKey === "grid";
  if (skipMtf) {
    return {
      score: 1.0,
      trendScore: 1.0,
      signalScore: 1.0,
      entryConfirm: 1.0,
      trendDirection: "neutral",
      reason: "MTF skipped for time-based/grid strategy",
      passed: true,
    };
  }

  const trend = calcTrendScore(candles4h);
  const entry = calcEntryConfirm(candles15m, signalAction);

  // Weighted combination: trend matters most
  const score = trend.score * 0.5 + signalScore * 0.3 + entry.score * 0.2;

  // Gate requirements — lowered threshold for better signal throughput
  const trendThreshold = options?.trendThreshold ?? 0.5;
  const entryThreshold = options?.entryThreshold ?? 0.7;
  const passed = signalAction === "hold" || (trend.score > trendThreshold && entry.score > entryThreshold);

  return {
    score: Math.round(score * 100) / 100,
    trendScore: Math.round(trend.score * 100) / 100,
    signalScore: Math.round(signalScore * 100) / 100,
    entryConfirm: Math.round(entry.score * 100) / 100,
    trendDirection: trend.direction,
    reason: `4h:${trend.direction}(${trend.score.toFixed(1)}) 15m:${entry.reason}(${entry.score.toFixed(1)})`,
    passed,
  };
}
