/**
 * Portfolio Optimization Engine
 * Modern Portfolio Theory + Risk Parity + Correlation Management
 */

import type { AutoTradingTrade, UserAutoTradingConfig } from './types'

export interface AssetAllocation {
  symbol: string
  targetWeight: number
  currentWeight: number
  recommendedAction: 'increase' | 'decrease' | 'hold'
  actionSize: number
  reason: string
}

export interface PortfolioOptimization {
  totalValue: number
  cashReserve: number
  allocations: AssetAllocation[]
  
  // Risk metrics
  portfolioVolatility: number
  expectedReturn: number
  sharpeRatio: number
  diversificationScore: number // 0-100
  
  // Recommendations
  rebalancingNeeded: boolean
  suggestedTrades: {
    symbol: string
    action: 'buy' | 'sell'
    amount: number
    reason: string
  }[]
  
  // Risk warnings
  concentrationRisk: boolean
  correlationRisk: boolean
  sectorRisk: boolean
}

interface AssetMetrics {
  symbol: string
  expectedReturn: number
  volatility: number
  correlations: Map<string, number>
  sharpe: number
  maxDrawdown: number
}

// Maximum allocation limits for risk management
const ALLOCATION_LIMITS = {
  maxSingleAsset: 0.30,      // Max 30% in one asset
  maxCorrelatedGroup: 0.50,  // Max 50% in correlated assets
  minCashReserve: 0.05,      // Keep 5% cash minimum
  targetDiversification: 0.7 // Target correlation-based diversification
}

/**
 * Optimize portfolio allocation using Modern Portfolio Theory
 */
export function optimizePortfolio(
  currentTrades: AutoTradingTrade[],
  availableSymbols: string[],
  cashBalance: number,
  config: UserAutoTradingConfig
): PortfolioOptimization {
  const totalValue = calculateTotalValue(currentTrades, cashBalance)
  const assetMetrics = calculateAssetMetrics(availableSymbols)
  
  // Calculate current weights
  const currentWeights = calculateCurrentWeights(currentTrades, totalValue)
  
  // Calculate optimal weights using mean-variance optimization
  const optimalWeights = calculateOptimalWeights(assetMetrics, config)
  
  // Apply risk constraints
  const constrainedWeights = applyRiskConstraints(optimalWeights, assetMetrics)
  
  // Generate allocations
  const allocations: AssetAllocation[] = availableSymbols.map(symbol => {
    const current = currentWeights.get(symbol) || 0
    const target = constrainedWeights.get(symbol) || 0
    
    let recommendedAction: 'increase' | 'decrease' | 'hold' = 'hold'
    let actionSize = 0
    
    const diff = target - current
    if (Math.abs(diff) > 0.05) { // 5% threshold for rebalancing
      recommendedAction = diff > 0 ? 'increase' : 'decrease'
      actionSize = Math.abs(diff)
    }
    
    return {
      symbol,
      targetWeight: target,
      currentWeight: current,
      recommendedAction,
      actionSize,
      reason: generateReason(diff, symbol, assetMetrics.find(a => a.symbol === symbol)!)
    }
  })
  
  // Calculate portfolio metrics
  const portfolioVolatility = calculatePortfolioVolatility(allocations, assetMetrics)
  const expectedReturn = calculateExpectedReturn(allocations, assetMetrics)
  const sharpeRatio = portfolioVolatility > 0 ? expectedReturn / portfolioVolatility : 0
  const diversificationScore = calculateDiversificationScore(allocations, assetMetrics)
  
  // Check risks
  const concentrationRisk = allocations.some(a => a.currentWeight > ALLOCATION_LIMITS.maxSingleAsset)
  const correlationRisk = checkCorrelationRisk(allocations, assetMetrics)
  
  // Generate rebalancing trades
  const suggestedTrades = generateRebalancingTrades(allocations, totalValue)
  
  return {
    totalValue,
    cashReserve: cashBalance / totalValue,
    allocations,
    portfolioVolatility,
    expectedReturn,
    sharpeRatio,
    diversificationScore,
    rebalancingNeeded: allocations.some(a => a.recommendedAction !== 'hold'),
    suggestedTrades,
    concentrationRisk,
    correlationRisk,
    sectorRisk: false // Would need sector data
  }
}

/**
 * Calculate optimal weights using mean-variance optimization
 */
function calculateOptimalWeights(
  assets: AssetMetrics[],
  config: UserAutoTradingConfig
): Map<string, number> {
  // Risk-parity approach: allocate based on inverse volatility
  const inverseVolWeights = new Map<string, number>()
  let totalInverseVol = 0
  
  for (const asset of assets) {
    const inverseVol = asset.volatility > 0 ? 1 / asset.volatility : 0
    inverseVolWeights.set(asset.symbol, inverseVol)
    totalInverseVol += inverseVol
  }
  
  // Normalize to sum to 1
  const weights = new Map<string, number>()
  for (const [symbol, invVol] of inverseVolWeights) {
    weights.set(symbol, totalInverseVol > 0 ? invVol / totalInverseVol : 1 / assets.length)
  }
  
  // Adjust based on risk level preference
  const riskAdjustment = config.risk_level === 'conservative' ? 0.8 :
                         config.risk_level === 'aggressive' ? 1.2 : 1.0
  
  // Apply adjustment and renormalize
  let totalWeight = 0
  for (const [symbol, weight] of weights) {
    const adjusted = Math.min(weight * riskAdjustment, ALLOCATION_LIMITS.maxSingleAsset)
    weights.set(symbol, adjusted)
    totalWeight += adjusted
  }
  
  // Final normalization
  for (const [symbol, weight] of weights) {
    weights.set(symbol, weight / totalWeight)
  }
  
  return weights
}

/**
 * Apply risk constraints to prevent over-concentration
 */
function applyRiskConstraints(
  weights: Map<string, number>,
  assets: AssetMetrics[]
): Map<string, number> {
  const constrained = new Map(weights)
  
  // Cap individual positions
  let adjustmentsNeeded = true
  let iterations = 0
  
  while (adjustmentsNeeded && iterations < 10) {
    adjustmentsNeeded = false
    let excessWeight = 0
    let numUnderLimit = 0
    
    // Find over-limit positions
    for (const [symbol, weight] of constrained) {
      if (weight > ALLOCATION_LIMITS.maxSingleAsset) {
        excessWeight += weight - ALLOCATION_LIMITS.maxSingleAsset
        constrained.set(symbol, ALLOCATION_LIMITS.maxSingleAsset)
        adjustmentsNeeded = true
      } else {
        numUnderLimit++
      }
    }
    
    // Redistribute excess to under-limit positions
    if (excessWeight > 0 && numUnderLimit > 0) {
      const redistribution = excessWeight / numUnderLimit
      for (const [symbol, weight] of constrained) {
        if (weight < ALLOCATION_LIMITS.maxSingleAsset) {
          constrained.set(symbol, weight + redistribution)
        }
      }
    }
    
    iterations++
  }
  
  return constrained
}

/**
 * Correlation Matrix for major crypto assets
 * Basert på historiske data (2023-2024)
 * Verdier: 0-1 hvor 1 = perfekt korrelasjon
 */
export const CORRELATION_MATRIX: Record<string, Record<string, number>> = {
  'BTCUSDT': { 'BTCUSDT': 1.0, 'ETHUSDT': 0.85, 'SOLUSDT': 0.75, 'BNBUSDT': 0.70, 'ADAUSDT': 0.72, 'AVAXUSDT': 0.78, 'DOTUSDT': 0.76, 'MATICUSDT': 0.74, 'LINKUSDT': 0.73, 'XRPUSDT': 0.68 },
  'ETHUSDT': { 'BTCUSDT': 0.85, 'ETHUSDT': 1.0, 'SOLUSDT': 0.82, 'BNBUSDT': 0.75, 'ADAUSDT': 0.80, 'AVAXUSDT': 0.84, 'DOTUSDT': 0.81, 'MATICUSDT': 0.85, 'LINKUSDT': 0.83, 'XRPUSDT': 0.71 },
  'SOLUSDT': { 'BTCUSDT': 0.75, 'ETHUSDT': 0.82, 'SOLUSDT': 1.0, 'BNBUSDT': 0.68, 'ADAUSDT': 0.77, 'AVAXUSDT': 0.79, 'DOTUSDT': 0.74, 'MATICUSDT': 0.78, 'LINKUSDT': 0.76, 'XRPUSDT': 0.65 },
  'BNBUSDT': { 'BTCUSDT': 0.70, 'ETHUSDT': 0.75, 'SOLUSDT': 0.68, 'BNBUSDT': 1.0, 'ADAUSDT': 0.66, 'AVAXUSDT': 0.69, 'DOTUSDT': 0.67, 'MATICUSDT': 0.68, 'LINKUSDT': 0.66, 'XRPUSDT': 0.62 },
  'ADAUSDT': { 'BTCUSDT': 0.72, 'ETHUSDT': 0.80, 'SOLUSDT': 0.77, 'BNBUSDT': 0.66, 'ADAUSDT': 1.0, 'AVAXUSDT': 0.81, 'DOTUSDT': 0.79, 'MATICUSDT': 0.80, 'LINKUSDT': 0.78, 'XRPUSDT': 0.70 },
  'AVAXUSDT': { 'BTCUSDT': 0.78, 'ETHUSDT': 0.84, 'SOLUSDT': 0.79, 'BNBUSDT': 0.69, 'ADAUSDT': 0.81, 'AVAXUSDT': 1.0, 'DOTUSDT': 0.82, 'MATICUSDT': 0.83, 'LINKUSDT': 0.80, 'XRPUSDT': 0.72 },
  'DOTUSDT': { 'BTCUSDT': 0.76, 'ETHUSDT': 0.81, 'SOLUSDT': 0.74, 'BNBUSDT': 0.67, 'ADAUSDT': 0.79, 'AVAXUSDT': 0.82, 'DOTUSDT': 1.0, 'MATICUSDT': 0.81, 'LINKUSDT': 0.79, 'XRPUSDT': 0.71 },
  'MATICUSDT': { 'BTCUSDT': 0.74, 'ETHUSDT': 0.85, 'SOLUSDT': 0.78, 'BNBUSDT': 0.68, 'ADAUSDT': 0.80, 'AVAXUSDT': 0.83, 'DOTUSDT': 0.81, 'MATICUSDT': 1.0, 'LINKUSDT': 0.81, 'XRPUSDT': 0.70 },
  'LINKUSDT': { 'BTCUSDT': 0.73, 'ETHUSDT': 0.83, 'SOLUSDT': 0.76, 'BNBUSDT': 0.66, 'ADAUSDT': 0.78, 'AVAXUSDT': 0.80, 'DOTUSDT': 0.79, 'MATICUSDT': 0.81, 'LINKUSDT': 1.0, 'XRPUSDT': 0.69 },
  'XRPUSDT': { 'BTCUSDT': 0.68, 'ETHUSDT': 0.71, 'SOLUSDT': 0.65, 'BNBUSDT': 0.62, 'ADAUSDT': 0.70, 'AVAXUSDT': 0.72, 'DOTUSDT': 0.71, 'MATICUSDT': 0.70, 'LINKUSDT': 0.69, 'XRPUSDT': 1.0 }
}

/**
 * Get correlation between two symbols
 */
export function getCorrelation(symbol1: string, symbol2: string): number {
  if (symbol1 === symbol2) return 1.0
  return CORRELATION_MATRIX[symbol1]?.[symbol2] || 0.75 // Default 0.75 for unknown pairs
}

/**
 * Check if a new trade would create excessive correlation
 * Brukes FØR en trade åpnes
 */
export function checkNewTradeCorrelation(
  newSymbol: string,
  openPositions: AutoTradingTrade[],
  riskLevel: string
): { allowed: boolean; reason?: string; avgCorrelation: number } {
  // Korrelasjonsgrenser per risikonivå
  const correlationLimits: Record<string, { maxCorrelation: number; maxPositions: number }> = {
    'conservative': { maxCorrelation: 0.80, maxPositions: 2 },
    'balanced': { maxCorrelation: 0.85, maxPositions: 4 },
    'aggressive': { maxCorrelation: 0.90, maxPositions: 6 },
    'custom': { maxCorrelation: 0.85, maxPositions: 4 }
  }

  const limits = correlationLimits[riskLevel] || correlationLimits['balanced']

  // Sjekk maks antall posisjoner
  if (openPositions.length >= limits.maxPositions) {
    return {
      allowed: false,
      reason: `Maks antall posisjoner nådd (${limits.maxPositions})`,
      avgCorrelation: 1.0
    }
  }

  // Beregn gjennomsnittlig korrelasjon med eksisterende posisjoner
  if (openPositions.length === 0) {
    return { allowed: true, avgCorrelation: 0 }
  }

  let totalCorrelation = 0
  const highCorrelationPairs: string[] = []

  for (const pos of openPositions) {
    const correlation = getCorrelation(newSymbol, pos.symbol)
    totalCorrelation += correlation

    if (correlation > limits.maxCorrelation) {
      highCorrelationPairs.push(`${pos.symbol} (${(correlation * 100).toFixed(0)}%)`)
    }
  }

  const avgCorrelation = totalCorrelation / openPositions.length

  // Avvis hvis for høy korrelasjon med noen eksisterende posisjon
  if (highCorrelationPairs.length > 0) {
    return {
      allowed: false,
      reason: `For høy korrelasjon med: ${highCorrelationPairs.join(', ')}. Maks tillatt: ${(limits.maxCorrelation * 100).toFixed(0)}%`,
      avgCorrelation
    }
  }

  // Sjekk total portefølje-korrelasjon
  if (avgCorrelation > 0.70) {
    return {
      allowed: false,
      reason: `Porteføljen er for korrelert (gjennomsnitt: ${(avgCorrelation * 100).toFixed(0)}%). Vent med å legge til flere posisjoner.`,
      avgCorrelation
    }
  }

  return { allowed: true, avgCorrelation }
}

/**
 * Check for excessive correlation concentration
 */
function checkCorrelationRisk(
  allocations: AssetAllocation[],
  assets: AssetMetrics[]
): boolean {
  const CORRELATION_THRESHOLD = 0.80
  
  // Group highly correlated assets
  const correlatedGroups: string[][] = []
  
  for (let i = 0; i < assets.length; i++) {
    for (let j = i + 1; j < assets.length; j++) {
      const corr = assets[i].correlations.get(assets[j].symbol) || 0
      if (corr > CORRELATION_THRESHOLD) {
        // Find or create group
        let group = correlatedGroups.find(g => 
          g.includes(assets[i].symbol) || g.includes(assets[j].symbol)
        )
        if (!group) {
          group = []
          correlatedGroups.push(group)
        }
        if (!group.includes(assets[i].symbol)) group.push(assets[i].symbol)
        if (!group.includes(assets[j].symbol)) group.push(assets[j].symbol)
      }
    }
  }
  
  // Check if any group exceeds limit
  for (const group of correlatedGroups) {
    const groupWeight = allocations
      .filter(a => group.includes(a.symbol))
      .reduce((sum, a) => sum + a.currentWeight, 0)
    
    if (groupWeight > ALLOCATION_LIMITS.maxCorrelatedGroup) {
      return true
    }
  }
  
  return false
}

/**
 * Calculate portfolio volatility
 */
function calculatePortfolioVolatility(
  allocations: AssetAllocation[],
  assets: AssetMetrics[]
): number {
  let variance = 0
  
  for (let i = 0; i < allocations.length; i++) {
    for (let j = 0; j < allocations.length; j++) {
      const wi = allocations[i].targetWeight
      const wj = allocations[j].targetWeight
      const vi = assets[i]?.volatility || 0
      const vj = assets[j]?.volatility || 0
      const corr = i === j ? 1 : (assets[i]?.correlations.get(assets[j].symbol) || 0)
      
      variance += wi * wj * vi * vj * corr
    }
  }
  
  return Math.sqrt(variance)
}

/**
 * Calculate expected portfolio return
 */
function calculateExpectedReturn(
  allocations: AssetAllocation[],
  assets: AssetMetrics[]
): number {
  return allocations.reduce((sum, alloc) => {
    const asset = assets.find(a => a.symbol === alloc.symbol)
    return sum + alloc.targetWeight * (asset?.expectedReturn || 0)
  }, 0)
}

/**
 * Calculate diversification score
 */
function calculateDiversificationScore(
  allocations: AssetAllocation[],
  assets: AssetMetrics[]
): number {
  // Herfindahl index for concentration
  const herfindahl = allocations.reduce((sum, a) => sum + a.targetWeight * a.targetWeight, 0)
  
  // Effective number of assets
  const effectiveN = 1 / herfindahl
  
  // Score based on effective number (max 10 for fully diversified)
  const score = Math.min(100, (effectiveN / 10) * 100)
  
  return Math.round(score)
}

/**
 * Generate rebalancing trade recommendations
 */
function generateRebalancingTrades(
  allocations: AssetAllocation[],
  totalValue: number
): PortfolioOptimization['suggestedTrades'] {
  const trades: PortfolioOptimization['suggestedTrades'] = []
  
  for (const alloc of allocations) {
    if (alloc.recommendedAction === 'hold') continue
    
    const tradeValue = alloc.actionSize * totalValue
    
    trades.push({
      symbol: alloc.symbol,
      action: alloc.recommendedAction === 'increase' ? 'buy' : 'sell',
      amount: tradeValue,
      reason: alloc.reason
    })
  }
  
  return trades.sort((a, b) => b.amount - a.amount)
}

// Helper functions
function calculateTotalValue(trades: AutoTradingTrade[], cash: number): number {
  const positionsValue = trades.reduce((sum, t) => {
    if (t.status === 'OPEN') {
      return sum + t.amount! + (t.unrealized_pnl || 0)
    }
    return sum
  }, 0)
  return positionsValue + cash
}

function calculateCurrentWeights(
  trades: AutoTradingTrade[],
  totalValue: number
): Map<string, number> {
  const weights = new Map<string, number>()
  
  for (const trade of trades) {
    if (trade.status !== 'OPEN') continue
    
    const value = trade.amount! + (trade.unrealized_pnl || 0)
    const current = weights.get(trade.symbol) || 0
    weights.set(trade.symbol, current + value / totalValue)
  }
  
  return weights
}

function calculateAssetMetrics(symbols: string[]): AssetMetrics[] {
  // In production, this would fetch historical data
  // Mock implementation
  return symbols.map(symbol => ({
    symbol,
    expectedReturn: 0.15 + (Math.random() - 0.5) * 0.1,
    volatility: 0.30 + (Math.random() - 0.5) * 0.1,
    correlations: new Map(),
    sharpe: 0.8,
    maxDrawdown: -0.20
  }))
}

function generateReason(diff: number, symbol: string, asset: AssetMetrics): string {
  if (Math.abs(diff) < 0.05) {
    return 'Vekt innenfor akseptabelt område'
  }
  
  if (diff > 0) {
    if (asset.sharpe > 1) {
      return `Øke eksponering - ${symbol} har sterk risk-adjusted performance (Sharpe: ${asset.sharpe.toFixed(2)})`
    }
    return `Rebalansere til target vekt for diversifisering`
  } else {
    if (asset.volatility > 0.40) {
      return `Redusere eksponering - ${symbol} har høy volatilitet (${(asset.volatility * 100).toFixed(0)}%)`
    }
    return `Ta litt profitt - overvektet sammenlignet med target`
  }
}

/**
 * Risk Parity allocation - equal risk contribution
 */
export function calculateRiskParityAllocation(
  assets: AssetMetrics[]
): Map<string, number> {
  // Target: each asset contributes equally to portfolio risk
  const weights = new Map<string, number>()
  
  // Inverse volatility weighting is a simple risk parity approach
  const invVols = assets.map(a => 1 / Math.max(a.volatility, 0.01))
  const totalInvVol = invVols.reduce((a, b) => a + b, 0)
  
  assets.forEach((asset, i) => {
    weights.set(asset.symbol, invVols[i] / totalInvVol)
  })
  
  return weights
}

/**
 * Maximum drawdown-constrained optimization
 */
export function optimizeWithDrawdownConstraint(
  assets: AssetMetrics[],
  maxAllowedDrawdown: number
): Map<string, number> {
  // Start with equal weight
  const n = assets.length
  const equalWeight = 1 / n
  const weights = new Map<string, number>()
  
  // Adjust based on individual max drawdowns
  let totalAdjustedWeight = 0
  
  for (const asset of assets) {
    // If asset has high drawdown, reduce weight
    const drawdownFactor = Math.max(0.5, 1 + (asset.maxDrawdown / maxAllowedDrawdown))
    const adjustedWeight = equalWeight * drawdownFactor
    weights.set(asset.symbol, adjustedWeight)
    totalAdjustedWeight += adjustedWeight
  }
  
  // Normalize
  for (const [symbol, weight] of weights) {
    weights.set(symbol, weight / totalAdjustedWeight)
  }
  
  return weights
}
