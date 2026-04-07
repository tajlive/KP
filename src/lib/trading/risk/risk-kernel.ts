/**
 * Risk Kernel – Server-Side Risk Enforcement
 * 
 * Immutable risk rules that the agent CANNOT override:
 * - Max daily loss
 * - Max drawdown
 * - Max position size
 * - Max leverage/notional
 * - Consecutive loss cooldown
 * - Volatility circuit breaker
 * 
 * @module trading/risk
 * @version 3.0.1
 */

export interface RiskLimits {
  // Loss limits
  maxDailyLoss: number;           // Absolute dollar amount
  maxDailyLossPercent: number;    // As % of equity
  maxDrawdownPercent: number;     // Max drawdown from peak
  
  // Position limits
  maxPositionSize: number;        // As % of equity
  maxNotional: number;            // Absolute dollar amount
  maxLeverage: number;            // Max leverage multiplier
  
  // Trading limits
  maxConsecutiveLosses: number;   // Before cooldown
  cooldownBars: number;           // Bars to wait after consecutive losses
  maxTradesPerDay: number;        // Daily trade limit
  maxTradesPerHour: number;       // Hourly trade limit
  
  // Volatility circuit breaker
  volatilityThreshold: number;    // ATR% threshold
  volatilityCooldownBars: number; // Cooldown after volatility spike
  
  // Time-based restrictions
  allowedHours: number[];         // UTC hours when trading allowed
  blockWeekends: boolean;         // Block weekend trading
  
  // ATR-based exit configuration
  atrExit: ATRExitConfig;
}

export interface ATRExitConfig {
  enabled: boolean;
  period: number;                 // ATR calculation period (default 14)
  stopLossMultiplier: number;     // ATR multiplier for stop-loss (default 1.5)
  takeProfitMultiplier: number;   // ATR multiplier for take-profit (default 3.0)
  trailingStop: boolean;          // Enable trailing stop
  trailingStopMultiplier: number; // ATR multiplier for trailing stop (default 1.0)
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d'; // ATR timeframe
}

export const DEFAULT_ATR_EXIT_CONFIG: ATRExitConfig = {
  enabled: true,
  period: 14,
  stopLossMultiplier: 1.5,
  takeProfitMultiplier: 3.0,
  trailingStop: true,
  trailingStopMultiplier: 1.0,
  timeframe: '1h',
};

export const DEFAULT_RISK_LIMITS: RiskLimits = {
  maxDailyLoss: 500,
  maxDailyLossPercent: 0.05,
  maxDrawdownPercent: 0.15,
  maxPositionSize: 0.3,
  maxNotional: 50000,
  maxLeverage: 3,
  maxConsecutiveLosses: 5,
  cooldownBars: 10,
  maxTradesPerDay: 50,
  maxTradesPerHour: 10,
  volatilityThreshold: 0.08,
  volatilityCooldownBars: 5,
  allowedHours: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
  blockWeekends: false,
  atrExit: DEFAULT_ATR_EXIT_CONFIG,
};

export interface RiskCheck {
  allowed: boolean;
  rule: string;
  severity: 'info' | 'warning' | 'critical';
  current: number;
  limit: number;
  message: string;
}

export interface RiskState {
  // Current metrics
  equity: number;
  peakEquity: number;
  dailyPnl: number;
  openPositions: number;
  openNotional: number;
  currentLeverage: number;
  
  // Trade history
  consecutiveLosses: number;
  tradesToday: number;
  tradesThisHour: number;
  
  // Circuit breakers
  volatilitySpikeActive: boolean;
  volatilityCooldownEnd: Date | null;
  consecutiveLossCooldownEnd: Date | null;
  manualBlock: boolean;
  
  // Timestamps
  lastTradeTime: Date | null;
  currentTime: Date;
}

export interface RiskViolation {
  timestamp: Date;
  rule: string;
  severity: 'warning' | 'critical';
  expectedValue: number;
  actualValue: number;
  action: 'blocked' | 'reduced' | 'allowed';
  reductionFactor?: number;
}

/**
 * Risk Kernel – Immutable risk enforcement
 * 
 * This class runs server-side and enforces hard limits.
 * The trading agent cannot bypass these rules.
 */
export class RiskKernel {
  /** Static identifier for production bundle compatibility */
  static readonly __name = 'RiskKernel';
  
  private limits: RiskLimits;
  private violations: RiskViolation[] = [];
  
  constructor(limits: Partial<RiskLimits> = {}) {
    this.limits = { ...DEFAULT_RISK_LIMITS, ...limits };
  }
  
  /**
   * Check if a trade is allowed under risk limits
   * 
   * Returns { allowed: true } if trade passes all checks
   * Returns { allowed: false, violations: [...] } if any check fails
   */
  checkTrade(
    proposedTrade: {
      side: 'buy' | 'sell';
      quantity: number;
      price: number;
      notional: number;
      leverage: number;
    },
    state: RiskState
  ): { 
    allowed: boolean; 
    violations: RiskViolation[];
    adjustedTrade?: typeof proposedTrade;
  } {
    const violations: RiskViolation[] = [];
    const adjustedTrade = { ...proposedTrade };
    
    // Check 1: Daily loss limit
    const dailyLossCheck = this.checkDailyLoss(state);
    if (!dailyLossCheck.allowed) {
      violations.push(this.createViolation('maxDailyLoss', 'critical', this.limits.maxDailyLoss, Math.abs(state.dailyPnl), 'blocked'));
      return { allowed: false, violations };
    }
    
    // Check 2: Drawdown limit
    const drawdownCheck = this.checkDrawdown(state);
    if (!drawdownCheck.allowed) {
      violations.push(this.createViolation('maxDrawdown', 'critical', this.limits.maxDrawdownPercent, this.calculateDrawdown(state), 'blocked'));
      return { allowed: false, violations };
    }
    
    // Check 3: Consecutive loss cooldown
    const cooldownCheck = this.checkConsecutiveLossCooldown(state);
    if (!cooldownCheck.allowed) {
      violations.push(this.createViolation('consecutiveLossCooldown', 'warning', 0, state.consecutiveLosses, 'blocked'));
      return { allowed: false, violations };
    }
    
    // Check 4: Volatility circuit breaker
    const volatilityCheck = this.checkVolatilityCircuitBreaker(state);
    if (!volatilityCheck.allowed) {
      violations.push(this.createViolation('volatilityCircuitBreaker', 'warning', this.limits.volatilityThreshold, 0, 'blocked'));
      return { allowed: false, violations };
    }
    
    // Check 5: Position size limit (can be reduced, not blocked)
    const positionCheck = this.checkPositionSize(proposedTrade, state);
    if (!positionCheck.allowed) {
      const maxAllowedNotional = state.equity * this.limits.maxPositionSize - state.openNotional;
      const reductionFactor = maxAllowedNotional / proposedTrade.notional;
      
      if (reductionFactor > 0.1) {
        // Reduce trade size
        adjustedTrade.quantity *= reductionFactor;
        adjustedTrade.notional *= reductionFactor;
        violations.push(this.createViolation('maxPositionSize', 'warning', this.limits.maxPositionSize, (state.openNotional + proposedTrade.notional) / state.equity, 'reduced', reductionFactor));
      } else {
        violations.push(this.createViolation('maxPositionSize', 'critical', this.limits.maxPositionSize, (state.openNotional + proposedTrade.notional) / state.equity, 'blocked'));
        return { allowed: false, violations };
      }
    }
    
    // Check 6: Notional limit
    const notionalCheck = this.checkNotional(adjustedTrade, state);
    if (!notionalCheck.allowed) {
      const maxNotional = this.limits.maxNotional - state.openNotional;
      const reductionFactor = maxNotional / adjustedTrade.notional;
      
      if (reductionFactor > 0.1) {
        adjustedTrade.quantity *= reductionFactor;
        adjustedTrade.notional *= reductionFactor;
        violations.push(this.createViolation('maxNotional', 'warning', this.limits.maxNotional, state.openNotional + adjustedTrade.notional, 'reduced', reductionFactor));
      } else {
        violations.push(this.createViolation('maxNotional', 'critical', this.limits.maxNotional, state.openNotional + adjustedTrade.notional, 'blocked'));
        return { allowed: false, violations };
      }
    }
    
    // Check 7: Leverage limit
    const leverageCheck = this.checkLeverage(adjustedTrade);
    if (!leverageCheck.allowed) {
      violations.push(this.createViolation('maxLeverage', 'critical', this.limits.maxLeverage, adjustedTrade.leverage, 'blocked'));
      return { allowed: false, violations };
    }
    
    // Check 8: Trade frequency
    const frequencyCheck = this.checkTradeFrequency(state);
    if (!frequencyCheck.allowed) {
      violations.push(this.createViolation('maxTradesPerDay', 'warning', this.limits.maxTradesPerDay, state.tradesToday, 'blocked'));
      return { allowed: false, violations };
    }
    
    // Check 9: Trading hours
    const hoursCheck = this.checkTradingHours(state);
    if (!hoursCheck.allowed) {
      violations.push(this.createViolation('allowedHours', 'warning', 0, state.currentTime.getHours(), 'blocked'));
      return { allowed: false, violations };
    }
    
    // Store violations for audit
    this.violations.push(...violations);
    
    const hasCritical = violations.some(v => v.severity === 'critical');
    if (hasCritical) {
      return { allowed: false, violations };
    }
    
    return { 
      allowed: true, 
      violations,
      adjustedTrade: violations.length > 0 ? adjustedTrade : undefined
    };
  }
  
  // Individual risk checks
  
  private checkDailyLoss(state: RiskState): { allowed: boolean } {
    const dailyLossPercent = Math.abs(state.dailyPnl) / state.equity;
    return {
      allowed: Math.abs(state.dailyPnl) < this.limits.maxDailyLoss && 
               dailyLossPercent < this.limits.maxDailyLossPercent
    };
  }
  
  private checkDrawdown(state: RiskState): { allowed: boolean } {
    const drawdown = this.calculateDrawdown(state);
    return { allowed: drawdown < this.limits.maxDrawdownPercent };
  }
  
  private checkConsecutiveLossCooldown(state: RiskState): { allowed: boolean } {
    if (state.consecutiveLosses < this.limits.maxConsecutiveLosses) {
      return { allowed: true };
    }
    
    if (!state.consecutiveLossCooldownEnd) {
      return { allowed: false };
    }
    
    return { allowed: state.currentTime >= state.consecutiveLossCooldownEnd };
  }
  
  private checkVolatilityCircuitBreaker(state: RiskState): { allowed: boolean } {
    if (!state.volatilitySpikeActive) {
      return { allowed: true };
    }
    
    if (!state.volatilityCooldownEnd) {
      return { allowed: false };
    }
    
    return { allowed: state.currentTime >= state.volatilityCooldownEnd };
  }
  
  private checkPositionSize(trade: { notional: number }, state: RiskState): { allowed: boolean } {
    const projectedExposure = (state.openNotional + trade.notional) / state.equity;
    return { allowed: projectedExposure <= this.limits.maxPositionSize };
  }
  
  private checkNotional(trade: { notional: number }, state: RiskState): { allowed: boolean } {
    return { allowed: state.openNotional + trade.notional <= this.limits.maxNotional };
  }
  
  private checkLeverage(trade: { leverage: number }): { allowed: boolean } {
    return { allowed: trade.leverage <= this.limits.maxLeverage };
  }
  
  private checkTradeFrequency(state: RiskState): { allowed: boolean } {
    const hourStart = new Date(state.currentTime);
    hourStart.setMinutes(0, 0, 0);
    
    // Check if last trade was in current hour
    const tradesThisHour = state.lastTradeTime && state.lastTradeTime >= hourStart
      ? state.tradesThisHour
      : 0;
    
    return {
      allowed: state.tradesToday < this.limits.maxTradesPerDay &&
               tradesThisHour < this.limits.maxTradesPerHour
    };
  }
  
  private checkTradingHours(state: RiskState): { allowed: boolean } {
    const hour = state.currentTime.getUTCHours();
    const day = state.currentTime.getUTCDay();
    
    if (this.limits.blockWeekends && (day === 0 || day === 6)) {
      return { allowed: false };
    }
    
    return { allowed: this.limits.allowedHours.includes(hour) };
  }
  
  private calculateDrawdown(state: RiskState): number {
    if (state.peakEquity <= 0) return 0;
    return (state.peakEquity - state.equity) / state.peakEquity;
  }
  
  private createViolation(
    rule: string,
    severity: 'warning' | 'critical',
    expectedValue: number,
    actualValue: number,
    action: 'blocked' | 'reduced' | 'allowed',
    reductionFactor?: number
  ): RiskViolation {
    return {
      timestamp: new Date(),
      rule,
      severity,
      expectedValue,
      actualValue,
      action,
      reductionFactor
    };
  }
  
  /**
   * Activate consecutive loss cooldown
   */
  activateConsecutiveLossCooldown(currentTime: Date): Date {
    const cooldownEnd = new Date(currentTime);
    cooldownEnd.setMinutes(cooldownEnd.getMinutes() + this.limits.cooldownBars * 5); // Assume 5-min bars
    return cooldownEnd;
  }
  
  /**
   * Activate volatility circuit breaker
   */
  activateVolatilityCircuitBreaker(currentTime: Date): Date {
    const cooldownEnd = new Date(currentTime);
    cooldownEnd.setMinutes(cooldownEnd.getMinutes() + this.limits.volatilityCooldownBars * 5);
    return cooldownEnd;
  }
  
  /**
   * Get all violations (for audit)
   */
  getViolations(): RiskViolation[] {
    return [...this.violations];
  }
  
  /**
   * Clear violation history
   */
  clearViolations(): void {
    this.violations = [];
  }
  
  /**
   * Get current limits
   */
  getLimits(): RiskLimits {
    return { ...this.limits };
  }
  
  /**
   * Update limits (requires explicit call)
   */
  updateLimits(limits: Partial<RiskLimits>): void {
    this.limits = { ...this.limits, ...limits };
  }
  
  // ============================================================================
  // ATR-BASED EXITS (2026 Enhancement)
  // ============================================================================
  
  /**
   * Calculate ATR-based stop-loss price
   * 
   * @param entryPrice - Position entry price
   * @param atr - Current ATR value
   * @param side - 'long' or 'short'
   * @returns Stop-loss price
   */
  calculateATRStopLoss(
    entryPrice: number,
    atr: number,
    side: 'long' | 'short'
  ): number {
    const config = this.limits.atrExit;
    if (!config.enabled) {
      // Fallback to fixed percentage if ATR exits disabled
      const fixedStopPercent = 0.05; // 5%
      return side === 'long' 
        ? entryPrice * (1 - fixedStopPercent)
        : entryPrice * (1 + fixedStopPercent);
    }
    
    const stopDistance = atr * config.stopLossMultiplier;
    return side === 'long'
      ? entryPrice - stopDistance
      : entryPrice + stopDistance;
  }
  
  /**
   * Calculate ATR-based take-profit price
   * 
   * @param entryPrice - Position entry price
   * @param atr - Current ATR value
   * @param side - 'long' or 'short'
   * @returns Take-profit price
   */
  calculateATRTakeProfit(
    entryPrice: number,
    atr: number,
    side: 'long' | 'short'
  ): number {
    const config = this.limits.atrExit;
    if (!config.enabled) {
      // Fallback to fixed 2:1 R:R if ATR exits disabled
      const fixedTpPercent = 0.10; // 10%
      return side === 'long'
        ? entryPrice * (1 + fixedTpPercent)
        : entryPrice * (1 - fixedTpPercent);
    }
    
    const tpDistance = atr * config.takeProfitMultiplier;
    return side === 'long'
      ? entryPrice + tpDistance
      : entryPrice - tpDistance;
  }
  
  /**
   * Calculate trailing stop price based on highest/lowest price since entry
   * 
   * @param extremePrice - Highest (long) or lowest (short) price since entry
   * @param atr - Current ATR value
   * @param side - 'long' or 'short'
   * @returns Trailing stop price
   */
  calculateATRTrailingStop(
    extremePrice: number,
    atr: number,
    side: 'long' | 'short'
  ): number {
    const config = this.limits.atrExit;
    if (!config.enabled || !config.trailingStop) {
      return 0; // Trailing stop disabled
    }
    
    const trailingDistance = atr * config.trailingStopMultiplier;
    return side === 'long'
      ? extremePrice - trailingDistance
      : extremePrice + trailingDistance;
  }
  
  /**
   * Evaluate if an exit should be triggered based on current price
   * 
   * @param position - Current position details
   * @param currentPrice - Current market price
   * @param atr - Current ATR value
   * @returns Exit recommendation
   */
  evaluateATRExit(
    position: {
      side: 'long' | 'short';
      entryPrice: number;
      highestPrice: number;    // For trailing stop (long)
      lowestPrice: number;     // For trailing stop (short)
      size: number;
    },
    currentPrice: number,
    atr: number
  ): {
    shouldExit: boolean;
    reason: 'stop_loss' | 'take_profit' | 'trailing_stop' | 'none';
    exitPrice: number;
    pnlPercent: number;
    pnlAmount: number;
  } {
    const config = this.limits.atrExit;
    
    // Calculate exit levels
    const stopLoss = this.calculateATRStopLoss(position.entryPrice, atr, position.side);
    const takeProfit = this.calculateATRTakeProfit(position.entryPrice, atr, position.side);
    
    // Check stop-loss
    const stopLossHit = position.side === 'long'
      ? currentPrice <= stopLoss
      : currentPrice >= stopLoss;
    
    if (stopLossHit) {
      const pnlPercent = position.side === 'long'
        ? (stopLoss - position.entryPrice) / position.entryPrice
        : (position.entryPrice - stopLoss) / position.entryPrice;
      
      return {
        shouldExit: true,
        reason: 'stop_loss',
        exitPrice: stopLoss,
        pnlPercent: pnlPercent * 100,
        pnlAmount: position.size * pnlPercent,
      };
    }
    
    // Check take-profit
    const takeProfitHit = position.side === 'long'
      ? currentPrice >= takeProfit
      : currentPrice <= takeProfit;
    
    if (takeProfitHit) {
      const pnlPercent = position.side === 'long'
        ? (takeProfit - position.entryPrice) / position.entryPrice
        : (position.entryPrice - takeProfit) / position.entryPrice;
      
      return {
        shouldExit: true,
        reason: 'take_profit',
        exitPrice: takeProfit,
        pnlPercent: pnlPercent * 100,
        pnlAmount: position.size * pnlPercent,
      };
    }
    
    // Check trailing stop (only if position is profitable)
    if (config.trailingStop) {
      const isProfitable = position.side === 'long'
        ? currentPrice > position.entryPrice
        : currentPrice < position.entryPrice;
      
      if (isProfitable) {
        const trailingStop = this.calculateATRTrailingStop(
          position.side === 'long' ? position.highestPrice : position.lowestPrice,
          atr,
          position.side
        );
        
        const trailingStopHit = position.side === 'long'
          ? currentPrice <= trailingStop
          : currentPrice >= trailingStop;
        
        if (trailingStopHit) {
          const pnlPercent = position.side === 'long'
            ? (trailingStop - position.entryPrice) / position.entryPrice
            : (position.entryPrice - trailingStop) / position.entryPrice;
          
          return {
            shouldExit: true,
            reason: 'trailing_stop',
            exitPrice: trailingStop,
            pnlPercent: pnlPercent * 100,
            pnlAmount: position.size * pnlPercent,
          };
        }
      }
    }
    
    // No exit triggered
    const currentPnlPercent = position.side === 'long'
      ? (currentPrice - position.entryPrice) / position.entryPrice
      : (position.entryPrice - currentPrice) / position.entryPrice;
    
    return {
      shouldExit: false,
      reason: 'none',
      exitPrice: currentPrice,
      pnlPercent: currentPnlPercent * 100,
      pnlAmount: position.size * currentPnlPercent,
    };
  }
  
  /**
   * Get ATR exit configuration
   */
  getATRExitConfig(): ATRExitConfig {
    return { ...this.limits.atrExit };
  }
  
  /**
   * Update ATR exit configuration
   */
  updateATRExitConfig(config: Partial<ATRExitConfig>): void {
    this.limits.atrExit = { ...this.limits.atrExit, ...config };
  }
}

/**
 * Factory function for creating RiskKernel instances.
 * Use this instead of `new RiskKernel()` for production bundle compatibility.
 */
export function createRiskKernel(limits: Partial<RiskLimits> = {}): RiskKernel {
  return new RiskKernel(limits);
}

/**
 * Risk State Manager – Maintains current risk state
 */
export class RiskStateManager {
  private state: RiskState;
  
  constructor(initialEquity: number) {
    this.state = {
      equity: initialEquity,
      peakEquity: initialEquity,
      dailyPnl: 0,
      openPositions: 0,
      openNotional: 0,
      currentLeverage: 0,
      consecutiveLosses: 0,
      tradesToday: 0,
      tradesThisHour: 0,
      volatilitySpikeActive: false,
      volatilityCooldownEnd: null,
      consecutiveLossCooldownEnd: null,
      manualBlock: false,
      lastTradeTime: null,
      currentTime: new Date()
    };
  }
  
  updateState(updates: Partial<RiskState>): void {
    this.state = { ...this.state, ...updates, currentTime: new Date() };
    
    // Update peak equity
    if (this.state.equity > this.state.peakEquity) {
      this.state.peakEquity = this.state.equity;
    }
  }
  
  recordTrade(pnl: number, notional: number): void {
    this.state.dailyPnl += pnl;
    this.state.equity += pnl;
    this.state.tradesToday++;
    this.state.tradesThisHour++;
    this.state.lastTradeTime = new Date();
    
    if (pnl < 0) {
      this.state.consecutiveLosses++;
    } else {
      this.state.consecutiveLosses = 0;
    }
    
    // Update open positions/notional
    this.state.openNotional += notional;
    this.state.openPositions = this.state.openNotional > 0 ? 1 : 0;
  }
  
  getState(): RiskState {
    return { ...this.state, currentTime: new Date() };
  }
  
  resetDaily(): void {
    this.state.dailyPnl = 0;
    this.state.tradesToday = 0;
    this.state.tradesThisHour = 0;
  }
}
