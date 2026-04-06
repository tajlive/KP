/**
 * Champion/Challenger Rollout Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  ChampionChallengerRollout,
  isRolloutHealthy,
  recommendTrafficAdjustment,
  DEFAULT_ROLLOUT_CONFIG,
  type PolicyMetrics,
  type RolloutStatus
} from '../rollout/champion-challenger';

describe('ChampionChallengerRollout', () => {
  let rollout: ChampionChallengerRollout;
  
  beforeEach(() => {
    rollout = new ChampionChallengerRollout();
  });
  
  describe('Traffic Assignment', () => {
    it('should assign challenger based on cohort split', () => {
      const alphaResult = rollout.shouldUseChallenger('alpha', 'user-1');
      const beta1Result = rollout.shouldUseChallenger('beta_1', 'user-2');
      const beta2Result = rollout.shouldUseChallenger('beta_2', 'user-3');
      
      // Alpha: 5% challenger - mostly champion
      // Beta 1: 20% challenger
      // Beta 2: 50% challenger
      
      expect(alphaResult.reason).toContain('traffic split');
      expect(beta1Result.reason).toContain('traffic split');
      expect(beta2Result.reason).toContain('traffic split');
    });
    
    it('should be deterministic for same user', () => {
      const result1 = rollout.shouldUseChallenger('alpha', 'same-user');
      const result2 = rollout.shouldUseChallenger('alpha', 'same-user');
      
      expect(result1.useChallenger).toBe(result2.useChallenger);
    });
    
    it('should block challenger when rollback is active', () => {
      rollout.activateRollback('alpha', 'Test rollback');
      
      const result = rollout.shouldUseChallenger('alpha', 'user-1');
      
      expect(result.useChallenger).toBe(false);
      expect(result.reason).toContain('Rollback active');
    });
  });
  
  describe('Auto-Rollback', () => {
    it('should trigger rollback on low Sharpe ratio', () => {
      const metrics: PolicyMetrics = {
        version: 'challenger',
        cohort: 'alpha',
        totalReturn: 0.05,
        sharpeRatio: 0.5, // Below 0.8 threshold
        maxDrawdown: 0.10,
        winRate: 0.50,
        profitFactor: 1.2,
        volatility: 0.2,
        avgLoss: -50,
        consecutiveLosses: 2,
        errorRate: 0.02,
        avgSlippage: 5,
        avgLatency: 100,
        fillRate: 0.95,
        trades: 50,
        bars: 100,
        startTime: new Date(),
        endTime: new Date()
      };
      
      // Record champion first
      rollout.recordMetrics({
        ...metrics,
        version: 'champion',
        sharpeRatio: 1.2
      });
      
      // Then record poor challenger
      rollout.recordMetrics(metrics);
      
      const status = rollout.getStatus('alpha');
      expect(status.isRollbackActive).toBe(true);
      expect(status.rollbackReason).toContain('Sharpe');
    });
    
    it('should trigger rollback on high drawdown', () => {
      const metrics: PolicyMetrics = {
        version: 'challenger',
        cohort: 'alpha',
        totalReturn: 0.10,
        sharpeRatio: 1.0,
        maxDrawdown: 0.25, // Above 20% threshold
        winRate: 0.50,
        profitFactor: 1.2,
        volatility: 0.3,
        avgLoss: -100,
        consecutiveLosses: 3,
        errorRate: 0.02,
        avgSlippage: 5,
        avgLatency: 100,
        fillRate: 0.95,
        trades: 50,
        bars: 100,
        startTime: new Date(),
        endTime: new Date()
      };
      
      rollout.recordMetrics(metrics);
      
      const status = rollout.getStatus('alpha');
      expect(status.isRollbackActive).toBe(true);
      expect(status.rollbackReason).toContain('drawdown');
    });
    
    it('should trigger rollback on high error rate', () => {
      const metrics: PolicyMetrics = {
        version: 'challenger',
        cohort: 'alpha',
        totalReturn: 0.10,
        sharpeRatio: 1.0,
        maxDrawdown: 0.10,
        winRate: 0.50,
        profitFactor: 1.2,
        volatility: 0.2,
        avgLoss: -50,
        consecutiveLosses: 2,
        errorRate: 0.08, // Above 5% threshold
        avgSlippage: 5,
        avgLatency: 100,
        fillRate: 0.95,
        trades: 50,
        bars: 100,
        startTime: new Date(),
        endTime: new Date()
      };
      
      rollout.recordMetrics(metrics);
      
      const status = rollout.getStatus('alpha');
      expect(status.isRollbackActive).toBe(true);
      expect(status.rollbackReason).toContain('Error');
    });
    
    it('should clear rollback when requested', () => {
      rollout.activateRollback('alpha', 'Test');
      expect(rollout.getStatus('alpha').isRollbackActive).toBe(true);
      
      rollout.clearRollback('alpha');
      expect(rollout.getStatus('alpha').isRollbackActive).toBe(false);
    });
  });
  
  describe('Metrics Aggregation', () => {
    it('should aggregate metrics correctly', () => {
      for (let i = 0; i < 5; i++) {
        rollout.recordMetrics({
          version: 'champion',
          cohort: 'alpha',
          totalReturn: 0.02,
          sharpeRatio: 1.0 + i * 0.1,
          maxDrawdown: 0.10,
          winRate: 0.50,
          profitFactor: 1.2,
          volatility: 0.2,
          avgLoss: -50,
          consecutiveLosses: 2,
          errorRate: 0.02,
          avgSlippage: 5,
          avgLatency: 100,
          fillRate: 0.95,
          trades: 10,
          bars: 20,
          startTime: new Date(),
          endTime: new Date()
        });
      }
      
      const metrics = rollout.getAggregatedMetrics('alpha', 'champion');
      
      expect(metrics).not.toBeNull();
      expect(metrics!.trades).toBe(50); // 5 * 10
      expect(metrics!.sharpeRatio).toBeGreaterThan(1.0);
    });
    
    it('should return null for insufficient data', () => {
      const metrics = rollout.getAggregatedMetrics('alpha', 'champion');
      expect(metrics).toBeNull();
    });
  });
  
  describe('Status & Health', () => {
    it('should report healthy status with good metrics', () => {
      // Record good champion
      rollout.recordMetrics({
        version: 'champion',
        cohort: 'alpha',
        totalReturn: 0.10,
        sharpeRatio: 1.2,
        maxDrawdown: 0.10,
        winRate: 0.55,
        profitFactor: 1.5,
        volatility: 0.2,
        avgLoss: -50,
        consecutiveLosses: 2,
        errorRate: 0.02,
        avgSlippage: 5,
        avgLatency: 100,
        fillRate: 0.95,
        trades: 100,
        bars: 200,
        startTime: new Date(),
        endTime: new Date()
      });
      
      // Record comparable challenger
      rollout.recordMetrics({
        version: 'challenger',
        cohort: 'alpha',
        totalReturn: 0.11,
        sharpeRatio: 1.25,
        maxDrawdown: 0.09,
        winRate: 0.56,
        profitFactor: 1.6,
        volatility: 0.19,
        avgLoss: -48,
        consecutiveLosses: 2,
        errorRate: 0.02,
        avgSlippage: 5,
        avgLatency: 95,
        fillRate: 0.96,
        trades: 100,
        bars: 200,
        startTime: new Date(),
        endTime: new Date()
      });
      
      const status = rollout.getStatus('alpha');
      
      expect(status.health).toBe('healthy');
      expect(status.recommendations.some(r => r.includes('increasing'))).toBe(true);
    });
    
    it('should report degraded status with poor challenger', () => {
      // Record good champion
      rollout.recordMetrics({
        version: 'champion',
        cohort: 'alpha',
        totalReturn: 0.10,
        sharpeRatio: 1.2,
        maxDrawdown: 0.10,
        winRate: 0.55,
        profitFactor: 1.5,
        volatility: 0.2,
        avgLoss: -50,
        consecutiveLosses: 2,
        errorRate: 0.02,
        avgSlippage: 5,
        avgLatency: 100,
        fillRate: 0.95,
        trades: 100,
        bars: 200,
        startTime: new Date(),
        endTime: new Date()
      });
      
      // Record poor challenger
      rollout.recordMetrics({
        version: 'challenger',
        cohort: 'alpha',
        totalReturn: 0.05,
        sharpeRatio: 0.9,
        maxDrawdown: 0.14,
        winRate: 0.48,
        profitFactor: 1.1,
        volatility: 0.25,
        avgLoss: -60,
        consecutiveLosses: 3,
        errorRate: 0.03,
        avgSlippage: 6,
        avgLatency: 110,
        fillRate: 0.93,
        trades: 100,
        bars: 200,
        startTime: new Date(),
        endTime: new Date()
      });
      
      const status = rollout.getStatus('alpha');
      
      expect(status.health).toBe('degraded');
    });
  });
  
  describe('Comparison', () => {
    it('should compare champion vs challenger', () => {
      // Record both versions
      rollout.recordMetrics({
        version: 'champion',
        cohort: 'alpha',
        totalReturn: 0.10,
        sharpeRatio: 1.2,
        maxDrawdown: 0.10,
        winRate: 0.55,
        profitFactor: 1.5,
        volatility: 0.2,
        avgLoss: -50,
        consecutiveLosses: 2,
        errorRate: 0.02,
        avgSlippage: 5,
        avgLatency: 100,
        fillRate: 0.95,
        trades: 100,
        bars: 200,
        startTime: new Date(),
        endTime: new Date()
      });
      
      rollout.recordMetrics({
        version: 'challenger',
        cohort: 'alpha',
        totalReturn: 0.12,
        sharpeRatio: 1.3,
        maxDrawdown: 0.09,
        winRate: 0.58,
        profitFactor: 1.6,
        volatility: 0.19,
        avgLoss: -48,
        consecutiveLosses: 2,
        errorRate: 0.02,
        avgSlippage: 5,
        avgLatency: 95,
        fillRate: 0.96,
        trades: 100,
        bars: 200,
        startTime: new Date(),
        endTime: new Date()
      });
      
      const comparison = rollout.getComparison('alpha');
      
      expect(comparison).not.toBeNull();
      expect(comparison!.length).toBeGreaterThan(0);
      
      const sharpeComparison = comparison!.find(c => c.metric === 'Sharpe Ratio');
      expect(sharpeComparison!.winner).toBe('challenger');
    });
  });
  
  describe('Traffic Split Updates', () => {
    it('should update traffic split', () => {
      rollout.updateTrafficSplit('alpha', 90, 10);
      
      const status = rollout.getStatus('alpha');
      expect(status.currentSplit.champion).toBe(90);
      expect(status.currentSplit.challenger).toBe(10);
    });
    
    it('should reject invalid traffic split', () => {
      expect(() => {
        rollout.updateTrafficSplit('alpha', 80, 30); // Sum != 100
      }).toThrow('Traffic split must sum to 100');
    });
  });
});

describe('isRolloutHealthy', () => {
  it('should return true for healthy status', () => {
    const status: RolloutStatus = {
      cohort: 'alpha',
      currentSplit: { champion: 95, challenger: 5 },
      championMetrics: null,
      challengerMetrics: null,
      isRollbackActive: false,
      health: 'healthy',
      recommendations: []
    };
    
    expect(isRolloutHealthy(status)).toBe(true);
  });
  
  it('should return false when rollback is active', () => {
    const status: RolloutStatus = {
      cohort: 'alpha',
      currentSplit: { champion: 100, challenger: 0 },
      championMetrics: null,
      challengerMetrics: null,
      isRollbackActive: true,
      rollbackReason: 'Test',
      health: 'critical',
      recommendations: []
    };
    
    expect(isRolloutHealthy(status)).toBe(false);
  });
});

describe('recommendTrafficAdjustment', () => {
  it('should recommend increase for outperforming challenger', () => {
    const status: RolloutStatus = {
      cohort: 'alpha',
      currentSplit: { champion: 80, challenger: 20 },
      championMetrics: {
        version: 'champion',
        cohort: 'alpha',
        totalReturn: 0.10,
        sharpeRatio: 1.0,
        maxDrawdown: 0.10,
        winRate: 0.50,
        profitFactor: 1.2,
        volatility: 0.2,
        avgLoss: -50,
        consecutiveLosses: 2,
        errorRate: 0.02,
        avgSlippage: 5,
        avgLatency: 100,
        fillRate: 0.95,
        trades: 100,
        bars: 200,
        startTime: new Date(),
        endTime: new Date()
      },
      challengerMetrics: {
        version: 'challenger',
        cohort: 'alpha',
        totalReturn: 0.15,
        sharpeRatio: 1.3,
        maxDrawdown: 0.08,
        winRate: 0.60,
        profitFactor: 1.5,
        volatility: 0.18,
        avgLoss: -40,
        consecutiveLosses: 1,
        errorRate: 0.02,
        avgSlippage: 5,
        avgLatency: 90,
        fillRate: 0.97,
        trades: 100,
        bars: 200,
        startTime: new Date(),
        endTime: new Date()
      },
      isRollbackActive: false,
      health: 'healthy',
      recommendations: []
    };
    
    const recommendation = recommendTrafficAdjustment(status);
    
    expect(recommendation.action).toBe('increase');
    expect(recommendation.targetSplit).toBeDefined();
  });
  
  it('should recommend rollback when active', () => {
    const status: RolloutStatus = {
      cohort: 'alpha',
      currentSplit: { champion: 100, challenger: 0 },
      championMetrics: null,
      challengerMetrics: null,
      isRollbackActive: true,
      rollbackReason: 'Degradation detected',
      health: 'critical',
      recommendations: []
    };
    
    const recommendation = recommendTrafficAdjustment(status);
    
    expect(recommendation.action).toBe('rollback');
  });
});
