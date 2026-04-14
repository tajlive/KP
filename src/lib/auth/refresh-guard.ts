/**
 * Refresh Guard - Prevents refresh-token storms and gotrue lock races
 *
 * Intercepts Supabase `grant_type=refresh_token` requests and applies:
 * 1. Per-key mutex: only one refresh call runs at a time per process/session.
 * 2. Circuit breaker: after 3 failures (429/400), blocks further refresh
 *    attempts for 30s to stop spam.
 * 3. Sentry logging: every failure is logged with context.
 *
 * Usage: inject via `global.fetch` in Supabase client config.
 */

import { logAuthError, AuthErrorCode } from "./sentry-auth";

type RefreshLockState = {
  locked: boolean;
  promise: Promise<unknown> | null;
  lastFailureAt: number;
  failureCount: number;
};

const refreshLocks = new Map<string, RefreshLockState>();

const CIRCUIT_BREAKER_COOLDOWN_MS = 30_000;
const MAX_FAILURES_BEFORE_COOLDOWN = 3;

function getLockState(key: string): RefreshLockState {
  if (!refreshLocks.has(key)) {
    refreshLocks.set(key, {
      locked: false,
      promise: null,
      lastFailureAt: 0,
      failureCount: 0,
    });
  }
  return refreshLocks.get(key)!;
}

export function isRefreshCircuitOpen(key: string): boolean {
  const state = getLockState(key);
  if (state.failureCount >= MAX_FAILURES_BEFORE_COOLDOWN) {
    const elapsed = Date.now() - state.lastFailureAt;
    if (elapsed < CIRCUIT_BREAKER_COOLDOWN_MS) {
      return true;
    }
    // Cooldown expired — reset counter
    state.failureCount = 0;
  }
  return false;
}

export function resetRefreshCircuitBreaker(key?: string): void {
  if (key) {
    refreshLocks.delete(key);
  } else {
    refreshLocks.clear();
  }
}

export interface RefreshGuardContext {
  userId?: string;
  path?: string;
  source: "browser" | "server" | "middleware" | "edge";
}

/**
 * Wraps `fetch` so that Supabase refresh-token requests are mutex-locked
 * and circuit-broken. Safe for browser, Node.js server, and Edge runtimes.
 */
export function createRefreshProtectedFetch(
  baseFetch: typeof fetch,
  context: RefreshGuardContext,
): typeof fetch {
  return async (input, init) => {
    const url = String(input);
    const isRefresh = url.includes("grant_type=refresh_token");

    if (!isRefresh) {
      return baseFetch(input, init);
    }

    const key = context.userId || `${context.source}:${context.path || "unknown"}`;
    const state = getLockState(key);

    // Circuit breaker: synthesise 429 so callers fail fast
    if (isRefreshCircuitOpen(key)) {
      logAuthError(
        AuthErrorCode.REFRESH_TOKEN_FAILED,
        new Error("Refresh circuit breaker open"),
        {
          userId: context.userId,
          path: context.path,
          source: context.source,
          attemptCount: state.failureCount,
          status: 429,
        },
      );
      return new Response(
        JSON.stringify({
          message: "Refresh rate limited by client circuit breaker",
          error: "refresh_rate_limited",
        }),
        {
          status: 429,
          headers: { "content-type": "application/json" },
        },
      );
    }

    // Mutex: if another refresh is in flight, wait for it then retry.
    // By re-trying with baseFetch, the updated cookies/storage will be used,
    // so the second call usually does not need refresh at all.
    if (state.locked && state.promise) {
      try {
        await state.promise;
      } catch {
        // ignore — we will retry below
      }
      return baseFetch(input, init);
    }

    // Acquire lock
    state.locked = true;
    const promise = baseFetch(input, init)
      .then((res) => {
        if (res.status === 429 || res.status === 400) {
          state.failureCount++;
          state.lastFailureAt = Date.now();
          logAuthError(
            AuthErrorCode.REFRESH_TOKEN_FAILED,
            new Error(`Refresh token request failed with status ${res.status}`),
            {
              userId: context.userId,
              path: context.path,
              source: context.source,
              attemptCount: state.failureCount,
              status: res.status,
            },
          );
        } else if (res.ok) {
          // Reset on any success (even 2xx that isn't 200)
          state.failureCount = 0;
        }
        return res;
      })
      .catch((err) => {
        state.failureCount++;
        state.lastFailureAt = Date.now();
        logAuthError(
          AuthErrorCode.REFRESH_TOKEN_FAILED,
          err,
          {
            userId: context.userId,
            path: context.path,
            source: context.source,
            attemptCount: state.failureCount,
            status: 0,
          },
        );
        throw err;
      })
      .finally(() => {
        state.locked = false;
      });

    state.promise = promise;
    return promise;
  };
}
