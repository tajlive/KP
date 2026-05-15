/**
 * ═══════════════════════════════════════════════════════════════════════════
 * KLARPAKKE: REALISTIC PAPER TRADING SIMULATOR
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Simulerer live-trading med realistic fills, slippage, og fees.
 * Paper trading uten dette overvurderer performance med 15-30%[1][2]
 * 
 * KILDER:
 * [1] Alpaca Markets: Paper vs. Live Trading Data-Backed Guide (2025)
 * [2] Interactive Brokers: Paper Trading vs Live Trading Differences
 * [3] Binance Fee Schedule: 0.1% maker/taker
 * [4] Research: Slippage increases exponentially with volatility
 */

import type { OptimizedRiskProfile } from '@/lib/config/optimized-risk-profiles';

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface PaperTradeConfig {
  simulateSlippage: boolean;
  simulateFees: boolean;
  realisticFills: boolean;      // Limit orders don't always fill
  simulateLatency: boolean;     // API latency simulation
}

export const DEFAULT_PAPER_CONFIG: PaperTradeConfig = {
  simulateSlippage: true,
  simulateFees: true,
  realisticFills: true,
  simulateLatency: false,       // Optional for advanced testing
};

// ============================================================================
// SLIPPAGE MODEL
// ============================================================================

export interface SlippageInput {
  symbol: string;
  side: 'buy' | 'sell';
  orderSize: number;            // In base currency
  orderValueUsd: number;
  currentPrice: number;
  volume24h: number;            // 24h volume in USD
  volatility: number;           // Current ATR / Price
  averageVolatility: number;    // Historical average
  orderBookDepth?: number;      // Optional: order book depth
}

export interface SlippageResult {
  slippagePercent: number;      // Positive = worse price
  adjustedPrice: number;        // Price after slippage
  reason: string;               // Explanation
}

/**
 * Calculate realistic slippage based on multiple factors
 * 
 * Slippage Components:
 * 1. Base slippage (liquidity of pair)
 * 2. Volume impact (order size vs daily volume)
 * 3. Volatility multiplier (high vol = more slippage)
 * 
 * Source: Alpaca Markets research on slippage[1]
 */
export function calculateSlippage(input: SlippageInput): SlippageResult {
  const {
    side,
    orderValueUsd,
    currentPrice,
    volume24h,
    volatility,
    averageVolatility,
  } = input;

  // 1. Base slippage by volatility regime
  let baseSlippage = 0.1; // 0.1% for BTC/ETH in normal conditions
  
  if (volatility > averageVolatility * 2) {
    baseSlippage = 0.3; // High volatility
  } else if (volatility > averageVolatility * 1.5) {
    baseSlippage = 0.2; // Elevated volatility
  }

  // 2. Volume impact (linear model)[1]
  // Large orders relative to daily volume get worse fills
  const volumeImpact = orderValueUsd / volume24h;
  let volumeSlippage = 0;
  
  if (volumeImpact > 0.001) { // > 0.1% of daily volume
    volumeSlippage = volumeImpact * 100; // Convert to percentage
    volumeSlippage = Math.min(volumeSlippage, 0.5); // Cap at 0.5%
  }

  // 3. Volatility multiplier
  const volatilityMultiplier = volatility / averageVolatility;
  const volatilityAdjustment = Math.max(0.8, Math.min(volatilityMultiplier, 2.0));

  // 4. Total slippage
  const totalSlippage = (baseSlippage + volumeSlippage) * volatilityAdjustment;
  
  // 5. Direction adjustment (buy = higher price, sell = lower price)
  const slippageDirection = side === 'buy' ? 1 : -1;
  const adjustedPrice = currentPrice * (1 + (totalSlippage / 100) * slippageDirection);

  const reasons: string[] = [];
  if (baseSlippage > 0.1) reasons.push(`high volatility (${(volatility*100).toFixed(2)}%)`);
  if (volumeSlippage > 0) reasons.push(`large order (${(volumeImpact*100).toFixed(3)}% of daily vol)`);

  return {
    slippagePercent: totalSlippage,
    adjustedPrice,
    reason: reasons.length > 0 ? reasons.join(', ') : 'normal market conditions',
  };
}

// ============================================================================
// FEE CALCULATION
// ============================================================================

export interface FeeConfig {
  makerFee: number;             // e.g., 0.001 = 0.1%
  takerFee: number;             // e.g., 0.001 = 0.1%
  bnbDiscount: boolean;         // 25% discount with BNB
}

export const BINANCE_FEE_CONFIG: FeeConfig = {
  makerFee: 0.001,              // 0.1%
  takerFee: 0.001,              // 0.1%
  bnbDiscount: false,           // Conservative: assume no discount
};

export interface FeeResult {
  entryFee: number;             // Fee paid on entry
  exitFee: number;              // Fee paid on exit
  totalFee: number;             // Sum of both
  totalFeePercent: number;      // As % of position
}

/**
 * Calculate trading fees for a round trip (entry + exit)
 * 
 * Source: Binance Fee Schedule[3]
 */
export function calculateFees(
  positionValue: number,
  feeConfig: FeeConfig = BINANCE_FEE_CONFIG
): FeeResult {
  const discount = feeConfig.bnbDiscount ? 0.75 : 1.0;
  
  const entryFee = positionValue * feeConfig.takerFee * discount;
  const exitFee = positionValue * feeConfig.takerFee * discount;
  const totalFee = entryFee + exitFee;
  
  return {
    entryFee,
    exitFee,
    totalFee,
    totalFeePercent: (totalFee / positionValue) * 100,
  };
}

// ============================================================================
// ORDER EXECUTION SIMULATION
// ============================================================================

export interface OrderExecutionInput {
  orderType: 'market' | 'limit';
  side: 'buy' | 'sell';
  quantity: number;
  requestedPrice: number;
  currentMarketPrice: number;
  bidPrice: number;
  askPrice: number;
  slippageInput: SlippageInput;
  feeConfig?: FeeConfig;
  paperConfig?: PaperTradeConfig;
}

export interface OrderExecutionResult {
  // Execution details
  filled: boolean;
  fillPercentage: number;       // 0-100 (partial fills possible)
  
  // Prices
  executedPrice: number;
  requestedPrice: number;
  slippagePercent: number;
  
  // Fees
  feePaid: number;
  feePercent: number;
  
  // P&L impact
  totalCost: number;            // Including fees and slippage
  effectiveSpread: number;      // Total cost vs mid price
  
  // Metadata
  fillReason?: string;          // Why it filled/didn't fill
  latencyMs?: number;           // Simulated latency
}

/**
 * Simulate realistic order execution for paper trading
 * 
 * Key differences from naive paper trading:
 * 1. Market orders have slippage
 * 2. Limit orders have fill probability < 100%
 * 3. Fees are deducted
 * 4. Large orders have worse execution
 */
export function simulateOrderExecution(
  input: OrderExecutionInput
): OrderExecutionResult {
  const {
    orderType,
    side,
    quantity,
    requestedPrice,
    currentMarketPrice,
    bidPrice,
    askPrice,
    slippageInput,
    feeConfig = BINANCE_FEE_CONFIG,
    paperConfig = DEFAULT_PAPER_CONFIG,
  } = input;

  // Calculate position value
  const positionValue = quantity * currentMarketPrice;

  // MARKET ORDER EXECUTION
  if (orderType === 'market') {
    // Market orders always fill but with slippage
    const slippage = paperConfig.simulateSlippage
      ? calculateSlippage(slippageInput)
      : { slippagePercent: 0, adjustedPrice: currentMarketPrice, reason: 'no slippage' };

    const fees = paperConfig.simulateFees
      ? calculateFees(positionValue, feeConfig)
      : { totalFee: 0, totalFeePercent: 0 };

    const executedPrice = slippage.adjustedPrice;
    const totalCost = (quantity * executedPrice) + fees.totalFee;
    const effectiveSpread = ((executedPrice - currentMarketPrice) / currentMarketPrice) * 100;

    return {
      filled: true,
      fillPercentage: 100,
      executedPrice,
      requestedPrice,
      slippagePercent: slippage.slippagePercent,
      feePaid: fees.totalFee,
      feePercent: fees.totalFeePercent,
      totalCost,
      effectiveSpread,
      fillReason: `Market order: ${slippage.reason}`,
    };
  }

  // LIMIT ORDER EXECUTION
  else {
    // Check if price is reached
    const priceReached = side === 'buy'
      ? currentMarketPrice <= requestedPrice  // Buy limit: price dropped to our level
      : currentMarketPrice >= requestedPrice; // Sell limit: price rose to our level

    if (!priceReached) {
      return {
        filled: false,
        fillPercentage: 0,
        executedPrice: 0,
        requestedPrice,
        slippagePercent: 0,
        feePaid: 0,
        feePercent: 0,
        totalCost: 0,
        effectiveSpread: 0,
        fillReason: 'Limit price not reached',
      };
    }

    // Price reached - but limit orders don't always fill immediately
    // In live trading, order book depth matters[1][2]
    const fillProbability = paperConfig.realisticFills ? 0.75 : 1.0; // 75% fill rate for realistic
    const willFill = Math.random() < fillProbability;

    if (!willFill) {
      return {
        filled: false,
        fillPercentage: 0,
        executedPrice: 0,
        requestedPrice,
        slippagePercent: 0,
        feePaid: 0,
        feePercent: 0,
        totalCost: 0,
        effectiveSpread: 0,
        fillReason: 'Price reached but no fill (order book depth)',
      };
    }

    // Limit order filled at limit price (no slippage for maker)
    const fees = paperConfig.simulateFees
      ? calculateFees(positionValue, { ...feeConfig, takerFee: feeConfig.makerFee }) // Maker fee
      : { totalFee: 0, totalFeePercent: 0 };

    return {
      filled: true,
      fillPercentage: 100,
      executedPrice: requestedPrice,
      requestedPrice,
      slippagePercent: 0,
      feePaid: fees.totalFee,
      feePercent: fees.totalFeePercent,
      totalCost: (quantity * requestedPrice) + fees.totalFee,
      effectiveSpread: ((requestedPrice - currentMarketPrice) / currentMarketPrice) * 100,
      fillReason: 'Limit order filled (maker)',
    };
  }
}

// ============================================================================
// PAPER TRADE SESSION
// ============================================================================

export interface PaperTradeSession {
  sessionId: string;
  userId: string;
  profile: OptimizedRiskProfile;
  config: PaperTradeConfig;
  
  startingBalance: number;
  currentBalance: number;
  
  trades: PaperTrade[];
  openPositions: PaperPosition[];
  
  stats: PaperTradeStats;
}

export interface PaperTrade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  entryPrice: number;
  exitPrice?: number;
  
  stopLoss: number;
  takeProfit: number;
  
  entryFee: number;
  exitFee?: number;
  slippageCost: number;
  
  pnl: number;
  pnlPercent: number;
  
  openedAt: Date;
  closedAt?: Date;
  status: 'open' | 'closed';
}

export interface PaperPosition {
  tradeId: string;
  symbol: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  
  stopLoss: number;
  takeProfit: number;
  trailingStop?: number;
  
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
}

export interface PaperTradeStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  
  totalPnl: number;
  totalPnlPercent: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  
  maxDrawdown: number;
  maxDrawdownPercent: number;
  
  totalFees: number;
  totalSlippage: number;
}

/**
 * Create new paper trading session with realistic simulation
 */
export function createPaperTradeSession(
  userId: string,
  profile: OptimizedRiskProfile,
  startingBalance: number,
  config: PaperTradeConfig = DEFAULT_PAPER_CONFIG
): PaperTradeSession {
  return {
    sessionId: generateSessionId(),
    userId,
    profile,
    config,
    startingBalance,
    currentBalance: startingBalance,
    trades: [],
    openPositions: [],
    stats: initializeStats(),
  };
}

function generateSessionId(): string {
  return `paper_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function initializeStats(): PaperTradeStats {
  return {
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    totalPnl: 0,
    totalPnlPercent: 0,
    avgWin: 0,
    avgLoss: 0,
    profitFactor: 0,
    maxDrawdown: 0,
    maxDrawdownPercent: 0,
    totalFees: 0,
    totalSlippage: 0,
  };
}

// ============================================================================
// STATISTICS CALCULATION
// ============================================================================

export function calculatePaperTradeStats(trades: PaperTrade[], startingBalance = 100000): PaperTradeStats {
  const closedTrades = trades.filter(t => t.status === 'closed');

  if (closedTrades.length === 0) {
    return initializeStats();
  }

  const winningTrades = closedTrades.filter(t => t.pnl > 0);
  const losingTrades = closedTrades.filter(t => t.pnl <= 0);

  const totalPnl = closedTrades.reduce((sum, t) => sum + t.pnl, 0);
  const totalFees = closedTrades.reduce((sum, t) => sum + t.entryFee + (t.exitFee || 0), 0);
  const totalSlippage = closedTrades.reduce((sum, t) => sum + t.slippageCost, 0);

  const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));

  // Calculate max drawdown
  let peak = 0;
  let maxDrawdown = 0;
  let runningPnl = 0;

  for (const trade of closedTrades) {
    runningPnl += trade.pnl;
    peak = Math.max(peak, runningPnl);
    const drawdown = peak - runningPnl;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }

  // Normalize startingBalance to a positive number to avoid division by zero
  const effectiveStartingBalance = startingBalance > 0 ? startingBalance : 100000;
  const rawWinRate = closedTrades.length > 0 ? winningTrades.length / closedTrades.length : 0;

  return {
    totalTrades: closedTrades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: rawWinRate * 100, // Normalized to 0-100 scale (consistent with backtestEngine)
    totalPnl,
    totalPnlPercent: (totalPnl / effectiveStartingBalance) * 100,
    avgWin: winningTrades.length > 0 ? grossProfit / winningTrades.length : 0,
    avgLoss: losingTrades.length > 0 ? grossLoss / losingTrades.length : 0,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    maxDrawdown,
    maxDrawdownPercent: (maxDrawdown / effectiveStartingBalance) * 100,
    totalFees,
    totalSlippage,
  };
}

// ============================================================================
// VALIDATION & WARNINGS
// ============================================================================

export interface PaperVsLiveComparison {
  paperResult: number;          // Profit from paper trading
  estimatedLiveResult: number;  // Estimated profit in live
  degradationPercent: number;   // How much worse live is expected
  warnings: string[];
}

/**
 * Compare paper trading results to expected live performance
 * 
 * Research shows paper trading typically outperforms live by 15-30%[1][2]
 */
export function estimateLivePerformance(
  paperStats: PaperTradeStats,
  profile: OptimizedRiskProfile
): PaperVsLiveComparison {
  const warnings: string[] = [];
  
  // Base degradation estimate
  let degradationPercent = 15; // Conservative estimate: 15% worse
  
  // Adjust based on profile
  if (profile.name === 'aggressive') {
    degradationPercent = 25; // Aggressive strategies suffer more
    warnings.push('Aggressive strategies typically see 20-30% degradation in live trading');
  }
  
  // Check if fees were properly simulated
  if (paperStats.totalFees === 0) {
    degradationPercent += 10;
    warnings.push('WARNING: Fees were not simulated - add 0.2% round-trip cost');
  }
  
  // Check if slippage was simulated
  if (paperStats.totalSlippage === 0) {
    degradationPercent += 10;
    warnings.push('WARNING: Slippage was not simulated - add 0.1-0.3% per trade');
  }
  
  // High win rate warning
  if (paperStats.winRate > 0.80) {
    warnings.push('Win rate >80% may indicate curve-fitting or insufficient sample size');
  }
  
  // Calculate estimated live result
  const estimatedLiveResult = paperStats.totalPnl * (1 - degradationPercent / 100);
  
  return {
    paperResult: paperStats.totalPnl,
    estimatedLiveResult,
    degradationPercent,
    warnings,
  };
}

// ============================================================================
// EXPORT SUMMARY
// ============================================================================

export const PaperTradeSimulator = {
  // Configuration
  DEFAULT_CONFIG: DEFAULT_PAPER_CONFIG,
  BINANCE_FEES: BINANCE_FEE_CONFIG,
  
  // Core functions
  calculateSlippage,
  calculateFees,
  simulateOrderExecution,
  createPaperTradeSession,
  calculatePaperTradeStats,
  estimateLivePerformance,
};

export default PaperTradeSimulator;
