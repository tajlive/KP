/**
 * Refresh Guard - Prevents refresh-token storms and gotrue lock races
 *
 * Intercepts Supabase `grant_type=refresh_token` requests and applies:
 * 1. Per-key mutex: only one refresh call runs at a time per process/session.
 * 2. Result caching: waiting callers receive the SAME response (cloned)
 *    instead of retrying with the stale refresh token.
 * 3. Circuit breaker: after 3 failures (429/400), blocks further refresh
 *    attempts for 30s to stop spam.
 * 4. Sentry logging: every failure is logged with context.
 *
 * Usage: inject via `global.fetch` in Supabase client config.
 */

import { logAuthError, AuthErrorCode } from "./sentry-auth";

type CachedRefreshResult =
  | { ok: true; status: number; body: string }
  | { ok: false; status: number; body: string };

type RefreshLockState = {
  locked: boolean;
  promise: Promise<unknown> | null;
  lastResult: CachedRefreshResult | null;
  lastFailureAt: number;
  failureCount: number;
};

const refreshLocks = new Map<string, RefreshLockState>();

const CIRCUIT_BREAKER_COOLDOWN_MS = 30_000;
const MAX_FAILURES_BEFORE_COOLDOWN = 3;
const LOCK_TIMEOUT_MS = 10_000;

function getLockState(key: string): RefreshLockState {
  if (!refreshLocks.has(key)) {
    refreshLocks.set(key, {
      locked: false,
      promise: null,
      lastResult: null,
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

function makeSyntheticResponse(result: CachedRefreshResult): Response {
  return new Response(result.body, {
    status: result.status,
    headers: { "content-type": "application/json" },
  });
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

    // If there is a cached result from a very recent refresh, return it immediately.
    // This prevents racing tabs from re-using an already-consumed refresh token.
    if (state.lastResult) {
      return makeSyntheticResponse(state.lastResult);
    }

    // Mutex: if another refresh is in flight, wait for it and then return its result.
    if (state.locked && state.promise) {
      const race = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error("Refresh lock timeout")), LOCK_TIMEOUT_MS);
      });
      try {
        await Promise.race([state.promise, race]);
      } catch {
        // timeout or failure — continue below to attempt our own refresh
      }
      if (state.lastResult) {
        return makeSyntheticResponse(state.lastResult);
      }
      // If no result was cached (e.g. lock timed out without resolution),
      // fall through and attempt the refresh ourselves.
    }

    // Acquire lock
    state.locked = true;
    state.lastResult = null;

    const promise = baseFetch(input, init)
      .then(async (res) => {
        const body = await res.text();
        const isError = res.status === 429 || res.status === 400;

        if (isError) {
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
          state.lastResult = { ok: false, status: res.status, body };
        } else if (res.ok) {
          // Reset on any success (even 2xx that isn't 200)
          state.failureCount = 0;
          state.lastResult = { ok: true, status: res.status, body };
        }
        return makeSyntheticResponse(state.lastResult!);
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
        const body = JSON.stringify({ message: err.message, error: "refresh_failed" });
        state.lastResult = { ok: false, status: 0, body };
        return makeSyntheticResponse(state.lastResult);
      })
      .finally(() => {
        state.locked = false;
        // Keep lastResult around briefly so racing callers can consume it,
        // but clear it after a short delay to avoid stale reuse.
        setTimeout(() => {
          if (state.lastResult) {
            state.lastResult = null;
          }
        }, 2000);
      });

    state.promise = promise;
    return promise;
  };
}
