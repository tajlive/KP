import { describe, it, expect } from 'vitest';
import { AutoTrader } from '../auto-trader';
import type { AutoTradingConfig, TradingSignal } from '@/lib/supabase/auto-trading';

describe('AutoTrader', () => {
  const mockConfig: AutoTradingConfig = {
    id: 'test-id',
    user_id: 'user-123',
    enabled: true,
    mode: 'paper',
    risk_level: 'medium',
    max_trade_size_nok: 10000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  describe('shouldExecute', () => {
    it('should execute signal with high confidence', async () => {
      const trader = new AutoTrader(mockConfig);
      const signal: TradingSignal = {
        id: 'sig-1',
        symbol: 'BTC',
        action: 'buy',
        confidence: 80,
        price: 900000,
        reasoning: 'Strong uptrend',
        created_at: new Date().toISOString(),
      };

      const result = await trader.shouldExecute(signal);
      expect(result).toBe(true);
    });

    it('should not execute signal with low confidence for medium risk', async () => {
      const trader = new AutoTrader(mockConfig);
      const signal: TradingSignal = {
        id: 'sig-2',
        symbol: 'BTC',
        action: 'buy',
        confidence: 59, // Below 60 threshold for medium risk
        price: 900000,
        reasoning: 'Weak signal',
        created_at: new Date().toISOString(),
      };

      const result = await trader.shouldExecute(signal);
      expect(result).toBe(false);
    });

    it('should execute lower confidence for high risk', async () => {
      const highRiskConfig = { ...mockConfig, risk_level: 'high' as const };
      const trader = new AutoTrader(highRiskConfig);
      const signal: TradingSignal = {
        id: 'sig-3',
        symbol: 'BTC',
        action: 'buy',
        confidence: 65, // Above 60 threshold for high risk
        price: 900000,
        reasoning: 'Moderate signal',
        created_at: new Date().toISOString(),
      };

      const result = await trader.shouldExecute(signal);
      expect(result).toBe(true);
    });

    it('should not execute stale signals', async () => {
      const trader = new AutoTrader(mockConfig);
      const oldSignal: TradingSignal = {
        id: 'sig-4',
        symbol: 'BTC',
        action: 'buy',
        confidence: 85,
        price: 900000,
        reasoning: 'Old signal',
        created_at: new Date(Date.now() - 16 * 60 * 1000).toISOString(), // 16 minutes old (exceeds 15min threshold)
      };

      const result = await trader.shouldExecute(oldSignal);
      expect(result).toBe(false);
    });
  });

  describe('calculateTradeSize', () => {
    it('should calculate correct trade size based on confidence', () => {
      const trader = new AutoTrader(mockConfig);
      const signal: TradingSignal = {
        id: 'sig-5',
        symbol: 'BTC',
        action: 'buy',
        confidence: 80,
        price: 900000,
        reasoning: 'Test',
        created_at: new Date().toISOString(),
      };

      const quantity = trader.calculateTradeSize(signal);
      const tradeValue = quantity * signal.price;
      
      // 80% confidence of 10000 NOK = 8000 NOK
      expect(tradeValue).toBeCloseTo(8000, 0);
    });

    it('should cap at max trade size', () => {
      const trader = new AutoTrader(mockConfig);
      const signal: TradingSignal = {
        id: 'sig-6',
        symbol: 'BTC',
        action: 'buy',
        confidence: 100,
        price: 900000,
        reasoning: 'Perfect signal',
        created_at: new Date().toISOString(),
      };

      const quantity = trader.calculateTradeSize(signal);
      const tradeValue = quantity * signal.price;
      
      expect(tradeValue).toBe(10000); // Max trade size
    });
  });

  describe('risk levels', () => {
    it('low risk should require 75+ confidence', async () => {
      const lowRiskConfig = { ...mockConfig, risk_level: 'low' as const };
      const trader = new AutoTrader(lowRiskConfig);
      
      const borderlineSignal: TradingSignal = {
        id: 'sig-7',
        symbol: 'BTC',
        action: 'buy',
        confidence: 74,
        price: 900000,
        reasoning: 'Borderline',
        created_at: new Date().toISOString(),
      };

      expect(await trader.shouldExecute(borderlineSignal)).toBe(false);

      const goodSignal = { ...borderlineSignal, confidence: 80, id: 'sig-8' };
      expect(await trader.shouldExecute(goodSignal)).toBe(true);
    });
  });
});
