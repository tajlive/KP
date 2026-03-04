/**
 * Technical Indicators for Trading
 * Ported from backtest-worker-v2.js and LiveStrategyView.tsx
 */

export function calculateSMA(
  prices: number[],
  period: number,
): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += prices[j];
    result.push(sum / period);
  }
  return result;
}

export function calculateRSI(prices: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = [];
  if (prices.length < period + 1) return prices.map(() => null);

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = 0; i < period; i++) result.push(null);
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push(100 - 100 / (1 + rs));

  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const r = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push(100 - 100 / (1 + r));
  }
  return result;
}

export function calculateEMA(prices: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result = [prices[0]];
  for (let i = 1; i < prices.length; i++) {
    result.push(prices[i] * k + result[i - 1] * (1 - k));
  }
  return result;
}

export function calculateMACD(prices: number[]): {
  macd: number[];
  signal: number[];
  histogram: number[];
} {
  const fast = calculateEMA(prices, 12);
  const slow = calculateEMA(prices, 26);
  const macdLine = fast.map((f, i) => f - slow[i]);
  const signalLine = calculateEMA(macdLine, 9);
  const histogram = macdLine.map((m, i) => m - signalLine[i]);
  return { macd: macdLine, signal: signalLine, histogram };
}

export function calculateBollingerBands(
  prices: number[],
  period = 20,
  mult = 2,
) {
  const sma = calculateSMA(prices, period);
  return sma.map((mid, i) => {
    if (mid === null) return { middle: null, upper: null, lower: null };
    let sumSq = 0;
    for (let j = i - period + 1; j <= i; j++) sumSq += (prices[j] - mid) ** 2;
    const std = Math.sqrt(sumSq / period);
    return { middle: mid, upper: mid + std * mult, lower: mid - std * mult };
  });
}
