/**
 * Risk Management System
 * Handles position sizing, stop-loss, circuit breakers, and daily limits
 * Includes Kelly Criterion for optimal position sizing
 */

import { type MarketRegime } from "./market-regime";
import type {
  AutoTradingStrategy,
  AutoTradingTrade,
  RiskLevel,
  UserAutoTradingConfig,
} from "./types";

// ============================================================================
// CIRCUIT BREAKER CONFIGURATION
// ============================================================================

export interface CircuitBreakerConfig {
  // Trade level
  stopLossPercent: number; // 5-12% depending on strategy
  takeProfitPercent: number; // 10-20% depending on strategy
  trailingStopPercent?: number; // 8-15% trailing stop

  // Daily level
  dailyLossLimit: number; // 2% of portfolio
  dailyWinLimit?: number; // Optional: lock in gains at 5%
  maxTradesPerDay: number; // Prevent overtrading

  // Weekly level
  weeklyLossLimit: number; // 5% of portfolio

  // Strategy level
  strategyDrawdownLimit: number; // 15% before strategy pause
  maxConsecutiveLosses: number; // 5 losses before cooldown

  // Account level
  accountDrawdownLimit: number; // 20% total drawdown = stop all

  // Cooldown periods
  dailyCooldownHours: number; // 24h after daily limit
  strategyCooldownDays: number; // 3 days after strategy limit
}

// Default configs by risk level
export const CIRCUIT_BREAKER_DEFAULTS: Record<RiskLevel, CircuitBreakerConfig> =
  {
    conservative: {
      stopLossPercent: 0.05,
      takeProfitPercent: 0.1,
      trailingStopPercent: 0.08,
      dailyLossLimit: 0.01,
      dailyWinLimit: 0.03,
      maxTradesPerDay: 2,
      weeklyLossLimit: 0.03,
      strategyDrawdownLimit: 0.1,
      maxConsecutiveLosses: 3,
      accountDrawdownLimit: 0.15,
      dailyCooldownHours: 24,
      strategyCooldownDays: 7,
    },
    balanced: {
      stopLossPercent: 0.08,
      takeProfitPercent: 0.15,
      trailingStopPercent: 0.1,
      dailyLossLimit: 0.02,
      maxTradesPerDay: 5,
      weeklyLossLimit: 0.05,
      strategyDrawdownLimit: 0.15,
      maxConsecutiveLosses: 5,
      accountDrawdownLimit: 0.2,
      dailyCooldownHours: 24,
      strategyCooldownDays: 3,
    },
    aggressive: {
      stopLossPercent: 0.12,
      takeProfitPercent: 0.25,
      trailingStopPercent: 0.15,
      dailyLossLimit: 0.03,
      maxTradesPerDay: 10,
      weeklyLossLimit: 0.08,
      strategyDrawdownLimit: 0.2,
      maxConsecutiveLosses: 7,
      accountDrawdownLimit: 0.3,
      dailyCooldownHours: 12,
      strategyCooldownDays: 2,
    },
    custom: {
      stopLossPercent: 0.08,
      takeProfitPercent: 0.15,
      dailyLossLimit: 0.02,
      maxTradesPerDay: 5,
      weeklyLossLimit: 0.05,
      strategyDrawdownLimit: 0.15,
      maxConsecutiveLosses: 5,
      accountDrawdownLimit: 0.2,
      dailyCooldownHours: 24,
      strategyCooldownDays: 3,
    },
    dynamic: {
      stopLossPercent: 0.08,
      takeProfitPercent: 0.15,
      trailingStopPercent: 0.1,
      dailyLossLimit: 0.03,
      dailyWinLimit: 0.1,
      maxTradesPerDay: 15,
      weeklyLossLimit: 0.1,
      strategyDrawdownLimit: 0.2,
      maxConsecutiveLosses: 6,
      accountDrawdownLimit: 0.25,
      dailyCooldownHours: 12,
      strategyCooldownDays: 1,
    },
  };

// ============================================================================
// KELLY CRITERION POSITION SIZING
// ============================================================================

export interface KellyInput {
  winRate: number; // Historical win rate (0-1)
  avgWin: number; // Average win % (e.g., 0.08 for 8%)
  avgLoss: number; // Average loss % (e.g., 0.05 for 5%)
  confidence: number; // AI confidence in this trade (0-1)
  marketRegime: MarketRegime;
  portfolioValue: number; // Current portfolio value
  riskTolerance: number; // User's risk tolerance (0.25 = Quarter Kelly)
}

export interface PositionSizeResult {
  kellyPercentage: number; // Raw Kelly % (can be > 100%)
  adjustedPercentage: number; // Adjusted for safety
  dollarAmount: number; // Position size in USD
  units: number; // Number of units to trade
  riskAmount: number; // Maximum loss on this trade
  reason: string; // Explanation for the sizing
  warnings: string[]; // Any warnings
}

/**
 * Calculate optimal position size using Kelly Criterion
 * Uses "Fractional Kelly" for safety (Half Kelly default)
 */
export function calculateKellyPositionSize(
  input: KellyInput,
): PositionSizeResult {
  const {
    winRate,
    avgWin,
    avgLoss,
    confidence,
    marketRegime,
    portfolioValue,
    riskTolerance,
  } = input;

  const warnings: string[] = [];

  // Validate inputs
  if (winRate <= 0 || winRate >= 1) {
    warnings.push("Ugyldig win rate - bruker konservativ verdi");
  }
  if (avgWin <= 0 || avgLoss <= 0) {
    warnings.push("Ugyldig win/loss - bruker standardverdier");
  }

  // Safe defaults if data is insufficient
  const safeWinRate = Math.max(0.45, Math.min(0.65, winRate));
  const safeAvgWin = Math.max(0.03, avgWin);
  const safeAvgLoss = Math.max(0.02, avgLoss);

  // Kelly formula: f = (p*b - q) / b
  // where p = win rate, q = loss rate, b = win/loss ratio
  const lossRate = 1 - safeWinRate;
  const winLossRatio = safeAvgWin / safeAvgLoss;

  const kellyFraction = (safeWinRate * winLossRatio - lossRate) / winLossRatio;

  // Apply adjustments
  let adjustedKelly = kellyFraction;

  // 1. Apply confidence factor
  adjustedKelly *= confidence;

  // 2. Apply market regime adjustment
  const regimeMultiplier = getRegimeMultiplier(marketRegime);
  adjustedKelly *= regimeMultiplier;

  // 3. Apply Kelly fraction (safety factor)
  const kellyFractionMultiplier = riskTolerance; // e.g., 0.5 for Half Kelly
  adjustedKelly *= kellyFractionMultiplier;

  // 4. Cap maximum position size
  const maxPositionSize = 0.1; // Max 10% of portfolio per trade
  adjustedKelly = Math.min(adjustedKelly, maxPositionSize);

  // 5. Ensure minimum if Kelly is positive
  if (kellyFraction > 0 && adjustedKelly < 0.01) {
    adjustedKelly = 0.01; // Minimum 1% position
  }

  // Calculate final amounts
  const dollarAmount = portfolioValue * adjustedKelly;
  const riskAmount = dollarAmount * safeAvgLoss;

  // Generate explanation
  let reason: string;
  if (kellyFraction <= 0) {
    reason = `Kelly negativ (${(kellyFraction * 100).toFixed(1)}%) - strategien er ikke profitable på lang sikt. Anbefaler ikke trade.`;
    warnings.push("Negativ Kelly - strategi taper penger over tid");
  } else if (adjustedKelly < 0.01) {
    reason = `Kelly=${(kellyFraction * 100).toFixed(1)}% men for høy risiko med nåværende konfidens/marked. Redusert til minimum.`;
  } else {
    reason =
      `Beregnet ${(kellyFraction * 100).toFixed(1)}% Kelly, justert til ${(adjustedKelly * 100).toFixed(1)}% ` +
      `(${Math.round(kellyFractionMultiplier * 100)}% Kelly × ${(confidence * 100).toFixed(0)}% konfidens × ${(regimeMultiplier * 100).toFixed(0)}% regime)`;
  }

  return {
    kellyPercentage: kellyFraction,
    adjustedPercentage: adjustedKelly,
    dollarAmount,
    units: 0, // Will be calculated based on asset price
    riskAmount,
    reason,
    warnings,
  };
}

/**
 * Get position size multiplier based on market regime
 */
function getRegimeMultiplier(regime: MarketRegime): number {
  const multipliers: Record<MarketRegime, number> = {
    bull: 1.0,
    bear: 0.3,
    sideways: 0.7,
    volatile: 0.4,
    uncertain: 0.2,
  };
  return multipliers[regime] || 0.5;
}

/**
 * Alternative: Fixed Fractional sizing (simpler, more conservative)
 */
export function calculateFixedFractionalSize(
  portfolioValue: number,
  riskPercent: number,
  stopLossPercent: number,
  marketRegime: MarketRegime,
): PositionSizeResult {
  const regimeMultiplier = getRegimeMultiplier(marketRegime);

  // Risk amount = portfolio * risk%
  const riskAmount = portfolioValue * riskPercent * regimeMultiplier;

  // Position size = risk amount / stop loss %
  const positionSize = riskAmount / stopLossPercent;

  // Cap at max 10% of portfolio
  const maxPosition = portfolioValue * 0.1 * regimeMultiplier;
  const finalSize = Math.min(positionSize, maxPosition);

  return {
    kellyPercentage: 0,
    adjustedPercentage: finalSize / portfolioValue,
    dollarAmount: finalSize,
    units: 0,
    riskAmount: finalSize * stopLossPercent,
    reason: `Fixed fractional: ${(riskPercent * 100).toFixed(1)}% risiko × ${(regimeMultiplier * 100).toFixed(0)}% regime = ${((finalSize / portfolioValue) * 100).toFixed(2)}% posisjon`,
    warnings: [],
  };
}

// ============================================================================
// CIRCUIT BREAKER CHECKS
// ============================================================================

export interface CircuitBreakerCheck {
  passed: boolean;
  triggered?: string;
  level?: "trade" | "daily" | "weekly" | "strategy" | "account";
  action: "allow" | "warn" | "block";
  reason?: string;
  cooldownUntil?: Date;
  suggestions?: string[];
}

export interface RiskCheckInput {
  userId: string;
  sessionId: string;
  strategy: AutoTradingStrategy;
  config: UserAutoTradingConfig;
  circuitBreaker: CircuitBreakerConfig;
  currentPortfolioValue: number;
  todaysTrades: AutoTradingTrade[];
  weeksTrades: AutoTradingTrade[];
  allTrades: AutoTradingTrade[];
  consecutiveLosses: number;
  currentDrawdown: number; // From peak
}

/**
 * Comprehensive circuit breaker check
 */
export function checkCircuitBreakers(
  input: RiskCheckInput,
): CircuitBreakerCheck {
  const {
    circuitBreaker,
    currentPortfolioValue,
    todaysTrades,
    weeksTrades,
    allTrades,
    consecutiveLosses,
    currentDrawdown,
  } = input;

  // 1. Check account-level drawdown (highest priority)
  if (currentDrawdown >= circuitBreaker.accountDrawdownLimit) {
    return {
      passed: false,
      triggered: "account_drawdown",
      level: "account",
      action: "block",
      reason:
        `Kritisk drawdown på ${(currentDrawdown * 100).toFixed(1)}% (grense: ${(circuitBreaker.accountDrawdownLimit * 100).toFixed(0)}%). ` +
        "All trading stoppet for å beskytte kapital.",
      suggestions: [
        "Ta en pause på minst 1 uke",
        "Re-evaluer hele strategien",
        "Vurder å redusere risikonivå",
        "Kontakt support for hjelp",
      ],
    };
  }

  // 2. Check strategy-level drawdown
  if (currentDrawdown >= circuitBreaker.strategyDrawdownLimit) {
    const cooldownDays = circuitBreaker.strategyCooldownDays;
    const cooldownUntil = new Date();
    cooldownUntil.setDate(cooldownUntil.getDate() + cooldownDays);

    return {
      passed: false,
      triggered: "strategy_drawdown",
      level: "strategy",
      action: "block",
      reason:
        `Strategi drawdown på ${(currentDrawdown * 100).toFixed(1)}% (grense: ${(circuitBreaker.strategyDrawdownLimit * 100).toFixed(0)}%). ` +
        `Trading pauset i ${cooldownDays} dager.`,
      cooldownUntil,
      suggestions: [
        "Analyser hva som gikk galt",
        "Vurder å bytte strategi",
        "Reduser posisjonsstørrelse ved gjenstart",
        "Sjekk markedssentiment",
      ],
    };
  }

  // 3. Check consecutive losses
  if (consecutiveLosses >= circuitBreaker.maxConsecutiveLosses) {
    return {
      passed: false,
      triggered: "consecutive_losses",
      level: "strategy",
      action: "block",
      reason: `${consecutiveLosses} tap på rad. Strategi trenger en pause for å unngå "revenge trading".`,
      cooldownUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      suggestions: [
        "Ikke jage tap - markedet vil alltid være der",
        "Bruk pausen til å analysere",
        "Sjekk om markedet har endret seg",
        "Vurder å redusere risiko ved gjenstart",
      ],
    };
  }

  // 4. Check weekly loss limit
  const weeklyLoss = calculatePeriodLoss(weeksTrades);
  if (weeklyLoss >= circuitBreaker.weeklyLossLimit) {
    return {
      passed: false,
      triggered: "weekly_loss_limit",
      level: "weekly",
      action: "block",
      reason:
        `Ukentlig tap på ${(weeklyLoss * 100).toFixed(1)}% (grense: ${(circuitBreaker.weeklyLossLimit * 100).toFixed(0)}%). ` +
        "Trading pauset til neste uke.",
      suggestions: [
        "God uke er over - beskytte kapital",
        "Analyser ukens trades",
        "Forbered strategi for neste uke",
      ],
    };
  }

  // 5. Check daily loss limit
  const dailyLoss = calculatePeriodLoss(todaysTrades);
  if (dailyLoss >= circuitBreaker.dailyLossLimit) {
    const cooldownHours = circuitBreaker.dailyCooldownHours;
    const cooldownUntil = new Date();
    cooldownUntil.setHours(cooldownUntil.getHours() + cooldownHours);

    return {
      passed: false,
      triggered: "daily_loss_limit",
      level: "daily",
      action: "block",
      reason:
        `Daglig tap på ${(dailyLoss * 100).toFixed(1)}% (grense: ${(circuitBreaker.dailyLossLimit * 100).toFixed(1)}%). ` +
        `Trading pauset i ${cooldownHours} timer.`,
      cooldownUntil,
      suggestions: [
        "Dagens trading er ferdig",
        "Ta en pause - kom tilbake i morgen",
        "Analyser hva som gikk galt",
        "Husk: kapitalbevaring er viktigst",
      ],
    };
  }

  // 6. Check max trades per day
  if (todaysTrades.length >= circuitBreaker.maxTradesPerDay) {
    return {
      passed: false,
      triggered: "max_trades_daily",
      level: "daily",
      action: "block",
      reason: `Maks ${circuitBreaker.maxTradesPerDay} trades per dag nådd. Overtrading prevention.`,
      suggestions: [
        "Kvalitet over kvantitet",
        "For mange trades øker transaksjonskostnader",
        "Vent til i morgen for nye muligheter",
      ],
    };
  }

  // 7. Check daily win limit (optional profit taking)
  if (circuitBreaker.dailyWinLimit) {
    const dailyProfit = calculatePeriodProfit(todaysTrades);
    if (dailyProfit >= circuitBreaker.dailyWinLimit) {
      return {
        passed: false,
        triggered: "daily_win_limit",
        level: "daily",
        action: "warn",
        reason:
          `Daglig gevinst på ${(dailyProfit * 100).toFixed(1)}% (mål: ${(circuitBreaker.dailyWinLimit * 100).toFixed(1)}%). ` +
          "Du kan fortsette, men vurder å sikre gevinsten.",
        suggestions: [
          "🎉 Bra jobbet! Vurder å ta gevinsten",
          "Ikke vær grådig - en god dag er en god dag",
          "Fortsett kun hvis setup er A+ kvalitet",
        ],
      };
    }
  }

  // All checks passed
  return {
    passed: true,
    action: "allow",
  };
}

function calculatePeriodLoss(trades: AutoTradingTrade[]): number {
  const closedTrades = trades.filter(
    (t) => t.status === "CLOSED" && t.realized_pnl !== null,
  );
  if (closedTrades.length === 0) return 0;

  const totalPnl = closedTrades.reduce(
    (sum, t) => sum + (t.realized_pnl || 0),
    0,
  );
  const totalInvested = closedTrades.reduce((sum, t) => sum + t.amount, 0);

  return totalInvested > 0
    ? Math.abs(Math.min(0, totalPnl / totalInvested))
    : 0;
}

function calculatePeriodProfit(trades: AutoTradingTrade[]): number {
  const closedTrades = trades.filter(
    (t) => t.status === "CLOSED" && t.realized_pnl !== null,
  );
  if (closedTrades.length === 0) return 0;

  const totalPnl = closedTrades.reduce(
    (sum, t) => sum + (t.realized_pnl || 0),
    0,
  );
  const totalInvested = closedTrades.reduce((sum, t) => sum + t.amount, 0);

  return totalInvested > 0 ? Math.max(0, totalPnl / totalInvested) : 0;
}

// ============================================================================
// STOP LOSS & TAKE PROFIT CALCULATIONS
// ============================================================================

export interface ExitLevels {
  stopLoss: number;
  takeProfit: number;
  trailingStop?: number;
  breakeven?: number;
  partialExit1?: number;
  partialExit2?: number;
}

/**
 * Calculate exit levels for a trade
 */
export function calculateExitLevels(
  entryPrice: number,
  direction: "LONG" | "SHORT",
  strategy: AutoTradingStrategy,
  volatility: number,
  atr: number,
): ExitLevels {
  const config = CIRCUIT_BREAKER_DEFAULTS[strategy.risk_level];

  // Base percentages
  let stopLossPercent = config.stopLossPercent;
  let takeProfitPercent = config.takeProfitPercent;

  // Adjust for volatility (ATR-based)
  const atrMultiplier = 2.0;
  const atrStopLoss = (atr * atrMultiplier) / entryPrice;

  // Use wider of fixed % or ATR-based
  stopLossPercent = Math.max(stopLossPercent, atrStopLoss);

  // Ensure minimum risk:reward of 1:1.5
  if (takeProfitPercent / stopLossPercent < 1.5) {
    takeProfitPercent = stopLossPercent * 1.5;
  }

  // Calculate actual prices
  const multiplier = direction === "LONG" ? 1 : -1;

  const stopLoss =
    direction === "LONG"
      ? entryPrice * (1 - stopLossPercent)
      : entryPrice * (1 + stopLossPercent);

  const takeProfit =
    direction === "LONG"
      ? entryPrice * (1 + takeProfitPercent)
      : entryPrice * (1 - takeProfitPercent);

  // Trailing stop (starts at 50% toward TP)
  const trailingDistance = stopLossPercent * 1.5;

  // Partial exits
  const partialExit1 =
    entryPrice + (takeProfit - entryPrice) * 0.5 * multiplier;
  const partialExit2 =
    entryPrice + (takeProfit - entryPrice) * 0.75 * multiplier;

  // Breakeven (when 50% to TP)
  const breakeven = entryPrice + (takeProfit - entryPrice) * 0.5 * multiplier;

  return {
    stopLoss,
    takeProfit,
    trailingStop: trailingDistance,
    breakeven,
    partialExit1,
    partialExit2,
  };
}

// ============================================================================
// REAL-TIME RISK MONITORING
// ============================================================================

export interface RiskStatus {
  portfolioValue: number;
  peakValue: number;
  currentDrawdown: number;
  dailyPnl: number;
  weeklyPnl: number;
  openRisk: number; // Sum of risk in open positions
  availableRisk: number; // Remaining risk budget for today
  consecutiveLosses: number;
  tradesToday: number;
  maxTradesToday: number;
  circuitBreakerStatus: "normal" | "warning" | "blocked";
  warnings: string[];
}

/**
 * Get current risk status for dashboard display
 */
export function calculateRiskStatus(
  portfolioValue: number,
  peakValue: number,
  todaysTrades: AutoTradingTrade[],
  weeksTrades: AutoTradingTrade[],
  openTrades: AutoTradingTrade[],
  config: CircuitBreakerConfig,
): RiskStatus {
  const currentDrawdown =
    peakValue > 0 ? (peakValue - portfolioValue) / peakValue : 0;

  // Calculate PnL
  const dailyPnl = todaysTrades.reduce((sum, t) => {
    if (t.status === "CLOSED") return sum + (t.realized_pnl || 0);
    return sum + (t.unrealized_pnl || 0);
  }, 0);

  const weeklyPnl = weeksTrades.reduce((sum, t) => {
    if (t.status === "CLOSED") return sum + (t.realized_pnl || 0);
    return sum + (t.unrealized_pnl || 0);
  }, 0);

  // Calculate open risk
  const openRisk = openTrades.reduce((sum, t) => {
    const stopDistance = Math.abs(t.entry_price - t.stop_loss) / t.entry_price;
    return sum + t.amount * stopDistance;
  }, 0);

  // Available risk budget
  const dailyLossUsed = calculatePeriodLoss(todaysTrades);
  const availableRisk =
    (config.dailyLossLimit - dailyLossUsed) * portfolioValue;

  // Consecutive losses
  const sortedTrades = [...todaysTrades, ...weeksTrades]
    .filter((t) => t.status === "CLOSED")
    .sort(
      (a, b) =>
        new Date(b.closed_at!).getTime() - new Date(a.closed_at!).getTime(),
    );

  let consecutiveLosses = 0;
  for (const trade of sortedTrades) {
    if ((trade.realized_pnl || 0) < 0) consecutiveLosses++;
    else break;
  }

  // Determine status
  let circuitBreakerStatus: "normal" | "warning" | "blocked" = "normal";
  const warnings: string[] = [];

  if (currentDrawdown >= config.accountDrawdownLimit * 0.8) {
    circuitBreakerStatus = "blocked";
    warnings.push("🚨 Nærmer seg kritisk drawdown - trading vil stoppes");
  } else if (currentDrawdown >= config.strategyDrawdownLimit * 0.8) {
    circuitBreakerStatus = "warning";
    warnings.push("⚠️ Høy drawdown - vurder å redusere risiko");
  }

  if (dailyLossUsed >= config.dailyLossLimit * 0.8) {
    circuitBreakerStatus =
      circuitBreakerStatus === "blocked" ? "blocked" : "warning";
    warnings.push("⚠️ Nærmer seg daglig tapsgrense");
  }

  if (consecutiveLosses >= config.maxConsecutiveLosses - 1) {
    circuitBreakerStatus =
      circuitBreakerStatus === "blocked" ? "blocked" : "warning";
    warnings.push(
      `⚠️ ${consecutiveLosses} tap på rad - neste tap pauser trading`,
    );
  }

  return {
    portfolioValue,
    peakValue,
    currentDrawdown,
    dailyPnl,
    weeklyPnl,
    openRisk,
    availableRisk: Math.max(0, availableRisk),
    consecutiveLosses,
    tradesToday: todaysTrades.length,
    maxTradesToday: config.maxTradesPerDay,
    circuitBreakerStatus,
    warnings,
  };
}

// ============================================================================
// CORRELATION RISK
// ============================================================================

/**
 * Check for excessive correlation in portfolio
 * Don't put all eggs in similar baskets
 */
export function checkCorrelationRisk(
  openTrades: AutoTradingTrade[],
  newTradeSymbol: string,
  correlationMatrix: Map<string, Map<string, number>>,
): { allowed: boolean; reason?: string } {
  if (openTrades.length === 0) return { allowed: true };

  const CORRELATION_THRESHOLD = 0.85;
  const MAX_CORRELATED_POSITIONS = 2;

  let correlatedPositions = 0;
  const correlatedSymbols: string[] = [];

  for (const trade of openTrades) {
    const correlation =
      correlationMatrix.get(trade.symbol)?.get(newTradeSymbol) || 0;
    if (correlation > CORRELATION_THRESHOLD) {
      correlatedPositions++;
      correlatedSymbols.push(trade.symbol);
    }
  }

  if (correlatedPositions >= MAX_CORRELATED_POSITIONS) {
    return {
      allowed: false,
      reason:
        `${newTradeSymbol} er høyt korrelert med ${correlatedSymbols.join(", ")}. ` +
        "Diversifisering kreves - velg en ukorrelert asset.",
    };
  }

  return { allowed: true };
}

// ============================================================================
// PORTFOLIO HEAT (TOTAL RISK EXPOSURE)
// ============================================================================

/**
 * Calculate total portfolio heat (sum of all open position risks)
 * Should not exceed certain threshold (e.g., 25% of portfolio)
 */
export function calculatePortfolioHeat(
  openTrades: AutoTradingTrade[],
  portfolioValue: number,
): {
  totalHeat: number;
  heatPercent: number;
  status: "safe" | "warm" | "hot" | "critical";
  maxNewPositionSize: number;
} {
  const totalHeat = openTrades.reduce((sum, t) => {
    const stopDistance = Math.abs(t.entry_price - t.stop_loss) / t.entry_price;
    return sum + t.amount * stopDistance;
  }, 0);

  const heatPercent = portfolioValue > 0 ? totalHeat / portfolioValue : 0;

  let status: "safe" | "warm" | "hot" | "critical";
  if (heatPercent > 0.25) status = "critical";
  else if (heatPercent > 0.2) status = "hot";
  else if (heatPercent > 0.15) status = "warm";
  else status = "safe";

  // Max new position based on remaining heat budget
  const maxHeat = portfolioValue * 0.25;
  const remainingHeat = maxHeat - totalHeat;
  const maxNewPositionSize = remainingHeat / 0.1; // Assume 10% stop loss

  return {
    totalHeat,
    heatPercent,
    status,
    maxNewPositionSize: Math.max(0, maxNewPositionSize),
  };
}
