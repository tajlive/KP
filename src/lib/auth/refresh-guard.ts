/**
 * Refresh Guard - Prevents refresh-token storms and gotrue lock races
 *
 * Implements a cross-tab mutex using the Web Locks API (navigator.locks) if available,
 * falling back to a process-level mutex. This ensures only one refresh call
 * happens at a time across all instances of the application.
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
const CROSS_TAB_LOCK_NAME = "sb-auth-token-refresh-lock";

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
  [key: string]: unknown;
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

    const key = context.userId || `${context.source}:global`;
    const state = getLockState(key);

    // 1. Circuit breaker — return 400 (not 429) so Supabase gotrue-js
    // treats it as a permanent auth error and does NOT retry.
    if (isRefreshCircuitOpen(key)) {
      return new Response(
        JSON.stringify({
          error: "invalid_grant",
          error_description: "Refresh rate limited by client circuit breaker",
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        },
      );
    }

    // 2. Cross-tab synchronization via Web Locks API (Browser only)
    if (context.source === "browser" && typeof navigator !== "undefined" && navigator.locks) {
      return navigator.locks.request(CROSS_TAB_LOCK_NAME, { ifAvailable: false }, async () => {
        // Now that we have the lock, check if another instance already updated the session.
        // We can't easily check localStorage here without specific keys, but performing
        // the fetch within the lock ensures we are serialized.
        return performRefresh(baseFetch, input, init, state, context);
      });
    }

    // 3. Process-level mutex (Server/Fallback)
    if (state.locked && state.promise) {
      try {
        await Promise.race([
          state.promise,
          new Promise((_, r) => setTimeout(() => r(new Error("Timeout")), LOCK_TIMEOUT_MS)),
        ]);
      } catch {
        // ignore timeout/error, attempt own refresh
      }
      if (state.lastResult) {
        return makeSyntheticResponse(state.lastResult);
      }
    }

    return performRefresh(baseFetch, input, init, state, context);
  };
}

/**
 * Internal helper to actually execute the refresh call with locking logic
 */
async function performRefresh(
  baseFetch: typeof fetch,
  input: string | Request | URL,
  init: RequestInit | undefined,
  state: RefreshLockState,
  context: RefreshGuardContext,
): Promise<Response> {
  // If a result was just cached by a previous lock holder, use it.
  if (state.lastResult) {
    return makeSyntheticResponse(state.lastResult);
  }

  state.locked = true;
  state.lastResult = null;

  const promise = baseFetch(input, init)
    .then(async (res) => {
      const body = await res.text();
      const isError = res.status >= 400;

      if (isError) {
        state.failureCount++;
        state.lastFailureAt = Date.now();
        
        // Log errors but treat "Already Used" as a special case that potentially
        // doesn't need a heavy error report if suppressed via locks.
        if (!body.includes("Already Used")) {
          logAuthError(AuthErrorCode.REFRESH_TOKEN_FAILED, new Error(`Refresh status ${res.status}`), {
            ...context,
            attemptCount: state.failureCount,
            body: body.slice(0, 200),
          });
        }
        
        return { ok: false, status: res.status, body };
      }

      state.failureCount = 0;
      state.lastResult = { ok: true, status: res.status, body };
      return state.lastResult;
    })
    .catch((err) => {
      state.failureCount++;
      state.lastFailureAt = Date.now();
      logAuthError(AuthErrorCode.REFRESH_TOKEN_FAILED, err, context);
      return { ok: false, status: 503, body: JSON.stringify({ error: err.message }) };
    })
    .finally(() => {
      state.locked = false;
      // Clear cache after 2s to allow for late-arriving concurrent calls
      setTimeout(() => {
        state.lastResult = null;
      }, 2000);
    });

  state.promise = promise as Promise<CachedRefreshResult>;
  const result = await (promise as Promise<CachedRefreshResult>);
  return makeSyntheticResponse(result);
}
