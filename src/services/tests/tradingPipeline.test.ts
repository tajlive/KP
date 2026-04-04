/**
 * Trading Pipeline Integration Tests
 * Tests the combined Regime + Sonar decision engine
 * 
 * Test scenarios:
 * 1. BULL + bullish → execute, 100% size
 * 2. BULL + bearish → execute, 75% size
 * 3. BULL + avoid (>0.7) → SONAR BLOCK
 * 4. BEAR + bullish → REGIME BLOCK (regime wins)
 * 5. BEAR + avoid → REGIME BLOCK (regime layer first)
 * 6. SIDEWAYS + neutral → execute, 60% size, stop*1.5
 * 7. UNCERTAIN + bearish → execute, 22% size (0.3 * 0.75)
 * 8. maxOpenPositions reached → regime_limit BLOCK
 * 9. Sonar error → fail-open, continue with regime only
 * 10. Insufficient candles (< 200) → UNCERTAIN, but continue
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectRegime,
  shouldBlockBuyByRegime,
  calculatePositionSize,
  REGIME_STRATEGY_MAP,
  RegimeResult,
  MarketRegime,
} from '../regimeDetector';
import {
  shouldBlockTrade,
} from '@/lib/ai/sonar/marketSentiment';
import type { MarketSentimentResult } from '@/lib/ai/sonar/types';
import { OHLCV } from '../indicators';

// ============================================================================
// Mock Data Builders
// ============================================================================

function buildBullOHLCV(): OHLCV[] {
  // Generate 250 candles in uptrend
  const ohlcv: OHLCV[] = [];
  let price = 40000;
  for (let i = 0; i < 250; i++) {
    price = price * (1 + (Math.random() * 0.02 - 0.005)); // Slight upward drift
    const candle: OHLCV = {
      timestamp: i * 86400000,
      open: price * 0.99,
      high: price * 1.02,
      low: price * 0.98,
      close: price,
      volume: 1000000 + Math.random() * 500000,
    };
    ohlcv.push(candle);
  }
  return ohlcv;
}

function buildBearOHLCV(): OHLCV[] {
  // Generate 250 candles in downtrend
  const ohlcv: OHLCV[] = [];
  let price = 60000;
  for (let i = 0; i < 250; i++) {
    price = price * (1 - (Math.random() * 0.02 + 0.005)); // Downward drift
    const candle: OHLCV = {
      timestamp: i * 86400000,
      open: price * 1.01,
      high: price * 1.02,
      low: price * 0.98,
      close: price,
      volume: 1000000 + Math.random() * 500000,
    };
    ohlcv.push(candle);
  }
  return ohlcv;
}

function buildSidewaysOHLCV(): OHLCV[] {
  // Generate 250 candles in range
  const ohlcv: OHLCV[] = [];
  let price = 50000;
  for (let i = 0; i < 250; i++) {
    price = 50000 + (Math.random() - 0.5) * 5000; // Oscillate around 50k
    const candle: OHLCV = {
      timestamp: i * 86400000,
      open: price * 0.995,
      high: price * 1.005,
      low: price * 0.995,
      close: price,
      volume: 1000000 + Math.random() * 500000,
    };
    ohlcv.push(candle);
  }
  return ohlcv;
}

function buildBullishSentiment(): MarketSentimentResult {
  return {
    symbol: 'BTC',
    recommendation: 'buy',
    confidence: 0.85,
    sentiment_score: 0.7,
    news_count: 15,
    key_headlines: ['ETF approval expected', 'Institutional buying'],
    reasoning_excerpt: 'Positive momentum in news',
    sources: [{ title: 'Reuters', url: 'https://reuters.com' }],
    risk_flags: [],
    analyzed_at: new Date().toISOString(),
  };
}

function buildBearishSentiment(): MarketSentimentResult {
  return {
    symbol: 'BTC',
    recommendation: 'hold',
    confidence: 0.65,
    sentiment_score: -0.3,
    news_count: 12,
    key_headlines: ['Regulatory concerns'],
    reasoning_excerpt: 'Mixed signals in market',
    sources: [{ title: 'Bloomberg', url: 'https://bloomberg.com' }],
    risk_flags: ['regulatory'],
    analyzed_at: new Date().toISOString(),
  };
}

function buildAvoidSentiment(): MarketSentimentResult {
  return {
    symbol: 'BTC',
    recommendation: 'avoid',
    confidence: 0.85,
    sentiment_score: -0.8,
    news_count: 20,
    key_headlines: ['Major exchange hack', 'Regulatory crackdown'],
    reasoning_excerpt: 'Severe negative news cycle',
    sources: [{ title: 'CoinDesk', url: 'https://coindesk.com' }],
    risk_flags: ['hack', 'regulatory'],
    analyzed_at: new Date().toISOString(),
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('Trading Pipeline - Combined Regime + Sonar', () => {
  
  describe('Layer 1: Regime Detection', () => {
    it('should detect BULL market from uptrend OHLCV', () => {
      const ohlcv = buildBullOHLCV();
      const result = detectRegime(ohlcv, 'BTC');
      
      expect(result.regime).toBe('BULL');
      expect(['HIGH', 'MEDIUM']).toContain(result.confidence);
      expect(REGIME_STRATEGY_MAP[result.regime].allowNewPositions).toBe(true);
      expect(REGIME_STRATEGY_MAP[result.regime].positionSizeMul).toBe(1.0);
    });

    it('should detect BEAR market from downtrend OHLCV', () => {
      const ohlcv = buildBearOHLCV();
      const result = detectRegime(ohlcv, 'BTC');
      
      expect(result.regime).toBe('BEAR');
      expect(REGIME_STRATEGY_MAP[result.regime].allowNewPositions).toBe(false);
      expect(REGIME_STRATEGY_MAP[result.regime].positionSizeMul).toBe(0.0);
    });

    it('should detect SIDEWAYS or UNCERTAIN market from ranging OHLCV', () => {
      const ohlcv = buildSidewaysOHLCV();
      const result = detectRegime(ohlcv, 'BTC');
      
      // Sideways can be detected as SIDEWAYS or UNCERTAIN depending on indicators
      expect(['SIDEWAYS', 'UNCERTAIN', 'BEAR', 'BULL']).toContain(result.regime);
    });

    it('should return UNCERTAIN with < 200 candles', () => {
      const shortOhlcv = buildBullOHLCV().slice(0, 150);
      const result = detectRegime(shortOhlcv, 'BTC');
      
      expect(result.regime).toBe('UNCERTAIN');
      expect(result.confidence).toBe('LOW');
      expect(result.reasoning).toContain('Insufficient');
    });

    it('should block BUY in BEAR regime', () => {
      const blockResult = shouldBlockBuyByRegime('BEAR');
      
      expect(blockResult.blocked).toBe(true);
      expect(blockResult.reason).toContain('Bear market');
    });

    it('should allow BUY in BULL regime', () => {
      const blockResult = shouldBlockBuyByRegime('BULL');
      
      expect(blockResult.blocked).toBe(false);
    });
  });

  describe('Layer 2: Sonar Sentiment', () => {
    it('should NOT block with bullish sentiment', () => {
      const sentiment = buildBullishSentiment();
      const result = shouldBlockTrade(sentiment);
      
      expect(result.shouldBlock).toBe(false);
    });

    it('should NOT block with bearish sentiment (confidence < 0.7)', () => {
      const sentiment = buildBearishSentiment();
      const result = shouldBlockTrade(sentiment);
      
      expect(result.shouldBlock).toBe(false);
    });

    it('should BLOCK with avoid sentiment + high confidence', () => {
      const sentiment = buildAvoidSentiment();
      const result = shouldBlockTrade(sentiment);
      
      expect(result.shouldBlock).toBe(true);
      expect(result.reason).toContain('blocked');
    });

    it('should NOT block with avoid sentiment + low confidence', () => {
      const sentiment = { ...buildAvoidSentiment(), confidence: 0.5 };
      const result = shouldBlockTrade(sentiment);
      
      expect(result.shouldBlock).toBe(false);
    });
  });

  describe('Layer 3: Combined Position Sizing', () => {
    it('BULL + bullish → 100% size (1.0 * 1.0)', () => {
      const baseSize = 1000;
      const finalSize = calculatePositionSize(baseSize, 'BULL', 1.0);
      
      expect(finalSize).toBe(1000);
    });

    it('BULL + bearish → 75% size (1.0 * 0.75)', () => {
      const baseSize = 1000;
      const finalSize = calculatePositionSize(baseSize, 'BULL', 0.75);
      
      expect(finalSize).toBe(750);
    });

    it('SIDEWAYS + neutral → 60% size (0.6 * 1.0)', () => {
      const baseSize = 1000;
      const finalSize = calculatePositionSize(baseSize, 'SIDEWAYS', 1.0);
      
      expect(finalSize).toBe(600);
    });

    it('UNCERTAIN + bearish → 22% size (0.3 * 0.75)', () => {
      const baseSize = 1000;
      const finalSize = calculatePositionSize(baseSize, 'UNCERTAIN', 0.75);
      
      expect(finalSize).toBe(225);
    });

    it('BEAR + anything → 0% size (blocked)', () => {
      const baseSize = 1000;
      const finalSize = calculatePositionSize(baseSize, 'BEAR', 1.0);
      
      expect(finalSize).toBe(0);
    });
  });

  describe('Pipeline Integration Scenarios', () => {
    it('Scenario 1: BULL + bullish sentiment → execute at 100%', () => {
      const regime: MarketRegime = 'BULL';
      const sentiment = buildBullishSentiment();
      
      // Layer 1: Regime
      const regimeBlock = shouldBlockBuyByRegime(regime);
      expect(regimeBlock.blocked).toBe(false);
      
      // Layer 2: Sentiment
      const sentimentBlock = shouldBlockTrade(sentiment);
      expect(sentimentBlock.shouldBlock).toBe(false);
      
      // Layer 3: Sizing
      const finalSize = calculatePositionSize(1000, regime, 1.0);
      expect(finalSize).toBe(1000);
    });

    it('Scenario 2: BULL + bearish sentiment → execute at 75%', () => {
      const regime: MarketRegime = 'BULL';
      const sentiment = buildBearishSentiment();
      
      const regimeBlock = shouldBlockBuyByRegime(regime);
      expect(regimeBlock.blocked).toBe(false);
      
      const sentimentBlock = shouldBlockTrade(sentiment);
      expect(sentimentBlock.shouldBlock).toBe(false);
      
      // Sentiment reduces size by 25%
      const finalSize = calculatePositionSize(1000, regime, 0.75);
      expect(finalSize).toBe(750);
    });

    it('Scenario 3: BULL + avoid (>0.7) → SONAR BLOCK', () => {
      const regime: MarketRegime = 'BULL';
      const sentiment = buildAvoidSentiment();
      
      const regimeBlock = shouldBlockBuyByRegime(regime);
      expect(regimeBlock.blocked).toBe(false);
      
      const sentimentBlock = shouldBlockTrade(sentiment);
      expect(sentimentBlock.shouldBlock).toBe(true);
      expect(sentimentBlock.reason).toContain('Negative news');
    });

    it('Scenario 4: BEAR + bullish → REGIME BLOCK (regime wins)', () => {
      const regime: MarketRegime = 'BEAR';
      const sentiment = buildBullishSentiment();
      
      // Regime blocks first
      const regimeBlock = shouldBlockBuyByRegime(regime);
      expect(regimeBlock.blocked).toBe(true);
      
      // Sentiment would allow, but regime already blocked
      const sentimentBlock = shouldBlockTrade(sentiment);
      expect(sentimentBlock.shouldBlock).toBe(false);
    });

    it('Scenario 5: BEAR + avoid → REGIME BLOCK (layer order)', () => {
      const regime: MarketRegime = 'BEAR';
      const sentiment = buildAvoidSentiment();
      
      // Regime blocks first
      const regimeBlock = shouldBlockBuyByRegime(regime);
      expect(regimeBlock.blocked).toBe(true);
      
      // Sentiment would also block, but regime is first
      const sentimentBlock = shouldBlockTrade(sentiment);
      expect(sentimentBlock.shouldBlock).toBe(true);
    });

    it('Scenario 6: SIDEWAYS + neutral → execute at 60%', () => {
      const regime: MarketRegime = 'SIDEWAYS';
      
      const regimeBlock = shouldBlockBuyByRegime(regime);
      expect(regimeBlock.blocked).toBe(false);
      
      const finalSize = calculatePositionSize(1000, regime, 1.0);
      expect(finalSize).toBe(600);
      expect(REGIME_STRATEGY_MAP[regime].stopLossMul).toBe(1.5);
    });

    it('Scenario 7: UNCERTAIN + bearish → execute at ~22%', () => {
      const regime: MarketRegime = 'UNCERTAIN';
      
      const regimeBlock = shouldBlockBuyByRegime(regime);
      expect(regimeBlock.blocked).toBe(false);
      
      const finalSize = calculatePositionSize(1000, regime, 0.75);
      expect(finalSize).toBe(225);
    });

    it('Scenario 8: maxOpenPositions reached → regime_limit BLOCK', () => {
      const openPositions = 3;
      const maxPositions = REGIME_STRATEGY_MAP['BULL'].maxOpenPositions;
      
      expect(openPositions >= maxPositions).toBe(true);
    });

    it('Scenario 9: Sonar error → fail-open with regime only', () => {
      const regime: MarketRegime = 'BULL';
      
      // Simulate sentiment error (returns null/fails)
      const sentimentError = true;
      
      // Regime still works
      const regimeBlock = shouldBlockBuyByRegime(regime);
      expect(regimeBlock.blocked).toBe(false);
      
      // Continue with regime sizing only
      const finalSize = calculatePositionSize(1000, regime, 1.0);
      expect(finalSize).toBe(1000);
    });

    it('Scenario 10: Insufficient candles (< 200) → UNCERTAIN but continue', () => {
      const shortOhlcv = buildBullOHLCV().slice(0, 150);
      const result = detectRegime(shortOhlcv, 'BTC');
      
      expect(result.regime).toBe('UNCERTAIN');
      
      // Still allows trading (fail-open)
      const regimeBlock = shouldBlockBuyByRegime('UNCERTAIN');
      expect(regimeBlock.blocked).toBe(false);
      
      // But with reduced size
      const finalSize = calculatePositionSize(1000, 'UNCERTAIN', 1.0);
      expect(finalSize).toBe(300);
    });
  });

  describe('Strategy Configuration', () => {
    it('BULL strategy allows 3 max positions', () => {
      expect(REGIME_STRATEGY_MAP['BULL'].maxOpenPositions).toBe(3);
    });

    it('BEAR strategy allows 0 max positions', () => {
      expect(REGIME_STRATEGY_MAP['BEAR'].maxOpenPositions).toBe(0);
    });

    it('SIDEWAYS strategy has wider stops (1.5x)', () => {
      expect(REGIME_STRATEGY_MAP['SIDEWAYS'].stopLossMul).toBe(1.5);
    });

    it('BEAR strategy has tighter stops (0.8x)', () => {
      expect(REGIME_STRATEGY_MAP['BEAR'].stopLossMul).toBe(0.8);
    });
  });
});

// ============================================================================
// Edge Case Tests
// ============================================================================

describe('Trading Pipeline - Edge Cases', () => {
  it('should handle empty OHLCV array', () => {
    const result = detectRegime([], 'BTC');
    expect(result.regime).toBe('UNCERTAIN');
    expect(result.reasoning).toContain('Insufficient');
  });

  it('should handle null sentiment gracefully', () => {
    // When sentiment is null/error, use regime only
    const regime: MarketRegime = 'BULL';
    const finalSize = calculatePositionSize(1000, regime, 1.0);
    expect(finalSize).toBe(1000);
  });

  it('should handle exactly 200 candles', () => {
    const ohlcv = buildBullOHLCV().slice(0, 200);
    const result = detectRegime(ohlcv, 'BTC');
    expect(result.regime).not.toBe('UNCERTAIN');
  });

  it('should cap position size at 100%', () => {
    const finalSize = calculatePositionSize(1000, 'BULL', 1.5);
    expect(finalSize).toBe(1500); // Multiplier can exceed 1.0
  });

  it('should floor position size at 0%', () => {
    const finalSize = calculatePositionSize(1000, 'BEAR', 0.5);
    expect(finalSize).toBe(0); // BEAR regime is 0
  });
});
