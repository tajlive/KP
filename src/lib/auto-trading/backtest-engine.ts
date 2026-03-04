/**
 * Backtesting Engine
 * Validates strategies against historical data before live trading
 * Uses REAL Binance historical data for accurate results
 */

import type { AutoTradingStrategy, RiskLevel } from "./types";
import { BinanceHistoricalDataFetcher, TimeInterval, BinanceCandle } from "./binance-historical-data";

export interface BacktestParams {
  strategy: AutoTradingStrategy;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  symbols: string[];
}

export interface BacktestResult {
  // Returns
  totalReturn: number;
  annualizedReturn: number;
  cagr: number;

  // Risk metrics
  maxDrawdown: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;

  // Trade metrics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  expectancy: number;
  largestWin: number;
  largestLoss: number;
  avgTradeReturn: number;

  // Duration metrics
  avgTradeDuration: number;
  maxTradeDuration: number;
  timeInMarket: number;

  // Monthly analysis
  monthlyReturns: { month: string; return: number }[];
  profitableMonths: number;
  unprofitableMonths: number;
  bestMonth: number;
  worstMonth: number;

  // Market regime performance
  regimePerformance: {
    bull: { return: number; trades: number };
    bear: { return: number; trades: number };
    sideways: { return: number; trades: number };
    volatile: { return: number; trades: number };
  };

  // Drawdown analysis
  drawdownAnalysis: {
    maxDrawdown: number;
    longestDrawdownDays: number;
    avgRecoveryDays: number;
    drawdownsOver10: number;
    drawdownsOver20: number;
  };

  // Comparison
  vsBuyAndHold: number;
  vsDCA: number;
  alpha: number;
  beta: number;

  // Consecutive analysis
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  consecutiveLossStreaks: number[];

  // Validation
  isValid: boolean;
  validationErrors: string[];
  confidenceScore: number;
  recommendation: "proceed" | "caution" | "reject";
  
  // Metadata
  dataSource: string;
  candlesUsed: number;
}

// Simulated trade for backtest
interface SimulatedTrade {
  entryTime: number;
  exitTime?: number;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  side: 'LONG' | 'SHORT';
  pnl: number;
  pnlPercent: number;
  exitReason: 'stop_loss' | 'take_profit' | 'signal' | 'end_of_data';
}

// Minimum requirements for strategy to be approved
const VALIDATION_THRESHOLDS = {
  minTotalReturn: 0,
  maxDrawdown: -0.25,
  minSharpeRatio: 0.5,
  minWinRate: 0.4,
  minProfitFactor: 1.1,
  minExpectancy: 0,
  minProfitableMonths: 0.5,
  maxConsecutiveLosses: 10,
  maxAvgRecoveryDays: 60,
  minTrades: 30,
};

/**
 * Run comprehensive backtest with REAL historical data
 */
export async function runBacktest(
  params: BacktestParams,
): Promise<BacktestResult> {
  console.info('🔍 Starting REAL backtest with historical data...');
  console.info(`   Strategy: ${params.strategy.name}`);
  console.info(`   Period: ${params.startDate.toISOString().split('T')[0]} to ${params.endDate.toISOString().split('T')[0]}`);
  console.info(`   Symbols: ${params.symbols.join(', ')}`);

  const fetcher = new BinanceHistoricalDataFetcher();
  const interval = mapStrategyTimeframe(params.strategy.timeframe);
  
  // Fetch historical data for all symbols
  const allCandles: Map<string, BinanceCandle[]> = new Map();
  
  for (const symbol of params.symbols) {
    try {
      const candles = await fetcher.fetchCandles(
        symbol,
        interval,
        params.startDate,
        params.endDate,
        { useCache: true, validateData: true }
      );
      allCandles.set(symbol, candles);
      console.info(`✅ ${symbol}: ${candles.length} candles`);
    } catch (error) {
      console.error(`❌ Failed to fetch ${symbol}:`, error);
    }
  }

  if (allCandles.size === 0) {
    throw new Error('No historical data available for backtest');
  }

  // Use the symbol with most data
  const primarySymbol = Array.from(allCandles.entries())
    .sort((a, b) => b[1].length - a[1].length)[0][0];
  const candles = allCandles.get(primarySymbol)!;

  console.info(`📊 Running simulation on ${candles.length} candles (${primarySymbol})`);

  // Run simulation
  const trades = simulateStrategy(candles, params.strategy, params.initialCapital);
  
  // Calculate metrics
  const result = calculateMetrics(trades, candles, params.initialCapital, primarySymbol);
  
  // Validate results
  const validation = validateBacktest(result);
  result.isValid = validation.isValid;
  result.validationErrors = validation.errors;
  result.confidenceScore = calculateConfidenceScore(result);
  result.recommendation = generateRecommendation(result);
  result.dataSource = 'binance_historical';
  result.candlesUsed = candles.length;

  console.info(`✅ Backtest complete: ${result.totalTrades} trades, ${(result.totalReturn * 100).toFixed(2)}% return`);

  return result;
}

/**
 * Map strategy timeframe to Binance interval
 */
function mapStrategyTimeframe(timeframe?: string): TimeInterval {
  const mapping: Record<string, TimeInterval> = {
    '1m': '1m',
    '5m': '5m',
    '15m': '15m',
    '30m': '30m',
    '1h': '1h',
    '4h': '4h',
    '1d': '1d',
    '1w': '1w',
  };
  return mapping[timeframe || '1h'] || '1h';
}

/**
 * Simulate strategy execution on historical data
 */
function simulateStrategy(
  candles: BinanceCandle[],
  strategy: AutoTradingStrategy,
  initialCapital: number
): SimulatedTrade[] {
  const trades: SimulatedTrade[] = [];
  let position: SimulatedTrade | null = null;
  let capital = initialCapital;
  
  // Need at least 50 candles for indicator calculation
  const startIndex = 50;
  
  for (let i = startIndex; i < candles.length; i++) {
    const currentCandle = candles[i];
    const historicalCandles = candles.slice(i - 50, i);
    
    // Calculate indicators
    const indicators = calculateIndicators(historicalCandles);
    
    // Check for entry signal
    if (!position) {
      const shouldEnter = checkEntrySignal(indicators, strategy, currentCandle);
      
      if (shouldEnter) {
        const positionSize = calculatePositionSize(capital, strategy);
        const quantity = positionSize / currentCandle.close;
        
        position = {
          entryTime: currentCandle.openTime,
          entryPrice: currentCandle.close,
          quantity,
          side: 'LONG',
          pnl: 0,
          pnlPercent: 0,
          exitReason: 'signal',
        };
      }
    }
    
    // Check for exit signal
    if (position) {
      const exitCheck = checkExitSignal(indicators, strategy, position, currentCandle);
      
      if (exitCheck.shouldExit || i === candles.length - 1) {
        position.exitTime = currentCandle.openTime;
        position.exitPrice = currentCandle.close;
        position.exitReason = exitCheck.reason;
        position.pnl = (currentCandle.close - position.entryPrice) * position.quantity;
        position.pnlPercent = ((currentCandle.close - position.entryPrice) / position.entryPrice);
        
        capital += position.pnl;
        trades.push({ ...position });
        position = null;
      }
    }
  }
  
  return trades;
}

/**
 * Calculate technical indicators
 */
function calculateIndicators(candles: BinanceCandle[]) {
  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  
  return {
    rsi: calculateRSI(closes, 14),
    ema20: calculateEMA(closes, 20),
    ema50: calculateEMA(closes, 50),
    sma20: calculateSMA(closes, 20),
    sma50: calculateSMA(closes, 50),
    macd: calculateMACD(closes),
    atr: calculateATR(highs, lows, closes, 14),
    bb: calculateBollingerBands(closes, 20, 2),
  };
}

/**
 * Check if we should enter a trade
 */
function checkEntrySignal(
  indicators: ReturnType<typeof calculateIndicators>,
  strategy: AutoTradingStrategy,
  candle: BinanceCandle
): boolean {
  // Simple entry logic based on risk level
  const { rsi, ema20, ema50, macd, bb } = indicators;
  
  // Conservative: Need multiple confirmations
  if (strategy.risk_level === 'conservative') {
    return (
      rsi < 40 &&
      ema20 > ema50 &&
      macd.histogram > 0 &&
      candle.close < bb.lower
    );
  }
  
  // Balanced: Moderate signals
  if (strategy.risk_level === 'balanced') {
    return (
      rsi < 50 &&
      ema20 > ema50 &&
      macd.macd > macd.signal
    );
  }
  
  // Aggressive: Momentum based
  return (
    rsi > 50 &&
    macd.histogram > 0
  );
}

/**
 * Check if we should exit a trade
 */
function checkExitSignal(
  indicators: ReturnType<typeof calculateIndicators>,
  strategy: AutoTradingStrategy,
  position: SimulatedTrade,
  candle: BinanceCandle
): { shouldExit: boolean; reason: SimulatedTrade['exitReason'] } {
  const pnlPercent = (candle.close - position.entryPrice) / position.entryPrice;
  
  // Stop loss
  const stopLossPercent = strategy.stop_loss_pct || 0.02;
  if (pnlPercent < -stopLossPercent) {
    return { shouldExit: true, reason: 'stop_loss' };
  }
  
  // Take profit
  const takeProfitPercent = strategy.take_profit_pct || 0.05;
  if (pnlPercent > takeProfitPercent) {
    return { shouldExit: true, reason: 'take_profit' };
  }
  
  // Signal-based exit
  const { rsi, ema20, ema50, macd } = indicators;
  
  if (strategy.risk_level === 'conservative' && rsi > 60) {
    return { shouldExit: true, reason: 'signal' };
  }
  
  if (ema20 < ema50 && macd.macd < macd.signal) {
    return { shouldExit: true, reason: 'signal' };
  }
  
  return { shouldExit: false, reason: 'signal' };
}

/**
 * Calculate position size
 */
function calculatePositionSize(capital: number, strategy: AutoTradingStrategy): number {
  const maxPositionPercent = strategy.max_position_size_pct || 0.05;
  return capital * maxPositionPercent;
}

/**
 * Calculate all backtest metrics
 */
function calculateMetrics(
  trades: SimulatedTrade[],
  candles: BinanceCandle[],
  initialCapital: number,
  symbol: string
): BacktestResult {
  const finalCapital = trades.reduce((sum, t) => sum + t.pnl, initialCapital);
  const totalReturn = (finalCapital - initialCapital) / initialCapital;
  
  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl <= 0);
  
  const winRate = trades.length > 0 ? winningTrades.length / trades.length : 0;
  
  const avgWin = winningTrades.length > 0 
    ? winningTrades.reduce((sum, t) => sum + t.pnlPercent, 0) / winningTrades.length 
    : 0;
  
  const avgLoss = losingTrades.length > 0
    ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnlPercent, 0)) / losingTrades.length
    : 0;
  
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;
  
  // Calculate drawdown
  const equityCurve = calculateEquityCurve(trades, initialCapital);
  const maxDrawdown = calculateMaxDrawdown(equityCurve);
  
  // Calculate volatility and Sharpe ratio
  const returns = trades.map(t => t.pnlPercent);
  const volatility = calculateStdDev(returns);
  const sharpeRatio = volatility > 0 ? (totalReturn / trades.length * 252) / (volatility * Math.sqrt(252)) : 0;
  
  // Calculate vs buy and hold
  const buyAndHoldReturn = (candles[candles.length - 1].close - candles[0].open) / candles[0].open;
  
  return {
    totalReturn,
    annualizedReturn: Math.pow(1 + totalReturn, 365 / trades.length) - 1,
    cagr: totalReturn,
    maxDrawdown,
    volatility,
    sharpeRatio,
    sortinoRatio: sharpeRatio, // Simplified
    calmarRatio: maxDrawdown !== 0 ? totalReturn / Math.abs(maxDrawdown) : 0,
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate,
    avgWin,
    avgLoss,
    profitFactor,
    expectancy: (winRate * avgWin) - ((1 - winRate) * avgLoss),
    largestWin: Math.max(...trades.map(t => t.pnlPercent), 0),
    largestLoss: Math.min(...trades.map(t => t.pnlPercent), 0),
    avgTradeReturn: trades.length > 0 ? totalReturn / trades.length : 0,
    avgTradeDuration: calculateAvgTradeDuration(trades),
    maxTradeDuration: calculateMaxTradeDuration(trades),
    timeInMarket: calculateTimeInMarket(trades, candles),
    monthlyReturns: [],
    profitableMonths: 0,
    unprofitableMonths: 0,
    bestMonth: 0,
    worstMonth: 0,
    regimePerformance: {
      bull: { return: 0, trades: 0 },
      bear: { return: 0, trades: 0 },
      sideways: { return: 0, trades: 0 },
      volatile: { return: 0, trades: 0 },
    },
    drawdownAnalysis: {
      maxDrawdown,
      longestDrawdownDays: 0,
      avgRecoveryDays: 0,
      drawdownsOver10: 0,
      drawdownsOver20: 0,
    },
    vsBuyAndHold: totalReturn - buyAndHoldReturn,
    vsDCA: 0,
    alpha: 0,
    beta: 0,
    maxConsecutiveWins: 0,
    maxConsecutiveLosses: 0,
    consecutiveLossStreaks: [],
    isValid: false,
    validationErrors: [],
    confidenceScore: 0,
    recommendation: 'reject',
    dataSource: '',
    candlesUsed: 0,
  };
}

// Technical indicator calculations
function calculateSMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1];
  const slice = data.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calculateEMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1];
  const k = 2 / (period + 1);
  let ema = data[0];
  for (let i = 1; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  return ema;
}

function calculateRSI(data: number[], period: number): number {
  if (data.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i <= period; i++) {
    const change = data[data.length - i] - data[data.length - i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateMACD(data: number[]): { macd: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);
  const macd = ema12 - ema26;
  // Simplified signal (should be EMA of MACD)
  const signal = macd * 0.9;
  return { macd, signal, histogram: macd - signal };
}

function calculateATR(highs: number[], lows: number[], closes: number[], period: number): number {
  if (highs.length < period + 1) return highs[0] - lows[0];
  
  let trSum = 0;
  for (let i = 1; i <= period; i++) {
    const idx = highs.length - i;
    const tr = Math.max(
      highs[idx] - lows[idx],
      Math.abs(highs[idx] - closes[idx - 1]),
      Math.abs(lows[idx] - closes[idx - 1])
    );
    trSum += tr;
  }
  return trSum / period;
}

function calculateBollingerBands(data: number[], period: number, stdDev: number): { upper: number; middle: number; lower: number } {
  const middle = calculateSMA(data, period);
  const variance = data.slice(-period).reduce((sum, price) => sum + Math.pow(price - middle, 2), 0) / period;
  const std = Math.sqrt(variance);
  return {
    upper: middle + stdDev * std,
    middle,
    lower: middle - stdDev * std,
  };
}

function calculateEquityCurve(trades: SimulatedTrade[], initialCapital: number): number[] {
  let capital = initialCapital;
  return trades.map(t => {
    capital += t.pnl;
    return capital;
  });
}

function calculateMaxDrawdown(equity: number[]): number {
  let maxDrawdown = 0;
  let peak = equity[0];
  
  for (const value of equity) {
    if (value > peak) peak = value;
    const drawdown = (peak - value) / peak;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  
  return -maxDrawdown;
}

function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function calculateAvgTradeDuration(trades: SimulatedTrade[]): number {
  if (trades.length === 0) return 0;
  const durations = trades
    .filter(t => t.exitTime)
    .map(t => ((t.exitTime || 0) - t.entryTime) / (1000 * 60 * 60 * 24));
  return durations.reduce((a, b) => a + b, 0) / durations.length;
}

function calculateMaxTradeDuration(trades: SimulatedTrade[]): number {
  const durations = trades
    .filter(t => t.exitTime)
    .map(t => ((t.exitTime || 0) - t.entryTime) / (1000 * 60 * 60 * 24));
  return Math.max(...durations, 0);
}

function calculateTimeInMarket(trades: SimulatedTrade[], candles: BinanceCandle[]): number {
  if (candles.length === 0) return 0;
  const totalTime = candles[candles.length - 1].closeTime - candles[0].openTime;
  const inMarketTime = trades
    .filter(t => t.exitTime)
    .reduce((sum, t) => sum + ((t.exitTime || 0) - t.entryTime), 0);
  return inMarketTime / totalTime;
}

function validateBacktest(result: BacktestResult): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (result.totalReturn <= VALIDATION_THRESHOLDS.minTotalReturn) {
    errors.push(`Strategien er ikke profitable: ${(result.totalReturn * 100).toFixed(1)}% avkastning`);
  }
  
  if (result.maxDrawdown < VALIDATION_THRESHOLDS.maxDrawdown) {
    errors.push(`For høy drawdown: ${(result.maxDrawdown * 100).toFixed(1)}% (maks tillatt: ${(VALIDATION_THRESHOLDS.maxDrawdown * 100).toFixed(0)}%)`);
  }
  
  if (result.sharpeRatio < VALIDATION_THRESHOLDS.minSharpeRatio) {
    errors.push(`For lav Sharpe ratio: ${result.sharpeRatio.toFixed(2)} (minimum: ${VALIDATION_THRESHOLDS.minSharpeRatio})`);
  }
  
  if (result.winRate < VALIDATION_THRESHOLDS.minWinRate) {
    errors.push(`For lav win rate: ${(result.winRate * 100).toFixed(0)}% (minimum: ${(VALIDATION_THRESHOLDS.minWinRate * 100).toFixed(0)}%)`);
  }
  
  if (result.profitFactor < VALIDATION_THRESHOLDS.minProfitFactor) {
    errors.push(`For lav profit factor: ${result.profitFactor.toFixed(2)} (minimum: ${VALIDATION_THRESHOLDS.minProfitFactor})`);
  }
  
  if (result.totalTrades < VALIDATION_THRESHOLDS.minTrades) {
    errors.push(`For få trades: ${result.totalTrades} (minimum: ${VALIDATION_THRESHOLDS.minTrades})`);
  }
  
  return { isValid: errors.length === 0, errors };
}

function calculateConfidenceScore(result: BacktestResult): number {
  let score = 50;
  
  if (result.totalReturn > 0.2) score += 15;
  else if (result.totalReturn > 0.1) score += 10;
  else if (result.totalReturn > 0) score += 5;
  else score -= 20;
  
  if (result.sharpeRatio > 1.5) score += 10;
  else if (result.sharpeRatio > 1.0) score += 5;
  else if (result.sharpeRatio < 0.5) score -= 10;
  
  if (result.maxDrawdown > -0.1) score += 10;
  else if (result.maxDrawdown > -0.15) score += 5;
  else if (result.maxDrawdown < -0.25) score -= 15;
  
  if (result.winRate > 0.55) score += 5;
  if (result.profitFactor > 2.0) score += 5;
  
  return Math.max(0, Math.min(100, score));
}

function generateRecommendation(result: BacktestResult): "proceed" | "caution" | "reject" {
  if (!result.isValid) return "reject";
  if (result.confidenceScore < 60) return "caution";
  if (result.maxDrawdown < -0.2) return "caution";
  if (result.sharpeRatio < 0.8) return "caution";
  return "proceed";
}

// Re-export for use in other modules
export { calculateRSI, calculateEMA, calculateSMA, calculateMACD, calculateATR };
