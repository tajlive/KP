/**
 * KLA-300 — OKX live-state cache-lag
 *
 * Verifiserer at getOkxLiveBalance:
 * 1. Leser fra okx_live_state når rad er fersk (≤ 5 min) — ingen API-kall
 * 2. Går til live API ved tom rad
 * 3. Går til live API ved stale rad (> 5 min)
 * 4. Returnerer {connected:false} ved API-feil
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getOkxLiveBalance } from "@/lib/trading/okx-live";

vi.mock("@/lib/crypto/encrypt-api-keys", () => ({
  decryptApiKey: vi.fn(async (v: string) => v),
}));

vi.mock("@/lib/trading/currency", () => ({
  getUsdtToNokRateAsync: vi.fn(async () => 9.5),
}));

const TOM_ID = "0dd08529-b8a8-4fd3-9806-275e2d0135dd";

const freshSnapshot = {
  balanceUsdc: 101.66,
  balanceNok: 965.77,
  quoteCcy: "USDC",
  dailyPnl: 0,
  dailyPnlPct: 0,
  position: null,
};

function mockSupabase(cachedRow: unknown) {
  // Dispatcher på tabellnavn: okx_live_state → cachedRow, user_okx_keys → null
  const from = vi.fn().mockImplementation((table: string) => {
    if (table === "okx_live_state") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: cachedRow, error: null }),
          }),
        }),
      };
    }
    // user_okx_keys og alt annet → ingen rad
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    };
  });
  return { from };
}

describe("getOkxLiveBalance cache-lag (KLA-300)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("leser fra okx_live_state når rad er fersk — ingen API-kall", async () => {
    const supabase = mockSupabase({
      snapshot: freshSnapshot,
      total_usdc: 101.66,
      updated_at: new Date(Date.now() - 60 * 1000).toISOString(), // 1 min gammel
    });

    const result = await getOkxLiveBalance(supabase as never, TOM_ID);

    expect(result.connected).toBe(true);
    expect(result.balanceUsdc).toBe(101.66);
    expect(result.balanceNok).toBe(965.77);
    // Må IKKE ha spurt om nøkler (user_okx_keys) — kun okx_live_state
    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(supabase.from).toHaveBeenCalledWith("okx_live_state");
  });

  it("går til live API ved tom rad", async () => {
    const supabase = mockSupabase(null);

    const result = await getOkxLiveBalance(supabase as never, TOM_ID);

    // Tom rad → {connected:false} siden mock-en ikke har nøkler
    expect(result.connected).toBe(false);
    expect(supabase.from).toHaveBeenCalledWith("okx_live_state");
  });

  it("går til live API ved stale rad (> 5 min)", async () => {
    const supabase = mockSupabase({
      snapshot: freshSnapshot,
      total_usdc: 101.66,
      updated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 min
    });

    const result = await getOkxLiveBalance(supabase as never, TOM_ID);

    // Stale cache → spør om nøkler (live-forsøk) → ingen nøkler i mock → false
    expect(result.connected).toBe(false);
    // Forvent 2 from-kall: okx_live_state (cache) + user_okx_keys (live)
    expect(supabase.from).toHaveBeenCalledWith("user_okx_keys");
  });

  it("returnerer {connected:false} ved API-feil", async () => {
    const supabase = mockSupabase(null);
    // Overstyr okx_live_state-lesingen til å kaste (DB nede)
    supabase.from.mockImplementationOnce(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.reject(new Error("DB nede")),
        }),
      }),
    }));

    const result = await getOkxLiveBalance(supabase as never, TOM_ID);
    expect(result.connected).toBe(false);
    expect(result.balanceUsdc).toBe(0);
  });
});
