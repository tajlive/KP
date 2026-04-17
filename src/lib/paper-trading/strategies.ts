/**
 * Trading Strategies for Paper Trading
 */

export interface MarketData {
  date: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type StrategyType = 'ma_crossover' | 'rsi' | 'macd' | 'bollinger' | 'breakout' | 'ai_ml';

export interface Strategy {
  id: StrategyType;
  name: string;
  nameEn: string;
  description: string;
  complexity: 'simple' | 'medium' | 'advanced';
  parameters: StrategyParameter[];
}

export interface StrategyParameter {
  name: string;
  label: string;
  type: 'number' | 'select';
  default: number | string;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
}

export interface StrategySignal {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reason: string;
  metadata?: Record<string, number>;
}

// Available strategies
export const STRATEGIES: Record<StrategyType, Strategy> = {
  ma_crossover: {
    id: 'ma_crossover',
    name: 'Moving Average Crossover',
    nameEn: 'MA Crossover',
    description: 'Klassisk strategi som kjøper når kortsiktig MA krysser over langsiktig MA (golden cross), og selger ved death cross.',
    complexity: 'simple',
    parameters: [
      { name: 'shortPeriod', label: 'Kort Periode', type: 'number', default: 10, min: 5, max: 50, step: 1 },
      { name: 'longPeriod', label: 'Lang Periode', type: 'number', default: 30, min: 20, max: 200, step: 5 }
    ]
  },
  rsi: {
    id: 'rsi',
    name: 'RSI Oversold/Overbought',
    nameEn: 'RSI Strategy',
    description: 'Kjøper når RSI indikerer oversolgt (under 30), selger når overkjøpt (over 70).',
    complexity: 'simple',
    parameters: [
      { name: 'period', label: 'RSI Periode', type: 'number', default: 14, min: 7, max: 28, step: 1 },
      { name: 'oversold', label: 'Oversolgt Nivå', type: 'number', default: 30, min: 10, max: 40, step: 5 },
      { name: 'overbought', label: 'Overkjøpt Nivå', type: 'number', default: 70, min: 60, max: 90, step: 5 }
    ]
  },
  macd: {
    id: 'macd',
    name: 'MACD Momentum',
    nameEn: 'MACD Strategy',
    description: 'Bruker MACD (Moving Average Convergence Divergence) for å identifisere momentum-skifter.',
    complexity: 'medium',
    parameters: [
      { name: 'fastPeriod', label: 'Rask EMA', type: 'number', default: 12, min: 8, max: 20, step: 1 },
      { name: 'slowPeriod', label: 'Treg EMA', type: 'number', default: 26, min: 20, max: 50, step: 1 },
      { name: 'signalPeriod', label: 'Signal Linje', type: 'number', default: 9, min: 5, max: 15, step: 1 }
    ]
  },
  bollinger: {
    id: 'bollinger',
    name: 'Bollinger Bands',
    nameEn: 'Bollinger Bands',
    description: 'Kjøper når pris treffer nedre bånd, selger ved øvre bånd. God for range-bundet markeder.',
    complexity: 'medium',
    parameters: [
      { name: 'period', label: 'SMA Periode', type: 'number', default: 20, min: 10, max: 50, step: 5 },
      { name: 'stdDev', label: 'Standard Avvik', type: 'number', default: 2, min: 1, max: 3, step: 0.5 }
    ]
  },
  breakout: {
    id: 'breakout',
    name: 'Price Breakout',
    nameEn: 'Breakout Strategy',
    description: 'Kjøper ved breakout over motstand, selger ved breakdown under støtte.',
    complexity: 'advanced',
    parameters: [
      { name: 'lookbackPeriod', label: 'Lookback Periode', type: 'number', default: 20, min: 10, max: 50, step: 5 },
      { name: 'breakoutThreshold', label: 'Breakout %', type: 'number', default: 2, min: 0.5, max: 5, step: 0.5 }
    ]
  },
  ai_ml: {
    id: 'ai_ml',
    name: 'AI/ML Prediksjon',
    nameEn: 'AI Prediction',
    description: 'Klarpakkes proprietære AI-modell som analyserer mønstre og predikerer prisbevegelser.',
    complexity: 'advanced',
    parameters: [
      { name: 'confidenceThreshold', label: 'Konfidens Terskel', type: 'number', default: 0.7, min: 0.5, max: 0.95, step: 0.05 },
      { name: 'predictionHorizon', label: 'Prediksjonshorisont', type: 'select', default: '24h', options: [
        { value: '1h', label: '1 time' },
        { value: '4h', label: '4 timer' },
        { value: '24h', label: '24 timer' },
        { value: '7d', label: '7 dager' }
      ]}
    ]
  }
};

// Technical indicator calculations
export function calculateSMA(data: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(NaN);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }
  return sma;
}

export function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      ema.push(data[i]);
    } else {
      ema.push((data[i] - ema[i - 1]) * multiplier + ema[i - 1]);
    }
  }
  return ema;
}

export function calculateRSI(data: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  let gains = 0;
  let losses = 0;
  
  // Calculate initial average gain/loss
  for (let i = 1; i <= period; i++) {
    const change = data[i] - data[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      rsi.push(NaN);
      continue;
    }
    
    if (i > period) {
      const change = data[i] - data[i - 1];
      avgGain = (avgGain * (period - 1) + (change > 0 ? change : 0)) / period;
      avgLoss = (avgLoss * (period - 1) + (change < 0 ? -change : 0)) / period;
    }
    
    const rs = avgGain / avgLoss;
    rsi.push(100 - (100 / (1 + rs)));
  }
  
  return rsi;
}

export function calculateMACD(
  data: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macd: number[]; signal: number[]; histogram: number[] } {
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);
  
  const macd: number[] = fastEMA.map((fast, i) => fast - slowEMA[i]);
  const signal = calculateEMA(macd.filter(v => !isNaN(v)), signalPeriod);
  
  // Pad signal array to match MACD length
  const paddedSignal = Array(macd.length - signal.length).fill(NaN).concat(signal);
  
  const histogram = macd.map((m, i) => m - paddedSignal[i]);
  
  return { macd, signal: paddedSignal, histogram };
}

export function calculateBollingerBands(
  data: number[],
  period: number = 20,
  stdDev: number = 2
): { middle: number[]; upper: number[]; lower: number[] } {
  const middle = calculateSMA(data, period);
  const upper: number[] = [];
  const lower: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      const mean = slice.reduce((a, b) => a + b, 0) / period;
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
      const standardDev = Math.sqrt(variance);
      
      upper.push(middle[i] + standardDev * stdDev);
      lower.push(middle[i] - standardDev * stdDev);
    }
  }
  
  return { middle, upper, lower };
}

/**
 * Generate trading signal based on strategy
 */
export function generateSignal(
  strategyId: StrategyType,
  data: MarketData[],
  currentIndex: number,
  params: Record<string, number | string>
): StrategySignal {
  const prices = data.map(d => d.close);
  const current = data[currentIndex];
  const previous = data[currentIndex - 1];
  
  switch (strategyId) {
    case 'ma_crossover': {
      const shortPeriod = Number(params.shortPeriod || 10);
      const longPeriod = Number(params.longPeriod || 30);
      
      if (currentIndex < longPeriod) {
        return { action: 'HOLD', confidence: 0, reason: 'Ikke nok data' };
      }
      
      const shortMA = calculateSMA(prices, shortPeriod);
      const longMA = calculateSMA(prices, longPeriod);
      
      const shortCurrent = shortMA[currentIndex];
      const shortPrev = shortMA[currentIndex - 1];
      const longCurrent = longMA[currentIndex];
      const longPrev = longMA[currentIndex - 1];
      
      if (shortPrev <= longPrev && shortCurrent > longCurrent) {
        return { 
          action: 'BUY', 
          confidence: 0.75, 
          reason: `Golden cross: ${shortPeriod}-dag MA krysset over ${longPeriod}-dag MA`,
          metadata: { shortMA: shortCurrent, longMA: longCurrent }
        };
      }
      
      if (shortPrev >= longPrev && shortCurrent < longCurrent) {
        return { 
          action: 'SELL', 
          confidence: 0.75, 
          reason: `Death cross: ${shortPeriod}-dag MA krysset under ${longPeriod}-dag MA`,
          metadata: { shortMA: shortCurrent, longMA: longCurrent }
        };
      }
      
      return { action: 'HOLD', confidence: 0.3, reason: 'Ingen MA crossover signal' };
    }
    
    case 'rsi': {
      const period = Number(params.period || 14);
      const oversold = Number(params.oversold || 30);
      const overbought = Number(params.overbought || 70);
      
      if (currentIndex < period) {
        return { action: 'HOLD', confidence: 0, reason: 'Ikke nok data' };
      }
      
      const rsi = calculateRSI(prices, period);
      const currentRSI = rsi[currentIndex];
      const prevRSI = rsi[currentIndex - 1];
      
      if (prevRSI <= oversold && currentRSI > oversold) {
        return { 
          action: 'BUY', 
          confidence: 0.8, 
          reason: `RSI forlot oversolgt nivå (${currentRSI.toFixed(1)})`,
          metadata: { rsi: currentRSI }
        };
      }
      
      if (prevRSI >= overbought && currentRSI < overbought) {
        return { 
          action: 'SELL', 
          confidence: 0.8, 
          reason: `RSI forlot overkjøpt nivå (${currentRSI.toFixed(1)})`,
          metadata: { rsi: currentRSI }
        };
      }
      
      return { action: 'HOLD', confidence: 0.3, reason: `RSI = ${currentRSI.toFixed(1)} (nøytral)` };
    }
    
    case 'macd': {
      const fast = Number(params.fastPeriod || 12);
      const slow = Number(params.slowPeriod || 26);
      const signal = Number(params.signalPeriod || 9);
      
      if (currentIndex < slow) {
        return { action: 'HOLD', confidence: 0, reason: 'Ikke nok data' };
      }
      
      const macd = calculateMACD(prices, fast, slow, signal);
      const histogram = macd.histogram[currentIndex];
      const prevHistogram = macd.histogram[currentIndex - 1];
      
      if (prevHistogram <= 0 && histogram > 0) {
        return { 
          action: 'BUY', 
          confidence: 0.75, 
          reason: 'MACD histogram vendte positivt',
          metadata: { macd: macd.macd[currentIndex], signal: macd.signal[currentIndex] }
        };
      }
      
      if (prevHistogram >= 0 && histogram < 0) {
        return { 
          action: 'SELL', 
          confidence: 0.75, 
          reason: 'MACD histogram vendte negativt',
          metadata: { macd: macd.macd[currentIndex], signal: macd.signal[currentIndex] }
        };
      }
      
      return { action: 'HOLD', confidence: 0.3, reason: 'Ingen MACD signal' };
    }
    
    case 'bollinger': {
      const bbPeriod = Number(params.period || 20);
      const bbStdDev = Number(params.stdDev || 2);
      
      if (currentIndex < bbPeriod) {
        return { action: 'HOLD', confidence: 0, reason: 'Ikke nok data' };
      }
      
      const bb = calculateBollingerBands(prices, bbPeriod, bbStdDev);
      const price = current.close;
      
      if (price <= bb.lower[currentIndex]) {
        return { 
          action: 'BUY', 
          confidence: 0.7, 
          reason: 'Pris treffer nedre Bollinger Band (oversolgt)',
          metadata: { lower: bb.lower[currentIndex], middle: bb.middle[currentIndex], upper: bb.upper[currentIndex] }
        };
      }
      
      if (price >= bb.upper[currentIndex]) {
        return { 
          action: 'SELL', 
          confidence: 0.7, 
          reason: 'Pris treffer øvre Bollinger Band (overkjøpt)',
          metadata: { lower: bb.lower[currentIndex], middle: bb.middle[currentIndex], upper: bb.upper[currentIndex] }
        };
      }
      
      return { action: 'HOLD', confidence: 0.3, reason: 'Pris innenfor Bollinger Bands' };
    }
    
    case 'breakout': {
      const lookback = Number(params.lookbackPeriod || 20);
      const threshold = Number(params.breakoutThreshold || 2) / 100;
      
      if (currentIndex < lookback) {
        return { action: 'HOLD', confidence: 0, reason: 'Ikke nok data' };
      }
      
      const lookbackData = data.slice(currentIndex - lookback, currentIndex);
      const high = Math.max(...lookbackData.map(d => d.high));
      const low = Math.min(...lookbackData.map(d => d.low));
      const price = current.close;
      
      if (price > high * (1 + threshold)) {
        return { 
          action: 'BUY', 
          confidence: 0.8, 
          reason: `Breakout over ${lookback}-dagers høyde`,
          metadata: { resistance: high, support: low }
        };
      }
      
      if (price < low * (1 - threshold)) {
        return { 
          action: 'SELL', 
          confidence: 0.8, 
          reason: `Breakdown under ${lookback}-dagers lav`,
          metadata: { resistance: high, support: low }
        };
      }
      
      return { action: 'HOLD', confidence: 0.3, reason: 'Ingen breakout signal' };
    }
    
    case 'ai_ml': {
      // Mock AI prediction - in production, this would call an ML model
      const confidence = Number(params.confidenceThreshold || 0.7);
      
      // Simulate AI prediction using price momentum + volume
      const priceChange = (current.close - data[currentIndex - 5].close) / data[currentIndex - 5].close;
      const volumeSpike = current.volume > (data[currentIndex - 5].volume * 1.5);
      
      const aiConfidence = 0.5 + Math.abs(priceChange) * 5 + (volumeSpike ? 0.2 : 0);
      
      if (aiConfidence > confidence && priceChange > 0) {
        return { 
          action: 'BUY', 
          confidence: aiConfidence, 
          reason: 'AI-modell predikerer oppgang basert på mønster-gjenkjenning',
          metadata: { aiConfidence, priceChange, volumeSpike: volumeSpike ? 1 : 0 }
        };
      }
      
      if (aiConfidence > confidence && priceChange < 0) {
        return { 
          action: 'SELL', 
          confidence: aiConfidence, 
          reason: 'AI-modell predikerer nedgang basert på mønster-gjenkjenning',
          metadata: { aiConfidence, priceChange, volumeSpike: volumeSpike ? 1 : 0 }
        };
      }
      
      return { action: 'HOLD', confidence: aiConfidence, reason: 'AI usikker - holder posisjon' };
    }
    
    default:
      return { action: 'HOLD', confidence: 0, reason: 'Ukjent strategi' };
  }
}
