/**
 * Multi-Timeframe Analysis
 * Bekrefter signaler på flere timeframes for å redusere falske signaler
 */

import type { MarketData, TechnicalIndicators } from './strategies/base-strategy'

export type Timeframe = '1h' | '4h' | '1d' | '1w'

export interface MultiTimeframeData {
  timeframe: Timeframe
  trend: 'up' | 'down' | 'sideways'
  strength: number // 0-100
  indicators: TechnicalIndicators
}

export interface TimeframeAlignment {
  aligned: boolean
  confidence: number
  primaryTrend: 'up' | 'down' | 'sideways'
  consensus: string
}

/**
 * Analyze trend on a specific timeframe
 */
export function analyzeTimeframe(
  prices: number[],
  timeframe: Timeframe
): { trend: 'up' | 'down' | 'sideways'; strength: number } {
  if (prices.length < 20) {
    return { trend: 'sideways', strength: 0 }
  }

  // Calculate SMAs
  const sma20 = prices.slice(-20).reduce((a, b) => a + b, 0) / 20
  const sma50 = prices.length >= 50 
    ? prices.slice(-50).reduce((a, b) => a + b, 0) / 50 
    : sma20

  // Price relative to MAs
  const currentPrice = prices[prices.length - 1]
  const priceVsSMA20 = (currentPrice - sma20) / sma20
  const priceVsSMA50 = (currentPrice - sma50) / sma50

  // Determine trend
  let trend: 'up' | 'down' | 'sideways'
  let strength = 0

  if (priceVsSMA20 > 0.02 && priceVsSMA50 > 0.01) {
    trend = 'up'
    strength = Math.min(100, (priceVsSMA20 + priceVsSMA50) * 1000)
  } else if (priceVsSMA20 < -0.02 && priceVsSMA50 < -0.01) {
    trend = 'down'
    strength = Math.min(100, Math.abs(priceVsSMA20 + priceVsSMA50) * 1000)
  } else {
    trend = 'sideways'
    strength = 50 - Math.abs(priceVsSMA20) * 1000
  }

  return { trend, strength: Math.max(0, Math.min(100, strength)) }
}

/**
 * Check alignment across multiple timeframes
 * Krev alignment: Alle 3 timeframes MÅ peke samme retning for høy konfidens
 */
export function checkTimeframeAlignment(
  dailyData: MultiTimeframeData,
  h4Data: MultiTimeframeData,
  weeklyData: MultiTimeframeData
): TimeframeAlignment {
  const timeframes = [dailyData, h4Data, weeklyData]
  
  // Count trends
  const upCount = timeframes.filter(t => t.trend === 'up').length
  const downCount = timeframes.filter(t => t.trend === 'down').length
  const sidewaysCount = timeframes.filter(t => t.trend === 'sideways').length

  // Determine primary trend
  let primaryTrend: 'up' | 'down' | 'sideways'
  if (upCount >= 2) primaryTrend = 'up'
  else if (downCount >= 2) primaryTrend = 'down'
  else primaryTrend = 'sideways'

  // Calculate alignment
  const aligned = upCount === 3 || downCount === 3
  
  // Calculate average strength
  const avgStrength = timeframes.reduce((sum, t) => sum + t.strength, 0) / 3
  
  // Confidence boost if all aligned
  const confidence = aligned 
    ? Math.min(100, avgStrength * 1.3) 
    : Math.min(100, avgStrength * 0.6)

  // Generate consensus message
  let consensus: string
  if (aligned) {
    consensus = `Sterk ${primaryTrend} trend bekreftet på alle timeframes`
  } else if (upCount >= 2 || downCount >= 2) {
    consensus = `Svak ${primaryTrend} trend - motstridende signaler på noen timeframes`
  } else {
    consensus = 'Uklart signal - markedet er i overgangsfase'
  }

  return {
    aligned,
    confidence,
    primaryTrend,
    consensus
  }
}

/**
 * Get timeframe weight for signal adjustment
 */
export function getTimeframeWeight(alignment: TimeframeAlignment): number {
  if (alignment.aligned) {
    return 1.3 // 30% boost when all timeframes align
  } else if (alignment.primaryTrend !== 'sideways') {
    return 0.8 // Reduce confidence when conflicting
  } else {
    return 0.5 // Significant reduction in sideways/unclear markets
  }
}

const TIMEFRAME_TO_INTERVAL: Record<Timeframe, string> = {
  '1h': '1h',
  '4h': '4h',
  '1d': '1d',
  '1w': '1w',
}

/**
 * Fetch historical close prices from Kraken klines (via egen rute — EU/EØS 2026).
 * Returns 200 candles for sufficient indicator warmup.
 */
export async function fetchTimeframeData(
  symbol: string,
  timeframe: Timeframe
): Promise<number[]> {
  const interval = TIMEFRAME_TO_INTERVAL[timeframe]
  const limit = 200
  const url = `/api/market/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Kraken klines HTTP ${res.status} for ${symbol} ${timeframe}`)
  }
  const body = (await res.json()) as {
    klines?: Array<{ close: number }>
  }
  return (body.klines ?? []).map((k) => k.close)
}
