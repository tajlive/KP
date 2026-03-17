/**
 * Volume Analysis for Signal Filtering
 * OBV, volume divergence, and volume confirmation
 */

export interface Candle {
  close: number;
  volume: number;
}

/** SMA helper for volume */
function smaVolume(data: number[], period: number): number {
  if (data.length < period) return data.reduce((a, b) => a + b, 0) / Math.max(1, data.length);
  return data.slice(-period).reduce((a, b) => a + b, 0) / period;
}

/**
 * On-Balance Volume: cumulative volume where positive when close > previous close
 */
export function calculateOBV(candles: { close: number; volume: number }[]): number[] {
  if (candles.length === 0) return [];
  const obv: number[] = [];
  obv[0] = candles[0].volume;
  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1].close;
    const curr = candles[i].close;
    if (curr > prev) obv[i] = obv[i - 1] + candles[i].volume;
    else if (curr < prev) obv[i] = obv[i - 1] - candles[i].volume;
    else obv[i] = obv[i - 1];
  }
  return obv;
}

/**
 * Detect divergence between price and OBV
 * Bullish: OBV rising + price falling (potential reversal up)
 * Bearish: OBV falling + price rising (potential reversal down)
 */
export function detectVolumeDivergence(
  prices: number[],
  obv: number[]
): 'bullish' | 'bearish' | 'neutral' {
  if (prices.length < 5 || obv.length < 5) return 'neutral';
  const lookback = Math.min(5, Math.floor(prices.length / 2));
  const priceStart = prices.slice(-lookback)[0];
  const priceEnd = prices[prices.length - 1];
  const obvStart = obv.slice(-lookback)[0];
  const obvEnd = obv[obv.length - 1];
  const priceUp = priceEnd > priceStart;
  const priceDown = priceEnd < priceStart;
  const obvUp = obvEnd > obvStart;
  const obvDown = obvEnd < obvStart;
  if (priceDown && obvUp) return 'bullish';
  if (priceUp && obvDown) return 'bearish';
  return 'neutral';
}

/**
 * Volume ratio: current volume / SMA(volume, 20)
 */
export function calculateVolumeRatio(currentVolume: number, avgVolume: number): number {
  if (avgVolume === 0) return 0;
  return currentVolume / avgVolume;
}

/** OBV trend over recent candles */
function getOBVTrend(obv: number[], lookback = 5): 'rising' | 'falling' | 'flat' {
  if (obv.length < lookback) return 'flat';
  const recent = obv.slice(-lookback);
  const start = recent[0];
  const end = recent[recent.length - 1];
  const diff = end - start;
  if (diff > 0) return 'rising';
  if (diff < 0) return 'falling';
  return 'flat';
}

/**
 * Check if a signal has volume support (ratio > 1.2)
 */
export function isVolumeConfirmed(
  candles: Candle[],
  lookback = 20
): { confirmed: boolean; ratio: number; obvTrend: string } {
  const VOLUME_CONFIRM_THRESHOLD = 1.2;

  if (candles.length < lookback) {
    return { confirmed: false, ratio: 0, obvTrend: 'unknown' };
  }

  const volumes = candles.map((c) => c.volume);
  const currentVolume = volumes[volumes.length - 1];
  const avgVolume = smaVolume(volumes, lookback);
  const ratio = calculateVolumeRatio(currentVolume, avgVolume);

  const obv = calculateOBV(candles);
  const obvTrend = getOBVTrend(obv, Math.min(lookback, 5));

  return {
    confirmed: ratio >= VOLUME_CONFIRM_THRESHOLD,
    ratio,
    obvTrend,
  };
}
