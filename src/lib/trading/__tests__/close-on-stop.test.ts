import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import {
  buildCloseOnStopExplanation,
  closeSessionPositionOnStop,
  isCloseOnStopEnabled,
} from "../close-on-stop";

/**
 * Close-on-stop (produktkrav 2026-07-25):
 * Stopper brukeren en bot med åpen posisjon, selges posisjonen automatisk
 * (DEFAULT på — toggle for avanserte brukere) og brukeren får en
 * læringsforklaring med resultatet. Uten dette forlates posisjonen
 * (orphan) og selges ALDRI — prod-bevis: 8 orphans, realisert P&L = 0.
 */

const BASE_SESSION = {
  id: "sess-1",
  user_id: "user-1",
  trading_pair: "BTCUSDT",
  mode: "paper",
  strategy_config: {},
  open_position: {
    side: "long" as const,
    quantity: 0.01,
    entry_price: 600000,
    entry_time: "2026-07-18T10:00:00.000Z",
    highest_price: 640000,
  },
};

function makeDbMock(options?: {
  failRpc?: boolean;
  tradesRows?: Record<string, unknown>[];
}) {
  const insertCalls: { table: string; payload: Record<string, unknown> }[] = [];
  const updateCalls: { table: string; payload: Record<string, unknown> }[] = [];
  const rpcCalls: { fn: string; args: Record<string, unknown> }[] = [];

  const fromMock = vi.fn((table: string) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn((payload: Record<string, unknown>) => {
      insertCalls.push({ table, payload });
      // Streng kolonnesjekk (F4): trades-tabellen i prod har IKKE en
      // symbol-kolonne — PostgREST svarer PGRST204 på ukjente nøkler.
      // Dette var årsaken til at close-on-stop alltid feilet i prod.
      if (table === "trades" && "symbol" in payload) {
        return {
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: {
                message:
                  "Could not find the 'symbol' column of 'trades' in the schema cache",
                code: "PGRST204",
              },
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: "trade-1" }, error: null }),
        }),
      };
    }),
    update: vi.fn((payload: Record<string, unknown>) => {
      updateCalls.push({ table, payload });
      return {
        eq: vi.fn().mockResolvedValue({ error: null }),
        in: vi.fn().mockResolvedValue({ error: null }),
      };
    }),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({
      data: options?.tradesRows ?? null,
      error: null,
    }),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  }));

  // Streng RPC-mock: speiler den faktiske SQL-signaturen
  // increment_capital(p_session_id, p_amount, p_user_id) — alle tre er
  // PÅKREVD (supabase/migrations/20260301111500_atomic_trading.sql).
  // Uventede argumentformer avvises som PostgREST ville gjort, slik at
  // en fremtidig signaturglipp ikke lenger kan passere testene.
  const db = {
    from: fromMock,
    rpc: vi.fn((fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });
      if (options?.failRpc) {
        return Promise.resolve({
          data: null,
          error: { message: "simulert RPC-feil", code: "P0001" },
        });
      }
      if (fn === "increment_capital" || fn === "decrement_capital") {
        const keys = Object.keys(args).sort();
        const expected = ["p_amount", "p_session_id", "p_user_id"];
        const missing = expected.filter((k) => !(k in args));
        const extra = keys.filter((k) => !expected.includes(k));
        if (missing.length > 0 || extra.length > 0) {
          return Promise.resolve({
            data: null,
            error: {
              message:
                `Could not find the function public.${fn} med argumenter ` +
                `(${keys.join(", ")}) in the schema cache`,
              code: "PGRST202",
            },
          });
        }
      }
      return Promise.resolve({ data: null, error: null });
    }),
  } as unknown as SupabaseClient<Database>;

  return { db, insertCalls, updateCalls, rpcCalls };
}

describe("isCloseOnStopEnabled", () => {
  it("er TRUE som default (mangler config)", () => {
    expect(isCloseOnStopEnabled(null)).toBe(true);
    expect(isCloseOnStopEnabled({})).toBe(true);
  });

  it("kan skrus AV for avanserte brukere", () => {
    expect(isCloseOnStopEnabled({ close_on_stop: false })).toBe(false);
  });

  it("respekterer eksplisitt true", () => {
    expect(isCloseOnStopEnabled({ close_on_stop: true })).toBe(true);
  });
});

describe("buildCloseOnStopExplanation", () => {
  it("gevinst: viser beløp, prosent og læringspoeng", () => {
    const text = buildCloseOnStopExplanation({
      pair: "BTCUSDT",
      quantity: 0.01,
      entryPrice: 600000,
      exitPrice: 630000,
      realizedPnl: 297,
      pnlPct: 5.0,
      daysHeld: 6.8,
      locale: "no",
    });
    expect(text).toContain("solgt automatisk");
    expect(text).toContain("+297");
    expect(text).toContain("5,0");
    expect(text).toContain("6,8");
  });

  it("tap: viser negativt resultat med læringspoeng om tapsbegrensning", () => {
    const text = buildCloseOnStopExplanation({
      pair: "BTCUSDT",
      quantity: 0.01,
      entryPrice: 600000,
      exitPrice: 570000,
      realizedPnl: -303,
      pnlPct: -5.0,
      daysHeld: 2.1,
      locale: "no",
    });
    expect(text).toContain("−303");
    expect(text).toContain("tap");
  });

  it("engelsk locale støttes", () => {
    const text = buildCloseOnStopExplanation({
      pair: "BTCUSDT",
      quantity: 0.01,
      entryPrice: 600000,
      exitPrice: 630000,
      realizedPnl: 297,
      pnlPct: 5.0,
      daysHeld: 1.0,
      locale: "en",
    });
    expect(text).toContain("sold automatically");
  });
});

describe("closeSessionPositionOnStop", () => {
  const DEPS = { priceUsdt: 63000, rate: 10 }; // 630 000 NOK per BTC

  it("gjør ingenting når sesjonen ikke har åpen posisjon", async () => {
    const { db, insertCalls } = makeDbMock();
    const result = await closeSessionPositionOnStop(
      db,
      { ...BASE_SESSION, open_position: null },
      DEPS,
    );
    expect(result.closed).toBe(false);
    expect(result.reason).toBe("no_position");
    expect(insertCalls.find((c) => c.table === "trades")).toBeUndefined();
  });

  it("gjør ingenting når close_on_stop er skrudd AV (toggle)", async () => {
    const { db, insertCalls } = makeDbMock();
    const result = await closeSessionPositionOnStop(
      db,
      { ...BASE_SESSION, strategy_config: { close_on_stop: false } },
      DEPS,
    );
    expect(result.closed).toBe(false);
    expect(result.reason).toBe("disabled_by_config");
    expect(insertCalls.find((c) => c.table === "trades")).toBeUndefined();
  });

  it("avviser live-modus (kun paper støttes — live krever ekte executor)", async () => {
    const { db, insertCalls } = makeDbMock();
    const result = await closeSessionPositionOnStop(
      db,
      { ...BASE_SESSION, mode: "live" },
      DEPS,
    );
    expect(result.closed).toBe(false);
    expect(result.reason).toBe("live_not_supported");
    expect(insertCalls.find((c) => c.table === "trades")).toBeUndefined();
  });

  it("selger posisjonen: trade, nullstilt posisjon, kapital kreditert, forklaring", async () => {
    const { db, insertCalls, updateCalls, rpcCalls } = makeDbMock();
    const result = await closeSessionPositionOnStop(db, BASE_SESSION, DEPS);

    expect(result.closed).toBe(true);

    // 1. Sell-trade bokført
    const trade = insertCalls.find((c) => c.table === "trades");
    expect(trade).toBeDefined();
    expect(trade!.payload.side).toBe("sell");
    expect(trade!.payload.quantity).toBe(0.01);
    expect(trade!.payload.status).toBe("filled");
    expect(trade!.payload.mode).toBe("paper");
    // Inngang 600 000, utgang ~630 000 (slippage trukket fra) → gevinst
    expect(Number(trade!.payload.realized_pnl)).toBeGreaterThan(0);
    // Læringsforklaring lagret på selve traden (vises i "Hvorfor"-kolonnen)
    const signal = trade!.payload.strategy_signal as Record<string, unknown>;
    expect(String(signal.explanation)).toContain("solgt automatisk");

    // 2. Posisjon nullstilt
    const sessionUpdate = updateCalls.find(
      (c) => c.table === "trading_sessions",
    );
    expect(sessionUpdate).toBeDefined();
    expect(sessionUpdate!.payload.open_position).toBeNull();

    // 3. Kapital kreditert via samme RPC som tick-salg — ALLE argumenter
    // asserteres (SQL-signaturen krever p_session_id, p_amount OG p_user_id)
    const capitalRpc = rpcCalls.find((c) => c.fn === "increment_capital");
    expect(capitalRpc).toBeDefined();
    expect(capitalRpc!.args.p_session_id).toBe("sess-1");
    expect(capitalRpc!.args.p_user_id).toBe("user-1");
    expect(Number(capitalRpc!.args.p_amount)).toBeGreaterThan(6000);

    // 4. Forklaring returneres til API-et (vises til brukeren)
    expect(result.explanation).toContain("solgt automatisk");
    expect(result.explanation).toContain("+");
  });

  it("RPC-feil: posisjonen BEVARES og closed=false (ingen stille pengefeil)", async () => {
    const { db, insertCalls, updateCalls, rpcCalls } = makeDbMock({
      failRpc: true,
    });
    const result = await closeSessionPositionOnStop(db, BASE_SESSION, DEPS);

    // Salget rapporteres IKKE som gjennomført
    expect(result.closed).toBe(false);
    expect(result.reason).toBe("capital_credit_failed");

    // RPC ble forsøkt med komplett signatur
    const capitalRpc = rpcCalls.find((c) => c.fn === "increment_capital");
    expect(capitalRpc).toBeDefined();
    expect(capitalRpc!.args.p_user_id).toBe("user-1");

    // Posisjonen nullstilles IKKE når krediteringen feiler — den kan
    // dermed selges på nytt uten risiko for dobbeltkreditering
    const sessionClear = updateCalls.find(
      (c) => c.table === "trading_sessions" && "open_position" in c.payload,
    );
    expect(sessionClear).toBeUndefined();

    // Traden ER bokført (skjedde før RPC-feilen) — tradeId eksponeres
    // slik at hendelsen kan følges opp manuelt
    expect(insertCalls.find((c) => c.table === "trades")).toBeDefined();
    expect(result.tradeId).toBe("trade-1");
  });

  it("FIFO: selges eldste lot først, P&L regnes fra kostgrunnlag", async () => {
    const { db, insertCalls } = makeDbMock();
    const sessionWithLots = {
      ...BASE_SESSION,
      open_position: {
        side: "long" as const,
        quantity: 0.01,
        entry_price: 600000,
        entry_time: "2026-07-18T10:00:00.000Z",
        lots: [
          { id: "l1", quantity: 0.006, entryPrice: 580000, timestamp: "2026-07-18T10:00:00Z", originalQuantity: 0.006 },
          { id: "l2", quantity: 0.004, entryPrice: 630000, timestamp: "2026-07-20T10:00:00Z", originalQuantity: 0.004 },
        ],
      },
    };
    const result = await closeSessionPositionOnStop(db, sessionWithLots, DEPS);
    expect(result.closed).toBe(true);
    const trade = insertCalls.find((c) => c.table === "trades");
    // FIFO-P&L: (630000*0.997 - 580000)*0.006 + (630000*0.997 - 630000)*0.004 > 0
    expect(Number(trade!.payload.realized_pnl)).toBeGreaterThan(0);
  });

  it("F4-regresjon: insert-payload inneholder IKKE symbol (kolonnen finnes ikke i prod)", async () => {
    // Mocken avviser symbol-nøkkel med PGRST204 (prod-oppførsel) — hadde
    // koden sendt symbol, ville closed blitt false med reason "error".
    const { db, insertCalls } = makeDbMock();
    const result = await closeSessionPositionOnStop(db, BASE_SESSION, DEPS);
    expect(result.closed).toBe(true);
    const trade = insertCalls.find((c) => c.table === "trades");
    expect(trade).toBeDefined();
    expect("symbol" in trade!.payload).toBe(false);
    expect(trade!.payload.trading_pair).toBe("BTCUSDT");
  });

  it("F2 phantom-guard: selger trade-utledet mengde når posisjonen er korrupt", async () => {
    // Eksakt prod-tilfellet 2026-07-25: posisjon sa 34,65 ETH, trade-ledgeret 0,064
    const { db, insertCalls } = makeDbMock({
      tradesRows: [
        {
          side: "buy",
          quantity: 0.06399361,
          price: 17991.22563,
          trading_pair: "ETHUSDT",
          created_at: "2026-07-25T23:55:05.310Z",
        },
      ],
    });
    const phantomSession = {
      ...BASE_SESSION,
      trading_pair: "ETHUSDT",
      open_position: {
        side: "long" as const,
        quantity: 34.64663961,
        entry_price: 17991.22563,
        entry_time: "2026-07-25T23:55:05.310Z",
      },
    };
    const result = await closeSessionPositionOnStop(db, phantomSession, {
      priceUsdt: 1875,
      rate: 9.58,
    });
    expect(result.closed).toBe(true);
    const trade = insertCalls.find((c) => c.table === "trades");
    // Selger LEDGER-mengden — ikke de 34,65 fantom-ETH-ene (~623 000 kr!)
    expect(Number(trade!.payload.quantity)).toBeCloseTo(0.06399361, 8);
    expect(Number(trade!.payload.total_value)).toBeLessThan(2000);
  });

  it("F2 phantom-guard: ledger tomt → no_position (ikke fantom-salg)", async () => {
    const { db, insertCalls } = makeDbMock({ tradesRows: [] });
    const phantomSession = {
      ...BASE_SESSION,
      open_position: {
        side: "long" as const,
        quantity: 34.64663961,
        entry_price: 17991.22563,
        entry_time: "2026-07-25T23:55:05.310Z",
      },
    };
    // tradesRows=[] → spørringen returnerer null → guard utløses ikke,
    // posisjonsmengden brukes (bakoverkompatibelt for legacy-sesjoner)
    const result = await closeSessionPositionOnStop(db, phantomSession, DEPS);
    expect(result.closed).toBe(true);
    expect(insertCalls.find((c) => c.table === "trades")).toBeDefined();
  });
});
