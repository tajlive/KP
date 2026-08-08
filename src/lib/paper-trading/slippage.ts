/**
 * Realistic Slippage Simulation for Paper Trading
 * 
 * Simulates real-world slippage to give users realistic expectations
 * before they switch to live trading.
 * 
 * Based on TradingView and professional simulator implementations.
 */

import { createKrakenMarketDataProvider } from "@/lib/trading/canonical/market-data";

const marketDataProvider = createKrakenMarketDataProvider();

export interface SlippageParams {
  symbol: string;
  side: 'buy' | 'sell';
  orderType: 'market' | 'limit';
  amount: number;
  currentPrice: number;
}

export interface SlippageResult {
  executionPrice: number;
  slippageBps: number; // basis points (0.01% = 1bp)
  slippageAmount: number; // USD
  reason: string;
}

// In-memory cache for volatility data
const volatilityCache: Map<string, { volatility: number; timestamp: number }> = new Map();
const VOLATILITY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached volatility or return default
 */
function getCachedVolatility(symbol: string): number {
  const cached = volatilityCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < VOLATILITY_CACHE_TTL) {
    return cached.volatility;
  }
  return 0.1; // Default 10% volatility
}

/**
 * Update volatility cache
 */
export function updateVolatility(symbol: string, volatility: number): void {
  volatilityCache.set(symbol, {
    volatility: Math.max(0, Math.min(1, volatility)),
    timestamp: Date.now(),
  });
}

/**
 * Calculate realistic slippage for paper trading
 */
export function calculateSlippage(params: SlippageParams): SlippageResult {
  const { symbol, side, orderType, amount, currentPrice } = params;

  // Limit orders get no slippage (filled at exact price or not at all)
  if (orderType === 'limit') {
    return {
      executionPrice: currentPrice,
      slippageBps: 0,
      slippageAmount: 0,
      reason: 'Limit order - no slippage',
    };
  }

  // Market order slippage factors:

  // 1. Base slippage (always present)
  const baseSlippageBps = 5; // 0.05%

  // 2. Volatility slippage (higher during high volatility)
  const volatility = getCachedVolatility(symbol); // 0-1 scale
  const volatilitySlippageBps = volatility * 20; // 0-0.2%

  // 3. Order size slippage (larger orders = more slippage)
  const notionalValue = amount * currentPrice;
  const sizeSlippageBps = Math.min((notionalValue / 100000) * 5, 30); // Max 0.3%

  // 4. Time of day slippage (higher outside major market hours)
  const hour = new Date().getUTCHours();
  const isOffHours = hour < 6 || hour > 22; // Outside major market hours
  const timeSlippageBps = isOffHours ? 10 : 0;

  // Total slippage
  const totalSlippageBps =
    baseSlippageBps + volatilitySlippageBps + sizeSlippageBps + timeSlippageBps;

  // Apply slippage direction (buy = worse price higher, sell = worse price lower)
  const slippageMultiplier = side === 'buy' ? 1 : -1;
  const slippagePercentage = (totalSlippageBps / 10000) * slippageMultiplier;

  const executionPrice = currentPrice * (1 + slippagePercentage);
  const slippageAmount = Math.abs(executionPrice - currentPrice) * amount;

  return {
    executionPrice,
    slippageBps: Math.round(totalSlippageBps * 100) / 100,
    slippageAmount: Math.round(slippageAmount * 10000) / 10000,
    reason: `Base: ${baseSlippageBps}bp, Volatility: ${volatilitySlippageBps.toFixed(1)}bp, Size: ${sizeSlippageBps.toFixed(1)}bp, Time: ${timeSlippageBps}bp`,
  };
}

/**
 * Simulate if a limit order would be filled
 */
export function wouldLimitOrderFill(
  limitPrice: number,
  currentPrice: number,
  side: 'buy' | 'sell',
  volatility: number = 0.1
): boolean {
  // Limit buy: Fills if market price goes DOWN to limit price
  // Limit sell: Fills if market price goes UP to limit price

  const priceMovement = volatility * currentPrice * 0.01; // 1% of volatility

  if (side === 'buy') {
    const potentialLowPrice = currentPrice - priceMovement;
    return limitPrice >= potentialLowPrice;
  } else {
    const potentialHighPrice = currentPrice + priceMovement;
    return limitPrice <= potentialHighPrice;
  }
}

/**
 * Get market volatility from API
 */
export async function fetchMarketVolatility(symbol: string): Promise<number> {
  try {
    // OPTIMIZED: Use canonical Binance market-data provider
    const priceChangePercent = Math.abs(
      (await marketDataProvider.get24hChange(symbol.toUpperCase())) || 0,
    );

    // Normalize to 0-1 scale (assuming max daily volatility is 20%)
    const normalizedVolatility = Math.min(priceChangePercent / 20, 1);

    updateVolatility(symbol, normalizedVolatility);

    return normalizedVolatility;
  } catch (error) {
    console.warn('Failed to fetch volatility, using cached/default:', error);
    return getCachedVolatility(symbol);
  }
}

/**
 * Format slippage for display
 */
export function formatSlippage(slippageBps: number): string {
  if (slippageBps === 0) return '0.00%';
  const percentage = slippageBps / 100;
  return `${percentage.toFixed(2)}%`;
}

/**
 * Get slippage severity level
 */
export function getSlippageSeverity(slippageBps: number): 'low' | 'medium' | 'high' | 'extreme' {
  if (slippageBps < 10) return 'low';      // < 0.1%
  if (slippageBps < 25) return 'medium';   // 0.1% - 0.25%
  if (slippageBps < 50) return 'high';     // 0.25% - 0.5%
  return 'extreme';                         // > 0.5%
}

/**
 * Get slippage color for UI
 */
export function getSlippageColorClass(severity: 'low' | 'medium' | 'high' | 'extreme'): string {
  switch (severity) {
    case 'low':
      return 'text-green-600';
    case 'medium':
      return 'text-yellow-600';
    case 'high':
      return 'text-orange-600';
    case 'extreme':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
}
