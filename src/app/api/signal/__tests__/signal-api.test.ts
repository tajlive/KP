/**
 * Signal API Integration Tests
 * Tests /api/signal/current and /api/signal/explanation with feature flags
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET as getCurrentSignal } from '../current/route';
import { POST as postExplanation } from '../explanation/route';
import type { ConfluentSignal } from '@/lib/trading/confluent-signal-engine';

// Mock feature flags
const mockIsSonarIntegrationEnabled = vi.fn();
vi.mock('@/lib/ai/sonar/feature-flags', () => ({
  isSonarIntegrationEnabled: () => mockIsSonarIntegrationEnabled(),
}));

// Mock Sonar client
const mockNarrativeScanWithFallback = vi.fn();
const mockRegimeScanWithFallback = vi.fn();
vi.mock('@/lib/ai/sonar', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai/sonar')>();
  return {
    ...actual,
    narrativeScanWithFallback: (...args: unknown[]) =>
      mockNarrativeScanWithFallback(...args),
    regimeScanWithFallback: (...args: unknown[]) =>
      mockRegimeScanWithFallback(...args),
  };
});

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock canonical market data provider
vi.mock('@/lib/trading/canonical/market-data', () => ({
  createBinanceMarketDataProvider: vi.fn().mockReturnValue({
    getKlines: vi.fn().mockResolvedValue(
      Array.from({ length: 50 }, (_, i) => ({
        timestamp: Date.now() - (50 - i) * 3600000,
        open: 50000 + i,
        high: 50100 + i,
        low: 49900 + i,
        close: 50000 + i,
        volume: 1,
      })),
    ),
    getPrice: vi.fn().mockResolvedValue(50000),
    getDepth: vi.fn().mockResolvedValue({
      bids: [],
      asks: [],
      timestamp: new Date(),
    }),
    get24hChange: vi.fn().mockResolvedValue(0),
  }),
}));

// Mock explainSignal
const mockExplainSignalWithFallback = vi.fn();
vi.mock('@/lib/ai/sonar/explainSignal', () => ({
  explainSignalWithFallback: (...args: unknown[]) =>
    mockExplainSignalWithFallback(...args),
}));

describe('/api/signal/current', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns signal with AI factors when Sonar is enabled', async () => {
    mockIsSonarIntegrationEnabled.mockReturnValue(true);
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

    const request = new Request(
      'http://localhost/api/signal/current?symbol=BTC&strategy=trend_balansert'
    );
    const response = await getCurrentSignal(request);
    const data: ConfluentSignal & { _meta: unknown } = await response.json();

    expect(response.status).toBe(200);
    expect(data.factors.narrative_sentiment).toBe(0.5);
    expect(data.factors.market_regime).toBe('bull');
    expect(mockNarrativeScanWithFallback).toHaveBeenCalled();
    expect(mockRegimeScanWithFallback).toHaveBeenCalled();
  });

  it('returns technical-only signal when Sonar is disabled', async () => {
    mockIsSonarIntegrationEnabled.mockReturnValue(false);

    const request = new Request(
      'http://localhost/api/signal/current?symbol=BTC&strategy=trend_balansert'
    );
    const response = await getCurrentSignal(request);
    const data: ConfluentSignal & { _meta: unknown } = await response.json();

    expect(response.status).toBe(200);
    expect(data.factors.narrative_sentiment).toBeUndefined();
    expect(data.factors.market_regime).toBeUndefined();
    expect(data.metadata.usedFallback).toBe(true);
    expect(mockNarrativeScanWithFallback).not.toHaveBeenCalled();
    expect(mockRegimeScanWithFallback).not.toHaveBeenCalled();
  });

  it('returns fallback signal on error', async () => {
    mockIsSonarIntegrationEnabled.mockReturnValue(true);
    mockNarrativeScanWithFallback.mockRejectedValue(new Error('API Error'));
    mockRegimeScanWithFallback.mockRejectedValue(new Error('API Error'));

    const request = new Request(
      'http://localhost/api/signal/current?symbol=BTC&strategy=trend_balansert'
    );
    const response = await getCurrentSignal(request);
    const data: ConfluentSignal & { _meta: unknown } = await response.json();

    expect(response.status).toBe(200);
    expect(data.action).toBe('HOLD');
    expect(data.score).toBe(50);
  });

  it('validates query parameters', async () => {
    const request = new Request(
      'http://localhost/api/signal/current?symbol=' + 'A'.repeat(25)
    );
    const response = await getCurrentSignal(request);

    expect(response.status).toBe(400);
  });
});

describe('/api/signal/explanation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns explanation when request is valid', async () => {
    mockExplainSignalWithFallback.mockResolvedValue({
      title: 'Test Explanation',
      summary: 'Test summary',
      key_points: ['Point 1'],
      risk_warnings: ['Warning 1'],
      sources: [],
    });

    const request = new Request('http://localhost/api/signal/explanation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: 'BTC',
        timeframe: 'medium',
        decision: 'BUY',
        score: 75,
        risk_level: 3,
        factors: { trend: 0.8 },
        userRiskProfile: 'balanced',
        locale: 'nb-NO',
      }),
    });

    const response = await postExplanation(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.title).toBe('Test Explanation');
    expect(data.summary).toBe('Test summary');
  });

  it('returns 400 for invalid request body', async () => {
    const request = new Request('http://localhost/api/signal/explanation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: '', // Invalid: empty
        decision: 'INVALID', // Invalid decision
      }),
    });

    const response = await postExplanation(request);

    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid JSON', async () => {
    const request = new Request('http://localhost/api/signal/explanation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not valid json',
    });

    const response = await postExplanation(request);

    expect(response.status).toBe(400);
  });

  it('returns 500 when explanation generation fails', async () => {
    mockExplainSignalWithFallback.mockRejectedValue(new Error('AI Error'));

    const request = new Request('http://localhost/api/signal/explanation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: 'BTC',
        timeframe: 'medium',
        decision: 'BUY',
        score: 75,
        risk_level: 3,
        factors: {},
        userRiskProfile: 'balanced',
        locale: 'nb-NO',
      }),
    });

    const response = await postExplanation(request);

    expect(response.status).toBe(500);
  });
});
