import { describe, it, expect } from 'vitest';
import { calculateSlippage, calculateFees, EXECUTION_CONFIG } from '../realistic-execution';

describe('Realistic Execution', () => {
  const mockMarket = {
    symbol: 'BTCUSDT',
    currentPrice: 50000,
    bidPrice: 49950,
    askPrice: 50050,
    spread: 100,
    spreadPct: 0.2,
    volume24h: 30_000_000_000,
    priceChange24h: 2.5,
    volatility: 0.125,
    timestamp: Date.now(),
  };

  it('should calculate slippage correctly', () => {
    const result = calculateSlippage(10000, mockMarket);
    expect(result.slippagePct).toBeGreaterThanOrEqual(0.05);
    expect(result.slippagePct).toBeLessThanOrEqual(0.5);
  });

  it('should calculate fees correctly', () => {
    const result = calculateFees(10000, false, false);
    expect(result.feesPct).toBe(0.1);
    expect(result.feesAmount).toBe(10);
  });
});
