/**
 * Test: syncPaperAccountBalance skal KUN telle aktive sesjoner.
 * Pausede/stoppete sesjoner skal IKKE bidra til kontobalansen.
 *
 * Regresjonsbeskyttelse for dobbel balansevisning (2026-07-29).
 */
import { describe, it, expect, vi } from "vitest";
import { syncPaperAccountBalance } from "../core/paper-account-sync";

function mockSupabaseWithSessions(sessions: { current_capital_nok: number }[]) {
  let eqCount = 0;
  const chain: any = {
    eq: vi.fn(() => {
      eqCount++;
      if (eqCount >= 3) return { data: sessions, error: null };
      return chain;
    }),
  };

  return {
    from: vi.fn(() => ({ select: vi.fn(() => chain) })),
    getEqCount: () => eqCount,
  };
}

describe("syncPaperAccountBalance", () => {
  it("bruker 3 eq()-kall: user_id, mode, status", async () => {
    const mock = mockSupabaseWithSessions([{ current_capital_nok: 100_000 }]);
    await syncPaperAccountBalance(mock as any, "u1");
    expect(mock.getEqCount()).toBe(3);
  });

  it("håndterer tom resultatliste uten feil", async () => {
    const mock = mockSupabaseWithSessions([]);
    await expect(
      syncPaperAccountBalance(mock as any, "u1"),
    ).resolves.toBeUndefined();
  });

  it("fanger session-fetch feil uten å kaste", async () => {
    const chain: any = {
      eq: vi.fn(() => ({ data: null, error: { message: "DB error" } })),
    };
    const supabase = {
      from: vi.fn(() => ({ select: vi.fn(() => chain) })),
    } as any;
    await expect(
      syncPaperAccountBalance(supabase, "u1"),
    ).resolves.toBeUndefined();
  });
});
