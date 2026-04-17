/**
 * Refresh Guard Tests
 *
 * Verifies mutex + circuit breaker behaviour for Supabase refresh-token requests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createRefreshProtectedFetch,
  resetRefreshCircuitBreaker,
  isRefreshCircuitOpen,
} from "../refresh-guard";
import * as sentryAuth from "../sentry-auth";

// Spy on Sentry logging so tests stay offline
vi.mock("../sentry-auth", async () => {
  const actual = await vi.importActual<typeof import("../sentry-auth")>("../sentry-auth");
  return {
    ...actual,
    logAuthError: vi.fn(),
  };
});

describe("createRefreshProtectedFetch", () => {
  beforeEach(() => {
    resetRefreshCircuitBreaker();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("passes through non-refresh requests unchanged", async () => {
    const baseFetch = vi.fn().mockImplementation(async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );
    const guarded = createRefreshProtectedFetch(baseFetch, { source: "browser" });

    const res = await guarded("https://api.supabase.co/rest/v1/users", { method: "GET" });

    expect(baseFetch).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
  });

  it("serialises concurrent refresh requests so only one fetch executes", async () => {
    let fetchCount = 0;
    const baseFetch = vi.fn().mockImplementation(async () => {
      fetchCount++;
      await new Promise((r) => setTimeout(r, 50));
      return new Response(JSON.stringify({ access_token: "new_token" }), { status: 200 });
    });

    const guarded = createRefreshProtectedFetch(baseFetch, { source: "browser" });
    const url = "https://api.supabase.co/auth/v1/token?grant_type=refresh_token";

    const [r1, r2, r3] = await Promise.all([
      guarded(url, { method: "POST" }),
      guarded(url, { method: "POST" }),
      guarded(url, { method: "POST" }),
    ]);

    // Only one network call executes; the other callers receive the cached result.
    expect(fetchCount).toBe(1);
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r3.status).toBe(200);
  });

  it("opens circuit breaker after 3 failures and returns synthetic 429", async () => {
    const baseFetch = vi.fn().mockImplementation(async () =>
      new Response(JSON.stringify({ error: "too_many_requests" }), { status: 429 })
    );
    const guarded = createRefreshProtectedFetch(baseFetch, { source: "server" });
    const url = "https://api.supabase.co/auth/v1/token?grant_type=refresh_token";

    // 3 actual failures
    await guarded(url, { method: "POST" });
    await guarded(url, { method: "POST" });
    await guarded(url, { method: "POST" });

    expect(baseFetch).toHaveBeenCalledTimes(3);
    expect(isRefreshCircuitOpen("server:global")).toBe(true);

    // 4th call should be short-circuited
    const res = await guarded(url, { method: "POST" });
    expect(baseFetch).toHaveBeenCalledTimes(3); // no new fetch
    expect(res.status).toBe(429);
    expect(sentryAuth.logAuthError).toHaveBeenCalled();
  });

  it("resets circuit breaker after cooldown expires", async () => {
    vi.useFakeTimers();
    const baseFetch = vi.fn().mockImplementation(async () =>
      new Response(JSON.stringify({ error: "bad_request" }), { status: 400 })
    );
    const guarded = createRefreshProtectedFetch(baseFetch, { source: "server" });
    const url = "https://api.supabase.co/auth/v1/token?grant_type=refresh_token";

    await guarded(url, { method: "POST" });
    await guarded(url, { method: "POST" });
    await guarded(url, { method: "POST" });

    expect(isRefreshCircuitOpen("server:global")).toBe(true);

    // Advance past cooldown
    vi.advanceTimersByTime(31_000);

    expect(isRefreshCircuitOpen("server:global")).toBe(false);

    // Next call should hit the network again
    const res = await guarded(url, { method: "POST" });
    expect(baseFetch).toHaveBeenCalledTimes(4);
    expect(res.status).toBe(400);
  });

  it("retries successfully after a queued refresh finishes", async () => {
    let fetchCount = 0;
    const baseFetch = vi.fn().mockImplementation(async () => {
      fetchCount++;
      await new Promise((r) => setTimeout(r, 30));
      return new Response(JSON.stringify({ access_token: "token" }), { status: 200 });
    });

    const guarded = createRefreshProtectedFetch(baseFetch, { source: "browser" });
    const url = "https://api.supabase.co/auth/v1/token?grant_type=refresh_token";

    // Start two parallel calls
    const p1 = guarded(url, { method: "POST" });
    const p2 = guarded(url, { method: "POST" });

    const [r1, r2] = await Promise.all([p1, p2]);

    // Only one network call; the queued caller receives the cached success result.
    expect(fetchCount).toBe(1);
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
  });

  it("tracks failures per user key when userId is provided", async () => {
    const baseFetch = vi.fn().mockImplementation(async () =>
      new Response(JSON.stringify({ error: "too_many_requests" }), { status: 429 })
    );

    const guardedA = createRefreshProtectedFetch(baseFetch, {
      source: "server",
      userId: "user-a",
    });
    const guardedB = createRefreshProtectedFetch(baseFetch, {
      source: "server",
      userId: "user-b",
    });
    const url = "https://api.supabase.co/auth/v1/token?grant_type=refresh_token";

    // 3 failures for user-a
    await guardedA(url, { method: "POST" });
    await guardedA(url, { method: "POST" });
    await guardedA(url, { method: "POST" });

    expect(isRefreshCircuitOpen("user-a")).toBe(true);
    expect(isRefreshCircuitOpen("user-b")).toBe(false);

    // user-b can still refresh (only 1 failure so far, circuit not open yet)
    expect(isRefreshCircuitOpen("user-b")).toBe(false);
    const resB = await guardedB(url, { method: "POST" });
    expect(resB.status).toBe(429); // mock returns 429
  });
});
