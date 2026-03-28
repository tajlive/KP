/**
 * Sonar Metrics
 * Observability for Sonar AI integration
 */

import { logger } from '@/lib/logger';

// ============================================================================
// Types
// ============================================================================

export interface SonarApiMetrics {
  endpoint: string;
  method: 'GET' | 'POST';
  durationMs: number;
  statusCode: number;
  error?: string;
}

export interface SonarExplanationMetrics {
  symbol: string;
  decision: string;
  durationMs: number;
  success: boolean;
  cached: boolean;
  error?: string;
}

export interface SonarSignalMetrics {
  symbol: string;
  strategy: string;
  durationMs: number;
  hasNarrative: boolean;
  hasRegime: boolean;
  usedFallback: boolean;
  score: number;
  error?: string;
}

// ============================================================================
// In-memory metrics store (for development/debugging)
// ============================================================================

interface MetricsSnapshot {
  explanationCalls: number;
  explanationErrors: number;
  signalCalls: number;
  signalErrors: number;
  apiCalls: Record<string, number>;
  averageExplanationLatency: number;
  averageSignalLatency: number;
}

let metricsStore: {
  explanationCalls: number;
  explanationErrors: number;
  signalCalls: number;
  signalErrors: number;
  apiCalls: Map<string, number>;
  explanationLatencies: number[];
  signalLatencies: number[];
} = {
  explanationCalls: 0,
  explanationErrors: 0,
  signalCalls: 0,
  signalErrors: 0,
  apiCalls: new Map(),
  explanationLatencies: [],
  signalLatencies: [],
};

// ============================================================================
// Logging functions
// ============================================================================

/**
 * Log API call metrics
 * Logs metadata only - never logs PII or full prompts
 */
export function logSonarApiCall(metrics: SonarApiMetrics): void {
  const { endpoint, method, durationMs, statusCode, error } = metrics;

  // Track in memory
  const key = `${method} ${endpoint}`;
  const current = metricsStore.apiCalls.get(key) || 0;
  metricsStore.apiCalls.set(key, current + 1);

  // Log to console/logger
  if (error) {
    logger.warn(`[SonarMetrics] API error: ${method} ${endpoint} - ${error}`, {
      durationMs,
      statusCode,
    });
  } else {
    logger.debug(`[SonarMetrics] API call: ${method} ${endpoint}`, {
      durationMs,
      statusCode,
    });
  }
}

/**
 * Log signal generation metrics
 */
export function logSignalGeneration(metrics: SonarSignalMetrics): void {
  const {
    symbol,
    strategy,
    durationMs,
    hasNarrative,
    hasRegime,
    usedFallback,
    score,
    error,
  } = metrics;

  // Track in memory
  metricsStore.signalCalls++;
  metricsStore.signalLatencies.push(durationMs);
  
  // Keep only last 100 latencies
  if (metricsStore.signalLatencies.length > 100) {
    metricsStore.signalLatencies.shift();
  }

  if (error) {
    metricsStore.signalErrors++;
    logger.warn(
      `[SonarMetrics] Signal generation failed: ${symbol} (${strategy})`,
      {
        durationMs,
        error,
      }
    );
  } else {
    logger.info(
      `[SonarMetrics] Signal generated: ${symbol} (${strategy}) - score: ${score}`,
      {
        durationMs,
        hasNarrative,
        hasRegime,
        usedFallback,
      }
    );
  }
}

/**
 * Log explanation generation metrics
 */
export function logExplanationGeneration(metrics: SonarExplanationMetrics): void {
  const { symbol, decision, durationMs, success, cached, error } = metrics;

  // Track in memory
  metricsStore.explanationCalls++;
  metricsStore.explanationLatencies.push(durationMs);
  
  // Keep only last 100 latencies
  if (metricsStore.explanationLatencies.length > 100) {
    metricsStore.explanationLatencies.shift();
  }

  if (!success) {
    metricsStore.explanationErrors++;
    logger.warn(
      `[SonarMetrics] Explanation failed: ${symbol} (${decision})`,
      {
        durationMs,
        error,
      }
    );
  } else {
    logger.info(
      `[SonarMetrics] Explanation generated: ${symbol} (${decision})`,
      {
        durationMs,
        cached,
      }
    );
  }
}

// ============================================================================
// Metrics retrieval
// ============================================================================

/**
 * Get current metrics snapshot
 */
export function getSonarMetricsSnapshot(): MetricsSnapshot {
  const avgExplanationLatency =
    metricsStore.explanationLatencies.length > 0
      ? metricsStore.explanationLatencies.reduce((a, b) => a + b, 0) /
        metricsStore.explanationLatencies.length
      : 0;

  const avgSignalLatency =
    metricsStore.signalLatencies.length > 0
      ? metricsStore.signalLatencies.reduce((a, b) => a + b, 0) /
        metricsStore.signalLatencies.length
      : 0;

  return {
    explanationCalls: metricsStore.explanationCalls,
    explanationErrors: metricsStore.explanationErrors,
    signalCalls: metricsStore.signalCalls,
    signalErrors: metricsStore.signalErrors,
    apiCalls: Object.fromEntries(metricsStore.apiCalls),
    averageExplanationLatency: Math.round(avgExplanationLatency),
    averageSignalLatency: Math.round(avgSignalLatency),
  };
}

/**
 * Reset metrics (useful for testing)
 */
export function resetSonarMetrics(): void {
  metricsStore = {
    explanationCalls: 0,
    explanationErrors: 0,
    signalCalls: 0,
    signalErrors: 0,
    apiCalls: new Map(),
    explanationLatencies: [],
    signalLatencies: [],
  };
}

/**
 * Calculate error rates
 */
export function getSonarErrorRates(): {
  explanationErrorRate: number;
  signalErrorRate: number;
} {
  const explanationErrorRate =
    metricsStore.explanationCalls > 0
      ? metricsStore.explanationErrors / metricsStore.explanationCalls
      : 0;

  const signalErrorRate =
    metricsStore.signalCalls > 0
      ? metricsStore.signalErrors / metricsStore.signalCalls
      : 0;

  return {
    explanationErrorRate,
    signalErrorRate,
  };
}
