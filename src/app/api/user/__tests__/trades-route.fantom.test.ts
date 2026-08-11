/**
 * P1-regresjonstest (2026-08-11): /api/user/trades skal IKKE bygge
 * «åpne posisjoner» fra stoppede/arkiverte sesjoner.
 *
 * Historikk-siden viste fantom-posisjoner (Tom: ADA 3 253 kr + BTC
 * 1 330 kr fra stoppede sesjoner som «åpne posisjoner»). Trades-listen
 * er fortsatt en komplett ledger (alle sesjoner), men posisjoner bygges
 * KUN fra active/paused-sesjoner.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const MOCK_USER_ID = "0dd08529-b8a8-4fd3-9806-275e2d0135dd";

const SESSION_ACTIVE = "11111111-1111-4111-8111-111111111111";
const SESSION_STOPPED = "22222222-2222-4222-8222-222222222222";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  computePositionsFromTrades: vi.fn(),
  getKlines: vi.fn(),
  getUsdtToNokRateAsync: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mocks.getUser },
    from: vi.fn(),
  })),
  createClient: vi.fn(() => ({ from: vi.fn() })),
}));

vi.mock("@/lib/trading/positions-from-trades", () => ({
  computePositionsFromTrades: mocks.computePositionsFromTrades,
}));

vi.mock("@/lib/trading/canonical/market-data", () => ({
  KrakenMarketDataProvider: vi.fn(function MockProvider() {
    return { getKlines: mocks.getKlines };
  }),
}));

vi.mock("@/lib/trading/currency", () => ({
  getUsdtToNokRateAsync: mocks.getUsdtToNokRateAsync,
}));

import { GET } from "../trades/route";

/** NextRequest-erstatter: ruten leser request.nextUrl.searchParams. */
function makeRequest(url: string) {
  const u = new URL(url);
  return {
    nextUrl: {
      searchParams: u.searchParams,
    },
  } as never;
}

/** Bygger en mock-supabase der sessions-ruten gir active+stopped og trades gir 2 rader. */
function mockSupabase() {
  const sessionsData = [
    { id: SESSION_ACTIVE, status: "active" },
    { id: SESSION_STOPPED, status: "stopped" },
  ];
  const tradesData = [
    {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      session_id: SESSION_ACTIVE,
      trading_pair: "BTCUSDT",
      side: "buy",
      quantity: 0.01,
      price: 600000,
      total_value: 6000,
      realized_pnl: null,
      mode: "paper",
      status: "filled",
      created_at: "2026-08-11T10:00:00.000Z",
      executed_at: "2026-08-11T10:00:00.000Z",
      strategy_signal: null,
      fee: 0,
      order_type: "market",
    },
    {
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      session_id: SESSION_STOPPED,
      trading_pair: "ADAUSDT",
      side: "buy",
      quantity: 1000,
      price: 2,
      total_value: 2000,
      realized_pnl: null,
      mode: "paper",
      status: "filled",
      created_at: "2026-08-01T10:00:00.000Z",
      executed_at: "2026-08-01T10:00:00.000Z",
      strategy_signal: null,
      fee: 0,
      order_type: "market",
    },
  ];

  const sessionsBuilder = {
    select: vi.fn(() => sessionsBuilder),
    eq: vi.fn(() => Promise.resolve({ data: sessionsData, error: null })),
    in: vi.fn(() => Promise.resolve({ data: sessionsData, error: null })),
  };
  const tradesBuilder = {
    select: vi.fn(() => tradesBuilder),
    eq: vi.fn(() => tradesBuilder),
    in: vi.fn(() => tradesBuilder),
    order: vi.fn(() => tradesBuilder),
    limit: vi.fn(() => Promise.resolve({ data: tradesData, error: null })),
  };
  const from = vi.fn((table: string) => {
    if (table === "trading_sessions") return sessionsBuilder;
    if (table === "trades") return tradesBuilder;
    return { select: vi.fn(() => Promise.resolve({ data: [], error: null })) };
  });

  return {
    supabase: { from, auth: { getUser: mocks.getUser } },
    from,
  };
}

describe("GET /api/user/trades — fantom-posisjoner (P1 2026-08-11)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({
      data: { user: { id: MOCK_USER_ID } },
      error: null,
    });
    mocks.computePositionsFromTrades.mockImplementation(
      (trades: Array<{ session_id: string }>) => {
        const sessions = new Set(trades.map((t) => t.session_id));
        return Array.from(sessions).map((sid) => ({
          pair: `PAIR-${sid.slice(0, 8)}`,
          quantity: 1,
          avg_entry_price: 1,
          cost_basis_nok: 100,
          oldest_entry_at: "2026-08-11T10:00:00.000Z",
        }));
      },
    );
    mocks.getKlines.mockResolvedValue([{ close: 600000 }]);
    mocks.getUsdtToNokRateAsync.mockResolvedValue(10);
  });

  it("bygger posisjoner KUN fra active/paused-sesjoner, aldri stopped", async () => {
    const { supabase } = mockSupabase();
    const { createServerClient } = await import("@/lib/supabase/server");
    (createServerClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      supabase,
    );

    const res = await GET(
      makeRequest("https://www.klarpakke.no/api/user/trades?limit=50"),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    // Ledger: BEGGE trades er med (aktiv + stoppet) — historikk mister aldri rader
    expect(body.trades.length).toBe(2);
    // Posisjoner: KUN den aktive sesjonens trade (1 posisjon, ikke 2)
    expect(body.positions.length).toBe(1);
    expect(body.positions[0].pair).toContain(SESSION_ACTIVE.slice(0, 8));

    // Bekreft at positions-beregneren fikk KUN den aktive sesjonens trade
    const received = mocks.computePositionsFromTrades.mock
      .calls[0][0] as Array<{ session_id: string }>;
    expect(received.map((t) => t.session_id)).toEqual([SESSION_ACTIVE]);
  });

  it("session_id-parameter gir posisjoner fra den eksplisitte sesjonen", async () => {
    const { supabase } = mockSupabase();
    const { createServerClient } = await import("@/lib/supabase/server");
    (createServerClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      supabase,
    );

    const res = await GET(
      makeRequest(
        `https://www.klarpakke.no/api/user/trades?session_id=${SESSION_STOPPED}`,
      ),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    // Eksplisitt forespurt sesjon → posisjoner fra DEN sesjonen (brukeren ber om detaljene)
    expect(body.positions.length).toBe(1);
    expect(body.positions[0].pair).toContain(SESSION_STOPPED.slice(0, 8));
  });
});
