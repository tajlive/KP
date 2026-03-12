/**
 * Auto-Trading Enhancements
 * Kombinert implementasjon av:
 * - Smart Rebalancing
 * - Education Gates
 * - Backtest Integration
 */

import { createClient } from '@/lib/utils'
import type { AutoTradingSession, UserAutoTradingConfig, TradingPhase } from './types'

// ============================================================================
// 9. SMART REBALANSERING
// ============================================================================

interface RebalanceCheck {
  needsRebalance: boolean
  deviations: Array<{
    symbol: string
    currentWeight: number
    targetWeight: number
    deviation: number
  }>
  suggestedTrades: Array<{
    symbol: string
    action: 'buy' | 'sell'
    amount: number
  }>
}

/**
 * Check if portfolio needs rebalancing
 */
export async function checkRebalanceNeeded(
  sessionId: string,
  threshold: number = 0.05 // 5% deviation threshold
): Promise<RebalanceCheck> {
  const supabase = createClient()
  
  // Fetch session and open positions
  const { data: session } = await supabase
    .from('auto_trading_sessions')
    .select('*, config:user_auto_trading_configs(*)')
    .eq('id', sessionId)
    .single() as any

  if (!session) {
    return { needsRebalance: false, deviations: [], suggestedTrades: [] }
  }

  const { data: positions } = await supabase
    .from('auto_trading_trades')
    .select('*')
    .eq('session_id', sessionId)
    .eq('status', 'OPEN')

  if (!positions || positions.length === 0) {
    return { needsRebalance: false, deviations: [], suggestedTrades: [] }
  }

  // Calculate total value and current weights
  const totalValue = positions.reduce((sum, p) => 
    sum + p.amount + (p.unrealized_pnl || 0), 0
  ) + (session.current_capital_nok || 0)

  // Group by symbol
  const symbolValues: Record<string, number> = {}
  for (const pos of positions) {
    const value = pos.amount + (pos.unrealized_pnl || 0)
    symbolValues[pos.symbol] = (symbolValues[pos.symbol] || 0) + value
  }

  // Target: equal weight for simplicity (kan tilpasses)
  const uniqueSymbols = Object.keys(symbolValues)
  const targetWeight = 1 / uniqueSymbols.length

  // Calculate deviations
  const deviations = uniqueSymbols.map(symbol => {
    const currentWeight = symbolValues[symbol] / totalValue
    return {
      symbol,
      currentWeight,
      targetWeight,
      deviation: currentWeight - targetWeight
    }
  })

  // Check if any exceeds threshold
  const needsRebalance = deviations.some(d => Math.abs(d.deviation) > threshold)

  // Generate suggested trades
  const suggestedTrades = deviations
    .filter(d => Math.abs(d.deviation) > threshold)
    .map(d => ({
      symbol: d.symbol,
      action: (d.deviation > 0 ? 'sell' : 'buy') as 'buy' | 'sell',
      amount: Math.abs(d.deviation) * totalValue
    }))

  return { needsRebalance, deviations, suggestedTrades }
}

/**
 * Execute rebalancing (kan kalles daglig/ukentlig)
 */
export async function executeRebalancing(
  sessionId: string,
  trades: RebalanceCheck['suggestedTrades']
): Promise<{ success: boolean; executed: number }> {
  let executed = 0
  
  for (const trade of trades) {
    // I produksjon: Kall binance-executor for hver trade
    // Foreløpig: Logg bare
    console.info(`Rebalancing: ${trade.action} ${trade.symbol} for ${trade.amount} NOK`)
    executed++
  }

  return { success: true, executed }
}

// ============================================================================
// 10. EDUCATION GATES (UTDANNINGS-KRAV)
// ============================================================================

interface EducationGate {
  level: number
  name: string
  requiredCourses: string[]
  requiredDays: number
  minProfitability: number
  unlockedFeatures: string[]
}

const EDUCATION_GATES: EducationGate[] = [
  {
    level: 1,
    name: 'Grunnleggende',
    requiredCourses: ['krypto-for-smaasparere'],
    requiredDays: 0,
    minProfitability: 0,
    unlockedFeatures: ['paper_trading']
  },
  {
    level: 2,
    name: 'Paper Trading Mester',
    requiredCourses: ['krypto-for-smaasparere', 'risiko-management'],
    requiredDays: 30,
    minProfitability: 0,
    unlockedFeatures: ['auto_trading_conservative']
  },
  {
    level: 3,
    name: 'Balansert Trader',
    requiredCourses: ['krypto-for-smaasparere', 'risiko-management', 'teknisk-analyse'],
    requiredDays: 60,
    minProfitability: 0.05, // 5% total return
    unlockedFeatures: ['auto_trading_balanced']
  },
  {
    level: 4,
    name: 'Avansert Trader',
    requiredCourses: ['krypto-for-smaasparere', 'risiko-management', 'teknisk-analyse', 'avansert-strategi'],
    requiredDays: 90,
    minProfitability: 0.10, // 10% total return
    unlockedFeatures: ['auto_trading_aggressive', 'grid_trading']
  },
  {
    level: 5,
    name: 'Mester Trader',
    requiredCourses: ['krypto-for-smaasparere', 'risiko-management', 'teknisk-analyse', 'avansert-strategi'],
    requiredDays: 120,
    minProfitability: 0.15, // 15% total return
    unlockedFeatures: ['auto_trading_dynamic', 'dca_bot', 'all_strategies']
  }
]

export interface EducationStatus {
  currentLevel: number
  nextGate: EducationGate | null
  canProgress: boolean
  missingRequirements: string[]
  completedCourses: string[]
}

/**
 * Check user's education progress and available features
 */
export async function checkEducationStatus(
  userId: string,
  sessionId: string
): Promise<EducationStatus> {
  const supabase = createClient()

  // Fetch completed courses
  const { data: completedCourses } = await supabase
    .from('course_progress')
    .select('course_slug, completed')
    .eq('user_id', userId)
    .eq('completed', true)

  const completedSlugs = completedCourses?.map(c => c.course_slug) || []

  // Fetch session data
  const { data: session } = await supabase
    .from('auto_trading_sessions')
    .select('*')
    .eq('id', sessionId)
    .single() as any

  if (!session) {
    return {
      currentLevel: 1,
      nextGate: EDUCATION_GATES[1],
      canProgress: false,
      missingRequirements: ['Ingen aktiv session'],
      completedCourses: completedSlugs
    }
  }

  // Calculate days active
  const daysActive = Math.floor(
    (Date.now() - new Date(session.created_at).getTime()) / (1000 * 60 * 60 * 24)
  )

  // Calculate profitability
  const totalReturn = session.starting_capital_nok > 0
    ? (session.current_capital_nok - session.starting_capital_nok) / session.starting_capital_nok
    : 0

  // Find current level
  let currentLevel = 1
  for (let i = EDUCATION_GATES.length - 1; i >= 0; i--) {
    const gate = EDUCATION_GATES[i]
    const hasAllCourses = gate.requiredCourses.every(c => completedSlugs.includes(c))
    const hasDays = daysActive >= gate.requiredDays
    const hasProfit = totalReturn >= gate.minProfitability

    if (hasAllCourses && hasDays && hasProfit) {
      currentLevel = gate.level
      break
    }
  }

  // Check next gate requirements
  const nextGate = EDUCATION_GATES[currentLevel] || null
  const missingRequirements: string[] = []

  if (nextGate) {
    // Check missing courses
    for (const course of nextGate.requiredCourses) {
      if (!completedSlugs.includes(course)) {
        missingRequirements.push(`Fullfør kurs: ${course}`)
      }
    }

    // Check days
    if (daysActive < nextGate.requiredDays) {
      missingRequirements.push(`${nextGate.requiredDays - daysActive} dager igjen`)
    }

    // Check profitability
    if (totalReturn < nextGate.minProfitability) {
      missingRequirements.push(`Profitabilitet: ${(totalReturn * 100).toFixed(1)}% / ${(nextGate.minProfitability * 100).toFixed(0)}%`)
    }
  }

  return {
    currentLevel,
    nextGate,
    canProgress: missingRequirements.length === 0,
    missingRequirements,
    completedCourses: completedSlugs
  }
}

/**
 * Check if user can access specific auto-trading feature
 */
export async function canAccessFeature(
  userId: string,
  sessionId: string,
  feature: string
): Promise<{ allowed: boolean; reason?: string }> {
  const status = await checkEducationStatus(userId, sessionId)

  // Map features to required levels
  const featureLevels: Record<string, number> = {
    'paper_trading': 1,
    'auto_trading_conservative': 2,
    'auto_trading_balanced': 3,
    'auto_trading_aggressive': 4,
    'auto_trading_dynamic': 5,
    'grid_trading': 4,
    'dca_bot': 5
  }

  const requiredLevel = featureLevels[feature] || 1

  if (status.currentLevel >= requiredLevel) {
    return { allowed: true }
  }

  return {
    allowed: false,
    reason: `${feature} krever nivå ${requiredLevel}. Du er på nivå ${status.currentLevel}. ${status.missingRequirements.join(', ')}`
  }
}

// ============================================================================
// 8. BACKTEST INTEGRATION HELPERS
// ============================================================================

export interface BacktestResult {
  strategy: string
  riskLevel: string
  period: { start: string; end: string }
  totalReturn: number
  maxDrawdown: number
  winRate: number
  sharpeRatio: number
  totalTrades: number
  profitFactor: number
  equityCurve: Array<{ date: string; value: number }>
}

/**
 * Format backtest result for display
 */
export function formatBacktestResult(result: BacktestResult): {
  summary: string
  metrics: Array<{ label: string; value: string; positive: boolean }>
} {
  const formatPct = (n: number) => `${n >= 0 ? '+' : ''}${(n * 100).toFixed(2)}%`
  
  return {
    summary: `${result.strategy} (${result.riskLevel}) - ${formatPct(result.totalReturn)} på ${result.totalTrades} handler`,
    metrics: [
      { label: 'Total avkastning', value: formatPct(result.totalReturn), positive: result.totalReturn > 0 },
      { label: 'Max drawdown', value: formatPct(-result.maxDrawdown), positive: result.maxDrawdown < 0.15 },
      { label: 'Win rate', value: `${(result.winRate * 100).toFixed(1)}%`, positive: result.winRate > 0.5 },
      { label: 'Sharpe ratio', value: result.sharpeRatio.toFixed(2), positive: result.sharpeRatio > 1 },
      { label: 'Profit factor', value: result.profitFactor.toFixed(2), positive: result.profitFactor > 1.5 }
    ]
  }
}

/**
 * Get rebalancing schedule based on risk level
 */
export function getRebalancingSchedule(riskLevel: string): {
  frequency: 'daily' | 'weekly' | 'monthly'
  threshold: number
} {
  const schedules: Record<string, { frequency: 'daily' | 'weekly' | 'monthly'; threshold: number }> = {
    'conservative': { frequency: 'monthly', threshold: 0.05 },
    'balanced': { frequency: 'weekly', threshold: 0.07 },
    'aggressive': { frequency: 'daily', threshold: 0.10 },
    'custom': { frequency: 'weekly', threshold: 0.07 }
  }

  return schedules[riskLevel] || schedules['balanced']
}
