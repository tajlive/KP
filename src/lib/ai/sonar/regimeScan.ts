/**
 * Regime Scan Module
 * Analyserer markedets regime (bull/bear/range/unclear)
 */

import { z } from 'zod';
import { logger } from '@/lib/logger';
import { callSonar } from './client';
import { PROMPT_TEMPLATES, DEFAULT_CACHE_CONFIG } from './config';
import type { RegimeScanResult, MarketRegime } from './types';
import { SonarValidationError, SonarError } from './types';
import { cache } from '@/lib/cache';

const REGIME_CACHE_KEY = 'sonar:regime:global';

// ============================================================================
// Zod Validation Schema
// ============================================================================

const MarketRegimeSchema = z.enum(['bull', 'bear', 'range', 'unclear']);

const RegimeSourceSchema = z.object({
  title: z.string().min(1).max(200),
  url: z.string().url(),
});

const RegimeScanResultSchema = z.object({
  regime: MarketRegimeSchema,
  confidence: z.number().min(0).max(1),
  reasoning_excerpt: z.string().min(1).max(500),
  risk_flags: z.array(z.string().min(1).max(100)).max(10),
  sources: z.array(RegimeSourceSchema).max(10),
});

// =============================================================================
// Cache helpers (Redis/Upstash i prod, MemoryCache i dev)
// Erstatter in-memory RegimeCache som IKKE er serverless-safe.
// =============================================================================

async function getCachedRegimeData(): Promise<RegimeScanResult | null> {
  try {
    return await cache.get<RegimeScanResult>(REGIME_CACHE_KEY);
  } catch (err) {
    logger.warn('[RegimeScan] Cache get feilet, hopper over cache:', err);
    return null;
  }
}

async function setCachedRegimeData(
  data: RegimeScanResult,
  ttlMs: number
): Promise<void> {
  try {
    await cache.set(REGIME_CACHE_KEY, data, ttlMs);
    logger.debug(`[RegimeScan] Lagret i Redis/Memory for ${ttlMs}ms`);
  } catch (err) {
    logger.warn('[RegimeScan] Cache set feilet, fortsetter uten cache:', err);
  }
}

async function deleteCachedRegimeData(): Promise<void> {
  try {
    await cache.delete(REGIME_CACHE_KEY);
    logger.info('[RegimeScan] Cache tomt');
  } catch (err) {
    logger.warn('[RegimeScan] Cache delete feilet:', err);
  }
}

// ============================================================================
// Default / Fallback Values
// ============================================================================

const DEFAULT_REGIME_RESULT: RegimeScanResult = {
  regime: 'unclear',
  confidence: 0,
  reasoning_excerpt: 'Ingen regime-data tilgjengelig',
  risk_flags: [],
  sources: [],
};

// ============================================================================
// Response Parsing
// ============================================================================

/**
 * Parse and validate Sonar response for regime scan
 */
function parseRegimeResponse(responseContent: string): RegimeScanResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(responseContent);
  } catch (error) {
    logger.error('[RegimeScan] Failed to parse JSON response:', error);
    throw new SonarValidationError(
      `Invalid JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  try {
    const validated = RegimeScanResultSchema.parse(parsed);
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
      logger.error('[RegimeScan] Validation failed:', issues);
      throw new SonarValidationError(`Response validation failed: ${issues}`);
    }
    throw error;
  }
}

// ============================================================================
// Main Function
// ============================================================================

export interface RegimeScanOptions {
  tier?: 'sonar' | 'sonar-pro';
  mode?: 'low' | 'medium' | 'high';
  timeoutMs?: number;
  skipCache?: boolean;
  cacheTtlMs?: number;
}

/**
 * Scan market regime (bull/bear/range/unclear)
 *
 * @param options - Optional configuration
 * @returns RegimeScanResult with regime, confidence, and risk flags
 * @throws SonarError if the API call fails
 * @throws SonarValidationError if response validation fails
 */
export async function regimeScan(
  options: RegimeScanOptions = {}
): Promise<RegimeScanResult> {
  const {
    tier = 'sonar-pro', // Use pro for regime - it's more important
    mode = 'high',      // Use high context for better analysis
    timeoutMs = 45000,  // Longer timeout for complex analysis
    skipCache = false,
    cacheTtlMs = DEFAULT_CACHE_CONFIG.regimeTtlMs,
  } = options;

  // Sjekk Redis/cache forst (serverless-safe)
  if (!skipCache) {
    const cached = await getCachedRegimeData();
    if (cached) {
      logger.debug('[RegimeScan] Cache hit');
      return cached;
    }
  }

  logger.info('[RegimeScan] Starting market regime scan');
  const startTime = Date.now();

  try {
    const prompt = PROMPT_TEMPLATES.REGIME_SCAN;

    const response = await callSonar(prompt, {
      tier,
      mode,
      jsonMode: true,
      timeoutMs,
    });

    const result = parseRegimeResponse(response);

    const duration = Date.now() - startTime;
    logger.info(
      `[RegimeScan] Completed scan in ${duration}ms. ` +
        `Regime: ${result.regime}, Confidence: ${result.confidence.toFixed(2)}`
    );

    // Lagre i Redis/cache (serverless-safe)
    await setCachedRegimeData(result, cacheTtlMs);

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof SonarValidationError) {
      logger.error(
        `[RegimeScan] Validation failed after ${duration}ms: ${error.message}`
      );
      throw error;
    }

    if (error instanceof SonarError) {
      logger.error(
        `[RegimeScan] API error after ${duration}ms: ${error.message}`
      );
      throw error;
    }

    logger.error('[RegimeScan] Unexpected error:', error);
    throw new SonarError(
      `Unexpected error during regime scan: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'API_ERROR',
      undefined,
      false
    );
  }
}

/**
 * Scan with fallback - returns default values instead of throwing
 *
 * @param options - Optional configuration
 * @returns RegimeScanResult (with defaults on error)
 */
export async function regimeScanWithFallback(
  options: RegimeScanOptions = {}
): Promise<RegimeScanResult> {
  try {
    return await regimeScan(options);
  } catch (error) {
    logger.warn(
      `[RegimeScan] Using fallback: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return { ...DEFAULT_REGIME_RESULT };
  }
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Force refresh regime data (bypass cache)
 */
export async function refreshRegime(
  options: Omit<RegimeScanOptions, 'skipCache'> = {}
): Promise<RegimeScanResult> {
  return regimeScan({ ...options, skipCache: true });
}

/**
 * Clear regime cache (Redis/Memory)
 */
export async function clearRegimeCache(): Promise<void> {
  await deleteCachedRegimeData();
}

/**
 * Get cached regime data if available
 */
export async function getCachedRegime(): Promise<RegimeScanResult | null> {
  return getCachedRegimeData();
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get human-readable label for regime
 */
export function regimeToLabel(regime: MarketRegime): string {
  const labels: Record<MarketRegime, string> = {
    bull: 'Bull-marked',
    bear: 'Bear-marked',
    range: 'Sideways',
    unclear: 'Uklart',
  };
  return labels[regime];
}

/**
 * Get emoji for regime
 */
export function regimeToEmoji(regime: MarketRegime): string {
  const emojis: Record<MarketRegime, string> = {
    bull: '🐂',
    bear: '🐻',
    range: '↔️',
    unclear: '❓',
  };
  return emojis[regime];
}

/**
 * Get color class for regime
 */
export function regimeToColor(regime: MarketRegime): string {
  const colors: Record<MarketRegime, string> = {
    bull: 'text-green-600',
    bear: 'text-red-600',
    range: 'text-yellow-500',
    unclear: 'text-gray-500',
  };
  return colors[regime];
}

/**
 * Get Tailwind background color class for regime
 */
export function regimeToBgColor(regime: MarketRegime): string {
  const colors: Record<MarketRegime, string> = {
    bull: 'bg-green-100',
    bear: 'bg-red-100',
    range: 'bg-yellow-100',
    unclear: 'bg-gray-100',
  };
  return colors[regime];
}

/**
 * Check if regime is favorable for long positions
 */
export function isBullishRegime(regime: MarketRegime): boolean {
  return regime === 'bull';
}

/**
 * Check if regime is favorable for short positions or caution
 */
export function isBearishRegime(regime: MarketRegime): boolean {
  return regime === 'bear';
}

/**
 * Check if regime requires caution (unclear or bear)
 */
export function requiresCaution(regime: MarketRegime): boolean {
  return regime === 'bear' || regime === 'unclear';
}

/**
 * Get recommended position size adjustment based on regime
 * Returns a multiplier (0.5 = reduce to 50%, 1.0 = normal, 1.5 = increase)
 */
export function getRegimePositionAdjustment(regime: MarketRegime): number {
  const adjustments: Record<MarketRegime, number> = {
    bull: 1.2,    // Can be slightly more aggressive
    bear: 0.5,    // Reduce position size significantly
    range: 1.0,   // Normal sizing
    unclear: 0.7, // Reduce position size
  };
  return adjustments[regime];
}
