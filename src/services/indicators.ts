/**
 * Technical Indicators for Regime Detection
 * EMA, ADX, RSI calculations for market regime analysis
 */

// ============================================================================
// EMA (Exponential Moving Average)
// ============================================================================

export interface EMAResult {
  ema21: number;
  ema55: number;
  ema200: number;
  trend: 'above_21' | 'between_21_55' | 'between_55_200' | 'below_200';
}

/**
 * Calculate EMA for a given period
 */
export function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length < period) {
    return new Array(prices.length).fill(NaN);
  }

  const multiplier = 2 / (period + 1);
  const ema: number[] = [];
  
  // Start with SMA for first value
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  ema[period - 1] = sum / period;

  // Calculate EMA for remaining values
  for (let i = period; i < prices.length; i++) {
    ema[i] = (prices[i] - ema[i - 1]) * multiplier + ema[i - 1];
  }

  // Fill NaN for first period-1 values
  for (let i = 0; i < period - 1; i++) {
    ema[i] = NaN;
  }

  return ema;
}

/**
 * Get EMA values for regime detection (21, 55, 200)
 */
export function getEMAValues(closes: number[]): EMAResult | null {
  if (closes.length < 200) {
    return null;
  }

  const ema21 = calculateEMA(closes, 21);
  const ema55 = calculateEMA(closes, 55);
  const ema200 = calculateEMA(closes, 200);

  const lastIndex = closes.length - 1;
  const currentPrice = closes[lastIndex];
  const currentEMA21 = ema21[lastIndex];
  const currentEMA55 = ema55[lastIndex];
  const currentEMA200 = ema200[lastIndex];

  if (isNaN(currentEMA21) || isNaN(currentEMA55) || isNaN(currentEMA200)) {
    return null;
  }

  let trend: EMAResult['trend'];
  if (currentPrice > currentEMA21) {
    trend = 'above_21';
  } else if (currentPrice > currentEMA55) {
    trend = 'between_21_55';
  } else if (currentPrice > currentEMA200) {
    trend = 'between_55_200';
  } else {
    trend = 'below_200';
  }

  return {
    ema21: currentEMA21,
    ema55: currentEMA55,
    ema200: currentEMA200,
    trend,
  };
}

// ============================================================================
// RSI (Relative Strength Index)
// ============================================================================

export interface RSIResult {
  value: number;
  condition: 'oversold' | 'neutral' | 'overbought';
}

/**
 * Calculate RSI for a given period (default 14)
 */
export function calculateRSI(prices: number[], period: number = 14): number[] {
  if (prices.length < period + 1) {
    return new Array(prices.length).fill(NaN);
  }

  const rsi: number[] = new Array(prices.length).fill(NaN);
  let gains = 0;
  let losses = 0;

  // Calculate initial average gain/loss
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Calculate RSI
  for (let i = period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      rsi[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      rsi[i] = 100 - (100 / (1 + rs));
    }
  }

  return rsi;
}

/**
 * Get current RSI with condition
 */
export function getRSIValue(prices: number[], period: number = 14): RSIResult | null {
  const rsi = calculateRSI(prices, period);
  const currentRSI = rsi[rsi.length - 1];

  if (isNaN(currentRSI)) {
    return null;
  }

  let condition: RSIResult['condition'];
  if (currentRSI < 30) {
    condition = 'oversold';
  } else if (currentRSI > 70) {
    condition = 'overbought';
  } else {
    condition = 'neutral';
  }

  return { value: currentRSI, condition };
}

// ============================================================================
// ADX (Average Directional Index)
// ============================================================================

export interface ADXResult {
  adx: number;
  plusDI: number;
  minusDI: number;
  trendStrength: 'weak' | 'moderate' | 'strong' | 'very_strong';
  trendDirection: 'up' | 'down' | 'neutral';
}

/**
 * Calculate True Range
 */
function calculateTrueRange(
  highs: number[],
  lows: number[],
  closes: number[]
): number[] {
  const tr: number[] = [];
  tr[0] = highs[0] - lows[0];

  for (let i = 1; i < highs.length; i++) {
    const tr1 = highs[i] - lows[i];
    const tr2 = Math.abs(highs[i] - closes[i - 1]);
    const tr3 = Math.abs(lows[i] - closes[i - 1]);
    tr[i] = Math.max(tr1, tr2, tr3);
  }

  return tr;
}

/**
 * Calculate +DM and -DM
 */
function calculateDM(
  highs: number[],
  lows: number[]
): { plusDM: number[]; minusDM: number[] } {
  const plusDM: number[] = [0];
  const minusDM: number[] = [0];

  for (let i = 1; i < highs.length; i++) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];

    if (upMove > downMove && upMove > 0) {
      plusDM[i] = upMove;
    } else {
      plusDM[i] = 0;
    }

    if (downMove > upMove && downMove > 0) {
      minusDM[i] = downMove;
    } else {
      minusDM[i] = 0;
    }
  }

  return { plusDM, minusDM };
}

/**
 * Calculate ADX (14-period default)
 */
export function calculateADX(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14
): ADXResult | null {
  if (highs.length < period * 2 || lows.length < period * 2 || closes.length < period * 2) {
    return null;
  }

  const tr = calculateTrueRange(highs, lows, closes);
  const { plusDM, minusDM } = calculateDM(highs, lows);

  // Smooth TR, +DM, -DM
  const atr = calculateEMA(tr, period);
  const smoothPlusDM = calculateEMA(plusDM, period);
  const smoothMinusDM = calculateEMA(minusDM, period);

  // Calculate +DI and -DI
  const plusDI: number[] = [];
  const minusDI: number[] = [];
  const dx: number[] = [];

  for (let i = period - 1; i < atr.length; i++) {
    if (isNaN(atr[i]) || atr[i] === 0) {
      plusDI[i] = NaN;
      minusDI[i] = NaN;
      dx[i] = NaN;
      continue;
    }

    plusDI[i] = (smoothPlusDM[i] / atr[i]) * 100;
    minusDI[i] = (smoothMinusDM[i] / atr[i]) * 100;

    const sum = plusDI[i] + minusDI[i];
    if (sum === 0) {
      dx[i] = 0;
    } else {
      dx[i] = (Math.abs(plusDI[i] - minusDI[i]) / sum) * 100;
    }
  }

  // Calculate ADX (smoothed DX)
  const adx = calculateEMA(dx.filter(v => !isNaN(v)), period);
  const currentADX = adx[adx.length - 1];
  const currentPlusDI = plusDI[plusDI.length - 1];
  const currentMinusDI = minusDI[minusDI.length - 1];

  if (isNaN(currentADX)) {
    return null;
  }

  // Determine trend strength
  let trendStrength: ADXResult['trendStrength'];
  if (currentADX < 20) {
    trendStrength = 'weak';
  } else if (currentADX < 40) {
    trendStrength = 'moderate';
  } else if (currentADX < 60) {
    trendStrength = 'strong';
  } else {
    trendStrength = 'very_strong';
  }

  // Determine trend direction
  let trendDirection: ADXResult['trendDirection'];
  if (currentPlusDI > currentMinusDI + 5) {
    trendDirection = 'up';
  } else if (currentMinusDI > currentPlusDI + 5) {
    trendDirection = 'down';
  } else {
    trendDirection = 'neutral';
  }

  return {
    adx: currentADX,
    plusDI: currentPlusDI,
    minusDI: currentMinusDI,
    trendStrength,
    trendDirection,
  };
}

// ============================================================================
// OHLCV Types and Helpers
// ============================================================================

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Extract arrays from OHLCV data
 */
export function extractArrays(ohlcv: OHLCV[]): {
  opens: number[];
  highs: number[];
  lows: number[];
  closes: number[];
  volumes: number[];
} {
  return {
    opens: ohlcv.map(c => c.open),
    highs: ohlcv.map(c => c.high),
    lows: ohlcv.map(c => c.low),
    closes: ohlcv.map(c => c.close),
    volumes: ohlcv.map(c => c.volume),
  };
}

/**
 * Check if we have enough data for regime detection
 */
export function hasEnoughData(ohlcv: OHLCV[], minCandles: number = 200): boolean {
  return ohlcv.length >= minCandles;
}
