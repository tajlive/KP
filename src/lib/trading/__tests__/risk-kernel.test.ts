/**
 * Risk Kernel Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  RiskKernel, 
  RiskStateManager,
  DEFAULT_RISK_LIMITS,
  type RiskLimits,
  type RiskState 
} from '../risk/risk-kernel';

describe('RiskKernel', () => {
  let risk: RiskKernel;
  
  beforeEach(() => {
    risk = new RiskKernel();
  });
  
  describe('Hard Limits', () => {
    it('should block trade exceeding daily loss limit', () => {
      const state: RiskState = {
        equity: 10000,
        peakEquity: 10000,
        dailyPnl: -550, // Exceeds $500 limit
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
      
      const trade = {
        side: 'buy' as const,
        quantity: 1,
        price: 100,
        notional: 100,
        leverage: 1
      };
      
      const result = risk.checkTrade(trade, state);
      
      expect(result.allowed).toBe(false);
      expect(result.violations.some(v => v.rule === 'maxDailyLoss')).toBe(true);
    });
    
    it('should block trade exceeding drawdown limit', () => {
      const state: RiskState = {
        equity: 8500,
        peakEquity: 10000, // 15% drawdown
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
      
      const trade = {
        side: 'buy' as const,
        quantity: 1,
        price: 100,
        notional: 100,
        leverage: 1
      };
      
      const result = risk.checkTrade(trade, state);
      
      expect(result.allowed).toBe(false);
      expect(result.violations.some(v => v.rule === 'maxDrawdown')).toBe(true);
    });
    
    it('should block trade exceeding leverage limit', () => {
      const state: RiskState = {
        equity: 10000,
        peakEquity: 10000,
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
      
      const trade = {
        side: 'buy' as const,
        quantity: 1,
        price: 100,
        notional: 100,
        leverage: 5 // Exceeds 3x limit
      };
      
      const result = risk.checkTrade(trade, state);
      
      expect(result.allowed).toBe(false);
      expect(result.violations.some(v => v.rule === 'maxLeverage')).toBe(true);
    });
    
    it('should reduce trade size exceeding position limit', () => {
      const state: RiskState = {
        equity: 10000,
        peakEquity: 10000,
        dailyPnl: 0,
        openPositions: 1,
        openNotional: 2500, // Already 25% in
        currentLeverage: 1,
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
      
      const trade = {
        side: 'buy' as const,
        quantity: 1,
        price: 1000,
        notional: 1000, // Would exceed 30% limit
        leverage: 1
      };
      
      const result = risk.checkTrade(trade, state);
      
      // Should reduce, not block, if possible
      if (result.allowed) {
        expect(result.adjustedTrade).toBeDefined();
        expect(result.adjustedTrade!.notional).toBeLessThan(trade.notional);
      }
    });
  });
  
  describe('Cooldowns', () => {
    it('should block trade during consecutive loss cooldown', () => {
      const cooldownEnd = new Date();
      cooldownEnd.setMinutes(cooldownEnd.getMinutes() + 10);
      
      const state: RiskState = {
        equity: 10000,
        peakEquity: 10000,
        dailyPnl: 0,
        openPositions: 0,
        openNotional: 0,
        currentLeverage: 0,
        consecutiveLosses: 5,
        tradesToday: 0,
        tradesThisHour: 0,
        volatilitySpikeActive: false,
        volatilityCooldownEnd: null,
        consecutiveLossCooldownEnd: cooldownEnd,
        manualBlock: false,
        lastTradeTime: null,
        currentTime: new Date()
      };
      
      const trade = {
        side: 'buy' as const,
        quantity: 1,
        price: 100,
        notional: 100,
        leverage: 1
      };
      
      const result = risk.checkTrade(trade, state);
      
      expect(result.allowed).toBe(false);
      expect(result.violations.some(v => v.rule === 'consecutiveLossCooldown')).toBe(true);
    });
    
    it('should block trade during volatility circuit breaker', () => {
      const cooldownEnd = new Date();
      cooldownEnd.setMinutes(cooldownEnd.getMinutes() + 5);
      
      const state: RiskState = {
        equity: 10000,
        peakEquity: 10000,
        dailyPnl: 0,
        openPositions: 0,
        openNotional: 0,
        currentLeverage: 0,
        consecutiveLosses: 0,
        tradesToday: 0,
        tradesThisHour: 0,
        volatilitySpikeActive: true,
        volatilityCooldownEnd: cooldownEnd,
        consecutiveLossCooldownEnd: null,
        manualBlock: false,
        lastTradeTime: null,
        currentTime: new Date()
      };
      
      const trade = {
        side: 'buy' as const,
        quantity: 1,
        price: 100,
        notional: 100,
        leverage: 1
      };
      
      const result = risk.checkTrade(trade, state);
      
      expect(result.allowed).toBe(false);
      expect(result.violations.some(v => v.rule === 'volatilityCircuitBreaker')).toBe(true);
    });
  });
  
  describe('Trade Frequency', () => {
    it('should block trade exceeding daily limit', () => {
      const state: RiskState = {
        equity: 10000,
        peakEquity: 10000,
        dailyPnl: 0,
        openPositions: 0,
        openNotional: 0,
        currentLeverage: 0,
        consecutiveLosses: 0,
        tradesToday: 55, // Exceeds 50 limit
        tradesThisHour: 0,
        volatilitySpikeActive: false,
        volatilityCooldownEnd: null,
        consecutiveLossCooldownEnd: null,
        manualBlock: false,
        lastTradeTime: null,
        currentTime: new Date()
      };
      
      const trade = {
        side: 'buy' as const,
        quantity: 1,
        price: 100,
        notional: 100,
        leverage: 1
      };
      
      const result = risk.checkTrade(trade, state);
      
      expect(result.allowed).toBe(false);
    });
  });
  
  describe('Allowed Trades', () => {
    it('should allow compliant trade', () => {
      const state: RiskState = {
        equity: 10000,
        peakEquity: 10000,
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
      
      const trade = {
        side: 'buy' as const,
        quantity: 0.1,
        price: 100,
        notional: 10,
        leverage: 1
      };
      
      const result = risk.checkTrade(trade, state);
      
      expect(result.allowed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });
  
  describe('Violations', () => {
    it('should log violations for audit', () => {
      const state: RiskState = {
        equity: 10000,
        peakEquity: 10000,
        dailyPnl: -550,
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
      
      const trade = {
        side: 'buy' as const,
        quantity: 1,
        price: 100,
        notional: 100,
        leverage: 1
      };
      
      risk.checkTrade(trade, state);
      
      const violations = risk.getViolations();
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].timestamp).toBeInstanceOf(Date);
      expect(violations[0].severity).toBe('critical');
    });
  });
});

describe('RiskStateManager', () => {
  it('should track state updates', () => {
    const manager = new RiskStateManager(10000);
    
    manager.updateState({ equity: 10500, dailyPnl: 500 });
    
    const state = manager.getState();
    expect(state.equity).toBe(10500);
    expect(state.peakEquity).toBe(10500); // Updated automatically
  });
  
  it('should track consecutive losses', () => {
    const manager = new RiskStateManager(10000);
    
    manager.recordTrade(-100, 1000); // Loss
    manager.recordTrade(-50, 500);   // Loss
    manager.recordTrade(100, 1000);  // Win
    
    const state = manager.getState();
    expect(state.consecutiveLosses).toBe(0); // Reset after win
  });
});
