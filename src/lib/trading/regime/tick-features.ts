/**
 * Tick Features — Extract regime features from candle data for the tick engine.
 *
 * Converts Candle[] → RegimeFeatures using the same indicator functions
 * as the V2 strategy engine (strategies/indicators.ts).
 */

import type { Candle } from "../strategies/types";
import type { RegimeFeatures } from "./regime-classifier";
import { rsi, atr, ema, sma, adx, bollingerBands } from "../strategies/indicators";

export function extractFeaturesFromCandles(candles: Candle[]): RegimeFeatures {
  const len = candles.length;
  if (len < 30) {
    // Not enough data — return neutral features
    return getNeutralFeatures(candles);
  }

  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const volumes = candles.map((c) => c.volume);
  const currentPrice = closes[len - 1];

  // EMAs
  const ema20Series = ema(closes, 20);
  const ema50Series = ema(closes, 50);
  const ema20 = ema20Series[ema20Series.length - 1];
  const ema50 = ema50Series[ema50Series.length - 1];

  // ATR & volatility
  const atr14 = atr(highs, lows, closes, 14);
  const atrPercent = (atr14 / currentPrice) * 100;

  // ADX & directional indicators
  const adx14 = adx(highs, lows, closes, 14);

  // Approximate DI+ / DI- from EMA relationship
  // (full DI calculation requires Wilder's smoothing; we approximate)
  const ema20Slope = ema20 - ema20Series[Math.max(0, ema20Series.length - 5)];
  const diPlus = ema20 > ema50 && ema20Slope > 0 ? 1 : 0;
  const diMinus = ema20 < ema50 && ema20Slope < 0 ? 1 : 0;

  // Bollinger Bands
  const bb = bollingerBands(closes, 20, 2);
  const bbWidth = bb.bandwidth / 100; // convert % → decimal

  // Historical volatility (annualized from hourly returns)
  const returns = closes.slice(1).map((c, i) => Math.log(c / closes[i]));
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) /
    returns.length;
  const historicalVol = Math.sqrt(variance) * Math.sqrt(365 * 24);

  // Volume trend
  const recentVol =
    volumes.slice(-5).reduce((a, b) => a + b, 0) / 5 || 1;
  const prevVol =
    volumes.slice(-10, -5).reduce((a, b) => a + b, 0) / 5 || 1;
  const volumeTrend = recentVol / prevVol;

  // RSI
  const rsi14 = rsi(closes, 14);

  // Momentum (10-period price change)
  const momentum =
    (closes[len - 1] - closes[Math.max(0, len - 11)]) /
    closes[Math.max(0, len - 11)];

  return {
    adx: adx14,
    diPlus,
    diMinus,
    ema20Slope,
    ema50Slope: ema50 - ema50Series[Math.max(0, ema50Series.length - 5)],
    atr14,
    atrPercent,
    bbWidth,
    historicalVol,
    volumeTrend,
    rsi: rsi14,
    momentum,
  };
}

function getNeutralFeatures(candles: Candle[]): RegimeFeatures {
  const currentPrice = candles[candles.length - 1]?.close || 0;
  return {
    adx: 15,
    diPlus: 0,
    diMinus: 0,
    ema20Slope: 0,
    ema50Slope: 0,
    atr14: currentPrice * 0.02,
    atrPercent: 2,
    bbWidth: 0.05,
    historicalVol: 0.3,
    volumeTrend: 1,
    rsi: 50,
    momentum: 0,
  };
}
