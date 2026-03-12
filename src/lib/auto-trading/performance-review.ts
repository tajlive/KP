/**
 * Weekly Performance Review System
 * Automated analysis of strategy performance with recommendations
 */

import { createClient } from '@/lib/utils'
import type { 
  AutoTradingStrategy, 
  UserAutoTradingConfig,
  AutoTradingSession,
  AutoTradingTrade 
} from './types'
import { analyzeCurrentMarket, getOverallMarketHealth } from './market-regime'

export interface PerformanceMetrics {
  // Time period
  period: { start: Date; end: Date; days: number }
  
  // Returns
  totalReturn: number // %
  annualizedReturn: number // %
  
  // Risk metrics
  maxDrawdown: number // % (negative)
  volatility: number // Annualized
  sharpeRatio: number
  sortinoRatio: number
  
  // Trade metrics
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number // %
  avgWin: number // %
  avgLoss: number // %
  profitFactor: number // Gross profit / Gross loss
  expectancy: number // Expected return per trade
  
  // Comparison
  vsBuyAndHold: number // % difference
  vsDCA: number // % difference
  
  // Efficiency
  avgTradeDuration: number // hours
  maxConsecutiveLosses: number
  bestDay: number // %
  worstDay: number // %
}

export interface StrategyAssessment {
  // Overall grade
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  score: number // 0-100
  
  // Component scores
  profitabilityScore: number
  riskScore: number
  consistencyScore: number
  efficiencyScore: number
  
  // Assessment
  isPerforming: boolean
  isUnderperforming: boolean
  riskLevel: 'safe' | 'moderate' | 'high' | 'dangerous'
  
  // Recommendations
  recommendations: string[]
  warnings: string[]
  suggestedActions: {
    type: 'continue' | 'adjust' | 'pause' | 'switch' | 'stop'
    priority: 'high' | 'medium' | 'low'
    description: string
    reason: string
  }[]
}

export interface WeeklyReview {
  userId: string
  sessionId: string
  generatedAt: Date
  
  metrics: PerformanceMetrics
  assessment: StrategyAssessment
  marketContext: {
    regime: string
    health: string
    impact: string
  }
  
  // Action items
  immediateActions: string[]
  weeklyGoals: string[]
  
  // Learning
  whatWorked: string[]
  whatDidnt: string[]
  lessonsLearned: string[]
}

// Scoring thresholds
const SCORING = {
  profitability: {
    excellent: 0.15, // 15% annualized
    good: 0.08,      // 8% annualized
    acceptable: 0.02 // 2% annualized
  },
  risk: {
    maxDrawdown: -0.15,     // 15% max drawdown
    maxVolatility: 0.30,    // 30% annual volatility
    minSharpe: 0.5          // Minimum Sharpe ratio
  },
  winRate: {
    excellent: 0.60,
    good: 0.55,
    acceptable: 0.45
  }
}

/**
 * Generate comprehensive weekly review for a user
 */
export async function generateWeeklyReview(
  userId: string,
  sessionId?: string
): Promise<WeeklyReview | null> {
  const supabase = createClient()
  
  // Get or find active session
  let activeSessionId = sessionId
  if (!activeSessionId) {
    const { data: session } = await supabase
      .from('auto_trading_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .single() as any
    
    if (session) activeSessionId = session.id
  }
  
  if (!activeSessionId) return null
  
  // Get trades for last 30 days
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
  
  const { data: trades } = await supabase
    .from('auto_trading_trades')
    .select('*')
    .eq('session_id', activeSessionId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false })
  
  if (!trades || trades.length === 0) {
    return generateEmptyReview(userId, activeSessionId)
  }
  
  // Calculate metrics
  const metrics = calculateMetrics(trades, startDate, endDate)
  
  // Assess strategy
  const assessment = assessStrategy(metrics)
  
  // Get market context
  const marketHealth = await getOverallMarketHealth()
  const btcRegime = await analyzeCurrentMarket('BTC')
  
  // Generate review
  const review: WeeklyReview = {
    userId,
    sessionId: activeSessionId,
    generatedAt: new Date(),
    metrics,
    assessment,
    marketContext: {
      regime: btcRegime.regime,
      health: marketHealth.health,
      impact: getMarketImpactDescription(btcRegime.regime, metrics)
    },
    immediateActions: generateImmediateActions(assessment, metrics),
    weeklyGoals: generateWeeklyGoals(assessment, metrics),
    whatWorked: identifyWhatWorked(trades),
    whatDidnt: identifyWhatDidnt(trades),
    lessonsLearned: extractLessons(trades, metrics)
  }
  
  // Store review in database
  await storeReview(review)
  
  return review
}

/**
 * Calculate comprehensive performance metrics
 */
function calculateMetrics(
  trades: AutoTradingTrade[],
  startDate: Date,
  endDate: Date
): PerformanceMetrics {
  // Calculate returns
  const closedTrades = trades.filter(t => t.status === 'CLOSED' && t.realized_pnl !== null)
  
  if (closedTrades.length === 0) {
    return getEmptyMetrics(startDate, endDate)
  }
  
  const returns = closedTrades.map(t => t.realized_pnl! / t.amount!)
  const totalReturn = returns.reduce((a, b) => a + b, 0)
  
  const days = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const annualizedReturn = Math.pow(1 + totalReturn, 365.25 / days) - 1
  
  // Win/loss analysis
  const winningTrades = returns.filter(r => r > 0)
  const losingTrades = returns.filter(r => r <= 0)
  
  const avgWin = winningTrades.length > 0 
    ? winningTrades.reduce((a, b) => a + b, 0) / winningTrades.length 
    : 0
  const avgLoss = losingTrades.length > 0
    ? losingTrades.reduce((a, b) => a + b, 0) / losingTrades.length
    : 0
  
  const grossProfit = winningTrades.reduce((a, b) => a + b, 0)
  const grossLoss = Math.abs(losingTrades.reduce((a, b) => a + b, 0))
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0
  
  const winRate = closedTrades.length > 0 ? winningTrades.length / closedTrades.length : 0
  
  // Expectancy
  const expectancy = (winRate * avgWin) + ((1 - winRate) * avgLoss)
  
  // Calculate drawdown
  const maxDrawdown = calculateMaxDrawdown(returns)
  
  // Volatility and ratios
  const volatility = calculateVolatility(returns) * Math.sqrt(365.25)
  const sharpeRatio = volatility > 0 ? (annualizedReturn - 0.02) / volatility : 0
  
  // Sortino (downside deviation only)
  const downsideReturns = returns.filter(r => r < 0)
  const downsideDeviation = downsideReturns.length > 0
    ? Math.sqrt(downsideReturns.reduce((sum, r) => sum + r * r, 0) / downsideReturns.length) * Math.sqrt(365.25)
    : 0
  const sortinoRatio = downsideDeviation > 0 ? (annualizedReturn - 0.02) / downsideDeviation : 0
  
  // Trade duration
  const durations = closedTrades.map(t => {
    const open = new Date(t.created_at)
    const close = new Date(t.closed_at!)
    return (close.getTime() - open.getTime()) / (1000 * 60 * 60) // hours
  })
  const avgTradeDuration = durations.reduce((a, b) => a + b, 0) / durations.length
  
  // Consecutive losses
  const maxConsecutiveLosses = calculateMaxConsecutiveLosses(returns)
  
  // Daily best/worst
  const dailyReturns = aggregateDailyReturns(trades)
  const bestDay = dailyReturns.length > 0 ? Math.max(...dailyReturns) : 0
  const worstDay = dailyReturns.length > 0 ? Math.min(...dailyReturns) : 0
  
  return {
    period: { start: startDate, end: endDate, days: Math.round(days) },
    totalReturn,
    annualizedReturn,
    maxDrawdown,
    volatility,
    sharpeRatio,
    sortinoRatio,
    totalTrades: closedTrades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate,
    avgWin,
    avgLoss,
    profitFactor,
    expectancy,
    vsBuyAndHold: 0, // Would need market data
    vsDCA: 0,        // Would need calculation
    avgTradeDuration,
    maxConsecutiveLosses,
    bestDay,
    worstDay
  }
}

function calculateMaxDrawdown(returns: number[]): number {
  let peak = 0
  let maxDrawdown = 0
  let cumulative = 0
  
  for (const ret of returns) {
    cumulative += ret
    if (cumulative > peak) {
      peak = cumulative
    }
    const drawdown = (cumulative - peak) / (1 + peak)
    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown
    }
  }
  
  return maxDrawdown
}

function calculateVolatility(returns: number[]): number {
  if (returns.length < 2) return 0
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  const squaredDiffs = returns.map(r => Math.pow(r - mean, 2))
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / returns.length)
}

function calculateMaxConsecutiveLosses(returns: number[]): number {
  let maxConsecutive = 0
  let currentConsecutive = 0
  
  for (const ret of returns) {
    if (ret <= 0) {
      currentConsecutive++
      maxConsecutive = Math.max(maxConsecutive, currentConsecutive)
    } else {
      currentConsecutive = 0
    }
  }
  
  return maxConsecutive
}

function aggregateDailyReturns(trades: AutoTradingTrade[]): number[] {
  const dailyMap = new Map<string, number>()
  
  for (const trade of trades) {
    if (trade.status !== 'CLOSED' || trade.realized_pnl! === null) continue
    
    const date = new Date(trade.closed_at!).toISOString().split('T')[0]
    const current = dailyMap.get(date) || 0
    dailyMap.set(date, current + trade.realized_pnl!)
  }
  
  return Array.from(dailyMap.values())
}

/**
 * Assess strategy performance and generate recommendations
 */
function assessStrategy(metrics: PerformanceMetrics): StrategyAssessment {
  // Score components (0-100)
  const profitabilityScore = scoreProfitability(metrics)
  const riskScore = scoreRisk(metrics)
  const consistencyScore = scoreConsistency(metrics)
  const efficiencyScore = scoreEfficiency(metrics)
  
  // Overall score
  const score = Math.round(
    profitabilityScore * 0.35 +
    riskScore * 0.30 +
    consistencyScore * 0.20 +
    efficiencyScore * 0.15
  )
  
  // Grade
  const grade = scoreToGrade(score)
  
  // Risk level
  const riskLevel = determineRiskLevel(metrics)
  
  // Performance status
  const isPerforming = score >= 70 && metrics.annualizedReturn > SCORING.profitability.acceptable
  const isUnderperforming = score < 50 || metrics.annualizedReturn < 0
  
  // Generate recommendations
  const recommendations = generateRecommendations(metrics, score)
  const warnings = generateWarnings(metrics)
  const suggestedActions = generateSuggestedActions(metrics, score, riskLevel)
  
  return {
    grade,
    score,
    profitabilityScore,
    riskScore,
    consistencyScore,
    efficiencyScore,
    isPerforming,
    isUnderperforming,
    riskLevel,
    recommendations,
    warnings,
    suggestedActions
  }
}

function scoreProfitability(metrics: PerformanceMetrics): number {
  if (metrics.annualizedReturn >= SCORING.profitability.excellent) return 100
  if (metrics.annualizedReturn >= SCORING.profitability.good) return 80
  if (metrics.annualizedReturn >= SCORING.profitability.acceptable) return 60
  if (metrics.annualizedReturn >= 0) return 40
  if (metrics.annualizedReturn >= -0.10) return 20
  return 0
}

function scoreRisk(metrics: PerformanceMetrics): number {
  let score = 100
  
  // Drawdown penalty
  if (metrics.maxDrawdown < -0.20) score -= 40
  else if (metrics.maxDrawdown < -0.15) score -= 30
  else if (metrics.maxDrawdown < -0.10) score -= 15
  else if (metrics.maxDrawdown < -0.05) score -= 5
  
  // Volatility penalty
  if (metrics.volatility > 0.50) score -= 20
  else if (metrics.volatility > 0.40) score -= 10
  else if (metrics.volatility > 0.30) score -= 5
  
  // Sharpe bonus/penalty
  if (metrics.sharpeRatio < 0) score -= 30
  else if (metrics.sharpeRatio < 0.5) score -= 15
  else if (metrics.sharpeRatio > 1.5) score += 10
  
  return Math.max(0, score)
}

function scoreConsistency(metrics: PerformanceMetrics): number {
  let score = 50
  
  // Win rate
  if (metrics.winRate >= SCORING.winRate.excellent) score += 30
  else if (metrics.winRate >= SCORING.winRate.good) score += 20
  else if (metrics.winRate >= SCORING.winRate.acceptable) score += 10
  else if (metrics.winRate < 0.40) score -= 20
  
  // Consecutive losses
  if (metrics.maxConsecutiveLosses > 7) score -= 20
  else if (metrics.maxConsecutiveLosses > 5) score -= 10
  else if (metrics.maxConsecutiveLosses <= 3) score += 10
  
  // Expectancy
  if (metrics.expectancy > 0.02) score += 10
  else if (metrics.expectancy < 0) score -= 20
  
  return Math.min(100, Math.max(0, score))
}

function scoreEfficiency(metrics: PerformanceMetrics): number {
  let score = 50
  
  // Profit factor
  if (metrics.profitFactor > 2) score += 25
  else if (metrics.profitFactor > 1.5) score += 15
  else if (metrics.profitFactor > 1.2) score += 5
  else if (metrics.profitFactor < 1) score -= 30
  
  // Trade count (avoid overtrading)
  const tradesPerDay = metrics.totalTrades / metrics.period.days
  if (tradesPerDay > 5) score -= 15
  else if (tradesPerDay > 3) score -= 5
  else if (tradesPerDay < 0.5) score -= 10 // Too few trades
  
  // Duration efficiency
  if (metrics.avgTradeDuration > 168) score -= 10 // Too long (1 week)
  if (metrics.avgTradeDuration < 1) score -= 5    // Too short (scalping)
  
  return Math.min(100, Math.max(0, score))
}

function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

function determineRiskLevel(metrics: PerformanceMetrics): 'safe' | 'moderate' | 'high' | 'dangerous' {
  if (metrics.maxDrawdown < -0.25 || metrics.volatility > 0.60) return 'dangerous'
  if (metrics.maxDrawdown < -0.15 || metrics.volatility > 0.40) return 'high'
  if (metrics.maxDrawdown < -0.08 || metrics.volatility > 0.25) return 'moderate'
  return 'safe'
}

function generateRecommendations(metrics: PerformanceMetrics, score: number): string[] {
  const recs: string[] = []
  
  if (metrics.annualizedReturn < SCORING.profitability.acceptable) {
    recs.push('Vurder å justere strategi - avkastning er under målet')
  }
  
  if (metrics.maxDrawdown < -0.15) {
    recs.push('Reduser risiko - drawdown er høyere enn anbefalt (15%)')
  }
  
  if (metrics.winRate < 0.45) {
    recs.push('Forbedre inngangstiming - win rate er under 45%')
  }
  
  if (metrics.sharpeRatio < 0.5) {
    recs.push('Risiko/Avkastning-forholdet kan forbedres')
  }
  
  if (metrics.profitFactor < 1.3) {
    recs.push('Øk størrelsen på vinnende trades i forhold til tapende')
  }
  
  if (recs.length === 0 && score >= 80) {
    recs.push('Strategien presterer godt - fortsett som nå')
  }
  
  return recs
}

function generateWarnings(metrics: PerformanceMetrics): string[] {
  const warnings: string[] = []
  
  if (metrics.maxDrawdown < -0.20) {
    warnings.push('⚠️ Høy drawdown på >20% - overvei å pause trading')
  }
  
  if (metrics.maxConsecutiveLosses > 5) {
    warnings.push(`⚠️ ${metrics.maxConsecutiveLosses} tap på rad - sjekk markedsforhold`)
  }
  
  if (metrics.annualizedReturn < -0.10) {
    warnings.push('⚠️ Negativ avkastning - strategien trenger justering')
  }
  
  if (metrics.volatility > 0.50) {
    warnings.push('⚠️ Høy volatilitet - økt risiko for store tap')
  }
  
  return warnings
}

function generateSuggestedActions(
  metrics: PerformanceMetrics, 
  score: number,
  riskLevel: string
) {
  const actions: StrategyAssessment['suggestedActions'] = []
  
  if (riskLevel === 'dangerous' || score < 40) {
    actions.push({
      type: 'stop',
      priority: 'high',
      description: 'Stopp auto-trading umiddelbart',
      reason: 'Kritisk risikonivå - beskytte gjenværende kapital'
    })
  } else if (riskLevel === 'high' || score < 60) {
    actions.push({
      type: 'pause',
      priority: 'high',
      description: 'Pause trading i 3-7 dager',
      reason: 'Re-evaluer strategi og marked'
    })
  } else if (score < 70) {
    actions.push({
      type: 'adjust',
      priority: 'medium',
      description: 'Reduser posisjonsstørrelse med 30%',
      reason: 'Forbedre risiko/avkastning-forhold'
    })
  } else {
    actions.push({
      type: 'continue',
      priority: 'low',
      description: 'Fortsett nåværende strategi',
      reason: 'God ytelse og risikokontroll'
    })
  }
  
  return actions
}

// Helper functions for empty review
function generateEmptyReview(userId: string, sessionId: string): WeeklyReview {
  return {
    userId,
    sessionId,
    generatedAt: new Date(),
    metrics: getEmptyMetrics(new Date(), new Date()),
    assessment: {
      grade: 'C',
      score: 50,
      profitabilityScore: 50,
      riskScore: 50,
      consistencyScore: 50,
      efficiencyScore: 50,
      isPerforming: false,
      isUnderperforming: false,
      riskLevel: 'moderate',
      recommendations: ['Ingen trades ennå - vent på signaler'],
      warnings: [],
      suggestedActions: [{
        type: 'continue',
        priority: 'low',
        description: 'Vent på første trade',
        reason: 'Systemet er aktivt men venter på gode innganger'
      }]
    },
    marketContext: {
      regime: 'unknown',
      health: 'moderate',
      impact: 'Venter på markeddata'
    },
    immediateActions: ['Monitor systemet daglig'],
    weeklyGoals: ['Fullfør første profitable trade'],
    whatWorked: [],
    whatDidnt: [],
    lessonsLearned: ['Tålmodighet er viktig - vent på A+ setups']
  }
}

function getEmptyMetrics(startDate: Date, endDate: Date): PerformanceMetrics {
  return {
    period: { start: startDate, end: endDate, days: 0 },
    totalReturn: 0,
    annualizedReturn: 0,
    maxDrawdown: 0,
    volatility: 0,
    sharpeRatio: 0,
    sortinoRatio: 0,
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    avgWin: 0,
    avgLoss: 0,
    profitFactor: 0,
    expectancy: 0,
    vsBuyAndHold: 0,
    vsDCA: 0,
    avgTradeDuration: 0,
    maxConsecutiveLosses: 0,
    bestDay: 0,
    worstDay: 0
  }
}

// Additional helper functions
function getMarketImpactDescription(regime: string, metrics: PerformanceMetrics): string {
  const regimeDescriptions: Record<string, string> = {
    bull: 'Bull marked har hjulpet avkastningen',
    bear: 'Bear marked har utfordret strategien',
    sideways: 'Sideways marked har gitt begrenset avkastning',
    volatile: 'Høy volatilitet har påvirket resultatene',
    uncertain: 'Usikkert marked - vanskelig å bedømme påvirkning'
  }
  return regimeDescriptions[regime] || 'Markedspåvirkning ukjent'
}

function generateImmediateActions(assessment: StrategyAssessment, metrics: PerformanceMetrics): string[] {
  const actions = assessment.suggestedActions
    .filter(a => a.priority === 'high')
    .map(a => a.description)
  
  if (actions.length === 0) {
    actions.push('Ingen umiddelbare handlinger nødvendig')
  }
  
  return actions
}

function generateWeeklyGoals(assessment: StrategyAssessment, metrics: PerformanceMetrics): string[] {
  const goals: string[] = []
  
  if (metrics.winRate < 0.50) {
    goals.push('Øk win rate til over 50%')
  }
  if (metrics.maxDrawdown < -0.10) {
    goals.push('Reduser max drawdown under 10%')
  }
  if (metrics.totalTrades < 5) {
    goals.push('Fullfør minst 5 trades denne uken')
  }
  
  goals.push('Gjennomfør ukentlig strategi-review')
  goals.push('Les og forstå alle trades som ble gjort')
  
  return goals
}

function identifyWhatWorked(trades: AutoTradingTrade[]): string[] {
  const winners = trades.filter(t => t.status === 'CLOSED' && (t.realized_pnl || 0) > 0)
  
  if (winners.length === 0) return ['Ingen vinnende trades ennå']
  
  const worked: string[] = []
  
  // Analyze patterns in winners
  const avgWinSize = winners.reduce((sum, t) => sum + (t.realized_pnl || 0), 0) / winners.length
  worked.push(`Gjennomsnittlig gevinst på ${(avgWinSize * 100).toFixed(2)}%`)
  
  // Most profitable symbol
  const symbolPnL = new Map<string, number>()
  for (const trade of winners) {
    const current = symbolPnL.get(trade.symbol) || 0
    symbolPnL.set(trade.symbol, current + (trade.realized_pnl! || 0))
  }
  const bestSymbol = Array.from(symbolPnL.entries()).sort((a, b) => b[1] - a[1])[0]
  if (bestSymbol) {
    worked.push(`${bestSymbol[0]} ga best resultater`)
  }
  
  return worked
}

function identifyWhatDidnt(trades: AutoTradingTrade[]): string[] {
  const losers = trades.filter(t => t.status === 'CLOSED' && (t.realized_pnl || 0) <= 0)
  
  if (losers.length === 0) return ['Ingen tapende trades - godt jobbet!']
  
  const didnt: string[] = []
  
  // Analyze patterns in losers
  const avgLossSize = losers.reduce((sum, t) => sum + Math.abs(t.realized_pnl || 0), 0) / losers.length
  didnt.push(`Gjennomsnittlig tap på ${(avgLossSize * 100).toFixed(2)}%`)
  
  // Early exits
  const earlyExits = losers.filter(t => {
    const duration = t.closed_at && t.created_at
      ? (new Date(t.closed_at).getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60)
      : 0
    return duration < 24
  }).length
  
  if (earlyExits > losers.length * 0.3) {
    didnt.push('Mange tidlige exits - kanskje for stramme stop-loss?')
  }
  
  return didnt
}

function extractLessons(trades: AutoTradingTrade[], metrics: PerformanceMetrics): string[] {
  const lessons: string[] = []
  
  if (metrics.winRate < 0.45) {
    lessons.push('Vinnende trades krever tålmodighet - ikke tving trades')
  }
  
  if (metrics.maxConsecutiveLosses > 3) {
    lessons.push('Etter 3 tap på rad: ta en pause og re-evaluer')
  }
  
  if (metrics.avgTradeDuration < 2) {
    lessons.push('For korte holdetider kan indikere overtrading')
  }
  
  if (metrics.profitFactor < 1.5) {
    lessons.push('La vinnerne løpe lengre - kutte tapere raskere')
  }
  
  lessons.push('Dokumenter hver trade - lær av både vinn og tap')
  lessons.push('Følg strategien - ikke la følelser styre')
  
  return lessons
}

async function storeReview(review: WeeklyReview): Promise<void> {
  const supabase = createClient()
  
  await supabase.from('auto_trading_reviews').insert({
    user_id: review.userId,
    session_id: review.sessionId,
    generated_at: review.generatedAt.toISOString(),
    metrics: review.metrics,
    assessment: review.assessment,
    market_context: review.marketContext,
    immediate_actions: review.immediateActions,
    weekly_goals: review.weeklyGoals,
    what_worked: review.whatWorked,
    what_didnt: review.whatDidnt,
    lessons_learned: review.lessonsLearned
  })
}

/**
 * Run weekly review for all active users
 */
export async function runWeeklyReviews(): Promise<{
  processed: number
  issues: string[]
}> {
  const supabase = createClient()
  const issues: string[] = []
  let processed = 0
  
  // Get all users with active sessions
  const { data: activeSessions, error } = await supabase
    .from('auto_trading_sessions')
    .select('user_id, id')
    .eq('status', 'ACTIVE')
  
  if (error) {
    return { processed: 0, issues: [error.message] }
  }
  
  for (const session of activeSessions || []) {
    try {
      await generateWeeklyReview(session.user_id, session.id)
      processed++
    } catch (err) {
      issues.push(`Failed for user ${session.user_id}: ${err}`)
    }
  }
  
  return { processed, issues }
}
