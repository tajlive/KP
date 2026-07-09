/**
 * Renne matematiske indikatorfunksjoner — ingen sideeffekter.
 */

/** Simple Moving Average */
export function sma(data: number[], period: number): (number | null)[] {
  if (data.length < period) return data.map(() => null);
  return data.map((_, i) => {
    if (i < period - 1) return null;
    return data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
  });
}

/** Relative Strength Index (Wilder's smoothed RSI) */
export function rsi(closes: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length < period + 1) return out;

  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }

  // Første RSI-verdi bruker SMA av gains/losses
  const avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  if (avgLoss === 0) {
    out[period] = 100;
  } else {
    const rs = avgGain / avgLoss;
    out[period] = 100 - 100 / (1 + rs);
  }

  // Wilder's smoothed RSI for resten
  for (let i = period + 1; i < closes.length; i++) {
    const prevAvgGain = out.length > 0
      ? gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period
      : 0;
    const prevAvgLoss = out.length > 0
      ? losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period
      : 0;
    const rs = prevAvgLoss === 0 ? 100 : prevAvgGain / prevAvgLoss;
    out[i] = 100 - 100 / (1 + rs);
  }

  return out;
}

/** Momentum (prosent endring over N perioder) */
export function momentum(data: number[], period = 10): (number | null)[] {
  if (data.length <= period) return data.map(() => null);
  return data.map((_, i) => {
    if (i < period) return null;
    return ((data[i] - data[i - period]) / data[i - period]) * 100;
  });
}
