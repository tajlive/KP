/**
 * Regime Scan Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  regimeScan,
  regimeScanWithFallback,
  refreshRegime,
  isRegimeCacheValid,
  getRegimeCacheExpiry,
  clearRegimeCache,
  getCachedRegime,
  regimeToLabel,
  regimeToEmoji,
  regimeToColor,
  regimeToBgColor,
  isBullishRegime,
  isBearishRegime,
  requiresCaution,
  getRegimePositionAdjustment,
} from '../regimeScan';
import { SonarValidationError, SonarError } from '../types';

// Mock callSonar
const mockCallSonar = vi.fn();
vi.mock('../client', () => ({
  callSonar: (...args: unknown[]) => mockCallSonar(...args),
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

describe('regimeScan', () => {
  beforeEach(() => {
    mockCallSonar.mockReset();
    clearRegimeCache();
  });

  it('should return validated result on successful scan', async () => {
    const mockResponse = JSON.stringify({
      regime: 'bull',
      confidence: 0.85,
      reasoning_excerpt: 'Strong upward momentum',
      risk_flags: ['regulatory_uncertainty'],
      sources: [
        { title: 'Market Analysis', url: 'https://example.com' },
      ],
    });

    mockCallSonar.mockResolvedValueOnce(mockResponse);

    const result = await regimeScan();

    expect(result.regime).toBe('bull');
    expect(result.confidence).toBe(0.85);
    expect(result.reasoning_excerpt).toBe('Strong upward momentum');
    expect(result.risk_flags).toContain('regulatory_uncertainty');
    expect(result.sources).toHaveLength(1);
  });

  it('should cache results', async () => {
    const mockResponse = JSON.stringify({
      regime: 'bear',
      confidence: 0.7,
      reasoning_excerpt: 'Downtrend confirmed',
      risk_flags: [],
      sources: [],
    });

    mockCallSonar.mockResolvedValue(mockResponse);

    // First call should hit API
    const result1 = await regimeScan();
    expect(mockCallSonar).toHaveBeenCalledTimes(1);

    // Second call should use cache
    const result2 = await regimeScan();
    expect(mockCallSonar).toHaveBeenCalledTimes(1); // Still 1
    expect(result2.regime).toBe(result1.regime);
  });

  it('should skip cache when skipCache is true', async () => {
    const mockResponse = JSON.stringify({
      regime: 'range',
      confidence: 0.6,
      reasoning_excerpt: 'Sideways movement',
      risk_flags: [],
      sources: [],
    });

    mockCallSonar.mockResolvedValue(mockResponse);

    await regimeScan();
    await regimeScan({ skipCache: true });

    expect(mockCallSonar).toHaveBeenCalledTimes(2);
  });

  it('should use correct default options', async () => {
    const mockResponse = JSON.stringify({
      regime: 'bull',
      confidence: 0.8,
      reasoning_excerpt: 'Test',
      risk_flags: [],
      sources: [],
    });

    mockCallSonar.mockResolvedValueOnce(mockResponse);

    await regimeScan();

    expect(mockCallSonar).toHaveBeenCalledWith(
      expect.any(String),
      {
        tier: 'sonar-pro',
        mode: 'high',
        jsonMode: true,
        timeoutMs: 45000,
      }
    );
  });

  it('should throw validation error for invalid JSON', async () => {
    mockCallSonar.mockResolvedValueOnce('not valid json');

    await expect(regimeScan()).rejects.toThrow(SonarValidationError);
  });

  it('should throw validation error for invalid regime value', async () => {
    const mockResponse = JSON.stringify({
      regime: 'invalid_regime',
      confidence: 0.5,
      reasoning_excerpt: 'Test',
      risk_flags: [],
      sources: [],
    });

    mockCallSonar.mockResolvedValueOnce(mockResponse);

    await expect(regimeScan()).rejects.toThrow(SonarValidationError);
  });

  it('should throw validation error for confidence out of range', async () => {
    const mockResponse = JSON.stringify({
      regime: 'bull',
      confidence: 1.5, // Invalid: > 1
      reasoning_excerpt: 'Test',
      risk_flags: [],
      sources: [],
    });

    mockCallSonar.mockResolvedValueOnce(mockResponse);

    await expect(regimeScan()).rejects.toThrow(SonarValidationError);
  });

  it('should propagate SonarError', async () => {
    const error = new SonarError('API Error', 'API_ERROR', 500, true);
    mockCallSonar.mockRejectedValueOnce(error);

    await expect(regimeScan()).rejects.toThrow(SonarError);
  });
});

describe('regimeScanWithFallback', () => {
  beforeEach(() => {
    mockCallSonar.mockReset();
    clearRegimeCache();
  });

  it('should return result on success', async () => {
    const mockResponse = JSON.stringify({
      regime: 'bull',
      confidence: 0.8,
      reasoning_excerpt: 'Good',
      risk_flags: [],
      sources: [],
    });

    mockCallSonar.mockResolvedValueOnce(mockResponse);

    const result = await regimeScanWithFallback();

    expect(result.regime).toBe('bull');
    expect(result.confidence).toBe(0.8);
  });

  it('should return fallback on error', async () => {
    mockCallSonar.mockRejectedValueOnce(new Error('Network error'));

    const result = await regimeScanWithFallback();

    expect(result.regime).toBe('unclear');
    expect(result.confidence).toBe(0);
    expect(result.reasoning_excerpt).toBe('Ingen regime-data tilgjengelig');
  });
});

describe('cache management', () => {
  beforeEach(() => {
    mockCallSonar.mockReset();
    clearRegimeCache();
  });

  it('should check if cache is valid', async () => {
    expect(isRegimeCacheValid()).toBe(false);

    const mockResponse = JSON.stringify({
      regime: 'bull',
      confidence: 0.8,
      reasoning_excerpt: 'Test',
      risk_flags: [],
      sources: [],
    });

    mockCallSonar.mockResolvedValueOnce(mockResponse);
    await regimeScan();

    expect(isRegimeCacheValid()).toBe(true);
  });

  it('should return null for expiry when cache is empty', () => {
    expect(getRegimeCacheExpiry()).toBeNull();
  });

  it('should return expiry time when cache exists', async () => {
    const mockResponse = JSON.stringify({
      regime: 'bull',
      confidence: 0.8,
      reasoning_excerpt: 'Test',
      risk_flags: [],
      sources: [],
    });

    mockCallSonar.mockResolvedValueOnce(mockResponse);
    await regimeScan();

    const expiry = getRegimeCacheExpiry();
    expect(expiry).toBeGreaterThan(0);
    expect(expiry).toBeLessThanOrEqual(4 * 60 * 60 * 1000); // Max 4 hours
  });

  it('should return cached data', async () => {
    const mockResponse = JSON.stringify({
      regime: 'bear',
      confidence: 0.9,
      reasoning_excerpt: 'Test',
      risk_flags: [],
      sources: [],
    });

    mockCallSonar.mockResolvedValueOnce(mockResponse);
    await regimeScan();

    const cached = getCachedRegime();
    expect(cached?.regime).toBe('bear');
  });

  it('should clear cache', async () => {
    const mockResponse = JSON.stringify({
      regime: 'bull',
      confidence: 0.8,
      reasoning_excerpt: 'Test',
      risk_flags: [],
      sources: [],
    });

    mockCallSonar.mockResolvedValueOnce(mockResponse);
    await regimeScan();

    expect(isRegimeCacheValid()).toBe(true);
    clearRegimeCache();
    expect(isRegimeCacheValid()).toBe(false);
  });

  it('should force refresh with refreshRegime', async () => {
    const mockResponse = JSON.stringify({
      regime: 'bull',
      confidence: 0.8,
      reasoning_excerpt: 'Test',
      risk_flags: [],
      sources: [],
    });

    mockCallSonar.mockResolvedValue(mockResponse);

    await regimeScan();
    await refreshRegime();

    expect(mockCallSonar).toHaveBeenCalledTimes(2);
  });
});

describe('regime utilities', () => {
  describe('regimeToLabel', () => {
    it('should return correct labels', () => {
      expect(regimeToLabel('bull')).toBe('Bull-marked');
      expect(regimeToLabel('bear')).toBe('Bear-marked');
      expect(regimeToLabel('range')).toBe('Sideways');
      expect(regimeToLabel('unclear')).toBe('Uklart');
    });
  });

  describe('regimeToEmoji', () => {
    it('should return correct emojis', () => {
      expect(regimeToEmoji('bull')).toBe('🐂');
      expect(regimeToEmoji('bear')).toBe('🐻');
      expect(regimeToEmoji('range')).toBe('↔️');
      expect(regimeToEmoji('unclear')).toBe('❓');
    });
  });

  describe('regimeToColor', () => {
    it('should return correct color classes', () => {
      expect(regimeToColor('bull')).toBe('text-green-600');
      expect(regimeToColor('bear')).toBe('text-red-600');
      expect(regimeToColor('range')).toBe('text-yellow-500');
      expect(regimeToColor('unclear')).toBe('text-gray-500');
    });
  });

  describe('regimeToBgColor', () => {
    it('should return correct background color classes', () => {
      expect(regimeToBgColor('bull')).toBe('bg-green-100');
      expect(regimeToBgColor('bear')).toBe('bg-red-100');
      expect(regimeToBgColor('range')).toBe('bg-yellow-100');
      expect(regimeToBgColor('unclear')).toBe('bg-gray-100');
    });
  });

  describe('isBullishRegime', () => {
    it('should return true only for bull', () => {
      expect(isBullishRegime('bull')).toBe(true);
      expect(isBullishRegime('bear')).toBe(false);
      expect(isBullishRegime('range')).toBe(false);
      expect(isBullishRegime('unclear')).toBe(false);
    });
  });

  describe('isBearishRegime', () => {
    it('should return true only for bear', () => {
      expect(isBearishRegime('bull')).toBe(false);
      expect(isBearishRegime('bear')).toBe(true);
      expect(isBearishRegime('range')).toBe(false);
      expect(isBearishRegime('unclear')).toBe(false);
    });
  });

  describe('requiresCaution', () => {
    it('should return true for bear and unclear', () => {
      expect(requiresCaution('bull')).toBe(false);
      expect(requiresCaution('bear')).toBe(true);
      expect(requiresCaution('range')).toBe(false);
      expect(requiresCaution('unclear')).toBe(true);
    });
  });

  describe('getRegimePositionAdjustment', () => {
    it('should return correct adjustments', () => {
      expect(getRegimePositionAdjustment('bull')).toBe(1.2);
      expect(getRegimePositionAdjustment('bear')).toBe(0.5);
      expect(getRegimePositionAdjustment('range')).toBe(1.0);
      expect(getRegimePositionAdjustment('unclear')).toBe(0.7);
    });
  });
});
