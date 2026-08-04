/**
 * Test: syncPaperAccountBalance skal KUN telle aktive sesjoner.
 * Pausede/stoppete sesjoner skal IKKE bidra til kontobalansen.
 *
 * Regresjonsbeskyttelse for dobbel balansevisning (2026-07-29).
 */
import { describe, it, expect, vi } from "vitest";
import { syncPaperAccountBalance } from "../core/paper-account-sync";

function mockSupabaseWithSessions(
  sessions: { current_capital_nok: number; starting_capital_nok?: number }[],
) {
  let eqCount = 0;
  let updatedBalance: number | null = null;
  const chain: any = {
    eq: vi.fn(() => {
      eqCount++;
      if (eqCount >= 3) return { data: sessions, error: null };
      return chain;
    }),
  };

  return {
    from: vi.fn((table: string) => {
      if (table === "trading_sessions") {
        return { select: vi.fn(() => chain) };
      }
      // paper_accounts update
      return {
        update: vi.fn((row: { current_balance?: number }) => {
          updatedBalance = row.current_balance ?? null;
          return { eq: vi.fn(() => ({ error: null })) };
        }),
      };
    }),
    getEqCount: () => eqCount,
    getUpdatedBalance: () => updatedBalance,
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

  it("sanity-cap: sum > 3× initial skrives IKKE til paper_accounts", async () => {
    // Reproduserer prod-hendelsen 2026-08-04: 11 sesjoner à 94 389 kr
    // (hele balansen per symbol) = 1 038 280 kr > 3× initial.
    const mock = mockSupabaseWithSessions([
      { current_capital_nok: 1_038_280, starting_capital_nok: 100_000 },
    ]);
    await syncPaperAccountBalance(mock as any, "u1");
    expect(mock.getUpdatedBalance()).toBeNull();
  });

  it("innenfor cap: sum ≤ 3× initial synkes normalt", async () => {
    const mock = mockSupabaseWithSessions([
      { current_capital_nok: 55_000, starting_capital_nok: 50_000 },
      { current_capital_nok: 49_389, starting_capital_nok: 50_000 },
    ]);
    await syncPaperAccountBalance(mock as any, "u1");
    expect(mock.getUpdatedBalance()).toBe(104_389);
  });

  it("uten starting_capital_nok (legacy-rader) skippes cap", async () => {
    const mock = mockSupabaseWithSessions([
      { current_capital_nok: 500_000 }, // initial ukjent → 0 → cap inaktiv
    ]);
    await syncPaperAccountBalance(mock as any, "u1");
    expect(mock.getUpdatedBalance()).toBe(500_000);
  });
});
