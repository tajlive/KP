/**
 * Sonar Client Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock config module completely BEFORE importing client
// This ensures SONAR_API_KEY is set at module load time
vi.mock('../config', () => ({
  SONAR_API_KEY: 'kimi-test-key-ci-123456',
  SONAR_API_BASE_URL: 'https://api.moonshot.ai/v1',
  DEFAULT_RETRY_CONFIG: {
    maxRetries: 2,
    baseDelayMs: 100,
    maxDelayMs: 500,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  },
  RATE_LIMIT_CONFIG: {
    sonar: { tokensPerMinute: 1000, burstSize: 100 },
    'sonar-pro': { tokensPerMinute: 500, burstSize: 50 },
  },
  getModelForTier: (tier: string) => tier,
  getSearchContextForMode: (mode: string) => mode === 'low' ? 'low' : mode === 'high' ? 'high' : 'medium',
  getWebSearchTools: () => [
    {
      type: 'builtin_function',
      function: { name: '$web_search' },
    },
  ],
  getTimeout: (timeoutMs?: number) => timeoutMs || 30000,
  calculateBackoff: (attempt: number) => Math.min(1000 * Math.pow(2, attempt), 10000),
  validateConfig: () => ({ valid: true }),
  DEFAULT_CACHE_CONFIG: {
    regimeTtlMs: 4 * 60 * 60 * 1000,
    explanationTtlMs: 30 * 60 * 1000,
    narrativeTtlMs: 2 * 60 * 60 * 1000,
  },
  FALLBACK_VALUES: {
    narrative_sentiment: 0,
    event_risk: 0,
    market_regime: 'unclear',
  },
}));

// Now import client after mocks are set up
import {
  callSonar,
  getSonarMetrics,
  resetSonarMetrics,
  checkSonarHealth,
  setSonarDelayFn,
  resetSonarDelayFn,
} from '../client';
import { SonarError } from '../types';

describe('callSonar', () => {
  beforeEach(() => {
    // Instant delay: eliminerer alle retry-ventetider i tester
    setSonarDelayFn(() => Promise.resolve());
    mockFetch.mockReset();
    resetSonarMetrics();
  });
  afterEach(() => {
    resetSonarDelayFn();
    vi.clearAllMocks();
  });

  it('should return content on successful request', async () => {
    const mockResponse = {
      id: 'test-id',
      model: 'sonar',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'Test response',
          },
          finish_reason: 'stop',
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await callSonar('Test prompt', {
      tier: 'sonar',
      mode: 'medium',
    });

    expect(result).toBe('Test response');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.moonshot.ai/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': expect.stringMatching(/^Bearer kimi-/),
          'Content-Type': 'application/json',
        }),
        body: expect.stringContaining('Test prompt'),
      })
    );
  });

  it('should NOT send response_format (Perplexity removed json_object support)', async () => {
    const mockResponse = {
      id: 'test-id',
      model: 'sonar',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: '{"key": "value"}',
          },
          finish_reason: 'stop',
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
    });

    await callSonar('Test prompt', {
      tier: 'sonar',
      mode: 'medium',
      jsonMode: true,
    });

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    // Perplexity API no longer accepts response_format: { type: 'json_object' }
    expect(body.response_format).toBeUndefined();
  });

  it('should retry on retryable error and eventually succeed', async () => {
    const mockResponse = {
      id: 'test-id',
      model: 'sonar',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'Success after retry',
          },
          finish_reason: 'stop',
        },
      ],
    };

    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

    const result = await callSonar('Test prompt', {
      tier: 'sonar',
      mode: 'low',
    });

    expect(result).toBe('Success after retry');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should throw SonarError after max retries', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    await expect(
      callSonar('Test prompt', {
        tier: 'sonar',
        mode: 'low',
      })
    ).rejects.toThrow(SonarError);

    // Initial attempt + 2 retries = 3 calls
    expect(mockFetch).toHaveBeenCalledTimes(3);

    const metrics = getSonarMetrics();
    expect(metrics.errorsTotal).toBe(1);
  });

  it('should throw RATE_LIMIT error when rate limited', async () => {
    // Mock 429 responses for all retries
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Too many requests'),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Too many requests'),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Too many requests'),
      });

    await expect(
      callSonar('Test prompt', {
        tier: 'sonar',
        mode: 'low',
      })
    ).rejects.toThrow('429');
  });

  it('should throw TIMEOUT error on abort', async () => {
    const abortError = new Error('AbortError');
    abortError.name = 'AbortError';
    mockFetch.mockRejectedValue(abortError);

    await expect(
      callSonar('Test prompt', {
        tier: 'sonar',
        mode: 'low',
        timeoutMs: 1000,
      })
    ).rejects.toThrow('Request timed out');
  });

  it('should not retry non-retryable errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: () => Promise.resolve('Bad request'),
    });

    await expect(
      callSonar('Test prompt', {
        tier: 'sonar',
        mode: 'low',
      })
    ).rejects.toThrow();

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should throw error on empty response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          id: 'test-id',
          model: 'sonar',
          choices: [],
        }),
    });

    await expect(
      callSonar('Test prompt', {
        tier: 'sonar',
        mode: 'low',
      })
    ).rejects.toThrow('Empty response from Sonar API');
  });

  it('should track metrics correctly', async () => {
    const mockResponse = {
      id: 'test-id',
      model: 'sonar',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'Test',
          },
          finish_reason: 'stop',
        },
      ],
    };

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
    });

    await callSonar('Test', { tier: 'sonar', mode: 'low' });
    await callSonar('Test', { tier: 'sonar', mode: 'medium' });
    await callSonar('Test', { tier: 'sonar-pro', mode: 'high' });

    const metrics = getSonarMetrics();
    expect(metrics.callsTotal).toBe(3);
    expect(metrics.callsByTier.sonar).toBe(2);
    expect(metrics.callsByTier['sonar-pro']).toBe(1);
    expect(metrics.callsByMode.low).toBe(1);
    expect(metrics.callsByMode.medium).toBe(1);
    expect(metrics.callsByMode.high).toBe(1);
  });
});

describe('checkSonarHealth', () => {
  it('should return healthy when configured', async () => {
    const result = await checkSonarHealth();
    expect(result.healthy).toBe(true);
  });
});

describe('getSonarMetrics', () => {
  beforeEach(() => {
    resetSonarMetrics();
  });

  it('should return initial metrics', () => {
    const metrics = getSonarMetrics();
    expect(metrics.callsTotal).toBe(0);
    expect(metrics.errorsTotal).toBe(0);
    expect(metrics.cacheHits).toBe(0);
  });
});
