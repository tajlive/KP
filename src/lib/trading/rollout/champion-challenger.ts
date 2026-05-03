/**
 * Champion/Challenger Rollout Framework
 * 
 * Features:
 * - Traffic splitting per cohort
 * - Auto-rollback on degradation
 * - Metric monitoring (Sharpe, drawdown, error rate)
 * - Gradual rollout: 5% (alpha) → 20% (beta1) → 50% (beta2)
 * 
 * @module trading/rollout
 * @version 3.0.1
 */

import type { BetaCohort } from '../beta/beta-harness';

export type PolicyVersion = 'champion' | 'challenger';

export interface RolloutConfig {
  // Traffic split per cohort
  trafficSplit: Record<BetaCohort, { champion: number; challenger: number }>;
  
  // Rollback thresholds
  thresholds: {
    minSharpe: number;
    maxDrawdown: number;
    maxErrorRate: number;
    minWinRate: number;
  };
  
  // Evaluation window
  evaluationWindowBars: number;
  minSampleSize: number;
  
  // Auto-rollback
  autoRollback: boolean;
  rollbackOnDegradation: boolean;
}

export const DEFAULT_ROLLOUT_CONFIG: RolloutConfig = {
  trafficSplit: {
    alpha: { champion: 95, challenger: 5 },
    beta_1: { champion: 80, challenger: 20 },
    beta_2: { champion: 50, challenger: 50 }
  },
  thresholds: {
    minSharpe: 0.8,
    maxDrawdown: 0.20,
    maxErrorRate: 0.05,
    minWinRate: 0.45
  },
  evaluationWindowBars: 100,
  minSampleSize: 20,
  autoRollback: true,
  rollbackOnDegradation: true
};

export interface PolicyMetrics {
  version: PolicyVersion;
  cohort: BetaCohort;
  
  // Performance
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  
  // Risk
  volatility: number;
  avgLoss: number;
  consecutiveLosses: number;
  
  // Execution
  errorRate: number;
  avgSlippage: number;
  avgLatency: number;
  fillRate: number;
  
  // Sample size
  trades: number;
  bars: number;
  
  // Timestamps
  startTime: Date;
  endTime: Date;
}

export interface RolloutDecision {
  useChallenger: boolean;
  reason: string;
  confidence: number;
  metrics?: {
    champion: PolicyMetrics;
    challenger: PolicyMetrics;
  };
}

export interface RolloutStatus {
  cohort: BetaCohort;
  currentSplit: { champion: number; challenger: number };
  championMetrics: PolicyMetrics | null;
  challengerMetrics: PolicyMetrics | null;
  isRollbackActive: boolean;
  rollbackReason?: string;
  health: 'healthy' | 'degraded' | 'critical';
  recommendations: string[];
}

/**
 * Champion/Challenger Rollout Manager
 */
export class ChampionChallengerRollout {
  private config: RolloutConfig;
  private metrics: Map<string, PolicyMetrics[]> = new Map();
  private rollbackState: Map<BetaCohort, { active: boolean; reason: string; timestamp: Date }> = new Map();
  
  constructor(config: Partial<RolloutConfig> = {}) {
    this.config = { ...DEFAULT_ROLLOUT_CONFIG, ...config };
  }
  
  /**
   * Decide whether to use challenger for a user
   */
  shouldUseChallenger(cohort: BetaCohort, userId: string): RolloutDecision {
    // Check if rollback is active
    const rollback = this.rollbackState.get(cohort);
    if (rollback?.active) {
      return {
        useChallenger: false,
        reason: `Rollback active: ${rollback.reason}`,
        confidence: 1
      };
    }
    
    // Deterministic assignment based on user ID hash
    const hash = this.hashUserId(userId);
    const split = this.config.trafficSplit[cohort];
    const challengerThreshold = split.challenger / 100;
    
    const useChallenger = (hash % 1000) / 1000 < challengerThreshold;
    
    return {
      useChallenger,
      reason: useChallenger ? 'Challenger traffic split' : 'Champion traffic split',
      confidence: 0.95
    };
  }
  
  /**
   * Record metrics for a policy version
   */
  recordMetrics(metrics: PolicyMetrics): void {
    const key = `${metrics.cohort}-${metrics.version}`;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    const list = this.metrics.get(key)!;
    list.push(metrics);
    
    // Keep only recent metrics
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days
    while (list.length > 0 && list[0].endTime.getTime() < cutoff) {
      list.shift();
    }
    
    // Check for rollback conditions
    if (this.config.autoRollback) {
      this.evaluateRollback(metrics.cohort);
    }
  }
  
  /**
   * Evaluate if rollback is needed
   */
  private evaluateRollback(cohort: BetaCohort): void {
    const championMetrics = this.getAggregatedMetrics(cohort, 'champion');
    const challengerMetrics = this.getAggregatedMetrics(cohort, 'challenger');
    
    if (!championMetrics || !challengerMetrics) return;
    
    // Check if challenger is significantly worse
    const degradationChecks = [
      {
        check: challengerMetrics.sharpeRatio < this.config.thresholds.minSharpe &&
               challengerMetrics.sharpeRatio < championMetrics.sharpeRatio * 0.7,
        reason: 'Sharpe ratio below threshold and significantly worse than champion'
      },
      {
        check: challengerMetrics.maxDrawdown > this.config.thresholds.maxDrawdown,
        reason: 'Max drawdown exceeds threshold'
      },
      {
        check: challengerMetrics.errorRate > this.config.thresholds.maxErrorRate,
        reason: 'Error rate exceeds threshold'
      },
      {
        check: challengerMetrics.winRate < this.config.thresholds.minWinRate,
        reason: 'Win rate below threshold'
      },
      {
        check: this.config.rollbackOnDegradation &&
               challengerMetrics.totalReturn < championMetrics.totalReturn * 0.5,
        reason: 'Total return significantly worse than champion'
      }
    ];
    
    for (const { check, reason } of degradationChecks) {
      if (check) {
        this.activateRollback(cohort, reason);
        return;
      }
    }
  }
  
  /**
   * Activate rollback for cohort
   */
  activateRollback(cohort: BetaCohort, reason: string): void {
    this.rollbackState.set(cohort, {
      active: true,
      reason,
      timestamp: new Date()
    });
    
    console.warn(`[Rollout] Rollback activated for ${cohort}: ${reason}`);
  }
  
  /**
   * Clear rollback for cohort
   */
  clearRollback(cohort: BetaCohort): void {
    this.rollbackState.delete(cohort);
  }
  
  /**
   * Get aggregated metrics for a policy version
   */
  getAggregatedMetrics(cohort: BetaCohort, version: PolicyVersion): PolicyMetrics | null {
    const key = `${cohort}-${version}`;
    const list = this.metrics.get(key);
    
    if (!list || list.length === 0) return null;
    
    // Aggregate metrics
    const totalTrades = list.reduce((sum, m) => sum + m.trades, 0);
    
    if (totalTrades < this.config.minSampleSize) return null;
    
    const weightedSharpe = list.reduce((sum, m) => sum + m.sharpeRatio * m.trades, 0) / totalTrades;
    const maxDrawdown = Math.max(...list.map(m => m.maxDrawdown));
    const weightedWinRate = list.reduce((sum, m) => sum + m.winRate * m.trades, 0) / totalTrades;
    const totalReturn = list.reduce((sum, m) => sum + m.totalReturn, 0);
    const avgErrorRate = list.reduce((sum, m) => sum + m.errorRate, 0) / list.length;
    
    return {
      version,
      cohort,
      totalReturn,
      sharpeRatio: weightedSharpe,
      maxDrawdown,
      winRate: weightedWinRate,
      profitFactor: list.reduce((sum, m) => sum + m.profitFactor, 0) / list.length,
      volatility: list.reduce((sum, m) => sum + m.volatility, 0) / list.length,
      avgLoss: list.reduce((sum, m) => sum + m.avgLoss, 0) / list.length,
      consecutiveLosses: Math.max(...list.map(m => m.consecutiveLosses)),
      errorRate: avgErrorRate,
      avgSlippage: list.reduce((sum, m) => sum + m.avgSlippage, 0) / list.length,
      avgLatency: list.reduce((sum, m) => sum + m.avgLatency, 0) / list.length,
      fillRate: list.reduce((sum, m) => sum + m.fillRate, 0) / list.length,
      trades: totalTrades,
      bars: list.reduce((sum, m) => sum + m.bars, 0),
      startTime: list[0].startTime,
      endTime: list[list.length - 1].endTime
    };
  }
  
  /**
   * Get rollout status for a cohort
   */
  getStatus(cohort: BetaCohort): RolloutStatus {
    const champion = this.getAggregatedMetrics(cohort, 'champion');
    const challenger = this.getAggregatedMetrics(cohort, 'challenger');
    const rollback = this.rollbackState.get(cohort);
    
    const recommendations: string[] = [];
    let health: 'healthy' | 'degraded' | 'critical' = 'healthy';
    
    if (rollback?.active) {
      health = 'critical';
      recommendations.push('Rollback is active - investigate challenger performance');
    } else if (challenger && champion) {
      if (challenger.sharpeRatio < champion.sharpeRatio * 0.9) {
        health = 'degraded';
        recommendations.push('Challenger Sharpe ratio degrading');
      }
      if (challenger.maxDrawdown > champion.maxDrawdown * 1.2) {
        health = 'degraded';
        recommendations.push('Challenger drawdown significantly higher');
      }
      
      if (challenger.sharpeRatio > champion.sharpeRatio * 1.1 && 
          challenger.maxDrawdown < champion.maxDrawdown) {
        recommendations.push('Challenger outperforming - consider increasing traffic');
      }
    }
    
    if (!challenger || challenger.trades < this.config.minSampleSize) {
      recommendations.push('Insufficient challenger data for evaluation');
    }
    
    return {
      cohort,
      currentSplit: this.config.trafficSplit[cohort],
      championMetrics: champion,
      challengerMetrics: challenger,
      isRollbackActive: rollback?.active || false,
      rollbackReason: rollback?.reason,
      health,
      recommendations
    };
  }
  
  /**
   * Update traffic split for a cohort
   */
  updateTrafficSplit(cohort: BetaCohort, champion: number, challenger: number): void {
    if (champion + challenger !== 100) {
      throw new Error('Traffic split must sum to 100');
    }
    
    this.config.trafficSplit[cohort] = { champion, challenger };
  }
  
  /**
   * Get comparison between champion and challenger
   */
  getComparison(cohort: BetaCohort): {
    metric: string;
    champion: number;
    challenger: number;
    difference: number;
    winner: PolicyVersion;
  }[] | null {
    const champion = this.getAggregatedMetrics(cohort, 'champion');
    const challenger = this.getAggregatedMetrics(cohort, 'challenger');
    
    if (!champion || !challenger) return null;
    
    const compare = (name: string, cVal: number, hVal: number, higherIsBetter: boolean) => ({
      metric: name,
      champion: cVal,
      challenger: hVal,
      difference: hVal - cVal,
      winner: higherIsBetter 
        ? (hVal > cVal ? 'challenger' : 'champion')
        : (hVal < cVal ? 'challenger' : 'champion')
    });
    
    return [
      compare('Sharpe Ratio', champion.sharpeRatio, challenger.sharpeRatio, true),
      compare('Total Return', champion.totalReturn, challenger.totalReturn, true),
      compare('Max Drawdown', champion.maxDrawdown, challenger.maxDrawdown, false),
      compare('Win Rate', champion.winRate, challenger.winRate, true),
      compare('Error Rate', champion.errorRate, challenger.errorRate, false)
    ] as { metric: string; champion: number; challenger: number; difference: number; winner: PolicyVersion }[];
  }
  
  /**
   * Hash user ID for deterministic assignment
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
  
  /**
   * Export rollout report
   */
  exportReport(): string {
    const cohorts: BetaCohort[] = ['alpha', 'beta_1', 'beta_2'];
    
    return JSON.stringify({
      config: this.config,
      cohorts: cohorts.map(c => this.getStatus(c)),
      comparisons: cohorts.map(c => ({
        cohort: c,
        comparison: this.getComparison(c)
      })),
      exportedAt: new Date().toISOString()
    }, null, 2);
  }
}

/**
 * Quick check if rollout is healthy
 */
export function isRolloutHealthy(status: RolloutStatus): boolean {
  return status.health === 'healthy' && !status.isRollbackActive;
}

/**
 * Recommend traffic adjustment
 */
export function recommendTrafficAdjustment(status: RolloutStatus): {
  action: 'increase' | 'decrease' | 'maintain' | 'rollback';
  targetSplit?: { champion: number; challenger: number };
  reason: string;
} {
  if (status.isRollbackActive) {
    return { action: 'rollback', reason: status.rollbackReason || 'Unknown' };
  }
  
  if (!status.championMetrics || !status.challengerMetrics) {
    return { action: 'maintain', reason: 'Insufficient data' };
  }
  
  const c = status.championMetrics;
  const h = status.challengerMetrics;
  
  // Significant outperformance
  if (h.sharpeRatio > c.sharpeRatio * 1.2 && h.maxDrawdown < c.maxDrawdown * 1.1) {
    const currentChallenger = status.currentSplit.challenger;
    const newChallenger = Math.min(80, currentChallenger + 20);
    
    return {
      action: 'increase',
      targetSplit: { champion: 100 - newChallenger, challenger: newChallenger },
      reason: 'Challenger significantly outperforming champion'
    };
  }
  
  // Significant underperformance
  if (h.sharpeRatio < c.sharpeRatio * 0.8 || h.maxDrawdown > c.maxDrawdown * 1.3) {
    return {
      action: 'decrease',
      targetSplit: { champion: 95, challenger: 5 },
      reason: 'Challenger underperforming - reducing traffic'
    };
  }
  
  return { action: 'maintain', reason: 'Performance comparable' };
}
