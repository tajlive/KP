/**
 * Circuit Breaker – Fault Tolerance for External APIs
 * 
 * Prevents cascading failures when external APIs are down or slow.
 * States: CLOSED (normal) -> OPEN (failing) -> HALF_OPEN (testing)
 * 
 * @module trading
 * @version 1.0.0
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  /** Number of failures before opening circuit (default: 5) */
  failureThreshold: number;
  /** Time in ms before attempting reset (default: 30000) */
  resetTimeoutMs: number;
  /** Number of successes in HALF_OPEN needed to close (default: 3) */
  successThreshold: number;
  /** Timeout for individual requests in ms (default: 10000) */
  requestTimeoutMs: number;
  /** Name for logging/monitoring */
  name: string;
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  failures: number;
  successes: number;
  consecutiveSuccesses: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  totalRequests: number;
  rejectedRequests: number;
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetTimeoutMs: 30000, // 30 seconds
  successThreshold: 3,
  requestTimeoutMs: 10000, // 10 seconds
  name: 'circuit-breaker',
};

/**
 * Circuit Breaker implementation for resilient API calls
 */
export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private consecutiveSuccesses = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private totalRequests = 0;
  private rejectedRequests = 0;
  private nextAttempt?: Date;
  private options: CircuitBreakerOptions;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if we should reject immediately (circuit is OPEN)
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.transitionTo('HALF_OPEN');
      } else {
        this.rejectedRequests++;
        throw new CircuitBreakerOpenError(
          `Circuit breaker is OPEN for ${this.options.name}. ` +
          `Next attempt after ${this.nextAttempt?.toISOString()}`
        );
      }
    }

    // Execute with timeout
    try {
      const result = await this.executeWithTimeout(fn);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Get current metrics for monitoring
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      consecutiveSuccesses: this.consecutiveSuccesses,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      rejectedRequests: this.rejectedRequests,
    };
  }

  /**
   * Force circuit to specific state (for manual recovery)
   */
  forceState(state: CircuitState): void {
    this.transitionTo(state);
  }

  /**
   * Reset circuit to CLOSED (for testing or after manual fix)
   */
  reset(): void {
    this.transitionTo('CLOSED');
    this.failures = 0;
    this.consecutiveSuccesses = 0;
    this.nextAttempt = undefined;
  }

  /**
   * Check if circuit is currently allowing requests
   */
  isClosed(): boolean {
    return this.state === 'CLOSED' || (this.state === 'OPEN' && this.shouldAttemptReset());
  }

  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new CircuitBreakerTimeoutError(
          `Request timed out after ${this.options.requestTimeoutMs}ms`
        ));
      }, this.options.requestTimeoutMs);

      fn()
        .then((result) => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  private onSuccess(): void {
    this.successes++;
    this.lastSuccessTime = new Date();

    if (this.state === 'HALF_OPEN') {
      this.consecutiveSuccesses++;
      if (this.consecutiveSuccesses >= this.options.successThreshold) {
        this.transitionTo('CLOSED');
      }
    } else {
      this.consecutiveSuccesses++;
    }

    // Reset failures on success (in CLOSED state)
    if (this.state === 'CLOSED') {
      this.failures = 0;
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = new Date();
    this.consecutiveSuccesses = 0;

    if (this.state === 'HALF_OPEN') {
      // Failed in HALF_OPEN, go back to OPEN
      this.transitionTo('OPEN');
    } else if (this.state === 'CLOSED' && this.failures >= this.options.failureThreshold) {
      // Too many failures, open circuit
      this.transitionTo('OPEN');
    }
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;

    if (newState === 'OPEN') {
      this.nextAttempt = new Date(Date.now() + this.options.resetTimeoutMs);
      this.consecutiveSuccesses = 0;
      console.warn(`[CircuitBreaker:${this.options.name}] OPENED (failures: ${this.failures})`);
    } else if (newState === 'HALF_OPEN') {
      this.consecutiveSuccesses = 0;
    } else if (newState === 'CLOSED') {
      this.failures = 0;
      this.consecutiveSuccesses = 0;
      this.nextAttempt = undefined;
    }

    // Log state transition for monitoring
    if (oldState !== newState) {
      this.logStateTransition(oldState, newState);
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.nextAttempt) return true;
    return Date.now() >= this.nextAttempt.getTime();
  }

  private logStateTransition(from: CircuitState, to: CircuitState): void {
    // Could emit to monitoring system, Sentry, etc.
  }
}

/**
 * Error thrown when circuit breaker is OPEN
 */
export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

/**
 * Error thrown when request times out
 */
export class CircuitBreakerTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerTimeoutError';
  }
}

// =============================================================================
// Pre-configured Circuit Breakers
// =============================================================================

/**
 * Circuit breaker for Binance API
 * Tuned for trading: faster failure detection, shorter reset
 */
export const binanceCircuitBreaker = new CircuitBreaker({
  name: 'binance-api',
  failureThreshold: 3,        // Open after 3 failures
  resetTimeoutMs: 15000,      // Try again after 15 seconds
  successThreshold: 2,        // Need 2 successes to close
  requestTimeoutMs: 8000,     // 8 second timeout for trading
});

/**
 * Circuit breaker for price feeds
 * More lenient: prices can tolerate occasional failures
 */
export const priceFeedCircuitBreaker = new CircuitBreaker({
  name: 'price-feed',
  failureThreshold: 5,
  resetTimeoutMs: 30000,
  successThreshold: 3,
  requestTimeoutMs: 5000,     // 5 second timeout for prices
});

/**
 * Circuit breaker for general external APIs
 */
export const generalApiCircuitBreaker = new CircuitBreaker({
  name: 'general-api',
  failureThreshold: 5,
  resetTimeoutMs: 60000,      // 1 minute reset
  successThreshold: 3,
  requestTimeoutMs: 10000,
});

// =============================================================================
// Decorator/Wrapper Helpers
// =============================================================================

/**
 * Wrap an async function with circuit breaker
 */
export function withCircuitBreaker<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  breaker: CircuitBreaker
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return breaker.execute(() => fn(...args)) as Promise<ReturnType<T>>;
  };
}

/**
 * Get health status of all circuit breakers
 */
export function getAllCircuitBreakerMetrics(): Record<string, CircuitBreakerMetrics> {
  return {
    binance: binanceCircuitBreaker.getMetrics(),
    priceFeed: priceFeedCircuitBreaker.getMetrics(),
    general: generalApiCircuitBreaker.getMetrics(),
  };
}

/**
 * Reset all circuit breakers (use with caution)
 */
export function resetAllCircuitBreakers(): void {
  binanceCircuitBreaker.reset();
  priceFeedCircuitBreaker.reset();
  generalApiCircuitBreaker.reset();
}
