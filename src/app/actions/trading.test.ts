import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { startTrading, startPaperTrading } from "./trading";

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(),
}));

import { createServerClient } from "@/lib/supabase/server";

type MockUser = { id: string; email?: string };

function createMockSupabase(overrides: {
  user?: MockUser | null;
  profile?: { tier: string } | null;
  krakenKeys?: { id: string } | null;
  activeCount?: number | null;
  existingSession?: { id: string } | null;
  insertedSession?: { id: string } | null;
} = {}) {
  const {
    user = { id: "user-1" },
    profile = { tier: "student" },
    krakenKeys = null,
    activeCount = 0,
    existingSession = null,
    insertedSession = { id: "session-1" },
  } = overrides;

  const mockFrom = vi.fn((table: string) => {
    // Generic chain builder
    const chain: Record<string, unknown> = {
      select: vi.fn((columns: string) => {
        if (table === "user_profiles" && columns === "tier") {
          return {
            eq: vi.fn(() => ({
              maybeSingle: async () => ({ data: profile, error: null }),
              single: async () => ({ data: profile, error: null }),
            })),
          };
        }
        // Nye tabeller spurt av ExecutorFactory.canTradeLive — tomme som default
        if (table === "user_kraken_keys") {
          const emptyRow = async () => ({ data: krakenKeys, error: null });
          const limiter = { maybeSingle: emptyRow };
          const withIs = { ...limiter, limit: vi.fn(() => limiter) };
          const withEq = {
            eq: vi.fn(() => withEq),
            is: vi.fn(() => withIs),
            limit: vi.fn(() => limiter),
            maybeSingle: emptyRow,
          };
          return withEq;
        }
        if (table === "user_okx_keys") {
          const emptyRow = async () => ({ data: null, error: null });
          const limiter = { maybeSingle: emptyRow };
          const withIs = { ...limiter, limit: vi.fn(() => limiter) };
          const withEq = {
            eq: vi.fn(() => withEq),
            is: vi.fn(() => withIs),
            limit: vi.fn(() => limiter),
            maybeSingle: emptyRow,
          };
          return withEq;
        }
        if (table === "trading_sessions" && columns === "*") {
          return {
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: async () => ({ data: existingSession, error: null }),
                })),
              })),
            })),
          };
        }
        if (table === "trading_sessions" && columns === "id") {
          return {
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    maybeSingle: async () => ({ data: existingSession, error: null }),
                  })),
                })),
              })),
            })),
          };
        }
        return chain;
      }),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: async () => ({ data: insertedSession, error: null }),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: async () => ({ data: insertedSession, error: null }),
          })),
        })),
      })),
      upsert: vi.fn(() => ({ error: null })),
    };

    // Override count query when count option is used
    const originalSelect = chain.select as ReturnType<typeof vi.fn>;
    chain.select = vi.fn((columns: string, opts?: { count?: string; head?: boolean }) => {
      if (table === "trading_sessions" && opts?.count === "exact" && opts?.head) {
        return {
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                error: null,
                count: activeCount,
              })),
            })),
          })),
        };
      }
      return originalSelect(columns);
    });

    return chain;
  });

  return {
    auth: {
      getUser: async () => ({ data: { user }, error: null }),
    },
    from: mockFrom,
    rpc: vi.fn(),
  };
}

describe("startTrading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns VALIDATION_FAILED when mode is missing", async () => {
    vi.mocked(createServerClient).mockResolvedValue(
      createMockSupabase({ user: { id: "user-1" } }) as never
    );

    const result = await startTrading({
      strategy: "dca",
      risk_level: "low",
      pairs: ["BTCUSDT"],
      // @ts-expect-error intentionally omitting required mode field
      mode: undefined,
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("VALIDATION_FAILED");
  });

  it("returns UNAUTHORIZED when there is no user", async () => {
    vi.mocked(createServerClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null }, error: new Error("no session") }) },
      from: vi.fn(),
      rpc: vi.fn(),
    } as never);

    const result = await startTrading({
      mode: "paper",
      strategy: "dca",
      risk_level: "low",
      pairs: ["BTCUSDT"],
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("UNAUTHORIZED");
  });

  it("starts a paper bot successfully", async () => {
    vi.mocked(createServerClient).mockResolvedValue(
      createMockSupabase({
        user: { id: "user-1" },
        profile: { tier: "student" },
        activeCount: 0,
        existingSession: null,
        insertedSession: { id: "paper-session-1" },
      }) as never
    );

    const result = await startTrading({
      mode: "paper",
      strategy: "dca",
      risk_level: "low",
      pairs: ["BTCUSDT"],
      starting_capital_nok: 100000,
    });

    expect(result.ok).toBe(true);
    expect(result.code).toBe("PAPER_BOT_STARTED");
    expect(result.session_id).toBe("paper-session-1");
  });

  it("returns LIVE_NOT_ALLOWED for student tier", async () => {
    vi.mocked(createServerClient).mockResolvedValue(
      createMockSupabase({
        user: { id: "user-1" },
        profile: { tier: "student" },
      }) as never
    );

    const result = await startTrading({
      mode: "live",
      strategy: "dca",
      risk_level: "low",
      pairs: ["BTCUSDT"],
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("LIVE_NOT_ALLOWED");
  });

  it("returns KRAKEN_NOT_CONNECTED for bachelor tier without Kraken keys", async () => {
    vi.mocked(createServerClient).mockResolvedValue(
      createMockSupabase({
        user: { id: "user-1" },
        profile: { tier: "bachelor" },
        krakenKeys: null,
      }) as never
    );

    const result = await startTrading({
      mode: "live",
      strategy: "dca",
      risk_level: "low",
      pairs: ["BTCUSDT"],
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("KRAKEN_NOT_CONNECTED");
  });

  it("starts a live bot successfully for bachelor+ tier with Kraken keys", async () => {
    vi.mocked(createServerClient).mockResolvedValue(
      createMockSupabase({
        user: { id: "user-1" },
        profile: { tier: "bachelor" },
        krakenKeys: { id: "kraken-key-1" },
        activeCount: 0,
        existingSession: null,
        insertedSession: { id: "live-session-1" },
      }) as never
    );

    const result = await startTrading({
      mode: "live",
      strategy: "dca",
      risk_level: "low",
      pairs: ["BTCUSDT"],
      starting_capital_nok: 100000,
    });

    expect(result.ok).toBe(true);
    expect(result.code).toBe("LIVE_BOT_STARTED");
    expect(result.session_id).toBe("live-session-1");
  });

  it("backward-compatible startPaperTrading alias defaults to paper mode", async () => {
    vi.mocked(createServerClient).mockResolvedValue(
      createMockSupabase({
        user: { id: "user-1" },
        profile: { tier: "student" },
        activeCount: 0,
        existingSession: null,
        insertedSession: { id: "alias-session-1" },
      }) as never
    );

    const result = await startPaperTrading({
      strategy: "dca",
      risk_level: "low",
      pairs: ["BTCUSDT"],
      starting_capital_nok: 100000,
    });

    expect(result.ok).toBe(true);
    expect(result.code).toBe("PAPER_BOT_STARTED");
    expect(result.session_id).toBe("alias-session-1");
  });
});
