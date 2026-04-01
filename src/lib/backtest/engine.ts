/**
 * Backtest Engine - KLA-240
 * Simulerer trading strategier mot historiske data fra Binance
 */

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Trade {
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  side: 'LONG' | 'SHORT';
  size: number;
  pnl: number;
  pnlPct: number;
  fee: number;
}

export interface BacktestMetrics {
  totalReturnPct: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  winRate: number;
  totalTrades: number;
  profitFactor: number;
  bestTrade: number;
  worstTrade: number;
  avgTradeDuration: number;
}

export interface BacktestResult {
  trades: Trade[];
  equityCurve: { timestamp: number; equity: number }[];
  metrics: BacktestMetrics;
  buyHoldReturn: number;
}

export type StrategyType = 'SMA_CROSSOVER' | 'RSI_MEAN_REVERSION' | 'AI_SIGNALS';

// Risk profile mapping for backtest strategies
export type RiskProfile = 'konservativ' | 'balansert' | 'aggressiv';

export interface StrategyConfig {
  symbol: string;
  smaFast: number;
  smaSlow: number;
  maxPositionPct: number;
  name: string;
}

export const STRATEGY_MAP: Record<RiskProfile, StrategyConfig> = {
  konservativ: {
    symbol: 'ETHUSDT',     // ETH = lavere volatilitet
    smaFast: 30,           // tregere signal = færre trades
    smaSlow: 100,
    maxPositionPct: 0.5,   // kun 50% av kapital per trade
    name: 'ETH SMA 30/100',
  },
  balansert: {
    symbol: 'BTCUSDT',
    smaFast: 20,
    smaSlow: 50,
    maxPositionPct: 0.75,  // 75% av kapital
    name: 'BTC SMA 20/50',
  },
  aggressiv: {
    symbol: 'BTCUSDT',
    smaFast: 10,           // raskere signal = flere trades
    smaSlow: 30,
    maxPositionPct: 1.0,   // full posisjon
    name: 'BTC SMA 10/30',
  },
};

// USD/NOK conversion rate (konservativt estimat)
const USDNOK_RATE = 10.5;

export interface EnhancedBacktestMetrics extends BacktestMetrics {
  buyHoldReturnPct: number;
  alpha: number;  // strategi - buyhold
  startValueNOK: number;
  endValueNOK: number;
}

const FEE_RATE = 0.001;

export async function fetchHistoricalData(
  symbol: string,
  interval: string,
  limit: number = 365
): Promise<OHLCV[]> {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) {
    throw new Error(`Binance API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  return data.map((candle: unknown[]) => ({
    timestamp: candle[0] as number,
    open: parseFloat(candle[1] as string),
    high: parseFloat(candle[2] as string),
    low: parseFloat(candle[3] as string),
    close: parseFloat(candle[4] as string),
    volume: parseFloat(candle[5] as string),
  }));
}

function calculateSMA(data: OHLCV[], period: number): number[] {
  const closes = data.map((d) => d.close);
  const sma: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      sma.push(NaN);
    } else {
      const sum = closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }
  
  return sma;
}

function calculateRSI(data: OHLCV[], period: number = 14): number[] {
  const closes = data.map((d) => d.close);
  const rsi: number[] = [];
  let gains = 0;
  let losses = 0;
  
  for (let i = 0; i < closes.length; i++) {
    if (i === 0) {
      rsi.push(NaN);
      continue;
    }
    
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    
    if (i < period) {
      gains += gain;
      losses += loss;
      rsi.push(NaN);
    } else if (i === period) {
      gains = (gains + gain) / period;
      losses = (losses + loss) / period;
      rsi.push(losses === 0 ? 100 : 100 - 100 / (1 + gains / losses));
    } else {
      gains = (gains * (period - 1) + gain) / period;
      losses = (losses * (period - 1) + loss) / period;
      rsi.push(losses === 0 ? 100 : 100 - 100 / (1 + gains / losses));
    }
  }
  
  return rsi;
}

function generateSignals(
  data: OHLCV[],
  strategy: StrategyType,
  smaFast: number = 20,
  smaSlow: number = 50
): ('BUY' | 'SELL' | 'HOLD')[] {
  const signals: ('BUY' | 'SELL' | 'HOLD')[] = [];
  
  if (strategy === 'SMA_CROSSOVER') {
    const smaFastValues = calculateSMA(data, smaFast);
    const smaSlowValues = calculateSMA(data, smaSlow);
    
    for (let i = 0; i < data.length; i++) {
      if (isNaN(smaFastValues[i]) || isNaN(smaSlowValues[i])) {
        signals.push('HOLD');
      } else if (smaFastValues[i] > smaSlowValues[i] && smaFastValues[i - 1] <= smaSlowValues[i - 1]) {
        signals.push('BUY');
      } else if (smaFastValues[i] < smaSlowValues[i] && smaFastValues[i - 1] >= smaSlowValues[i - 1]) {
        signals.push('SELL');
      } else {
        signals.push('HOLD');
      }
    }
  } else if (strategy === 'RSI_MEAN_REVERSION') {
    const rsi = calculateRSI(data, 14);
    
    for (let i = 0; i < data.length; i++) {
      if (isNaN(rsi[i])) {
        signals.push('HOLD');
      } else if (rsi[i] < 30) {
        signals.push('BUY');
      } else if (rsi[i] > 70) {
        signals.push('SELL');
      } else {
        signals.push('HOLD');
      }
    }
  } else {
    signals.push(...new Array(data.length).fill('HOLD'));
  }
  
  return signals;
}

export function runBacktest(
  candles: OHLCV[],
  strategy: StrategyType,
  initialCapital: number,
  options?: {
    smaFast?: number;
    smaSlow?: number;
    maxPositionPct?: number;
  }
): BacktestResult & { enhancedMetrics: EnhancedBacktestMetrics } {
  const smaFast = options?.smaFast ?? 20;
  const smaSlow = options?.smaSlow ?? 50;
  const maxPositionPct = options?.maxPositionPct ?? 1.0;
  
  const signals = generateSignals(candles, strategy, smaFast, smaSlow);
  const trades: Trade[] = [];
  const equityCurve: { timestamp: number; equity: number }[] = [];
  
  let capital = initialCapital;
  let position: { side: 'LONG'; entryPrice: number; size: number; entryTime: number } | null = null;
  let maxEquity = initialCapital;
  let maxDrawdown = 0;
  
  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    const signal = signals[i];
    
    if (!position && signal === 'BUY') {
      const positionCapital = capital * maxPositionPct;
      const fee = positionCapital * FEE_RATE;
      const positionSize = positionCapital - fee;
      position = {
        side: 'LONG',
        entryPrice: candle.close,
        size: positionSize / candle.close,
        entryTime: candle.timestamp,
      };
      capital = capital - positionCapital;
    } else if (position && signal === 'SELL') {
      const exitValue = position.size * candle.close;
      const fee = exitValue * FEE_RATE;
      const pnl = exitValue - fee - (position.size * position.entryPrice);
      const pnlPct = (pnl / (position.size * position.entryPrice)) * 100;
      
      trades.push({
        entryTime: position.entryTime,
        exitTime: candle.timestamp,
        entryPrice: position.entryPrice,
        exitPrice: candle.close,
        side: position.side,
        size: position.size,
        pnl,
        pnlPct,
        fee: position.size * position.entryPrice * FEE_RATE + fee,
      });
      
      capital = exitValue - fee;
      position = null;
    }
    
    const currentEquity = position 
      ? capital + (position.size * candle.close)
      : capital;
    
    equityCurve.push({ timestamp: candle.timestamp, equity: currentEquity });
    
    if (currentEquity > maxEquity) {
      maxEquity = currentEquity;
    }
    const drawdown = (maxEquity - currentEquity) / maxEquity;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  
  if (position && candles.length > 0) {
    const lastCandle = candles[candles.length - 1];
    const exitValue = position.size * lastCandle.close;
    const fee = exitValue * FEE_RATE;
    const pnl = exitValue - fee - (position.size * position.entryPrice);
    
    trades.push({
      entryTime: position.entryTime,
      exitTime: lastCandle.timestamp,
      entryPrice: position.entryPrice,
      exitPrice: lastCandle.close,
      side: position.side,
      size: position.size,
      pnl,
      pnlPct: (pnl / (position.size * position.entryPrice)) * 100,
      fee: position.size * position.entryPrice * FEE_RATE + fee,
    });
    
    capital = exitValue - fee;
  }
  
  const finalEquity = capital;
  const totalReturnPct = ((finalEquity - initialCapital) / initialCapital) * 100;
  
  const winningTrades = trades.filter((t) => t.pnl > 0);
  const losingTrades = trades.filter((t) => t.pnl <= 0);
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
  
  const totalProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
  const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
  const profitFactor = totalLoss === 0 ? totalProfit : totalProfit / totalLoss;
  
  const bestTrade = trades.length > 0 ? Math.max(...trades.map((t) => t.pnlPct)) : 0;
  const worstTrade = trades.length > 0 ? Math.min(...trades.map((t) => t.pnlPct)) : 0;
  
  const avgTradeDuration = trades.length > 0
    ? trades.reduce((sum, t) => sum + (t.exitTime - t.entryTime) / (1000 * 60 * 60 * 24), 0) / trades.length
    : 0;
  
  const returns = equityCurve.map((e, i) => 
    i === 0 ? 0 : (e.equity - equityCurve[i - 1].equity) / equityCurve[i - 1].equity
  );
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdReturn = Math.sqrt(
    returns.reduce((sq, n) => sq + Math.pow(n - avgReturn, 2), 0) / returns.length
  );
  const sharpeRatio = stdReturn === 0 ? 0 : (avgReturn / stdReturn) * Math.sqrt(365);
  
  const buyHoldReturn = candles.length > 0
    ? ((candles[candles.length - 1].close - candles[0].open) / candles[0].open) * 100
    : 0;
  
  // Build metrics object first
  const metrics: BacktestMetrics = {
    totalReturnPct,
    maxDrawdownPct: maxDrawdown * 100,
    sharpeRatio,
    winRate,
    totalTrades: trades.length,
    profitFactor,
    bestTrade,
    worstTrade,
    avgTradeDuration,
  };
  
  // Convert to NOK
  const startValueNOK = initialCapital * USDNOK_RATE;
  const endValueNOK = finalEquity * USDNOK_RATE;
  
  const enhancedMetrics: EnhancedBacktestMetrics = {
    ...metrics,
    buyHoldReturnPct: buyHoldReturn,
    alpha: totalReturnPct - buyHoldReturn,
    startValueNOK,
    endValueNOK,
  };
  
  return {
    trades,
    equityCurve,
    metrics,
    buyHoldReturn,
    enhancedMetrics,
  };
}

// Helper function to run backtest with risk profile
export async function runBacktestWithProfile(
  riskProfile: RiskProfile,
  initialCapitalUSD: number,
  months: number
): Promise<BacktestResult & { enhancedMetrics: EnhancedBacktestMetrics; config: StrategyConfig }> {
  const config = STRATEGY_MAP[riskProfile];
  const limit = months <= 3 ? 90 : months <= 12 ? 365 : months <= 24 ? 730 : 1095;
  
  const candles = await fetchHistoricalData(config.symbol, '1d', limit);
  
  const result = runBacktest(candles, 'SMA_CROSSOVER', initialCapitalUSD, {
    smaFast: config.smaFast,
    smaSlow: config.smaSlow,
    maxPositionPct: config.maxPositionPct,
  });
  
  return { ...result, config };
}
