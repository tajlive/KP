/**
 * Narrative Scan Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  narrativeScan,
  narrativeScanWithFallback,
  sentimentToLabel,
  sentimentToColor,
  isElevatedEventRisk,
  impactToColor,
} from '../narrativeScan';
import { SonarValidationError, SonarError } from '../types';

// Mock callSonar
const mockCallSonar = vi.fn();
vi.mock('../client', () => ({
  callSonar: (...args: unknown[]) => mockCallSonar(...args),
  getSonarMetrics: vi.fn(() => ({
    callsTotal: 0,
    callsByTier: { sonar: 0, 'sonar-pro': 0 },
    callsByMode: { low: 0, medium: 0, high: 0 },
    errorsTotal: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageLatencyMs: 0,
  })),
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

describe('narrativeScan', () => {
  beforeEach(() => {
    mockCallSonar.mockReset();
  });

  it('should return validated result on successful scan', async () => {
    const mockResponse = JSON.stringify({
      symbol: 'BTC',
      sentiment: 0.5,
      event_risk: 0.3,
      key_events: [
        { title: 'Bitcoin reaches new high', impact: 'high' },
      ],
      reasoning_excerpt: 'Positive market momentum',
      sources: [
        { title: 'CryptoNews', url: 'https://example.com/news' },
      ],
    });

    mockCallSonar.mockResolvedValueOnce(mockResponse);

    const result = await narrativeScan('BTC');

    expect(result.symbol).toBe('BTC');
    expect(result.sentiment).toBe(0.5);
    expect(result.event_risk).toBe(0.3);
    expect(result.key_events).toHaveLength(1);
    expect(result.sources).toHaveLength(1);
  });

  it('should normalize symbol to uppercase', async () => {
    const mockResponse = JSON.stringify({
      symbol: 'BTC',
      sentiment: 0,
      event_risk: 0,
      key_events: [],
      reasoning_excerpt: 'Test',
      sources: [],
    });

    mockCallSonar.mockResolvedValueOnce(mockResponse);

    const result = await narrativeScan('btc');
    expect(result.symbol).toBe('BTC');
  });

  it('should handle symbol mismatch by using input symbol', async () => {
    const mockResponse = JSON.stringify({
      symbol: 'ETH', // Wrong symbol
      sentiment: 0,
      event_risk: 0,
      key_events: [],
      reasoning_excerpt: 'Test',
      sources: [],
    });

    mockCallSonar.mockResolvedValueOnce(mockResponse);

    const result = await narrativeScan('BTC');
    expect(result.symbol).toBe('BTC'); // Should use input, not response
  });

  it('should throw validation error for invalid JSON', async () => {
    mockCallSonar.mockResolvedValueOnce('not valid json');

    await expect(narrativeScan('BTC')).rejects.toThrow(SonarValidationError);
  });

  it('should throw validation error for invalid schema', async () => {
    const mockResponse = JSON.stringify({
      symbol: 'BTC',
      sentiment: 999, // Invalid: must be -1, -0.5, 0, 0.5, or 1
      event_risk: 0.5,
      key_events: [],
      reasoning_excerpt: 'Test',
      sources: [],
    });

    mockCallSonar.mockResolvedValueOnce(mockResponse);

    await expect(narrativeScan('BTC')).rejects.toThrow(SonarValidationError);
  });

  it('should throw validation error for missing required fields', async () => {
    const mockResponse = JSON.stringify({
      symbol: 'BTC',
      // Missing other required fields
    });

    mockCallSonar.mockResolvedValueOnce(mockResponse);

    await expect(narrativeScan('BTC')).rejects.toThrow(SonarValidationError);
  });

  it('should throw validation error for empty symbol', async () => {
    await expect(narrativeScan('')).rejects.toThrow(SonarValidationError);
  });

  it('should throw validation error for symbol too long', async () => {
    await expect(narrativeScan('A'.repeat(21))).rejects.toThrow(
      SonarValidationError
    );
  });

  it('should pass correct options to callSonar', async () => {
    const mockResponse = JSON.stringify({
      symbol: 'ETH',
      sentiment: 0,
      event_risk: 0,
      key_events: [],
      reasoning_excerpt: 'Test',
      sources: [],
    });

    mockCallSonar.mockResolvedValueOnce(mockResponse);

    await narrativeScan('ETH', {
      tier: 'sonar-pro',
      mode: 'high',
      timeoutMs: 60000,
    });

    expect(mockCallSonar).toHaveBeenCalledWith(
      expect.stringContaining('ETH'),
      {
        tier: 'sonar-pro',
        mode: 'high',
        jsonMode: true,
        timeoutMs: 60000,
      }
    );
  });

  it('should use default options when not provided', async () => {
    const mockResponse = JSON.stringify({
      symbol: 'BTC',
      sentiment: 0,
      event_risk: 0,
      key_events: [],
      reasoning_excerpt: 'Test',
      sources: [],
    });

    mockCallSonar.mockResolvedValueOnce(mockResponse);

    await narrativeScan('BTC');

    expect(mockCallSonar).toHaveBeenCalledWith(
      expect.any(String),
      {
        tier: 'sonar',
        mode: 'medium',
        jsonMode: true,
        timeoutMs: 30000,
      }
    );
  });

  it('should propagate SonarError', async () => {
    const error = new SonarError('API Error', 'API_ERROR', 500, true);
    mockCallSonar.mockRejectedValueOnce(error);

    await expect(narrativeScan('BTC')).rejects.toThrow(SonarError);
  });
});

describe('narrativeScanWithFallback', () => {
  beforeEach(() => {
    mockCallSonar.mockReset();
  });

  it('should return result on success', async () => {
    const mockResponse = JSON.stringify({
      symbol: 'BTC',
      sentiment: 0.5,
      event_risk: 0.3,
      key_events: [{ title: 'Event', impact: 'high' }],
      reasoning_excerpt: 'Good',
      sources: [{ title: 'Source', url: 'https://example.com' }],
    });

    mockCallSonar.mockResolvedValueOnce(mockResponse);

    const result = await narrativeScanWithFallback('BTC');

    expect(result.sentiment).toBe(0.5);
    expect(result.event_risk).toBe(0.3);
  });

  it('should return fallback on error', async () => {
    mockCallSonar.mockRejectedValueOnce(new Error('Network error'));

    const result = await narrativeScanWithFallback('BTC');

    expect(result.symbol).toBe('BTC');
    expect(result.sentiment).toBe(0);
    expect(result.event_risk).toBe(0);
    expect(result.key_events).toEqual([]);
    expect(result.sources).toEqual([]);
  });
});

describe('sentiment utilities', () => {
  describe('sentimentToLabel', () => {
    it('should return correct labels', () => {
      expect(sentimentToLabel(-1)).toBe('Svært negativt');
      expect(sentimentToLabel(-0.5)).toBe('Negativt');
      expect(sentimentToLabel(0)).toBe('Nøytralt');
      expect(sentimentToLabel(0.5)).toBe('Positivt');
      expect(sentimentToLabel(1)).toBe('Svært positivt');
    });
  });

  describe('sentimentToColor', () => {
    it('should return correct color classes', () => {
      expect(sentimentToColor(-1)).toBe('text-red-600');
      expect(sentimentToColor(-0.5)).toBe('text-orange-500');
      expect(sentimentToColor(0)).toBe('text-gray-500');
      expect(sentimentToColor(0.5)).toBe('text-emerald-500');
      expect(sentimentToColor(1)).toBe('text-green-600');
    });
  });

  describe('isElevatedEventRisk', () => {
    it('should return true for risk >= 0.7', () => {
      expect(isElevatedEventRisk(0.7)).toBe(true);
      expect(isElevatedEventRisk(0.9)).toBe(true);
    });

    it('should return false for risk < 0.7', () => {
      expect(isElevatedEventRisk(0.6)).toBe(false);
      expect(isElevatedEventRisk(0.3)).toBe(false);
    });
  });

  describe('impactToColor', () => {
    it('should return correct color classes', () => {
      expect(impactToColor('low')).toBe('text-blue-500');
      expect(impactToColor('medium')).toBe('text-yellow-500');
      expect(impactToColor('high')).toBe('text-red-500');
    });
  });
});
