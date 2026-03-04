import { describe, it, expect, beforeEach } from 'vitest';
import { useTradingStore } from '@/store/tradingStore';

describe('Trading Store', () => {
  beforeEach(() => {
    // Reset store to initial state
    useTradingStore.getState().resetPortfolio();
  });

  describe('Portfolio', () => {
    it('should initialize with 1M NOK balance', () => {
      const { portfolio } = useTradingStore.getState();
      expect(portfolio.balance).toBe(1_000_000);
      expect(portfolio.equity).toBe(1_000_000);
    });

    it('should reset portfolio correctly', () => {
      const store = useTradingStore.getState();
      
      // Open a position first
      store.openPosition({
        symbol: 'BTCUSDT',
        side: 'long',
        entryPrice: 50000,
        quantity: 0.1,
        leverage: 2,
      });

      // Reset
      store.resetPortfolio();

      const { portfolio, positions, trades } = useTradingStore.getState();
      expect(portfolio.balance).toBe(1_000_000);
      expect(positions.length).toBe(0);
      expect(trades.length).toBe(0);
    });
  });

  describe('Market Data', () => {
    it('should update market data for symbol', () => {
      const store = useTradingStore.getState();
      
      store.updateMarketData('BTCUSDT', {
        price: 51000,
        change24h: 1000,
        changePercent24h: 2,
      });

      const { marketData } = useTradingStore.getState();
      expect(marketData['BTCUSDT'].price).toBe(51000);
      expect(marketData['BTCUSDT'].change24h).toBe(1000);
      expect(marketData['BTCUSDT'].changePercent24h).toBe(2);
    });
  });

  describe('Positions', () => {
    it('should calculate P&L correctly for long position', () => {
      const store = useTradingStore.getState();
      
      // Set market price
      store.updateMarketData('BTCUSDT', { price: 50000 });
      
      // Open position
      const result = store.openPosition({
        symbol: 'BTCUSDT',
        side: 'long',
        entryPrice: 50000,
        quantity: 0.1,
        leverage: 2,
      });

      expect(result.success).toBe(true);
      
      // Update price up 10%
      store.updatePosition(result.position!.id, 55000);
      
      const { positions } = useTradingStore.getState();
      const position = positions.find(p => p.id === result.position!.id);
      
      // P&L should be positive (10% price increase * 2x leverage)
      expect(position!.pnl).toBeGreaterThan(0);
      expect(position!.pnlPercent).toBeCloseTo(20, 0); // 10% * 2x leverage
    });

    it('should reject position with excessive leverage', async () => {
      const store = useTradingStore.getState();
      
      const result = await store.openPosition({
        symbol: 'BTCUSDT',
        side: 'long',
        entryPrice: 50000,
        quantity: 0.1,
        leverage: 150, // Max is 10
      });

      expect(result.success).toBe(false);
    });

    it('should reject position with insufficient margin', async () => {
      const store = useTradingStore.getState();
      
      const result = await store.openPosition({
        symbol: 'BTCUSDT',
        side: 'long',
        entryPrice: 50000,
        quantity: 1000, // Way too much
        leverage: 1,
      });

      expect(result.success).toBe(false);
    });
  });

  describe('Symbol Selection', () => {
    it('should update selected symbol', () => {
      const store = useTradingStore.getState();
      
      store.setSelectedSymbol('ETHUSDT');
      
      const { selectedSymbol } = useTradingStore.getState();
      expect(selectedSymbol).toBe('ETHUSDT');
    });

    it('should update selected timeframe', () => {
      const store = useTradingStore.getState();
      
      store.setSelectedTimeframe('1h');
      
      const { selectedTimeframe } = useTradingStore.getState();
      expect(selectedTimeframe).toBe('1h');
    });
  });
});
