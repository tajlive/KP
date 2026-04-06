/**
 * Regime Classifier Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  RegimeClassifier, 
  detectRegime,
  DEFAULT_REGIME_CONFIG,
  type RegimeFeatures 
} from '../regime/regime-classifier';

describe('RegimeClassifier', () => {
  let classifier: RegimeClassifier;
  
  beforeEach(() => {
    classifier = new RegimeClassifier();
  });
  
  describe('Regime Detection', () => {
    it('should detect bull regime with strong uptrend', () => {
      const features: RegimeFeatures = {
        adx: 35,
        diPlus: 30,
        diMinus: 15,
        ema20Slope: 0.02,
        ema50Slope: 0.015,
        atr14: 100,
        atrPercent: 0.02,
        bbWidth: 0.05,
        historicalVol: 0.3,
        volumeTrend: 1.2,
        rsi: 60,
        momentum: 0.5
      };
      
      const result = classifier.classify(features);
      
      expect(result.regime).toBe('bull');
      expect(result.confidence).toBeGreaterThan(0.5);
    });
    
    it('should detect bear regime with strong downtrend', () => {
      const features: RegimeFeatures = {
        adx: 35,
        diPlus: 15,
        diMinus: 30,
        ema20Slope: -0.02,
        ema50Slope: -0.015,
        atr14: 100,
        atrPercent: 0.02,
        bbWidth: 0.05,
        historicalVol: 0.3,
        volumeTrend: 1.2,
        rsi: 40,
        momentum: -0.5
      };
      
      const result = classifier.classify(features);
      
      expect(result.regime).toBe('bear');
      expect(result.confidence).toBeGreaterThan(0.5);
    });
    
    it('should detect high-vol regime with elevated volatility', () => {
      const features: RegimeFeatures = {
        adx: 25,
        diPlus: 20,
        diMinus: 20,
        ema20Slope: 0,
        ema50Slope: 0,
        atr14: 500,
        atrPercent: 0.08,
        bbWidth: 0.15,
        historicalVol: 0.8,
        volumeTrend: 2,
        rsi: 50,
        momentum: 0
      };
      
      const result = classifier.classify(features);
      
      expect(result.regime).toBe('high-vol');
    });
    
    it('should detect chop regime in low ADX', () => {
      const features: RegimeFeatures = {
        adx: 15,
        diPlus: 18,
        diMinus: 17,
        ema20Slope: 0.005,
        ema50Slope: 0.003,
        atr14: 50,
        atrPercent: 0.01,
        bbWidth: 0.03,
        historicalVol: 0.2,
        volumeTrend: 1,
        rsi: 50,
        momentum: 0
      };
      
      const result = classifier.classify(features);
      
      expect(result.regime).toBe('chop');
    });
  });
  
  describe('Regime Persistence', () => {
    it('should maintain regime for minimum bars before switching', () => {
      const bullFeatures: RegimeFeatures = {
        adx: 30,
        diPlus: 28,
        diMinus: 15,
        ema20Slope: 0.02,
        ema50Slope: 0.015,
        atr14: 100,
        atrPercent: 0.02,
        bbWidth: 0.05,
        historicalVol: 0.3,
        volumeTrend: 1.2,
        rsi: 60,
        momentum: 0.5
      };
      
      // First classification - bull
      const result1 = classifier.classify(bullFeatures);
      expect(result1.regime).toBe('bull');
      
      // Switch to bear immediately - should stay bull (persistence)
      const bearFeatures = { ...bullFeatures, diPlus: 15, diMinus: 28, ema20Slope: -0.02 };
      const result2 = classifier.classify(bearFeatures);
      expect(result2.regimeDuration).toBeLessThan(5);
      expect(result2.regime).toBe('bull'); // Still bull due to persistence
    });
  });
  
  describe('Policy Recommendations', () => {
    it('should recommend trend policy in bull regime', () => {
      const recommendation = classifier.getRecommendedPolicy('bull');
      
      expect(recommendation.primary).toBe('trend');
      expect(recommendation.secondary).toBe('breakout');
      expect(recommendation.confidence).toBeGreaterThan(0.5);
    });
    
    it('should recommend no-trade in high-vol regime', () => {
      const recommendation = classifier.getRecommendedPolicy('high-vol');
      
      expect(recommendation.primary).toBe('no-trade');
      expect(recommendation.confidence).toBeGreaterThan(0.5);
    });
  });
  
  describe('Statistics', () => {
    it('should track regime distribution', () => {
      // Generate multiple classifications
      for (let i = 0; i < 10; i++) {
        classifier.classify({
          adx: 30,
          diPlus: 28,
          diMinus: 15,
          ema20Slope: 0.02,
          ema50Slope: 0.015,
          atr14: 100,
          atrPercent: 0.02,
          bbWidth: 0.05,
          historicalVol: 0.3,
          volumeTrend: 1.2,
          rsi: 60,
          momentum: 0.5
        });
      }
      
      const stats = classifier.getStats();
      
      expect(stats.regimeDistribution.bull).toBeGreaterThan(0);
      expect(stats.avgConfidence).toBeGreaterThan(0);
    });
  });
});

describe('detectRegime (quick check)', () => {
  it('should detect regime from price data', () => {
    // Uptrend price data
    const uptrendPrices = [100, 102, 101, 103, 105, 104, 106, 108, 107, 109, 
                          111, 110, 112, 114, 113, 115, 117, 116, 118, 120];
    
    const result = detectRegime(uptrendPrices);
    
    expect(['bull', 'high-vol']).toContain(result.regime);
    expect(result.confidence).toBeGreaterThan(0);
  });
  
  it('should return unknown for insufficient data', () => {
    const shortPrices = [100, 101, 102];
    
    const result = detectRegime(shortPrices);
    
    expect(result.regime).toBe('unknown');
  });
});
