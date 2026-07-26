import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * F1-regresjon (prod 2026-07-25): startTrading overskrev en AKTIV sesjon
 * for samme bruker+par (kapital/tellere/started_at nullstilt) i stedet for
 * å avvise. Disse testene låser den nye oppførselen:
 *   - aktiv sesjon for samme par → PAPER_BOT_DUPLICATE, INGEN update
 *   - ingen aktiv sesjon for paret → normal oppretting (insert)
 */

const { mockState, mockFrom, mockAuth } = vi.hoisted(() => {
  const mockState = {
    activeSessions: [] as { id: string; trading_pair: string }[],
    updates: [] as Record<string, unknown>[],
    inserts: [] as Record<string, unknown>[],
  };
  const mockAuth = {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    }),
  };

  function makeTable(table: string) {
    const t: Record<string, unknown> = {};
    const terminal = () => {
      if (table === "user_profiles") {
        return Promise.resolve({ data: { tier: "professor" }, error: null });
      }
      if (table === "trading_sessions") {
        const found = mockState.activeSessions.find(
          (s) => s.trading_pair === "BTCUSDT",
        );
        return Promise.resolve({
          data: found ? { id: found.id } : null,
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    };
    // Thenable: count-spørringen i startTrading await-er eq-kjeden direkte
    t.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ count: 0, error: null }).then(resolve);
    t.select = () => t;
    t.eq = () => t;
    t.in = () => t;
    t.order = () => t;
    t.limit = () => t;
    t.maybeSingle = () => terminal();
    t.single = () =>
      Promise.resolve({ data: { id: "new-session-1" }, error: null });
    t.insert = (p: Record<string, unknown>) => {
      mockState.inserts.push({ table, ...p });
      return t;
    };
    t.update = (p: Record<string, unknown>) => {
      mockState.updates.push({ table, ...p });
      return t;
    };
    t.upsert = () => Promise.resolve({ error: null });
    return t;
  }

  const mockFrom = vi.fn((table: string) => makeTable(table));
  return { mockState, mockFrom, mockAuth };
});

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: async () => ({
    auth: mockAuth,
    from: mockFrom,
  }),
}));

import { startTrading } from "../trading";

const BASE_INPUT = {
  mode: "paper" as const,
  strategy: "dca" as const,
  risk_level: "low" as const,
  pairs: ["BTCUSDT"],
  starting_capital_nok: 10000,
};

describe("startTrading — aktiv-sesjon-guard (F1)", () => {
  beforeEach(() => {
    mockState.activeSessions = [];
    mockState.updates = [];
    mockState.inserts = [];
    vi.clearAllMocks();
  });

  it("avviser når brukeren har en AKTIV sesjon for samme par (ingen overskriving!)", async () => {
    mockState.activeSessions = [
      { id: "existing-bot", trading_pair: "BTCUSDT" },
    ];

    const result = await startTrading(BASE_INPUT);

    expect(result.ok).toBe(false);
    expect(result.code).toBe("PAPER_BOT_DUPLICATE");
    expect(result.message).toContain("allerede en aktiv bot for dette paret");
    // Den kritiske invarianten: EKSISTERENDE sesjon røres ikke
    expect(
      mockState.updates.filter((u) => u.table === "trading_sessions"),
    ).toHaveLength(0);
    // Og ingen ny sesjon opprettes
    expect(
      mockState.inserts.filter((i) => i.table === "trading_sessions"),
    ).toHaveLength(0);
  });

  it("oppretter ny sesjon når paret ikke har en aktiv sesjon", async () => {
    mockState.activeSessions = [];

    const result = await startTrading(BASE_INPUT);

    expect(result.ok).toBe(true);
    expect(result.code).toBe("PAPER_BOT_STARTED");
    expect(result.session_id).toBe("new-session-1");
    const sessionInserts = mockState.inserts.filter(
      (i) => i.table === "trading_sessions",
    );
    expect(sessionInserts).toHaveLength(1);
    expect(sessionInserts[0].trading_pair).toBe("BTCUSDT");
    expect(sessionInserts[0].status).toBe("active");
  });
});
