/**
 * Sonar API Client
 * Hovedklient for Perplexity Sonar/Sonar Pro API
 */

import { logger } from '@/lib/logger';
import { opik } from '../opik-client';
import {
  calculateBackoff,
  DEFAULT_RETRY_CONFIG,
  getModelForTier,
  getSearchContextForMode,
  getTimeout,
  RATE_LIMIT_CONFIG,
  SONAR_API_BASE_URL,
  SONAR_API_KEY,
  validateConfig,
} from './config';
import {
  SonarApiResponse,
  SonarError,
  SonarMetrics,
  SonarMode,
  SonarRequestOptions,
  SonarTier,
} from './types';

// ============================================================================
// Injectable delay — mockbar i tester
// ============================================================================

/**
 * Delay-funksjon som kan overrides i tester via setSonarDelayFn()
 * Standard: ekte setTimeout. I tester: vi.fn() eller no-op.
 */
let _delayFn: (ms: number) => Promise<void> =
  (ms) => new Promise((r) => setTimeout(r, ms));

/** Brukes kun i tester for a injisere fake delay */
export function setSonarDelayFn(fn: (ms: number) => Promise<void>): void {
  _delayFn = fn;
}

/** Tilbakestill til ekte setTimeout (kall i afterEach) */
export function resetSonarDelayFn(): void {
  _delayFn = (ms) => new Promise((r) => setTimeout(r, ms));
}

// ============================================================================
// Token Bucket Rate Limiter (In-Memory)
// ============================================================================

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

class RateLimiter {
  private buckets: Map<SonarTier, TokenBucket> = new Map();

  constructor() {
    // Initialize buckets
    (Object.keys(RATE_LIMIT_CONFIG) as SonarTier[]).forEach((tier) => {
      this.buckets.set(tier, {
        tokens: RATE_LIMIT_CONFIG[tier].burstSize,
        lastRefill: Date.now(),
      });
    });
  }

  /**
   * Check if a request is allowed and consume a token if so
   */
  consume(tier: SonarTier): { allowed: boolean; remaining: number } {
    const bucket = this.buckets.get(tier);
    if (!bucket) return { allowed: false, remaining: 0 };

    const config = RATE_LIMIT_CONFIG[tier];
    const now = Date.now();
    const elapsedMs = now - bucket.lastRefill;

    // Refill tokens based on elapsed time
    const tokensToAdd = (elapsedMs / 60000) * config.tokensPerMinute;
    bucket.tokens = Math.min(config.burstSize, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return { allowed: true, remaining: Math.floor(bucket.tokens) };
    }

    return { allowed: false, remaining: 0 };
  }

  /**
   * Get time until next token is available (in ms)
   */
  getTimeUntilNextToken(tier: SonarTier): number {
    const bucket = this.buckets.get(tier);
    if (!bucket) return 0;

    const config = RATE_LIMIT_CONFIG[tier];
    const msPerToken = 60000 / config.tokensPerMinute;

    return Math.ceil(msPerToken);
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter();

// ============================================================================
// Metrics Tracking
// ============================================================================

class MetricsCollector {
  private metrics: SonarMetrics = {
    callsTotal: 0,
    callsByTier: { sonar: 0, 'sonar-pro': 0 },
    callsByMode: { low: 0, medium: 0, high: 0 },
    errorsTotal: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageLatencyMs: 0,
  };

  private latencies: number[] = [];

  recordCall(tier: SonarTier, mode: SonarMode, latencyMs: number): void {
    this.metrics.callsTotal++;
    this.metrics.callsByTier[tier]++;
    this.metrics.callsByMode[mode]++;

    this.latencies.push(latencyMs);
    // Keep last 100 latencies for rolling average
    if (this.latencies.length > 100) {
      this.latencies.shift();
    }

    this.metrics.averageLatencyMs =
      this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length;
  }

  recordError(): void {
    this.metrics.errorsTotal++;
  }

  recordCacheHit(): void {
    this.metrics.cacheHits++;
  }

  recordCacheMiss(): void {
    this.metrics.cacheMisses++;
  }

  getMetrics(): SonarMetrics {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      callsTotal: 0,
      callsByTier: { sonar: 0, 'sonar-pro': 0 },
      callsByMode: { low: 0, medium: 0, high: 0 },
      errorsTotal: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageLatencyMs: 0,
    };
    this.latencies = [];
  }
}

// Global metrics collector
const metricsCollector = new MetricsCollector();

// ============================================================================
// HTTP Client
// ============================================================================

/**
 * Make a single request to Sonar API
 */
async function makeSonarRequest(
  prompt: string,
  options: SonarRequestOptions
): Promise<SonarApiResponse> {
  const configValidation = validateConfig();
  if (!configValidation.valid) {
    throw new SonarError(
      configValidation.error || 'Invalid configuration',
      'API_ERROR',
      undefined,
      false
    );
  }

  const model = getModelForTier(options.tier);
  const searchContext = getSearchContextForMode(options.mode);
  const timeout = getTimeout(options.timeoutMs);

  const requestBody: { [key: string]: unknown } = {
    model,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    search_context: searchContext,
  };

  // Perplexity API no longer accepts response_format: { type: 'json_object' }.
  // We rely on the prompt to request JSON output instead.


  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${SONAR_API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SONAR_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      const isRetryable = DEFAULT_RETRY_CONFIG.retryableStatusCodes.includes(response.status);

      throw new SonarError(
        `Sonar API error: ${response.status} - ${errorText}`,
        response.status === 429 ? 'RATE_LIMIT' : 'API_ERROR',
        response.status,
        isRetryable
      );
    }

    const data: SonarApiResponse = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof SonarError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new SonarError(
          'Request timed out',
          'TIMEOUT',
          undefined,
          true
        );
      }

      throw new SonarError(
        `Network error: ${error.message}`,
        'NETWORK_ERROR',
        undefined,
        true
      );
    }

    throw new SonarError(
      'Unknown error occurred',
      'API_ERROR',
      undefined,
      false
    );
  }
}

// ============================================================================
// Main Client Function
// ============================================================================

/**
 * Call Sonar API with retries, timeout, and rate limiting
 *
 * @param prompt - The prompt to send to Sonar
 * @param options - Configuration options for the request
 * @returns The response content as string
 * @throws SonarError if the request fails after all retries
 */
export async function callSonar(
  prompt: string,
  options: SonarRequestOptions
): Promise<string> {
  // Start Opik trace
  const trace = opik.startTrace({
    name: 'callSonar',
    input: {
      prompt: prompt.slice(0, 1000), // Limit input size
      tier: options.tier,
      mode: options.mode,
      jsonMode: options.jsonMode,
    },
    tags: ['trading', options.tier, options.mode],
  });

  // Check rate limit
  const rateLimitCheck = rateLimiter.consume(options.tier);
  if (!rateLimitCheck.allowed) {
    const waitMs = rateLimiter.getTimeUntilNextToken(options.tier);
    const error = new SonarError(
      `Rate limit exceeded. Try again in ${Math.ceil(waitMs / 1000)}s`,
      'RATE_LIMIT',
      429,
      true
    );
    
    opik.endTrace(trace?.id || null, {
      error: `${error.code}: ${error.message}`,
      metadata: { rateLimited: true, waitMs, exceptionType: error.code },
    });
    
    throw error;
  }

  const startTime = Date.now();
  let lastError: SonarError | null = null;

  // Retry loop
  for (let attempt = 0; attempt <= DEFAULT_RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const response = await makeSonarRequest(prompt, options);
      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new SonarError(
          'Empty response from Sonar API',
          'API_ERROR',
          undefined,
          false
        );
      }

      const latencyMs = Date.now() - startTime;
      metricsCollector.recordCall(options.tier, options.mode, latencyMs);

      logger.debug(
        `[Sonar] Request succeeded - tier: ${options.tier}, mode: ${options.mode}, latency: ${latencyMs}ms`
      );

      opik.endTrace(trace?.id || null, {
        output: {
          content: content.slice(0, 1000), // Limit output size
          model: response.model,
          usage: response.usage,
        },
        metadata: {
          latencyMs,
          tier: options.tier,
          mode: options.mode,
          attempts: attempt + 1,
        },
      });

      return content;
    } catch (error) {
      if (error instanceof SonarError) {
        lastError = error;

        // Don't retry non-retryable errors
        if (!error.retryable || attempt === DEFAULT_RETRY_CONFIG.maxRetries) {
          break;
        }

        // Calculate backoff delay
        const delay = calculateBackoff(attempt);
        logger.warn(
          `[Sonar] Request failed (attempt ${attempt + 1}/${DEFAULT_RETRY_CONFIG.maxRetries + 1}), retrying in ${delay}ms: ${error.message}`
        );

        await _delayFn(delay);
      } else {
        // Unexpected error type
        lastError = new SonarError(
          String(error),
          'API_ERROR',
          undefined,
          false
        );
        break;
      }
    }
  }

  // All retries exhausted
  metricsCollector.recordError();

  // Log error without exposing full prompt (might contain sensitive info)
  logger.error(
    `[Sonar] Request failed after ${DEFAULT_RETRY_CONFIG.maxRetries + 1} attempts. ` +
      `Error: ${lastError?.message}, Code: ${lastError?.code}, ` +
      `Tier: ${options.tier}, Mode: ${options.mode}`
  );

  opik.endTrace(trace?.id || null, {
    error: lastError 
      ? `${lastError.code}: ${lastError.message}`
      : 'API_ERROR: Unknown error after retries',
    metadata: {
      errorCode: lastError?.code,
      attempts: DEFAULT_RETRY_CONFIG.maxRetries + 1,
      tier: options.tier,
      mode: options.mode,
    },
  });

  throw (
    lastError ||
    new SonarError(
      'Unknown error after retries',
      'API_ERROR',
      undefined,
      false
    )
  );
}

// ============================================================================
// Metrics and Health Exports
// ============================================================================

/**
 * Get current metrics for Sonar API usage
 */
export function getSonarMetrics(): SonarMetrics {
  return metricsCollector.getMetrics();
}

/**
 * Reset metrics (useful for testing)
 */
export function resetSonarMetrics(): void {
  metricsCollector.reset();
}

/**
 * Check if Sonar API is configured and healthy
 */
export async function checkSonarHealth(): Promise<{
  healthy: boolean;
  error?: string;
}> {
  const configValidation = validateConfig();
  if (!configValidation.valid) {
    return { healthy: false, error: configValidation.error };
  }

  return { healthy: true };
}
