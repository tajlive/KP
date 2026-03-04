/**
 * ═══════════════════════════════════════════════════════════════════════════
 * KLARPAKKE: BACKTESTING FRAMEWORK
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Test strategies mot historical data med realistic execution.
 * Minimum 30 dager data for statistical significance[1].
 * 
 * KILDER:
 * [1] Stoic.ai: How to Backtest Crypto Trading Strategies (2025)
 * [2] Freqtrade: Backtesting Best Practices
 * [3] Medium: Fibo Correction Strategy 67% Win Rate Backtest
 */

import type { OptimizedRiskProfile } from '@/lib/config/optimized-risk-profiles';
import {
  simulateOrderExecution,
  calculateSlippage,
  calculateFees,
  BINANCE_FEE_CONFIG,
  type PaperTradeConfig,
} from './paper-trade-simulator';

// ============================================================================
// TYPES
// ============================================================================

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BacktestTrade {
  id: string;
  entryTime: number;
  exitTime?: number;
  symbol: string;
  side: 'long' | 'short';
  
  entryPrice: number;
  exitPrice?: number;
  
  quantity: number;
  positionValue: number;
  
  stopLoss: number;
  takeProfit: number;
  
  fees: number;
  slippage: number;
  
  pnl: number;
  pnlPercent: number;
  
  exitReason: 'stop_loss' | 'take_profit' | 'trailing_stop' | 'signal';
}

export interface BacktestResult {
  // Trade statistics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  
  // P&L
  totalPnl: number;
  totalPnlPercent: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  
  // Ratios
  profitFactor: number;
  riskRewardRatio: number;
  
  // Risk metrics
  maxDrawdown: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  sortinoRatio: number;
  
  // Trade duration
  avgTradeDuration: number;       // Hours
  avgTradesPerDay: number;
  
  // Costs
  totalFees: number;
  totalSlippage: number;
  totalCosts: number;
  
  // Equity curve
  equityCurve: EquityPoint[];
  
  // Trades
  trades: BacktestTrade[];
  
  // Metadata
  startDate: Date;
  endDate: Date;
  durationDays: number;
  initialCapital: number;
  finalCapital: number;
}

export interface EquityPoint {
  timestamp: number;
  equity: number;
  drawdown: number;
}

export interface BacktestConfig {
  initialCapital: number;
  symbol: string;
  profile: OptimizedRiskProfile;
  
  // Simulation settings
  simulateSlippage: boolean;
  simulateFees: boolean;
  
  // Data settings
  startDate: Date;
  endDate: Date;
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
}

// ============================================================================
// ATR CALCULATION (for volatility-based sizing)
// ============================================================================

export function calculateATR(candles: CandleData[], period: number = 14): number[] {
  const atrs: number[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      atrs.push(candles[i].high - candles[i].low);
      continue;
    }
    
    const tr1 = candles[i].high - candles[i].low;
    const tr2 = Math.abs(candles[i].high - candles[i - 1].close);
    const tr3 = Math.abs(candles[i].low - candles[i - 1].close);
    
    const trueRange = Math.max(tr1, tr2, tr3);
    
    if (i < period) {
      // Simple average for first N periods
      const sum = atrs.slice(0, i).reduce((a, b) => a + b, 0) + trueRange;
      atrs.push(sum / (i + 1));
    } else {
      // Wilder's smoothing
      const prevATR = atrs[i - 1];
      atrs.push((prevATR * (period - 1) + trueRange) / period);
    }
  }
  
  return atrs;
}

// ============================================================================
// BACKTEST ENGINE
// ============================================================================

export interface StrategySignal {
  action: 'buy' | 'sell' | 'hold';
  confidence: number;             // 0-1
  stopLoss?: number;
  takeProfit?: number;
}

export type StrategyFunction = (
  candles: CandleData[],
  currentIndex: number,
  profile: OptimizedRiskProfile
) => StrategySignal;

/**
 * Run backtest with given strategy and configuration
 */
export async function runBacktest(
  candles: CandleData[],
  strategy: StrategyFunction,
  config: BacktestConfig
): Promise<BacktestResult> {
  const {
    initialCapital,
    profile,
    simulateSlippage,
    simulateFees,
  } = config;
  
  let capital = initialCapital;
  let peakCapital = initialCapital;
  let maxDrawdown = 0;
  
  const trades: BacktestTrade[] = [];
  const equityCurve: EquityPoint[] = [];
  
  let currentTrade: BacktestTrade | null = null;
  
  // Calculate ATR for volatility adjustments
  const atrs = calculateATR(candles);
  const avgATR = atrs.reduce((a, b) => a + b, 0) / atrs.length;
  
  for (let i = 20; i < candles.length; i++) { // Start after warmup period
    const candle = candles[i];
    const currentATR = atrs[i];
    
    // Update equity curve
    let currentEquity = capital;
    if (currentTrade) {
      const unrealizedPnl = currentTrade.side === 'long'
        ? (candle.close - currentTrade.entryPrice) * currentTrade.quantity
        : (currentTrade.entryPrice - candle.close) * currentTrade.quantity;
      currentEquity += unrealizedPnl;
    }
    
    peakCapital = Math.max(peakCapital, currentEquity);
    const drawdown = peakCapital - currentEquity;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
    
    equityCurve.push({
      timestamp: candle.timestamp,
      equity: currentEquity,
      drawdown: (drawdown / peakCapital) * 100,
    });
    
    // Check if current trade should exit
    if (currentTrade) {
      const exitCheck = checkExitConditions(currentTrade, candle, profile);
      
      if (exitCheck.shouldExit) {
        // Execute exit
        const exitResult = simulateExit(currentTrade, candle, exitCheck.reason, {
          simulateSlippage,
          simulateFees,
          currentATR,
          avgATR,
          volume24h: calculateVolume24h(candles, i),
        });
        
        // Update capital
        capital += exitResult.pnl - exitResult.fees - exitResult.slippage;
        
        // Update trade
        currentTrade.exitTime = candle.timestamp;
        currentTrade.exitPrice = exitResult.price;
        currentTrade.fees += exitResult.fees;
        currentTrade.slippage += exitResult.slippage;
        currentTrade.pnl = exitResult.pnl - exitResult.fees - exitResult.slippage;
        currentTrade.pnlPercent = (currentTrade.pnl / currentTrade.positionValue) * 100;
        currentTrade.exitReason = exitCheck.reason;
        
        trades.push(currentTrade);
        currentTrade = null;
      }
    }
    
    // Check for new entry signal
    else {
      const signal = strategy(candles, i, profile);
      
      if (signal.action === 'buy' || signal.action === 'sell') {
        // Check if we can trade (daily limits, etc.)
        if (!canOpenTrade(trades, profile, candle.timestamp)) {
          continue;
        }
        
        // Calculate position size
        const positionSize = calculatePositionSize(capital, profile, signal.confidence);
        
        // Execute entry
        const entryResult = simulateEntry(
          candle,
          signal.action === 'buy' ? 'long' : 'short',
          positionSize,
          {
            simulateSlippage,
            simulateFees,
            currentATR,
            avgATR,
            volume24h: calculateVolume24h(candles, i),
            stopLoss: signal.stopLoss,
            takeProfit: signal.takeProfit,
          }
        );
        
        currentTrade = {
          id: `trade_${trades.length}_${Date.now()}`,
          entryTime: candle.timestamp,
          symbol: config.symbol,
          side: entryResult.side,
          entryPrice: entryResult.price,
          quantity: entryResult.quantity,
          positionValue: entryResult.positionValue,
          stopLoss: entryResult.stopLoss,
          takeProfit: entryResult.takeProfit,
          fees: entryResult.fees,
          slippage: entryResult.slippage,
          pnl: 0,
          pnlPercent: 0,
          exitReason: 'signal',
        };
      }
    }
  }
  
  // Close any open trade at the end
  if (currentTrade) {
    const lastCandle = candles[candles.length - 1];
    const exitResult = simulateExit(currentTrade, lastCandle, 'signal', {
      simulateSlippage,
      simulateFees,
      currentATR: atrs[atrs.length - 1],
      avgATR,
      volume24h: calculateVolume24h(candles, candles.length - 1),
    });
    
    currentTrade.exitTime = lastCandle.timestamp;
    currentTrade.exitPrice = exitResult.price;
    currentTrade.fees += exitResult.fees;
    currentTrade.slippage += exitResult.slippage;
    currentTrade.pnl = exitResult.pnl - exitResult.fees - exitResult.slippage;
    currentTrade.pnlPercent = (currentTrade.pnl / currentTrade.positionValue) * 100;
    
    trades.push(currentTrade);
  }
  
  return compileResults(trades, equityCurve, config);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

interface ExitCheck {
  shouldExit: boolean;
  reason: 'stop_loss' | 'take_profit' | 'trailing_stop' | 'signal';
}

function checkExitConditions(
  trade: BacktestTrade,
  candle: CandleData,
  profile: OptimizedRiskProfile
): ExitCheck {
  // Check stop loss
  if (trade.side === 'long' && candle.low <= trade.stopLoss) {
    return { shouldExit: true, reason: 'stop_loss' };
  }
  if (trade.side === 'short' && candle.high >= trade.stopLoss) {
    return { shouldExit: true, reason: 'stop_loss' };
  }
  
  // Check take profit
  if (trade.side === 'long' && candle.high >= trade.takeProfit) {
    return { shouldExit: true, reason: 'take_profit' };
  }
  if (trade.side === 'short' && candle.low <= trade.takeProfit) {
    return { shouldExit: true, reason: 'take_profit' };
  }
  
  return { shouldExit: false, reason: 'signal' };
}

interface SimulationResult {
  price: number;
  quantity: number;
  positionValue: number;
  fees: number;
  slippage: number;
  pnl: number;
  side: 'long' | 'short';
  stopLoss: number;
  takeProfit: number;
}

interface SimulationConfig {
  simulateSlippage: boolean;
  simulateFees: boolean;
  currentATR: number;
  avgATR: number;
  volume24h: number;
  stopLoss?: number;
  takeProfit?: number;
}

function simulateEntry(
  candle: CandleData,
  side: 'long' | 'short',
  positionValue: number,
  config: SimulationConfig
): SimulationResult {
  const price = candle.close;
  const quantity = positionValue / price;
  
  // Calculate fees
  const fees = config.simulateFees ? positionValue * BINANCE_FEE_CONFIG.takerFee : 0;
  
  // Calculate slippage
  const slippage = config.simulateSlippage
    ? calculateSlippageImpact(positionValue, config.volume24h, config.currentATR, config.avgATR)
    : 0;
  
  // Calculate default stop loss and take profit if not provided
  const stopLoss = config.stopLoss || (side === 'long'
    ? price * 0.97  // 3% stop
    : price * 1.03);
  
  const takeProfit = config.takeProfit || (side === 'long'
    ? price * 1.06  // 6% target
    : price * 0.94);
  
  return {
    price,
    quantity,
    positionValue,
    fees,
    slippage,
    pnl: 0,
    side,
    stopLoss,
    takeProfit,
  };
}

function simulateExit(
  trade: BacktestTrade,
  candle: CandleData,
  reason: string,
  config: SimulationConfig
): { price: number; pnl: number; fees: number; slippage: number } {
  let price = candle.close;
  
  // Adjust price based on exit reason
  if (reason === 'stop_loss') {
    price = trade.stopLoss;
  } else if (reason === 'take_profit') {
    price = trade.takeProfit;
  }
  
  // Calculate P&L
  const pnl = trade.side === 'long'
    ? (price - trade.entryPrice) * trade.quantity
    : (trade.entryPrice - price) * trade.quantity;
  
  // Calculate fees
  const exitValue = price * trade.quantity;
  const fees = config.simulateFees ? exitValue * BINANCE_FEE_CONFIG.takerFee : 0;
  
  // Calculate slippage
  const slippage = config.simulateSlippage
    ? calculateSlippageImpact(exitValue, config.volume24h, config.currentATR, config.avgATR)
    : 0;
  
  return { price, pnl, fees, slippage };
}

function calculateSlippageImpact(
  value: number,
  volume24h: number,
  currentATR: number,
  avgATR: number
): number {
  const volumeImpact = value / volume24h;
  const volatilityMultiplier = currentATR / avgATR;
  
  let slippage = 0.1; // Base 0.1%
  
  if (volumeImpact > 0.001) {
    slippage += volumeImpact * 100;
  }
  
  slippage *= Math.max(0.8, Math.min(volatilityMultiplier, 2.0));
  
  return value * (slippage / 100);
}

function calculateVolume24h(candles: CandleData[], endIndex: number): number {
  // Sum last 24 hours of volume (assuming 1h candles)
  const hours24 = Math.min(24, endIndex);
  let volume = 0;
  
  for (let i = endIndex - hours24; i < endIndex; i++) {
    if (i >= 0) {
      volume += candles[i].volume * candles[i].close; // Volume in USD
    }
  }
  
  // Annualize to estimate 24h volume
  return volume * (24 / hours24);
}

function calculatePositionSize(
  capital: number,
  profile: OptimizedRiskProfile,
  confidence: number
): number {
  const maxPosition = capital * (profile.maxPositionSizePercent / 100);
  const confidenceAdjusted = maxPosition * confidence;
  
  return Math.max(profile.minPositionSizeUsd, confidenceAdjusted);
}

function canOpenTrade(
  trades: BacktestTrade[],
  profile: OptimizedRiskProfile,
  timestamp: number
): boolean {
  // Check max open positions (simplified - assumes flat at this point)
  // In real implementation, check open positions separately
  
  // Check daily trade limit
  const dayStart = new Date(timestamp).setHours(0, 0, 0, 0);
  const todayTrades = trades.filter(t => t.entryTime >= dayStart);
  
  if (todayTrades.length >= profile.maxTradesPerDay) {
    return false;
  }
  
  return true;
}

// ============================================================================
// RESULTS COMPILATION
// ============================================================================

function compileResults(
  trades: BacktestTrade[],
  equityCurve: EquityPoint[],
  config: BacktestConfig
): BacktestResult {
  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl <= 0);
  
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const totalFees = trades.reduce((sum, t) => sum + t.fees, 0);
  const totalSlippage = trades.reduce((sum, t) => sum + t.slippage, 0);
  
  const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
  
  // Calculate max drawdown from equity curve
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;
  
  for (const point of equityCurve) {
    if (point.drawdown > maxDrawdownPercent) {
      maxDrawdownPercent = point.drawdown;
      maxDrawdown = point.equity * (point.drawdown / 100);
    }
  }
  
  // Calculate Sharpe ratio (simplified - assumes risk-free rate of 0)
  const returns = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const dailyReturn = (equityCurve[i].equity - equityCurve[i-1].equity) / equityCurve[i-1].equity;
    returns.push(dailyReturn);
  }
  
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(365) : 0;
  
  // Calculate Sortino ratio (downside deviation only)
  const negativeReturns = returns.filter(r => r < 0);
  const downsideVariance = negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length;
  const downsideDev = Math.sqrt(downsideVariance);
  const sortinoRatio = downsideDev > 0 ? (avgReturn / downsideDev) * Math.sqrt(365) : 0;
  
  // Calculate average trade duration
  const durations = trades
    .filter(t => t.exitTime)
    .map(t => (t.exitTime! - t.entryTime) / (1000 * 60 * 60)); // Hours
  
  const avgDuration = durations.length > 0
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 0;
  
  const durationDays = (config.endDate.getTime() - config.startDate.getTime()) / (1000 * 60 * 60 * 24);
  
  return {
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: trades.length > 0 ? winningTrades.length / trades.length : 0,
    
    totalPnl,
    totalPnlPercent: (totalPnl / config.initialCapital) * 100,
    avgWin: winningTrades.length > 0 ? grossProfit / winningTrades.length : 0,
    avgLoss: losingTrades.length > 0 ? grossLoss / losingTrades.length : 0,
    largestWin: winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl)) : 0,
    largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnl)) : 0,
    
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    riskRewardRatio: 0, // Calculate from avg win/loss
    
    maxDrawdown,
    maxDrawdownPercent,
    sharpeRatio,
    sortinoRatio,
    
    avgTradeDuration: avgDuration,
    avgTradesPerDay: trades.length / Math.max(durationDays, 1),
    
    totalFees,
    totalSlippage,
    totalCosts: totalFees + totalSlippage,
    
    equityCurve,
    trades,
    
    startDate: config.startDate,
    endDate: config.endDate,
    durationDays,
    initialCapital: config.initialCapital,
    finalCapital: config.initialCapital + totalPnl,
  };
}

// ============================================================================
// EXAMPLE STRATEGIES
// ============================================================================

/**
 * Simple Moving Average Crossover Strategy (example)
 */
export const smaCrossoverStrategy: StrategyFunction = (
  candles,
  currentIndex,
  profile
) => {
  if (currentIndex < 50) {
    return { action: 'hold', confidence: 0 };
  }
  
  // Calculate SMAs
  const shortSMA = calculateSMA(candles, currentIndex, 10);
  const longSMA = calculateSMA(candles, currentIndex, 50);
  const prevShortSMA = calculateSMA(candles, currentIndex - 1, 10);
  const prevLongSMA = calculateSMA(candles, currentIndex - 1, 50);
  
  const currentPrice = candles[currentIndex].close;
  
  // Golden cross (bullish)
  if (prevShortSMA <= prevLongSMA && shortSMA > longSMA) {
    return {
      action: 'buy',
      confidence: 0.7,
      stopLoss: currentPrice * (1 - profile.stopLossPercent / 100),
      takeProfit: currentPrice * (1 + profile.takeProfitPercent / 100),
    };
  }
  
  // Death cross (bearish)
  if (prevShortSMA >= prevLongSMA && shortSMA < longSMA) {
    return {
      action: 'sell',
      confidence: 0.7,
      stopLoss: currentPrice * (1 + profile.stopLossPercent / 100),
      takeProfit: currentPrice * (1 - profile.takeProfitPercent / 100),
    };
  }
  
  return { action: 'hold', confidence: 0 };
};

function calculateSMA(candles: CandleData[], endIndex: number, period: number): number {
  if (endIndex < period - 1) return 0;
  
  let sum = 0;
  for (let i = endIndex - period + 1; i <= endIndex; i++) {
    sum += candles[i].close;
  }
  
  return sum / period;
}

// ============================================================================
// EXPORT
// ============================================================================

export const Backtester = {
  runBacktest,
  calculateATR,
  smaCrossoverStrategy,
};

export default Backtester;
