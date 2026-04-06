/**
 * P0 Rollback Tests
 * 
 * Verifies auto-rollback functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChampionChallengerRollout, recommendTrafficAdjustment } from '@/lib/trading/rollout';
import type { PolicyMetrics, RolloutStatus } from '@/lib/trading/rollout';

describe('P0 Rollback Tests', () => {
  let rollout: ChampionChallengerRollout;
  
  beforeEach(() => {
    rollout = new ChampionChallengerRollout();
  });
  
  describe('Auto-Rollback Triggers', () => {
    it('should rollback when Sharpe drops below threshold', () => {
      // Record baseline champion
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
      
      // Record failing challenger (Sharpe < 0.8)
      rollout.recordMetrics({
        version: 'challenger',
        cohort: 'alpha',
        totalReturn: 0.02,
        sharpeRatio: 0.5,
        maxDrawdown: 0.12,
        winRate: 0.45,
        profitFactor: 1.1,
        volatility: 0.25,
        avgLoss: -80,
        consecutiveLosses: 3,
        errorRate: 0.03,
        avgSlippage: 6,
        avgLatency: 120,
        fillRate: 0.93,
        trades: 100,
        bars: 200,
        startTime: new Date(),
        endTime: new Date()
      });
      
      const status = rollout.getStatus('alpha');
      
      expect(status.isRollbackActive).toBe(true);
      expect(status.rollbackReason).toContain('Sharpe');
    });
    
    it('should rollback when drawdown exceeds 20%', () => {
      rollout.recordMetrics({
        version: 'champion',
        cohort: 'alpha',
        totalReturn: 0.10,
        sharpeRatio: 1.1,
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
        trades: 50,
        bars: 100,
        startTime: new Date(),
        endTime: new Date()
      });
      
      rollout.recordMetrics({
        version: 'challenger',
        cohort: 'alpha',
        totalReturn: 0.08,
        sharpeRatio: 0.9,
        maxDrawdown: 0.25, // Exceeds 20%
        winRate: 0.50,
        profitFactor: 1.3,
        volatility: 0.3,
        avgLoss: -120,
        consecutiveLosses: 4,
        errorRate: 0.02,
        avgSlippage: 5,
        avgLatency: 100,
        fillRate: 0.95,
        trades: 50,
        bars: 100,
        startTime: new Date(),
        endTime: new Date()
      });
      
      const status = rollout.getStatus('alpha');
      expect(status.isRollbackActive).toBe(true);
    });
    
    it('should rollback when error rate exceeds 5%', () => {
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
        totalReturn: 0.09,
        sharpeRatio: 1.0,
        maxDrawdown: 0.12,
        winRate: 0.52,
        profitFactor: 1.4,
        volatility: 0.22,
        avgLoss: -60,
        consecutiveLosses: 2,
        errorRate: 0.08, // Exceeds 5%
        avgSlippage: 5,
        avgLatency: 100,
        fillRate: 0.95,
        trades: 100,
        bars: 200,
        startTime: new Date(),
        endTime: new Date()
      });
      
      const status = rollout.getStatus('alpha');
      expect(status.isRollbackActive).toBe(true);
      expect(status.rollbackReason).toContain('Error');
    });
    
    it('should rollback when win rate below 45%', () => {
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
        totalReturn: 0.05,
        sharpeRatio: 0.8,
        maxDrawdown: 0.14,
        winRate: 0.40, // Below 45%
        profitFactor: 1.2,
        volatility: 0.25,
        avgLoss: -70,
        consecutiveLosses: 3,
        errorRate: 0.02,
        avgSlippage: 5,
        avgLatency: 100,
        fillRate: 0.95,
        trades: 100,
        bars: 200,
        startTime: new Date(),
        endTime: new Date()
      });
      
      const status = rollout.getStatus('alpha');
      expect(status.isRollbackActive).toBe(true);
    });
  });
  
  describe('Rollback Behavior', () => {
    it('should block all challenger traffic after rollback', () => {
      rollout.activateRollback('alpha', 'Test rollback');
      
      // Multiple decisions should all use champion
      for (let i = 0; i < 10; i++) {
        const decision = rollout.shouldUseChallenger('alpha', `user-${i}`);
        expect(decision.useChallenger).toBe(false);
      }
    });
    
    it('should clear rollback when requested', () => {
      rollout.activateRollback('alpha', 'Test');
      expect(rollout.getStatus('alpha').isRollbackActive).toBe(true);
      
      rollout.clearRollback('alpha');
      expect(rollout.getStatus('alpha').isRollbackActive).toBe(false);
    });
  });
  
  describe('Traffic Adjustment Recommendations', () => {
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
          profitFactor: 1.6,
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
      
      const rec = recommendTrafficAdjustment(status);
      expect(rec.action).toBe('increase');
    });
    
    it('should recommend decrease for underperforming challenger', () => {
      const status: RolloutStatus = {
        cohort: 'alpha',
        currentSplit: { champion: 80, challenger: 20 },
        championMetrics: {
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
        },
        challengerMetrics: {
          version: 'challenger',
          cohort: 'alpha',
          totalReturn: 0.05,
          sharpeRatio: 0.8,
          maxDrawdown: 0.18,
          winRate: 0.45,
          profitFactor: 1.1,
          volatility: 0.28,
          avgLoss: -80,
          consecutiveLosses: 3,
          errorRate: 0.03,
          avgSlippage: 6,
          avgLatency: 110,
          fillRate: 0.93,
          trades: 100,
          bars: 200,
          startTime: new Date(),
          endTime: new Date()
        },
        isRollbackActive: false,
        health: 'degraded',
        recommendations: []
      };
      
      const rec = recommendTrafficAdjustment(status);
      expect(rec.action).toBe('decrease');
    });
  });
  
  describe('Rollback Recovery', () => {
    it('should track rollback history', () => {
      rollout.activateRollback('alpha', 'First rollback');
      const status1 = rollout.getStatus('alpha');
      
      rollout.clearRollback('alpha');
      
      rollout.activateRollback('alpha', 'Second rollback');
      const status2 = rollout.getStatus('alpha');
      
      expect(status1.isRollbackActive).toBe(true);
      expect(status2.isRollbackActive).toBe(true);
      expect(status2.rollbackReason).toBe('Second rollback');
    });
  });
});
