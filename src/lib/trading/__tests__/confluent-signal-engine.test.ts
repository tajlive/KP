/**
 * Confluent Signal Engine Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateConfluentSignal,
  explainConfluentSignal,
  generateBatchSignals,
  checkConfluentEngineHealth,
  type ConfluentSignalOptions,
} from '../confluent-signal-engine';
import type { ConfluentSignal } from '../confluent-signal-engine';

// Mock Sonar modules
const mockNarrativeScanWithFallback = vi.fn();
const mockRegimeScanWithFallback = vi.fn();
const mockExplainSignalWithFallback = vi.fn();
const mockIsSonarIntegrationEnabled = vi.fn();

vi.mock('@/lib/ai/sonar', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai/sonar')>();
  return {
    ...actual,
    narrativeScanWithFallback: (...args: unknown[]) =>
      mockNarrativeScanWithFallback(...args),
    regimeScanWithFallback: (...args: unknown[]) =>
      mockRegimeScanWithFallback(...args),
    explainSignalWithFallback: (...args: unknown[]) =>
      mockExplainSignalWithFallback(...args),
  };
});

vi.mock('@/lib/ai/sonar/feature-flags', () => ({
  isSonarIntegrationEnabled: () => mockIsSonarIntegrationEnabled(),
  getEffectiveSonarTier: () => 'sonar',
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('generateConfluentSignal', () => {
  beforeEach(() => {
    mockNarrativeScanWithFallback.mockReset();
    mockRegimeScanWithFallback.mockReset();
    mockIsSonarIntegrationEnabled.mockReset();
    mockIsSonarIntegrationEnabled.mockReturnValue(true); // Default to enabled
  });

  const mockPrices = Array.from({ length: 50 }, (_, i) => 100 + i * 2);

  it('should generate signal with all factors', async () => {
    mockNarrativeScanWithFallback.mockResolvedValueOnce({
      symbol: 'BTC',
      sentiment: 0.5,
      event_risk: 0.3,
      key_events: [{ title: 'Positive news', impact: 'medium' }],
      reasoning_excerpt: 'Bullish sentiment',
      sources: [],
    });

    mockRegimeScanWithFallback.mockResolvedValueOnce({
      regime: 'bull',
      confidence: 0.8,
      reasoning_excerpt: 'Uptrend confirmed',
      risk_flags: [],
      sources: [],
    });

    const signal = await generateConfluentSignal({
      symbol: 'BTC',
      strategyType: 'trend_balansert',
      prices: mockPrices,
    });

    expect(signal.action).toBeDefined();
    expect(signal.score).toBeGreaterThanOrEqual(0);
    expect(signal.score).toBeLessThanOrEqual(100);
    expect(signal.riskLevel).toBeGreaterThanOrEqual(1);
    expect(signal.riskLevel).toBeLessThanOrEqual(5);
    expect(signal.factors.narrative_sentiment).toBe(0.5);
    expect(signal.factors.event_risk).toBe(0.3);
    expect(signal.factors.market_regime).toBe('bull');
    expect(signal.metadata.usedFallback).toBe(false);
  });

  it('should use fallback when narrative scan fails', async () => {
    mockNarrativeScanWithFallback.mockResolvedValueOnce({
      symbol: 'BTC',
      sentiment: 0,
      event_risk: 0,
      key_events: [],
      reasoning_excerpt: 'Ingen narrativdata tilgjengelig',
      sources: [],
    });

    mockRegimeScanWithFallback.mockResolvedValueOnce({
      regime: 'bull',
      confidence: 0.8,
      reasoning_excerpt: 'Uptrend confirmed',
      risk_flags: [],
      sources: [],
    });

    const signal = await generateConfluentSignal({
      symbol: 'BTC',
      strategyType: 'trend_balansert',
      prices: mockPrices,
    });

    expect(signal.metadata.usedFallback).toBe(true);
    expect(signal.factors.narrative_sentiment).toBe(0);
  });

  it('should use fallback when regime scan fails', async () => {
    mockNarrativeScanWithFallback.mockResolvedValueOnce({
      symbol: 'BTC',
      sentiment: 0.5,
      event_risk: 0.3,
      key_events: [{ title: 'Positive news', impact: 'medium' }],
      reasoning_excerpt: 'Bullish sentiment',
      sources: [],
    });

    mockRegimeScanWithFallback.mockResolvedValueOnce({
      regime: 'unclear',
      confidence: 0,
      reasoning_excerpt: 'Ingen regime-data tilgjengelig',
      risk_flags: [],
      sources: [],
    });

    const signal = await generateConfluentSignal({
      symbol: 'BTC',
      strategyType: 'trend_balansert',
      prices: mockPrices,
    });

    expect(signal.metadata.usedFallback).toBe(true);
    expect(signal.factors.market_regime).toBe('unclear');
  });

  it('should generate signal without narrative when disabled', async () => {
    mockRegimeScanWithFallback.mockResolvedValueOnce({
      regime: 'bull',
      confidence: 0.8,
      reasoning_excerpt: 'Uptrend confirmed',
      risk_flags: [],
      sources: [],
    });

    const signal = await generateConfluentSignal({
      symbol: 'BTC',
      strategyType: 'trend_balansert',
      prices: mockPrices,
      includeNarrative: false,
      includeRegime: true,
    });

    expect(signal.factors.narrative_sentiment).toBeUndefined();
    expect(signal.factors.market_regime).toBe('bull');
    expect(mockNarrativeScanWithFallback).not.toHaveBeenCalled();
  });

  it('should generate signal without regime when disabled', async () => {
    mockNarrativeScanWithFallback.mockResolvedValueOnce({
      symbol: 'BTC',
      sentiment: 0.5,
      event_risk: 0.3,
      key_events: [],
      reasoning_excerpt: 'Bullish sentiment',
      sources: [],
    });

    const signal = await generateConfluentSignal({
      symbol: 'BTC',
      strategyType: 'trend_balansert',
      prices: mockPrices,
      includeNarrative: true,
      includeRegime: false,
    });

    expect(signal.factors.market_regime).toBeUndefined();
    expect(signal.factors.narrative_sentiment).toBe(0.5);
    expect(mockRegimeScanWithFallback).not.toHaveBeenCalled();
  });

  it('should handle bear regime by lowering score', async () => {
    mockNarrativeScanWithFallback.mockResolvedValueOnce({
      symbol: 'BTC',
      sentiment: 0.5,
      event_risk: 0.3,
      key_events: [],
      reasoning_excerpt: 'Bullish sentiment',
      sources: [],
    });

    mockRegimeScanWithFallback.mockResolvedValueOnce({
      regime: 'bear',
      confidence: 0.9,
      reasoning_excerpt: 'Downtrend confirmed',
      risk_flags: [],
      sources: [],
    });

    const signal = await generateConfluentSignal({
      symbol: 'BTC',
      strategyType: 'trend_balansert',
      prices: mockPrices,
    });

    // Bear regime should reduce the score
    expect(signal.factors.market_regime).toBe('bear');
    expect(signal.riskLevel).toBeGreaterThanOrEqual(3);
  });

  it('should increase risk level with high event risk', async () => {
    mockNarrativeScanWithFallback.mockResolvedValueOnce({
      symbol: 'BTC',
      sentiment: -0.5,
      event_risk: 0.8, // High event risk
      key_events: [{ title: 'Regulatory news', impact: 'high' }],
      reasoning_excerpt: 'Negative sentiment',
      sources: [],
    });

    mockRegimeScanWithFallback.mockResolvedValueOnce({
      regime: 'range',
      confidence: 0.6,
      reasoning_excerpt: 'Sideways',
      risk_flags: [],
      sources: [],
    });

    const signal = await generateConfluentSignal({
      symbol: 'BTC',
      strategyType: 'trend_balansert',
      prices: mockPrices,
    });

    expect(signal.factors.event_risk).toBe(0.8);
    expect(signal.riskLevel).toBeGreaterThanOrEqual(3);
  });

  it('should generate technical-only signal when Sonar is disabled', async () => {
    mockIsSonarIntegrationEnabled.mockReturnValue(false);

    const signal = await generateConfluentSignal({
      symbol: 'BTC',
      strategyType: 'trend_balansert',
      prices: mockPrices,
    });

    expect(signal.factors.narrative_sentiment).toBeUndefined();
    expect(signal.factors.market_regime).toBeUndefined();
    expect(signal.metadata.usedFallback).toBe(true);
    expect(mockNarrativeScanWithFallback).not.toHaveBeenCalled();
    expect(mockRegimeScanWithFallback).not.toHaveBeenCalled();
  });
});

describe('explainConfluentSignal', () => {
  beforeEach(() => {
    mockExplainSignalWithFallback.mockReset();
  });

  const mockSignal: ConfluentSignal = {
    action: 'BUY',
    reason: 'Test signal',
    score: 75,
    riskLevel: 3,
    factors: {
      trend: 0.8,
      volatility: 0.4,
      ai_signal: 0.75,
      narrative_sentiment: 0.5,
      event_risk: 0.2,
      market_regime: 'bull',
    },
    metadata: {
      usedFallback: false,
    },
  };

  it('should generate explanation for signal', async () => {
    const mockExplanation = {
      title: 'Kjøpssignal',
      summary: 'Gode tekniske forhold.',
      key_points: ['Trend er stigende'],
      risk_warnings: ['Trading er risikofullt.'],
      sources: [],
    };

    mockExplainSignalWithFallback.mockResolvedValueOnce(mockExplanation);

    const result = await explainConfluentSignal(
      mockSignal,
      'BTC',
      'medium',
      'balanced'
    );

    expect(result.title).toBe('Kjøpssignal');
    expect(mockExplainSignalWithFallback).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: 'BTC',
        decision: 'BUY',
        score: 75,
        risk_level: 3,
        userRiskProfile: 'balanced',
      }),
      expect.any(Object)
    );
  });

  it('should map score to correct decision category', async () => {
    const testCases = [
      { score: 85, expected: 'STRONG_BUY' },
      { score: 70, expected: 'BUY' },
      { score: 50, expected: 'HOLD' },
      { score: 30, expected: 'SELL' },
      { score: 15, expected: 'STRONG_SELL' },
    ];

    for (const testCase of testCases) {
      mockExplainSignalWithFallback.mockReset();
      mockExplainSignalWithFallback.mockResolvedValueOnce({
        title: 'Test',
        summary: 'Test',
        key_points: [],
        risk_warnings: [],
        sources: [],
      });

      const signal = { ...mockSignal, score: testCase.score };
      await explainConfluentSignal(signal, 'BTC', 'medium');

      const callArg = mockExplainSignalWithFallback.mock.calls[0][0];
      expect(callArg.decision).toBe(testCase.expected);
    }
  });
});

describe('generateBatchSignals', () => {
  beforeEach(() => {
    mockNarrativeScanWithFallback.mockReset();
    mockRegimeScanWithFallback.mockReset();
  });

  const mockPrices = Array.from({ length: 50 }, (_, i) => 100 + i);

  it('should generate signals for multiple symbols', async () => {
    mockNarrativeScanWithFallback.mockResolvedValue({
      symbol: 'BTC',
      sentiment: 0.5,
      event_risk: 0.3,
      key_events: [],
      reasoning_excerpt: 'Test',
      sources: [],
    });

    mockRegimeScanWithFallback.mockResolvedValue({
      regime: 'bull',
      confidence: 0.8,
      reasoning_excerpt: 'Test',
      risk_flags: [],
      sources: [],
    });

    const results = await generateBatchSignals(
      ['BTC', 'ETH', 'SOL'],
      'trend_balansert',
      () => mockPrices
    );

    expect(results).toHaveLength(3);
    results.forEach((signal) => {
      expect(signal.action).toBeDefined();
      expect(signal.score).toBeGreaterThanOrEqual(0);
      expect(signal.score).toBeLessThanOrEqual(100);
    });
  });

  it('should handle errors for individual symbols', async () => {
    // First call succeeds, second fails, third succeeds
    mockNarrativeScanWithFallback
      .mockResolvedValueOnce({
        symbol: 'BTC',
        sentiment: 0.5,
        event_risk: 0.3,
        key_events: [],
        reasoning_excerpt: 'Test',
        sources: [],
      })
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce({
        symbol: 'SOL',
        sentiment: 0.3,
        event_risk: 0.2,
        key_events: [],
        reasoning_excerpt: 'Test',
        sources: [],
      });

    mockRegimeScanWithFallback.mockResolvedValue({
      regime: 'bull',
      confidence: 0.8,
      reasoning_excerpt: 'Test',
      risk_flags: [],
      sources: [],
    });

    const results = await generateBatchSignals(
      ['BTC', 'ETH', 'SOL'],
      'trend_balansert',
      () => mockPrices
    );

    expect(results).toHaveLength(3);
    // Middle result should be a fallback HOLD signal
    expect(results[1].action).toBe('HOLD');
  });
});

describe('checkConfluentEngineHealth', () => {
  beforeEach(() => {
    mockNarrativeScanWithFallback.mockReset();
    mockRegimeScanWithFallback.mockReset();
  });

  it('should report healthy when all factors work', async () => {
    mockIsSonarIntegrationEnabled.mockReturnValue(true);
    mockNarrativeScanWithFallback.mockResolvedValueOnce({
      symbol: 'BTC',
      sentiment: 0.5,
      event_risk: 0.3,
      key_events: [],
      reasoning_excerpt: 'Test',
      sources: [],
    });

    mockRegimeScanWithFallback.mockResolvedValueOnce({
      regime: 'bull',
      confidence: 0.8,
      reasoning_excerpt: 'Test',
      risk_flags: [],
      sources: [],
    });

    const health = await checkConfluentEngineHealth();

    expect(health.healthy).toBe(true);
    expect(health.factors.technical).toBe(true);
    expect(health.factors.narrative).toBe(true);
    expect(health.factors.regime).toBe(true);
    expect(health.sonarEnabled).toBe(true);
  });

  it('should report partially healthy when narrative fails', async () => {
    mockIsSonarIntegrationEnabled.mockReturnValue(true);
    mockNarrativeScanWithFallback.mockRejectedValueOnce(new Error('API Error'));

    mockRegimeScanWithFallback.mockResolvedValueOnce({
      regime: 'bull',
      confidence: 0.8,
      reasoning_excerpt: 'Test',
      risk_flags: [],
      sources: [],
    });

    const health = await checkConfluentEngineHealth();

    expect(health.healthy).toBe(true); // Still healthy if regime works
    expect(health.factors.narrative).toBe(false);
    expect(health.factors.regime).toBe(true);
  });

  it('should report unhealthy when both AI factors fail', async () => {
    mockIsSonarIntegrationEnabled.mockReturnValue(true);
    mockNarrativeScanWithFallback.mockRejectedValueOnce(new Error('API Error'));
    mockRegimeScanWithFallback.mockRejectedValueOnce(new Error('API Error'));

    const health = await checkConfluentEngineHealth();

    expect(health.healthy).toBe(false);
    expect(health.factors.narrative).toBe(false);
    expect(health.factors.regime).toBe(false);
  });

  it('should report healthy when Sonar is disabled', async () => {
    mockIsSonarIntegrationEnabled.mockReturnValue(false);
    // Mocks should not be called when Sonar is disabled

    const health = await checkConfluentEngineHealth();

    expect(health.healthy).toBe(true); // Technical still works
    expect(health.factors.technical).toBe(true);
    expect(health.factors.narrative).toBe(false);
    expect(health.factors.regime).toBe(false);
    expect(health.sonarEnabled).toBe(false);
    expect(mockNarrativeScanWithFallback).not.toHaveBeenCalled();
    expect(mockRegimeScanWithFallback).not.toHaveBeenCalled();
  });
});
