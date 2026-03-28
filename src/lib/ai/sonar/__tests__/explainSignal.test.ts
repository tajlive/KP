/**
 * Signal Explanation Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  explainSignal,
  explainSignalWithFallback,
  clearExplanationCache,
} from '../explainSignal';
import { SonarValidationError, SonarError } from '../types';
import type { ExplainSignalInput } from '../types';

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

const validInput: ExplainSignalInput = {
  symbol: 'BTC',
  timeframe: 'medium',
  decision: 'BUY',
  score: 75,
  risk_level: 3,
  factors: {
    trend: 0.8,
    volatility: 0.4,
    ai_signal: 0.7,
  },
  userRiskProfile: 'balanced',
  locale: 'nb-NO',
};

describe('explainSignal', () => {
  beforeEach(() => {
    mockCallSonar.mockReset();
    clearExplanationCache();
  });

  it('should return validated result on successful explanation', async () => {
    const mockResponse = JSON.stringify({
      title: 'Sterkt kjøpssignal for BTC',
      summary: 'Indikatorene peker i positiv retning.',
      key_points: [
        'Trenden er stigende',
        'Volumet støtter oppgangen',
      ],
      risk_warnings: [
        'Trading er risikofullt.',
        'Ikke invester mer enn du har råd til å tape.',
      ],
      sources: [
        { title: 'Teknisk Analyse', url: 'https://example.com' },
      ],
    });

    mockCallSonar.mockResolvedValueOnce(mockResponse);

    const result = await explainSignal(validInput);

    expect(result.title).toBe('Sterkt kjøpssignal for BTC');
    expect(result.summary).toBe('Indikatorene peker i positiv retning.');
    expect(result.key_points).toHaveLength(2);
    expect(result.risk_warnings).toHaveLength(2);
    expect(result.sources).toHaveLength(1);
  });

  it('should cache results', async () => {
    const mockResponse = JSON.stringify({
      title: 'Test',
      summary: 'Test summary',
      key_points: ['Point 1'],
      risk_warnings: ['Warning 1'],
      sources: [],
    });

    mockCallSonar.mockResolvedValue(mockResponse);

    await explainSignal(validInput);
    await explainSignal(validInput);

    expect(mockCallSonar).toHaveBeenCalledTimes(1);
  });

  it('should skip cache when skipCache is true', async () => {
    const mockResponse = JSON.stringify({
      title: 'Test',
      summary: 'Test summary',
      key_points: ['Point 1'],
      risk_warnings: ['Warning 1'],
      sources: [],
    });

    mockCallSonar.mockResolvedValue(mockResponse);

    await explainSignal(validInput);
    await explainSignal(validInput, { skipCache: true });

    expect(mockCallSonar).toHaveBeenCalledTimes(2);
  });

  it('should throw validation error for invalid input', async () => {
    const invalidInput = {
      ...validInput,
      symbol: '', // Empty symbol
    };

    await expect(explainSignal(invalidInput)).rejects.toThrow(
      SonarValidationError
    );
  });

  it('should throw validation error for invalid decision', async () => {
    const invalidInput = {
      ...validInput,
      decision: 'INVALID', // Invalid decision
    };

    await expect(explainSignal(invalidInput)).rejects.toThrow(
      SonarValidationError
    );
  });

  it('should throw validation error for score out of range', async () => {
    const invalidInput = {
      ...validInput,
      score: 150, // > 100
    };

    await expect(explainSignal(invalidInput)).rejects.toThrow(
      SonarValidationError
    );
  });

  it('should throw validation error for risk_level out of range', async () => {
    const invalidInput = {
      ...validInput,
      risk_level: 6, // > 5
    };

    await expect(explainSignal(invalidInput)).rejects.toThrow(
      SonarValidationError
    );
  });

  it('should throw validation error for unsupported locale', async () => {
    const invalidInput = {
      ...validInput,
      locale: 'en-US' as const, // Not supported
    };

    await expect(explainSignal(invalidInput)).rejects.toThrow(
      SonarValidationError
    );
  });

  it('should throw validation error for invalid JSON response', async () => {
    mockCallSonar.mockResolvedValueOnce('not valid json');

    await expect(explainSignal(validInput)).rejects.toThrow(
      SonarValidationError
    );
  });

  it('should throw validation error for missing required fields', async () => {
    const mockResponse = JSON.stringify({
      title: 'Test',
      // Missing summary, key_points, risk_warnings
    });

    mockCallSonar.mockResolvedValueOnce(mockResponse);

    await expect(explainSignal(validInput)).rejects.toThrow(
      SonarValidationError
    );
  });

  it('should throw validation error for empty risk_warnings', async () => {
    const mockResponse = JSON.stringify({
      title: 'Test',
      summary: 'Test',
      key_points: ['Point'],
      risk_warnings: [], // Empty - must have at least one
      sources: [],
    });

    mockCallSonar.mockResolvedValueOnce(mockResponse);

    await expect(explainSignal(validInput)).rejects.toThrow(
      SonarValidationError
    );
  });

  it('should propagate SonarError', async () => {
    const error = new SonarError('API Error', 'API_ERROR', 500, true);
    mockCallSonar.mockRejectedValueOnce(error);

    await expect(explainSignal(validInput)).rejects.toThrow(SonarError);
  });

  it('should use correct default options', async () => {
    const mockResponse = JSON.stringify({
      title: 'Test',
      summary: 'Test',
      key_points: ['Point'],
      risk_warnings: ['Warning'],
      sources: [],
    });

    mockCallSonar.mockResolvedValueOnce(mockResponse);

    await explainSignal(validInput);

    expect(mockCallSonar).toHaveBeenCalledWith(
      expect.stringContaining('BTC'),
      {
        tier: 'sonar',
        mode: 'medium',
        jsonMode: true,
        timeoutMs: 30000,
      }
    );
  });

  it('should include all factors in prompt', async () => {
    const mockResponse = JSON.stringify({
      title: 'Test',
      summary: 'Test',
      key_points: ['Point'],
      risk_warnings: ['Warning'],
      sources: [],
    });

    mockCallSonar.mockResolvedValueOnce(mockResponse);

    await explainSignal(validInput);

    const promptArg = mockCallSonar.mock.calls[0][0];
    expect(promptArg).toContain('trend: 0.8');
    expect(promptArg).toContain('volatility: 0.4');
    expect(promptArg).toContain('ai_signal: 0.7');
  });
});

describe('explainSignalWithFallback', () => {
  beforeEach(() => {
    mockCallSonar.mockReset();
    clearExplanationCache();
  });

  it('should return API result on success', async () => {
    const mockResponse = JSON.stringify({
      title: 'API Result',
      summary: 'From API',
      key_points: ['Point 1'],
      risk_warnings: ['Warning 1'],
      sources: [],
    });

    mockCallSonar.mockResolvedValueOnce(mockResponse);

    const result = await explainSignalWithFallback(validInput);

    expect(result.title).toBe('API Result');
    expect(result.summary).toBe('From API');
  });

  it('should return fallback on error', async () => {
    mockCallSonar.mockRejectedValueOnce(new Error('Network error'));

    const result = await explainSignalWithFallback(validInput);

    expect(result.title).toBe('Kjøpssignal');
    expect(result.risk_warnings.length).toBeGreaterThan(0);
  });

  it('should return correct fallback for STRONG_BUY', async () => {
    mockCallSonar.mockRejectedValueOnce(new Error('Error'));

    const result = await explainSignalWithFallback({
      ...validInput,
      decision: 'STRONG_BUY',
    });

    expect(result.title).toBe('Sterkt kjøpssignal');
    expect(result.summary).toContain('peker oppover');
  });

  it('should return correct fallback for SELL', async () => {
    mockCallSonar.mockRejectedValueOnce(new Error('Error'));

    const result = await explainSignalWithFallback({
      ...validInput,
      decision: 'SELL',
    });

    expect(result.title).toBe('Selgsignal');
    expect(result.summary).toContain('peker nedover');
  });

  it('should return correct fallback for STRONG_SELL', async () => {
    mockCallSonar.mockRejectedValueOnce(new Error('Error'));

    const result = await explainSignalWithFallback({
      ...validInput,
      decision: 'STRONG_SELL',
    });

    expect(result.title).toBe('Sterkt selgsignal');
    expect(result.risk_warnings[0]).toContain('Alvorlig risiko');
  });

  it('should return correct fallback for HOLD', async () => {
    mockCallSonar.mockRejectedValueOnce(new Error('Error'));

    const result = await explainSignalWithFallback({
      ...validInput,
      decision: 'HOLD',
    });

    expect(result.title).toBe('Hold-posisjon');
    expect(result.summary).toContain('uklare signaler');
  });
});
