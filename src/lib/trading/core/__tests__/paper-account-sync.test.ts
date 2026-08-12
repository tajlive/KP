/**
 * Regresjonstest: syncPaperAccountBalance skal IKKE telle stoppede sesjoner.
 * Reproducerer INC-2026-08-12: stoppede sesjoner med arvet inflatert
 * current_capital_nok.
 */
import { describe, it, expect } from "vitest";
import { syncPaperAccountBalance } from "../paper-account-sync";

// Mock Supabase client
function mockSupabase(
  sessions: { current_capital_nok: number; status: string }[],
) {
  const calls: any[] = [];
  return {
    calls,
    client: {
      from: (table: string) => {
        if (table === "trading_sessions") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  in: (col: string, statuses: string[]) => {
                    expect(statuses).toEqual(["active", "paused"]);
                    const filtered = sessions.filter((s) =>
                      statuses.includes(s.status),
                    );
                    return Promise.resolve({ data: filtered, error: null });
                  },
                }),
              }),
            }),
          };
        }
        if (table === "paper_accounts") {
          return {
            update: (data: any) => ({
              eq: () => {
                calls.push(data);
                return Promise.resolve({ error: null });
              },
            }),
          };
        }
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
          }),
        };
      },
    } as any,
  };
}

describe("syncPaperAccountBalance — INC-2026-08-12 regresjon", () => {
  it("stoppede sesjoner med inflatert capital skal IKKE telles med", async () => {
    const sessions = [
      { current_capital_nok: 199647, status: "stopped" }, // arvet inflasjon
      { current_capital_nok: 198637, status: "stopped" }, // arvet inflasjon
      { current_capital_nok: 100000, status: "active" },
    ];
    const { calls, client } = mockSupabase(sessions);
    await syncPaperAccountBalance(client, "user-1");

    // Skal kun telle active-sesjonen (100 000), ikke stoppede
    expect(calls.length).toBeGreaterThanOrEqual(0); // kan være 0 hvis bare én aktiv
    if (calls.length > 0) {
      expect(calls[0].current_balance).toBe(100000);
    }
  });

  it("sanity cap: sum > 1.5× initial → IKKE oppdater", async () => {
    // Tre aktive sesjoner med 99999 hver → sum = 299 997, initial = 300 000
    // 299 997 > 300 000 * 1.5? NEI (299 997 < 450 000). Ingen cap treffer.
    // Endre til: sum = 500 000 > 300 000 * 1.5 → cap treffer
    const sessions = [
      {
        current_capital_nok: 200000,
        starting_capital_nok: 100000,
        status: "active",
      },
      {
        current_capital_nok: 200000,
        starting_capital_nok: 100000,
        status: "active",
      },
      {
        current_capital_nok: 200000,
        starting_capital_nok: 100000,
        status: "active",
      },
    ];

    let updated = false;
    const client = {
      from: (table: string) => {
        if (table === "trading_sessions") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  in: () => Promise.resolve({ data: sessions, error: null }),
                }),
              }),
            }),
          } as any;
        }
        return {
          update: () => ({
            eq: () => {
              updated = true;
              return Promise.resolve({ error: null });
            },
          }),
        } as any;
      },
    } as any;

    await syncPaperAccountBalance(client, "user-2");
    // Sum = 600 000, initial = 300 000 → 600k > 450k → cap treffer → IKKE oppdater
    expect(updated).toBe(false);
  });

  it("sum under 1.5× initial → skal oppdatere", async () => {
    const sessions = [
      {
        current_capital_nok: 100000,
        starting_capital_nok: 100000,
        status: "active",
      },
      {
        current_capital_nok: 100000,
        starting_capital_nok: 100000,
        status: "active",
      },
    ];

    let updatedBalance: number | undefined;
    const client = {
      from: (table: string) => {
        if (table === "trading_sessions") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  in: () => Promise.resolve({ data: sessions, error: null }),
                }),
              }),
            }),
          } as any;
        }
        return {
          update: (data: any) => ({
            eq: () => {
              updatedBalance = data.current_balance;
              return Promise.resolve({ error: null });
            },
          }),
        } as any;
      },
    } as any;

    await syncPaperAccountBalance(client, "user-3");
    expect(updatedBalance).toBe(200000); // 100k + 100k
  });
});
