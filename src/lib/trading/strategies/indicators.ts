/**
 * Technical Indicators — Single source of truth.
 * Used by strategies AND can be overlaid on charts.
 */

/**
 * Simple Moving Average
 */
export function sma(data: number[], period: number): number {
  const slice = data.slice(-period);
  return slice.reduce((sum, v) => sum + v, 0) / slice.length;
}

/**
 * Calculate SMA series (for chart overlay)
 */
export function smaSeries(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }
  return result;
}

/**
 * Exponential Moving Average
 */
export function ema(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(data[i] * k + result[i - 1] * (1 - k));
  }
  return result;
}

/**
 * Relative Strength Index
 */
export function rsi(closes: number[], period: number = 14): number {
  const changes = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }
  const gains = changes.slice(-period).filter((c) => c > 0);
  const losses = changes
    .slice(-period)
    .filter((c) => c < 0)
    .map(Math.abs);

  const avgGain =
    gains.length > 0 ? gains.reduce((s, v) => s + v, 0) / period : 0;
  const avgLoss =
    losses.length > 0 ? losses.reduce((s, v) => s + v, 0) / period : 0;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * RSI series (for chart overlay)
 */
export function rsiSeries(
  closes: number[],
  period: number = 14,
): (number | null)[] {
  const result: (number | null)[] = [];
  let gains = 0;
  let losses = 0;

  for (let i = 0; i < closes.length; i++) {
    if (i === 0) {
      result.push(null);
      continue;
    }
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    if (i < period) {
      gains += gain;
      losses += loss;
      result.push(null);
    } else if (i === period) {
      gains = (gains + gain) / period;
      losses = (losses + loss) / period;
      result.push(losses === 0 ? 100 : 100 - 100 / (1 + gains / losses));
    } else {
      gains = (gains * (period - 1) + gain) / period;
      losses = (losses * (period - 1) + loss) / period;
      result.push(losses === 0 ? 100 : 100 - 100 / (1 + gains / losses));
    }
  }
  return result;
}

/**
 * MACD (Moving Average Convergence Divergence)
 */
export function macd(
  closes: number[],
  fast: number = 12,
  slow: number = 26,
  signalPeriod: number = 9,
) {
  const fastEMA = ema(closes, fast);
  const slowEMA = ema(closes, slow);
  const macdLine = fastEMA.map((f, i) => f - slowEMA[i]);
  const signalLine = ema(macdLine, signalPeriod);
  const last = macdLine.length - 1;
  return {
    macd: macdLine[last],
    signal: signalLine[last],
    histogram: macdLine[last] - signalLine[last],
    macdSeries: macdLine,
    signalSeries: signalLine,
    histogramSeries: macdLine.map((m, i) => m - signalLine[i]),
  };
}

/** Compute True Range for a single bar (used by ATR and ADX).
 *  Eliminates 7-line tr1/tr2/tr3 duplication across indicator functions. */
function computeTrueRange(
  high: number,
  low: number,
  prevClose: number,
): number {
  const tr1 = high - low;
  const tr2 = Math.abs(high - prevClose);
  const tr3 = Math.abs(low - prevClose);
  return Math.max(tr1, tr2, tr3);
}

/**
 * Average True Range — volatility measure
 */

export function atr(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14,
): number {
  const trs: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    trs.push(computeTrueRange(highs[i], lows[i], closes[i - 1]));
  }

  if (trs.length < period) {
    return trs.length > 0 ? trs.reduce((a, b) => a + b, 0) / trs.length : 0;
  }

  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
  }
  return atr;
}

/**
 * Average Directional Index (ADX) — trend strength
 * Returns 0-100, where >25 = trending, <20 = ranging
 */
export function adx(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14,
): number {
  if (highs.length < period + 1) return 0;

  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const trs: number[] = [];

  for (let i = 1; i < highs.length; i++) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];

    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);

    trs.push(computeTrueRange(highs[i], lows[i], closes[i - 1]));
  }

  // Smoothed averages
  let smoothedTR = trs.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothedPlusDM = plusDM.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothedMinusDM = minusDM.slice(0, period).reduce((a, b) => a + b, 0);

  let dxSum = 0;
  for (let i = 0; i < period; i++) {
    const plusDI = (smoothedPlusDM / smoothedTR) * 100;
    const minusDI = (smoothedMinusDM / smoothedTR) * 100;
    dxSum += (Math.abs(plusDI - minusDI) / (plusDI + minusDI)) * 100;
  }

  let adx = dxSum / period;

  for (let i = period; i < trs.length; i++) {
    smoothedTR = smoothedTR - smoothedTR / period + trs[i];
    smoothedPlusDM = smoothedPlusDM - smoothedPlusDM / period + plusDM[i];
    smoothedMinusDM = smoothedMinusDM - smoothedMinusDM / period + minusDM[i];

    const plusDI = (smoothedPlusDM / smoothedTR) * 100;
    const minusDI = (smoothedMinusDM / smoothedTR) * 100;
    const dx = (Math.abs(plusDI - minusDI) / (plusDI + minusDI)) * 100;
    adx = (adx * (period - 1) + dx) / period;
  }

  return isNaN(adx) ? 0 : adx;
}

/**
 * Bollinger Bands
 */
export function bollingerBands(
  closes: number[],
  period: number = 20,
  stdDev: number = 2,
): { upper: number; middle: number; lower: number; bandwidth: number } {
  const slice = closes.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / slice.length;

  const variance =
    slice.reduce((sum, v) => sum + Math.pow(v - middle, 2), 0) / slice.length;
  const std = Math.sqrt(variance);

  const upper = middle + stdDev * std;
  const lower = middle - stdDev * std;
  return {
    upper,
    middle,
    lower,
    bandwidth: ((upper - lower) / middle) * 100,
  };
}

/**
 * Market Regime Detection
 * Identifies whether market is trending, ranging, or volatile
 */
export function detectMarketRegime(
  highs: number[],
  lows: number[],
  closes: number[],
): "trending_up" | "trending_down" | "ranging" | "volatile" | "mixed" {
  const adxValue = adx(highs, lows, closes, 14);
  const atrValue = atr(highs, lows, closes, 14);
  const currentPrice = closes[closes.length - 1];
  const volatilityPct = (atrValue / currentPrice) * 100;

  // SMA direction
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const trendingUp = sma20 > sma50;

  if (adxValue > 25 && volatilityPct < 5) {
    return trendingUp ? "trending_up" : "trending_down";
  }
  if (adxValue < 20 && volatilityPct < 3) {
    return "ranging";
  }
  if (volatilityPct > 8) {
    return "volatile";
  }
  return "mixed";
}

// ══════════════════════════════════════════════════════════════════════
// E5 Regimefilter — BB Width wrapper (2026-08-12)
// ADX og Bollinger Bands finnes allerede i denne filen.
// ══════════════════════════════════════════════════════════════════════

/** Bollinger Bands Width i % av midten — bekvemmelighets-wrapper */
export function bbw(
  closes: number[],
  period: number = 20,
  stddev: number = 2,
): number {
  if (closes.length < period) return 0;
  const slice = closes.slice(-period);
  const mid = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((s, v) => s + (v - mid) ** 2, 0) / period;
  const sigma = Math.sqrt(variance);
  const upper = mid + stddev * sigma;
  const lower = mid - stddev * sigma;
  return ((upper - lower) / mid) * 100;
}
