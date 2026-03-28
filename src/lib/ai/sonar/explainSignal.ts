/**
 * Signal Explanation Module
 * Forklarer trading-signaler for sluttbrukere på norsk
 */

import { z } from 'zod';
import { logger } from '@/lib/logger';
import { callSonar } from './client';
import { PROMPT_TEMPLATES, DEFAULT_CACHE_CONFIG } from './config';
import type { ExplainSignalInput, ExplainSignalResult } from './types';
import { SonarValidationError, SonarError } from './types';

// ============================================================================
// Zod Validation Schema
// ============================================================================

const ExplanationSourceSchema = z.object({
  title: z.string().min(1).max(200),
  url: z.string().url(),
});

const ExplainSignalResultSchema = z.object({
  title: z.string().min(1).max(100),
  summary: z.string().min(1).max(1000),
  key_points: z.array(z.string().min(1).max(500)).max(10),
  risk_warnings: z.array(z.string().min(1).max(500)).min(1), // At least one warning
  sources: z.array(ExplanationSourceSchema).max(10),
});

// ============================================================================
// Cache Implementation
// ============================================================================

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class ExplanationCache {
  private cache: Map<string, CacheEntry<ExplainSignalResult>> = new Map();

  private generateKey(input: ExplainSignalInput): string {
    // Create cache key from relevant fields
    const keyParts = [
      input.symbol.toUpperCase(),
      input.decision,
      input.timeframe,
      input.risk_level.toString(),
      input.userRiskProfile,
    ];
    return keyParts.join(':');
  }

  get(input: ExplainSignalInput): ExplainSignalResult | null {
    const key = this.generateKey(input);
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    logger.debug('[ExplainSignal] Cache hit');
    return entry.data;
  }

  set(
    input: ExplainSignalInput,
    data: ExplainSignalResult,
    ttlMs: number = DEFAULT_CACHE_CONFIG.explanationTtlMs
  ): void {
    const key = this.generateKey(input);
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
    logger.debug(`[ExplainSignal] Cached result for ${ttlMs}ms`);
  }

  clear(): void {
    this.cache.clear();
    logger.info('[ExplainSignal] Cache cleared');
  }

  /**
   * Clear old entries to prevent memory leaks
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Global cache instance
const explanationCache = new ExplanationCache();

// Periodic cleanup every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => explanationCache.cleanup(), 10 * 60 * 1000);
}

// ============================================================================
// Input Validation
// ============================================================================

const DecisionSchema = z.enum([
  'STRONG_BUY',
  'BUY',
  'HOLD',
  'SELL',
  'STRONG_SELL',
]);

const TimeframeSchema = z.enum(['short', 'medium', 'long']);

const RiskLevelSchema = z.number().int().min(1).max(5);

const UserRiskProfileSchema = z.enum(['conservative', 'balanced', 'aggressive']);

const SupportedLocaleSchema = z.literal('nb-NO');

const ExplainSignalInputSchema = z.object({
  symbol: z.string().min(1).max(20),
  timeframe: TimeframeSchema,
  decision: DecisionSchema,
  score: z.number().min(0).max(100),
  risk_level: RiskLevelSchema,
  factors: z.record(z.string(), z.number()),
  userRiskProfile: UserRiskProfileSchema,
  locale: SupportedLocaleSchema,
});

// ============================================================================
// Response Parsing
// ============================================================================

/**
 * Parse and validate Sonar response for signal explanation
 */
function parseExplanationResponse(responseContent: string): ExplainSignalResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(responseContent);
  } catch (error) {
    logger.error('[ExplainSignal] Failed to parse JSON response:', error);
    throw new SonarValidationError(
      `Invalid JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  try {
    const validated = ExplainSignalResultSchema.parse(parsed);
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
      logger.error('[ExplainSignal] Validation failed:', issues);
      throw new SonarValidationError(`Response validation failed: ${issues}`);
    }
    throw error;
  }
}

// ============================================================================
// Main Function
// ============================================================================

export interface ExplainSignalOptions {
  tier?: 'sonar' | 'sonar-pro';
  mode?: 'low' | 'medium' | 'high';
  timeoutMs?: number;
  skipCache?: boolean;
  cacheTtlMs?: number;
}

/**
 * Generate human-readable explanation for a trading signal
 *
 * @param input - Signal data to explain
 * @param options - Optional configuration
 * @returns ExplainSignalResult with title, summary, key points, and warnings
 * @throws SonarError if the API call fails
 * @throws SonarValidationError if response validation fails
 */
export async function explainSignal(
  input: ExplainSignalInput,
  options: ExplainSignalOptions = {}
): Promise<ExplainSignalResult> {
  // Validate input
  const validationResult = ExplainSignalInputSchema.safeParse(input);
  if (!validationResult.success) {
    const issues = validationResult.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join(', ');
    throw new SonarValidationError(`Invalid input: ${issues}`);
  }

  const {
    tier = 'sonar',
    mode = 'medium',
    timeoutMs = 30000,
    skipCache = false,
    cacheTtlMs = DEFAULT_CACHE_CONFIG.explanationTtlMs,
  } = options;

  // Check cache first
  if (!skipCache) {
    const cached = explanationCache.get(input);
    if (cached) {
      return cached;
    }
  }

  logger.info(
    `[ExplainSignal] Generating explanation for ${input.symbol} (${input.decision})`
  );
  const startTime = Date.now();

  try {
    const prompt = PROMPT_TEMPLATES.EXPLAIN_SIGNAL(input);

    const response = await callSonar(prompt, {
      tier,
      mode,
      jsonMode: true,
      timeoutMs,
    });

    const result = parseExplanationResponse(response);

    const duration = Date.now() - startTime;
    logger.info(
      `[ExplainSignal] Generated explanation in ${duration}ms for ${input.symbol}`
    );

    // Cache the result
    explanationCache.set(input, result, cacheTtlMs);

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof SonarValidationError) {
      logger.error(
        `[ExplainSignal] Validation failed after ${duration}ms: ${error.message}`
      );
      throw error;
    }

    if (error instanceof SonarError) {
      logger.error(
        `[ExplainSignal] API error after ${duration}ms: ${error.message}`
      );
      throw error;
    }

    logger.error('[ExplainSignal] Unexpected error:', error);
    throw new SonarError(
      `Unexpected error during explanation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'API_ERROR',
      undefined,
      false
    );
  }
}

// ============================================================================
// Fallback Implementation
// ============================================================================

const FALLBACK_EXPLANATIONS: Record<
  ExplainSignalInput['decision'],
  Partial<ExplainSignalResult>
> = {
  STRONG_BUY: {
    title: 'Sterkt kjøpssignal',
    summary:
      'De fleste indikatorene peker oppover. Dette kan være en god mulighet, men husk å vurdere din egen risikotoleranse.',
    key_points: [
      'Tekniske indikatorer er positive',
      'Markedsforholdene ser gunstige ut',
      'Samsvar med din valgte risikoprofil',
    ],
    risk_warnings: [
      'Trading er risikofullt. Du kan tape mer enn du investerer.',
      'Historisk avkastning er ingen garanti for fremtidig resultat.',
    ],
  },
  BUY: {
    title: 'Kjøpssignal',
    summary:
      'Indikatorene viser en positiv utvikling. Dette kan være en mulighet, men vær oppmerksom på risiko.',
    key_points: [
      'Flere positive tekniske signaler',
      'Moderat risikonivå',
      'Passer for din risikoprofil',
    ],
    risk_warnings: [
      'Trading er risikofullt. Start med små beløp.',
      'Prisen kan gå begge veier.',
    ],
  },
  HOLD: {
    title: 'Hold-posisjon',
    summary:
      'Det er uklare signaler i markedet akkurat nå. Det kan være lurt å vente på tydeligere tegn.',
    key_points: [
      'Indikatorene er motstridende',
      'Avventer tydeligere retning',
      'Ingen umiddelbar handlingsnødvendighet',
    ],
    risk_warnings: [
      'Ved usikkerhet: ikke handle.',
      'Markedsforholdene kan endre seg raskt.',
    ],
  },
  SELL: {
    title: 'Selgsignal',
    summary:
      'Noen indikatorer peker nedover. Dette kan være et tegn på å ta gevinst eller redusere eksponering.',
    key_points: [
      'Negative tekniske signaler',
      'Risiko for prisfall',
      'Vurder å sikre gevinster',
    ],
    risk_warnings: [
      'Prisen kan fortsette å falle.',
      'Vurder dine langsiktige mål før salg.',
    ],
  },
  STRONG_SELL: {
    title: 'Sterkt selgsignal',
    summary:
      'De fleste indikatorene peker nedover. Dette kan være et tegn på å redusere eksponering betydelig.',
    key_points: [
      'Sterke negative signaler',
      'Høy risiko for videre nedgang',
      'Vurder å beskytte kapitalen',
    ],
    risk_warnings: [
      'Alvorlig risiko for tap. Vurder å redusere posisjonen.',
      'Ikke invester mer enn du har råd til å tape.',
    ],
  },
};

/**
 * Generate explanation with fallback - returns default values instead of throwing
 *
 * @param input - Signal data to explain
 * @param options - Optional configuration
 * @returns ExplainSignalResult (with fallback on error)
 */
export async function explainSignalWithFallback(
  input: ExplainSignalInput,
  options: ExplainSignalOptions = {}
): Promise<ExplainSignalResult> {
  try {
    return await explainSignal(input, options);
  } catch (error) {
    logger.warn(
      `[ExplainSignal] Using fallback for ${input.symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );

    const fallback = FALLBACK_EXPLANATIONS[input.decision];
    return {
      title: fallback.title || 'Signal',
      summary: fallback.summary || 'Ingen forklaring tilgjengelig.',
      key_points: fallback.key_points || [],
      risk_warnings: fallback.risk_warnings || [
        'Trading er risikofullt. Du kan tape penger.',
      ],
      sources: [],
    };
  }
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Clear explanation cache
 */
export function clearExplanationCache(): void {
  explanationCache.clear();
}
