/**
 * Paper Trading Harness – 100 Beta Users
 * 
 * Features:
 * - Cohort management (Alpha/Beta1/Beta2)
 * - Daily P&L capping ($500 max drawdown)
 * - Human override (kill-switch)
 * - Performance tracking
 * 
 * @module trading/beta/beta-harness
 * @version 3.0.0
 */

export type BetaCohort = 'alpha' | 'beta_1' | 'beta_2';
export type BetaStatus = 'active' | 'paused' | 'killed';

export interface BetaUserConfig {
  /** User ID */
  userId: string;
  /** Cohort assignment */
  cohort: BetaCohort;
  /** Current status */
  status: BetaStatus;
  /** Daily P&L cap in USD (negative = max loss) */
  dailyPnlCap: number;
  /** Daily max gain (soft cap, triggers warning) */
  dailyMaxGain: number;
  /** Max drawdown percentage (0.15 = 15%) */
  maxDrawdownPct: number;
  /** Max consecutive losses before auto-pause */
  maxConsecutiveLosses: number;
  /** Volatility multiplier threshold */
  volatilityThreshold: number;
  /** Starting capital */
  initialCapital: number;
  /** When user was enrolled */
  enrolledAt: Date;
  /** Last status change */
  statusChangedAt?: Date;
  /** Reason for kill/pause */
  statusReason?: string;
  /** Who approved override (if applicable) */
  overrideApprovedBy?: string;
}

export interface DailyMetrics {
  date: string; // YYYY-MM-DD
  startingBalance: number;
  endingBalance: number;
  dailyPnl: number;
  dailyPnlPct: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  volatility: number;
  fearGreedIndex: number;
  consecutiveLosses: number;
  killSwitchTriggered: boolean;
}

export interface KillSwitchTrigger {
  type: 'daily_loss' | 'drawdown' | 'consecutive_losses' | 'volatility' | 'manual' | 'api_error';
  severity: 'soft' | 'medium' | 'hard';
  triggeredAt: Date;
  metric: number;
  threshold: number;
  message: string;
  autoAction: 'warn' | 'pause' | 'kill';
}

export interface BetaCohortConfig {
  name: BetaCohort;
  maxUsers: number;
  durationWeeks: number;
  dailyPnlCap: number;
  maxDrawdownPct: number;
  features: {
    rlAgent: boolean;
    bybitExecution: boolean;
    advancedOrders: boolean;
    killSwitch: boolean;
  };
}

// Cohort configurations
export const COHORT_CONFIGS: Record<BetaCohort, BetaCohortConfig> = {
  alpha: {
    name: 'alpha',
    maxUsers: 10,
    durationWeeks: 2,
    dailyPnlCap: -500,
    maxDrawdownPct: 0.15,
    features: {
      rlAgent: true,
      bybitExecution: false, // Paper only
      advancedOrders: true,
      killSwitch: true
    }
  },
  beta_1: {
    name: 'beta_1',
    maxUsers: 30,
    durationWeeks: 4,
    dailyPnlCap: -500,
    maxDrawdownPct: 0.15,
    features: {
      rlAgent: true,
      bybitExecution: false,
      advancedOrders: false,
      killSwitch: true
    }
  },
  beta_2: {
    name: 'beta_2',
    maxUsers: 60,
    durationWeeks: 6,
    dailyPnlCap: -500,
    maxDrawdownPct: 0.12, // Tighter for larger cohort
    features: {
      rlAgent: true,
      bybitExecution: true,
      advancedOrders: true,
      killSwitch: true
    }
  }
};

// Default user configuration
export const DEFAULT_BETA_CONFIG: Omit<BetaUserConfig, 'userId' | 'cohort' | 'enrolledAt'> = {
  status: 'active',
  dailyPnlCap: -500,
  dailyMaxGain: 2000,
  maxDrawdownPct: 0.15,
  maxConsecutiveLosses: 5,
  volatilityThreshold: 2.5,
  initialCapital: 10000
};

/**
 * Beta User Harness – manages individual user trading limits
 */
export class BetaUserHarness {
  private config: BetaUserConfig;
  private dailyMetrics: Map<string, DailyMetrics> = new Map();
  private killSwitchHistory: KillSwitchTrigger[] = [];
  private currentConsecutiveLosses = 0;
  private peakBalance: number;
  private currentBalance: number;
  
  constructor(config: BetaUserConfig) {
    this.config = config;
    this.currentBalance = config.initialCapital;
    this.peakBalance = config.initialCapital;
  }
  
  /**
   * Check if a trade should be allowed
   */
  canTrade(): { allowed: boolean; reason?: string; severity?: 'soft' | 'medium' | 'hard' } {
    // Check if killed
    if (this.config.status === 'killed') {
      return { allowed: false, reason: 'Account killed: ' + this.config.statusReason, severity: 'hard' };
    }
    
    // Check if paused
    if (this.config.status === 'paused') {
      return { allowed: false, reason: 'Account paused: ' + this.config.statusReason, severity: 'medium' };
    }
    
    // Check daily loss limit
    const today = this.getTodayMetrics();
    if (today.dailyPnl <= this.config.dailyPnlCap) {
      this.triggerKillSwitch('daily_loss', 'hard', today.dailyPnl, this.config.dailyPnlCap);
      return { 
        allowed: false, 
        reason: `Daily loss limit reached: ${today.dailyPnl} USD`, 
        severity: 'hard' 
      };
    }
    
    // Check soft warning on daily loss approaching limit
    if (today.dailyPnl <= this.config.dailyPnlCap * 0.8) {
      return { 
        allowed: true, 
        reason: `Warning: Daily loss at ${(today.dailyPnl / this.config.dailyPnlCap * 100).toFixed(1)}% of limit`, 
        severity: 'soft' 
      };
    }
    
    // Check drawdown
    const currentDrawdown = (this.peakBalance - this.currentBalance) / this.peakBalance;
    if (currentDrawdown >= this.config.maxDrawdownPct) {
      this.triggerKillSwitch('drawdown', 'hard', currentDrawdown, this.config.maxDrawdownPct);
      return { 
        allowed: false, 
        reason: `Max drawdown reached: ${(currentDrawdown * 100).toFixed(2)}%`, 
        severity: 'hard' 
      };
    }
    
    // Check consecutive losses
    if (this.currentConsecutiveLosses >= this.config.maxConsecutiveLosses) {
      this.triggerKillSwitch('consecutive_losses', 'medium', this.currentConsecutiveLosses, this.config.maxConsecutiveLosses);
      return { 
        allowed: false, 
        reason: `Max consecutive losses: ${this.currentConsecutiveLosses}`, 
        severity: 'medium' 
      };
    }
    
    return { allowed: true };
  }
  
  /**
   * Record a trade outcome
   */
  recordTrade(pnl: number, volatility: number, fearGreedIndex: number): void {
    const today = this.getTodayMetrics();
    
    // Update balance
    this.currentBalance += pnl;
    
    // Update peak
    if (this.currentBalance > this.peakBalance) {
      this.peakBalance = this.currentBalance;
    }
    
    // Update metrics
    today.totalTrades++;
    today.dailyPnl += pnl;
    today.endingBalance = this.currentBalance;
    today.dailyPnlPct = (today.dailyPnl / today.startingBalance) * 100;
    today.volatility = volatility;
    today.fearGreedIndex = fearGreedIndex;
    
    // Track win/loss
    if (pnl > 0) {
      today.winningTrades++;
      this.currentConsecutiveLosses = 0;
    } else if (pnl < 0) {
      today.losingTrades++;
      this.currentConsecutiveLosses++;
      today.consecutiveLosses = this.currentConsecutiveLosses;
    }
    
    // Calculate drawdown
    const currentDrawdown = (this.peakBalance - this.currentBalance) / this.peakBalance;
    today.maxDrawdown = Math.max(today.maxDrawdown, this.peakBalance - this.currentBalance);
    today.maxDrawdownPct = Math.max(today.maxDrawdownPct, currentDrawdown);
    
    // Check volatility spike
    if (volatility >= this.config.volatilityThreshold) {
      this.triggerKillSwitch('volatility', 'soft', volatility, this.config.volatilityThreshold);
    }
    
    // Check daily gain cap (soft)
    if (today.dailyPnl >= this.config.dailyMaxGain) {
      // Soft warning - doesn't block but notifies
      console.warn(`Daily gain cap reached for user ${this.config.userId}: ${today.dailyPnl} USD`);
    }
    
    this.dailyMetrics.set(today.date, today);
  }
  
  /**
   * Trigger kill switch
   */
  private triggerKillSwitch(
    type: KillSwitchTrigger['type'],
    severity: KillSwitchTrigger['severity'],
    metric: number,
    threshold: number
  ): void {
    const trigger: KillSwitchTrigger = {
      type,
      severity,
      triggeredAt: new Date(),
      metric,
      threshold,
      message: this.getKillSwitchMessage(type, metric, threshold),
      autoAction: severity === 'hard' ? 'kill' : severity === 'medium' ? 'pause' : 'warn'
    };
    
    this.killSwitchHistory.push(trigger);
    
    // Auto-action
    if (trigger.autoAction === 'kill') {
      this.kill(`Auto-kill: ${trigger.message}`);
    } else if (trigger.autoAction === 'pause') {
      this.pause(`Auto-pause: ${trigger.message}`);
    }
    
    // Mark today's metrics
    const today = this.getTodayMetrics();
    today.killSwitchTriggered = true;
    this.dailyMetrics.set(today.date, today);
  }
  
  /**
   * Get human-readable kill switch message
   */
  private getKillSwitchMessage(type: KillSwitchTrigger['type'], metric: number, threshold: number): string {
    switch (type) {
      case 'daily_loss':
        return `Daily loss limit exceeded: ${metric.toFixed(2)} USD (limit: ${threshold} USD)`;
      case 'drawdown':
        return `Max drawdown exceeded: ${(metric * 100).toFixed(2)}% (limit: ${(threshold * 100).toFixed(2)}%)`;
      case 'consecutive_losses':
        return `Max consecutive losses reached: ${metric} (limit: ${threshold})`;
      case 'volatility':
        return `High volatility detected: ${metric.toFixed(2)} (threshold: ${threshold})`;
      case 'manual':
        return 'Manual override triggered';
      case 'api_error':
        return `API error rate exceeded: ${metric}%`;
      default:
        return 'Unknown kill switch trigger';
    }
  }
  
  /**
   * Manual kill (admin override)
   */
  kill(reason: string, approvedBy?: string): void {
    this.config.status = 'killed';
    this.config.statusReason = reason;
    this.config.statusChangedAt = new Date();
    this.config.overrideApprovedBy = approvedBy;
  }
  
  /**
   * Manual pause (admin override)
   */
  pause(reason: string, approvedBy?: string): void {
    this.config.status = 'paused';
    this.config.statusReason = reason;
    this.config.statusChangedAt = new Date();
    this.config.overrideApprovedBy = approvedBy;
  }
  
  /**
   * Resume trading (admin override)
   */
  resume(approvedBy: string): void {
    this.config.status = 'active';
    this.config.statusReason = undefined;
    this.config.statusChangedAt = new Date();
    this.config.overrideApprovedBy = approvedBy;
    
    // Reset consecutive losses on manual resume
    this.currentConsecutiveLosses = 0;
  }
  
  /**
   * Get or create today's metrics
   */
  private getTodayMetrics(): DailyMetrics {
    const today = new Date().toISOString().split('T')[0];
    
    if (!this.dailyMetrics.has(today)) {
      const yesterday = this.getYesterdayMetrics();
      this.dailyMetrics.set(today, {
        date: today,
        startingBalance: yesterday?.endingBalance || this.currentBalance,
        endingBalance: this.currentBalance,
        dailyPnl: 0,
        dailyPnlPct: 0,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        maxDrawdown: 0,
        maxDrawdownPct: 0,
        volatility: 0,
        fearGreedIndex: 50,
        consecutiveLosses: 0,
        killSwitchTriggered: false
      });
    }
    
    return this.dailyMetrics.get(today)!;
  }
  
  /**
   * Get yesterday's metrics
   */
  private getYesterdayMetrics(): DailyMetrics | undefined {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().split('T')[0];
    return this.dailyMetrics.get(yesterdayKey);
  }
  
  /**
   * Get all metrics
   */
  getMetrics(): { daily: DailyMetrics[]; killSwitchHistory: KillSwitchTrigger[] } {
    return {
      daily: Array.from(this.dailyMetrics.values()).sort((a, b) => a.date.localeCompare(b.date)),
      killSwitchHistory: this.killSwitchHistory
    };
  }
  
  /**
   * Get current status summary
   */
  getStatus(): {
    userId: string;
    status: BetaStatus;
    currentBalance: number;
    peakBalance: number;
    totalPnl: number;
    todayPnl: number;
    currentDrawdown: number;
    canTrade: boolean;
  } {
    const today = this.getTodayMetrics();
    const currentDrawdown = (this.peakBalance - this.currentBalance) / this.peakBalance;
    const canTrade = this.canTrade().allowed;
    
    return {
      userId: this.config.userId,
      status: this.config.status,
      currentBalance: this.currentBalance,
      peakBalance: this.peakBalance,
      totalPnl: this.currentBalance - this.config.initialCapital,
      todayPnl: today.dailyPnl,
      currentDrawdown,
      canTrade
    };
  }
  
  /**
   * Serialize state
   */
  serialize(): string {
    return JSON.stringify({
      config: this.config,
      dailyMetrics: Array.from(this.dailyMetrics.entries()),
      killSwitchHistory: this.killSwitchHistory,
      currentConsecutiveLosses: this.currentConsecutiveLosses,
      peakBalance: this.peakBalance,
      currentBalance: this.currentBalance
    });
  }
  
  /**
   * Deserialize state
   */
  static deserialize(data: string): BetaUserHarness {
    const parsed = JSON.parse(data);
    const harness = new BetaUserHarness(parsed.config);
    harness.dailyMetrics = new Map(parsed.dailyMetrics);
    harness.killSwitchHistory = parsed.killSwitchHistory;
    harness.currentConsecutiveLosses = parsed.currentConsecutiveLosses;
    harness.peakBalance = parsed.peakBalance;
    harness.currentBalance = parsed.currentBalance;
    return harness;
  }
}

/**
 * Beta Cohort Manager – manages all beta users
 */
export class BetaCohortManager {
  private users: Map<string, BetaUserHarness> = new Map();
  private cohortCounts: Record<BetaCohort, number> = { alpha: 0, beta_1: 0, beta_2: 0 };
  
  /**
   * Enroll a new user
   */
  enrollUser(userId: string, cohort: BetaCohort, overrides?: Partial<BetaUserConfig>): BetaUserHarness | null {
    // Check cohort capacity
    if (this.cohortCounts[cohort] >= COHORT_CONFIGS[cohort].maxUsers) {
      console.error(`Cohort ${cohort} is full`);
      return null;
    }
    
    // Check if user already enrolled
    if (this.users.has(userId)) {
      console.error(`User ${userId} already enrolled`);
      return null;
    }
    
    const config: BetaUserConfig = {
      userId,
      cohort,
      enrolledAt: new Date(),
      ...DEFAULT_BETA_CONFIG,
      dailyPnlCap: COHORT_CONFIGS[cohort].dailyPnlCap,
      maxDrawdownPct: COHORT_CONFIGS[cohort].maxDrawdownPct,
      ...overrides
    };
    
    const harness = new BetaUserHarness(config);
    this.users.set(userId, harness);
    this.cohortCounts[cohort]++;
    
    return harness;
  }
  
  /**
   * Get user harness
   */
  getUser(userId: string): BetaUserHarness | undefined {
    return this.users.get(userId);
  }
  
  /**
   * Get all users in a cohort
   */
  getCohort(cohort: BetaCohort): BetaUserHarness[] {
    return Array.from(this.users.values()).filter(u => u['config'].cohort === cohort);
  }
  
  /**
   * Get cohort statistics
   */
  getCohortStats(cohort: BetaCohort): {
    totalUsers: number;
    active: number;
    paused: number;
    killed: number;
    avgPnl: number;
    killSwitchRate: number;
  } {
    const users = this.getCohort(cohort);
    const statuses = users.map(u => u.getStatus());
    
    return {
      totalUsers: users.length,
      active: statuses.filter(s => s.status === 'active').length,
      paused: statuses.filter(s => s.status === 'paused').length,
      killed: statuses.filter(s => s.status === 'killed').length,
      avgPnl: statuses.reduce((sum, s) => sum + s.totalPnl, 0) / (statuses.length || 1),
      killSwitchRate: users.filter(u => u.getMetrics().killSwitchHistory.length > 0).length / (users.length || 1)
    };
  }
  
  /**
   * Get overall statistics
   */
  getOverallStats(): {
    totalUsers: number;
    byCohort: Record<BetaCohort, number>;
    active: number;
    paused: number;
    killed: number;
    totalPnl: number;
    avgPnlPerUser: number;
  } {
    const allStatuses = Array.from(this.users.values()).map(u => u.getStatus());
    
    return {
      totalUsers: this.users.size,
      byCohort: this.cohortCounts,
      active: allStatuses.filter(s => s.status === 'active').length,
      paused: allStatuses.filter(s => s.status === 'paused').length,
      killed: allStatuses.filter(s => s.status === 'killed').length,
      totalPnl: allStatuses.reduce((sum, s) => sum + s.totalPnl, 0),
      avgPnlPerUser: allStatuses.reduce((sum, s) => sum + s.totalPnl, 0) / (allStatuses.length || 1)
    };
  }
  
  /**
   * Admin: Kill all users (emergency)
   */
  emergencyKillAll(reason: string, approvedBy: string): void {
    for (const user of this.users.values()) {
      user.kill(`EMERGENCY: ${reason}`, approvedBy);
    }
  }
  
  /**
   * Admin: Pause all users
   */
  pauseAll(reason: string, approvedBy: string): void {
    for (const user of this.users.values()) {
      if (user['config'].status === 'active') {
        user.pause(`Global pause: ${reason}`, approvedBy);
      }
    }
  }
  
  /**
   * Admin: Resume all paused users
   */
  resumeAll(approvedBy: string): void {
    for (const user of this.users.values()) {
      if (user['config'].status === 'paused') {
        user.resume(approvedBy);
      }
    }
  }
}

/**
 * Factory for creating beta harness with default config
 */
export function createBetaHarness(
  userId: string,
  cohort: BetaCohort = 'beta_1',
  overrides?: Partial<BetaUserConfig>
): BetaUserHarness {
  const config: BetaUserConfig = {
    userId,
    cohort,
    enrolledAt: new Date(),
    ...DEFAULT_BETA_CONFIG,
    ...overrides
  };
  
  return new BetaUserHarness(config);
}
