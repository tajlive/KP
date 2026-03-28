/**
 * Narrative Scan Module
 * Analyserer nyheter og narrativ rundt et spesifikt symbol
 */

import { z } from 'zod';
import { logger } from '@/lib/logger';
import { callSonar } from './client';
import { PROMPT_TEMPLATES } from './config';
import type { NarrativeScanResult, SentimentValue, ImpactLevel } from './types';
import { SonarValidationError, SonarError } from './types';

// ============================================================================
// Zod Validation Schema
// ============================================================================

const SentimentSchema = z.union([
  z.literal(-1),
  z.literal(-0.5),
  z.literal(0),
  z.literal(0.5),
  z.literal(1),
]);

const ImpactSchema = z.enum(['low', 'medium', 'high']);

const NarrativeEventSchema = z.object({
  title: z.string().min(1).max(200),
  impact: ImpactSchema,
});

const NarrativeSourceSchema = z.object({
  title: z.string().min(1).max(200),
  url: z.string().url(),
});

const NarrativeScanResultSchema = z.object({
  symbol: z.string().min(1).max(20),
  sentiment: SentimentSchema,
  event_risk: z.number().min(0).max(1),
  key_events: z.array(NarrativeEventSchema).max(10),
  reasoning_excerpt: z.string().min(1).max(500),
  sources: z.array(NarrativeSourceSchema).max(10),
});

// ============================================================================
// Default / Fallback Values
// ============================================================================

const DEFAULT_NARRATIVE_RESULT: NarrativeScanResult = {
  symbol: '',
  sentiment: 0,
  event_risk: 0,
  key_events: [],
  reasoning_excerpt: 'Ingen narrativdata tilgjengelig',
  sources: [],
};

// ============================================================================
// Response Parsing
// ============================================================================

/**
 * Parse and validate Sonar response for narrative scan
 */
function parseNarrativeResponse(
  responseContent: string,
  expectedSymbol: string
): NarrativeScanResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(responseContent);
  } catch (error) {
    logger.error('[NarrativeScan] Failed to parse JSON response:', error);
    throw new SonarValidationError(
      `Invalid JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  try {
    const validated = NarrativeScanResultSchema.parse(parsed);

    // Ensure symbol matches (case-insensitive)
    if (validated.symbol.toUpperCase() !== expectedSymbol.toUpperCase()) {
      logger.warn(
        `[NarrativeScan] Symbol mismatch: expected ${expectedSymbol}, got ${validated.symbol}`
      );
      // Override with expected symbol
      validated.symbol = expectedSymbol.toUpperCase();
    }

    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
      logger.error('[NarrativeScan] Validation failed:', issues);
      throw new SonarValidationError(`Response validation failed: ${issues}`);
    }
    throw error;
  }
}

// ============================================================================
// Main Function
// ============================================================================

export interface NarrativeScanOptions {
  tier?: 'sonar' | 'sonar-pro';
  mode?: 'low' | 'medium' | 'high';
  timeoutMs?: number;
}

/**
 * Scan news and narrative for a specific symbol
 *
 * @param symbol - The crypto symbol to analyze (e.g., "BTC", "ETH")
 * @param options - Optional configuration
 * @returns NarrativeScanResult with sentiment, events, and sources
 * @throws SonarError if the API call fails
 * @throws SonarValidationError if response validation fails
 */
export async function narrativeScan(
  symbol: string,
  options: NarrativeScanOptions = {}
): Promise<NarrativeScanResult> {
  // Validate input
  if (!symbol || typeof symbol !== 'string') {
    throw new SonarValidationError('Symbol is required and must be a string');
  }

  const normalizedSymbol = symbol.trim().toUpperCase();
  if (normalizedSymbol.length < 1 || normalizedSymbol.length > 20) {
    throw new SonarValidationError('Symbol must be 1-20 characters');
  }

  const {
    tier = 'sonar',
    mode = 'medium',
    timeoutMs = 30000,
  } = options;

  logger.info(`[NarrativeScan] Starting scan for ${normalizedSymbol}`);
  const startTime = Date.now();

  try {
    const prompt = PROMPT_TEMPLATES.NARRATIVE_SCAN(normalizedSymbol);

    const response = await callSonar(prompt, {
      tier,
      mode,
      jsonMode: true,
      timeoutMs,
    });

    const result = parseNarrativeResponse(response, normalizedSymbol);

    const duration = Date.now() - startTime;
    logger.info(
      `[NarrativeScan] Completed scan for ${normalizedSymbol} in ${duration}ms. ` +
        `Sentiment: ${result.sentiment}, Events: ${result.key_events.length}`
    );

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof SonarValidationError) {
      logger.error(
        `[NarrativeScan] Validation failed for ${normalizedSymbol} after ${duration}ms: ${error.message}`
      );
      throw error;
    }

    if (error instanceof SonarError) {
      logger.error(
        `[NarrativeScan] API error for ${normalizedSymbol} after ${duration}ms: ${error.message}`
      );
      throw error;
    }

    logger.error(
      `[NarrativeScan] Unexpected error for ${normalizedSymbol}:`,
      error
    );
    throw new SonarError(
      `Unexpected error during narrative scan: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'API_ERROR',
      undefined,
      false
    );
  }
}

/**
 * Scan with fallback - returns default values instead of throwing
 *
 * @param symbol - The crypto symbol to analyze
 * @param options - Optional configuration
 * @returns NarrativeScanResult (with defaults on error)
 */
export async function narrativeScanWithFallback(
  symbol: string,
  options: NarrativeScanOptions = {}
): Promise<NarrativeScanResult> {
  try {
    return await narrativeScan(symbol, options);
  } catch (error) {
    logger.warn(
      `[NarrativeScan] Using fallback for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );

    return {
      ...DEFAULT_NARRATIVE_RESULT,
      symbol: symbol.toUpperCase(),
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert sentiment value to human-readable label
 */
export function sentimentToLabel(sentiment: SentimentValue): string {
  const labels: Record<SentimentValue, string> = {
    '-1': 'Svært negativt',
    '-0.5': 'Negativt',
    '0': 'Nøytralt',
    '0.5': 'Positivt',
    '1': 'Svært positivt',
  };
  return labels[sentiment];
}

/**
 * Get color class for sentiment value
 */
export function sentimentToColor(sentiment: SentimentValue): string {
  const colors: Record<SentimentValue, string> = {
    '-1': 'text-red-600',
    '-0.5': 'text-orange-500',
    '0': 'text-gray-500',
    '0.5': 'text-emerald-500',
    '1': 'text-green-600',
  };
  return colors[sentiment];
}

/**
 * Check if event risk is elevated
 */
export function isElevatedEventRisk(eventRisk: number): boolean {
  return eventRisk >= 0.7;
}

/**
 * Get impact color class
 */
export function impactToColor(impact: ImpactLevel): string {
  const colors: Record<ImpactLevel, string> = {
    low: 'text-blue-500',
    medium: 'text-yellow-500',
    high: 'text-red-500',
  };
  return colors[impact];
}
