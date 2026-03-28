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

// ============================================================================
// Cache Implementation
// ============================================================================

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class RegimeCache {
  private cache: Map<string, CacheEntry<RegimeScanResult>> = new Map();

  private getKey(): string {
    // Regime is global, so we use a fixed key
    return 'global_market_regime';
  }

  get(): RegimeScanResult | null {
    const key = this.getKey();
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    logger.debug('[RegimeScan] Cache hit');
    return entry.data;
  }

  set(data: RegimeScanResult, ttlMs: number = DEFAULT_CACHE_CONFIG.regimeTtlMs): void {
    const key = this.getKey();
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
    logger.debug(`[RegimeScan] Cached result for ${ttlMs}ms`);
  }

  clear(): void {
    this.cache.clear();
    logger.info('[RegimeScan] Cache cleared');
  }

  isValid(): boolean {
    const entry = this.cache.get(this.getKey());
    if (!entry) return false;
    return Date.now() <= entry.expiresAt;
  }

  getExpiryTime(): number | null {
    const entry = this.cache.get(this.getKey());
    if (!entry) return null;
    return Math.max(0, entry.expiresAt - Date.now());
  }
}

// Global cache instance
const regimeCache = new RegimeCache();

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

  // Check cache first
  if (!skipCache) {
    const cached = regimeCache.get();
    if (cached) {
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

    // Cache the result
    regimeCache.set(result, cacheTtlMs);

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
 * Check if cached regime data is available and valid
 */
export function isRegimeCacheValid(): boolean {
  return regimeCache.isValid();
}

/**
 * Get time until cache expires (in ms)
 */
export function getRegimeCacheExpiry(): number | null {
  return regimeCache.getExpiryTime();
}

/**
 * Clear regime cache
 */
export function clearRegimeCache(): void {
  regimeCache.clear();
}

/**
 * Get cached regime data if available
 */
export function getCachedRegime(): RegimeScanResult | null {
  return regimeCache.get();
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
