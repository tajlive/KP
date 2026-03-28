/**
 * Sonar Client Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callSonar, getSonarMetrics, resetSonarMetrics, checkSonarHealth } from '../client';
import { SonarError } from '../types';

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

// Mock config
vi.mock('../config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../config')>();
  return {
    ...actual,
    SONAR_API_KEY: 'pplx-test-key',
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
  };
});

describe('callSonar', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockFetch.mockReset();
    resetSonarMetrics();
  });

  afterEach(() => {
    vi.useRealTimers();
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
      'https://api.perplexity.ai/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer pplx-test-key',
          'Content-Type': 'application/json',
        }),
        body: expect.stringContaining('Test prompt'),
      })
    );
  });

  it('should use JSON mode when requested', async () => {
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
    expect(body.response_format).toEqual({ type: 'json_object' });
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
