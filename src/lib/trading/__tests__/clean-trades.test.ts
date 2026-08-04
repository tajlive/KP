import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import {
  clampedRealizedPnl,
  cleanTradeStats,
  CONTAMINATION_CUTOFF,
  getCleanTrades,
  type CleanTrade,
} from "../clean-trades";
import {
  buildTradingAnalytics,
  type TradeAnalyticsInput,
} from "../build-trading-analytics";

function mkTrade(
  partial: Partial<CleanTrade> & Pick<CleanTrade, "id" | "side">,
): CleanTrade {
  return {
    session_id: "s1",
    trading_pair: "BTCUSDT",
    realized_pnl: null,
    quantity: null,
    mode: "paper",
    created_at: "2026-08-01T00:00:00.000Z",
    executed_at: "2026-08-01T00:00:00.000Z",
    total_value: null,
    ...partial,
  };
}

describe("CONTAMINATION_CUTOFF", () => {
  it("er 2026-07-30 (samme cutoff som PROMPT #14/#16)", () => {
    expect(CONTAMINATION_CUTOFF).toBe("2026-07-30T00:00:00.000Z");
  });
});

describe("clampedRealizedPnl", () => {
  it("normal runde: kjøp dekker salg → pnl uendret", () => {
    const trades = [
      mkTrade({ id: "t1", side: "buy", quantity: 1 }),
      mkTrade({
        id: "t2",
        side: "sell",
        quantity: 1,
        realized_pnl: 50,
        executed_at: "2026-08-01T01:00:00.000Z",
        created_at: "2026-08-01T01:00:00.000Z",
      }),
    ];
    const clamped = clampedRealizedPnl(trades);
    expect(clamped.get("t1")).toBeNull();
    expect(clamped.get("t2")).toBe(50);
  });

  it("oversell uten kjøp → pnl clampes til 0", () => {
    const trades = [
      mkTrade({ id: "t1", side: "sell", quantity: 2, realized_pnl: 100 }),
    ];
    expect(clampedRealizedPnl(trades).get("t1")).toBe(0);
  });

  it("delvis oversell: salg > akkumulert kjøp skaleres proporsjonalt", () => {
    // Kjøp 1, salg 2 (pnl 200): kun halvparten er dekket → 200 × 0.5 = 100
    const trades = [
      mkTrade({ id: "t1", side: "buy", quantity: 1 }),
      mkTrade({
        id: "t2",
        side: "sell",
        quantity: 2,
        realized_pnl: 200,
        executed_at: "2026-08-01T01:00:00.000Z",
        created_at: "2026-08-01T01:00:00.000Z",
      }),
    ];
    expect(clampedRealizedPnl(trades).get("t2")).toBe(100);
  });

  it("posisjon etter delvis salg: kjøp, salg, kjøp, oversell → riktig clamp", () => {
    const trades = [
      mkTrade({ id: "t1", side: "buy", quantity: 1, executed_at: "2026-08-01T00:00:00.000Z" }),
      mkTrade({
        id: "t2",
        side: "sell",
        quantity: 1,
        realized_pnl: 10,
        executed_at: "2026-08-01T01:00:00.000Z",
        created_at: "2026-08-01T01:00:00.000Z",
      }),
      mkTrade({ id: "t3", side: "buy", quantity: 1, executed_at: "2026-08-01T02:00:00.000Z" }),
      mkTrade({
        id: "t4",
        side: "sell",
        quantity: 2,
        realized_pnl: 200,
        executed_at: "2026-08-01T03:00:00.000Z",
        created_at: "2026-08-01T03:00:00.000Z",
      }),
    ];
    const clamped = clampedRealizedPnl(trades);
    expect(clamped.get("t2")).toBe(10); // dekket 1:1
    expect(clamped.get("t4")).toBe(100); // kun 1 av 2 dekket
  });

  it("grupperer per par — oversell i ETT par påvirker ikke et annet", () => {
    const trades = [
      mkTrade({
        id: "a1",
        side: "sell",
        quantity: 2,
        realized_pnl: 100,
        trading_pair: "BTCUSDT",
      }), // ingen kjøp i BTC → full oversell
      mkTrade({ id: "b1", side: "buy", quantity: 1, trading_pair: "ETHUSDT" }),
      mkTrade({
        id: "b2",
        side: "sell",
        quantity: 1,
        realized_pnl: 10,
        trading_pair: "ETHUSDT",
      }),
    ];
    const clamped = clampedRealizedPnl(trades);
    expect(clamped.get("a1")).toBe(0); // oversell → clampet
    expect(clamped.get("b2")).toBe(10); // upåvirket
  });

  it("grupperer per sesjon — samme par i ulike sesjoner er uavhengige", () => {
    const trades = [
      mkTrade({
        id: "x1",
        side: "sell",
        quantity: 2,
        realized_pnl: 100,
        session_id: "sessX",
      }), // ingen kjøp i sessX → full oversell
      mkTrade({ id: "y1", side: "buy", quantity: 1, session_id: "sessY" }),
      mkTrade({
        id: "y2",
        side: "sell",
        quantity: 1,
        realized_pnl: 10,
        session_id: "sessY",
      }),
    ];
    const clamped = clampedRealizedPnl(trades);
    expect(clamped.get("x1")).toBe(0); // oversell i sessX
    expect(clamped.get("y2")).toBe(10); // dekket i sessY
  });

  it("normaliserer par med slash — BTC/USDT og BTCUSDT er samme posisjon", () => {
    const trades = [
      mkTrade({ id: "t1", side: "buy", quantity: 1, trading_pair: "BTC/USDT" }),
      mkTrade({
        id: "t2",
        side: "sell",
        quantity: 2,
        realized_pnl: 100,
        trading_pair: "BTCUSDT",
      }),
    ];
    // Kjøp i BTC/USDT dekker salget i BTCUSDT (samme posisjon) —
    // men kun 1 av 2 solgt er dekket → 100 × 0.5 = 50
    expect(clampedRealizedPnl(trades).get("t2")).toBe(50);
  });

  it("salg uten gyldig quantity kan ikke verifiseres — pnl beholdes", () => {
    const trades = [
      mkTrade({ id: "t1", side: "sell", quantity: null, realized_pnl: 100 }),
    ];
    expect(clampedRealizedPnl(trades).get("t1")).toBe(100);
  });

  it("ukjent side (verken buy/sell) clampes aldri", () => {
    const trades = [
      mkTrade({ id: "t1", side: "hold", realized_pnl: 42 }),
    ];
    expect(clampedRealizedPnl(trades).get("t1")).toBe(42);
  });

  it("buy med pnl (uventet) beholdes uendret", () => {
    const trades = [mkTrade({ id: "t1", side: "buy", quantity: 1, realized_pnl: 5 })];
    expect(clampedRealizedPnl(trades).get("t1")).toBe(5);
  });
});

describe("cleanTradeStats", () => {
  it("teller vinn/tap/breakeven og summerer totalPnl fra clamped verdier", () => {
    const trades = [
      mkTrade({ id: "t1", side: "buy", quantity: 1 }),
      mkTrade({ id: "t2", side: "sell", quantity: 1, realized_pnl: 10 }), // vinn
      mkTrade({ id: "t3", side: "buy", quantity: 1, created_at: "2026-08-02T00:00:00.000Z", executed_at: "2026-08-02T00:00:00.000Z" }),
      mkTrade({ id: "t4", side: "sell", quantity: 1, realized_pnl: -5, created_at: "2026-08-02T01:00:00.000Z", executed_at: "2026-08-02T01:00:00.000Z" }), // tap
      mkTrade({ id: "t5", side: "buy", quantity: 1, created_at: "2026-08-03T00:00:00.000Z", executed_at: "2026-08-03T00:00:00.000Z" }),
      mkTrade({ id: "t6", side: "sell", quantity: 1, realized_pnl: 0, created_at: "2026-08-03T01:00:00.000Z", executed_at: "2026-08-03T01:00:00.000Z" }), // breakeven
    ];
    const stats = cleanTradeStats(trades);
    expect(stats.closedCount).toBe(3);
    expect(stats.winCount).toBe(1);
    expect(stats.lossCount).toBe(1);
    expect(stats.winRate).toBe(1 / 3);
    expect(stats.totalPnl).toBe(5);
  });

  it("oversell som clampes til 0 teller som breakeven, ikke vinn", () => {
    const trades = [
      mkTrade({ id: "t1", side: "sell", quantity: 2, realized_pnl: 100 }), // ingen kjøp
    ];
    const stats = cleanTradeStats(trades);
    expect(stats.winCount).toBe(0);
    expect(stats.closedCount).toBe(1); // pnl 0 etter clamp = lukket breakeven
    expect(stats.totalPnl).toBe(0);
    expect(stats.winRate).toBe(0);
  });

  it("tom liste → null-winrate og nuller", () => {
    const stats = cleanTradeStats([]);
    expect(stats).toEqual({
      closedCount: 0,
      winCount: 0,
      lossCount: 0,
      winRate: null,
      totalPnl: 0,
    });
  });

  it("runder totalPnl til 2 desimaler", () => {
    const trades = [
      mkTrade({ id: "t1", side: "buy", quantity: 1 }),
      mkTrade({
        id: "t2",
        side: "sell",
        quantity: 1,
        realized_pnl: 0.1 + 0.2,
        executed_at: "2026-08-01T01:00:00.000Z",
        created_at: "2026-08-01T01:00:00.000Z",
      }),
    ];
    expect(cleanTradeStats(trades).totalPnl).toBe(0.3);
  });
});

// ── getCleanTrades: minimal fake av supabase-query-builder ────────────────

type FakeResult = { data: unknown; error: unknown };

class FakeQueryBuilder {
  calls: string[] = [];
  private result: FakeResult;

  constructor(result: FakeResult) {
    this.result = result;
  }

  select(_columns: string) {
    this.calls.push("select");
    return this;
  }
  eq(column: string, value: unknown) {
    this.calls.push(`eq:${column}=${String(value)}`);
    return this;
  }
  gte(column: string, value: unknown) {
    this.calls.push(`gte:${column}=${String(value)}`);
    return this;
  }
  in(column: string, values: unknown[]) {
    this.calls.push(`in:${column}=[${values.join(",")}]`);
    return this;
  }
  order(column: string, _opts?: unknown) {
    this.calls.push(`order:${column}`);
    return this;
  }
  limit(value: number) {
    this.calls.push(`limit:${value}`);
    return this;
  }
  then(onFulfilled: (v: FakeResult) => unknown) {
    return Promise.resolve(onFulfilled(this.result));
  }
}

function fakeSupabase(rows: unknown[], error: unknown = null) {
  const builder = new FakeQueryBuilder({ data: rows, error });
  return {
    from: (_table: string) => builder,
    _calls: () => builder.calls,
  } as unknown as SupabaseClient<Database> & { _calls: () => string[] };
}

const ROW = {
  id: "t1",
  session_id: "s1",
  trading_pair: "BTCUSDT",
  side: "buy",
  realized_pnl: null,
  quantity: 1,
  mode: "paper",
  created_at: "2026-08-01T00:00:00.000Z",
  executed_at: "2026-08-01T00:00:00.000Z",
  total_value: 100,
};

describe("getCleanTrades", () => {
  it("setter alltid forurensings-cutoff + brukerfilter", async () => {
    const supabase = fakeSupabase([ROW]);
    await getCleanTrades(supabase, "u1");
    const calls = supabase._calls();
    expect(calls).toContain("select");
    expect(calls).toContain("eq:user_id=u1");
    expect(calls).toContain(`gte:executed_at=${CONTAMINATION_CUTOFF}`);
    expect(calls).toContain("order:created_at");
  });

  it("filtrerer på sesjoner når sessionIds gis", async () => {
    const supabase = fakeSupabase([ROW]);
    await getCleanTrades(supabase, "u1", ["s1", "s2"]);
    expect(supabase._calls()).toContain("in:session_id=[s1,s2]");
  });

  it("tom sessionIds → __none__ (ingen treff, samme mønster som gamle ruter)", async () => {
    const supabase = fakeSupabase([]);
    await getCleanTrades(supabase, "u1", []);
    expect(supabase._calls()).toContain("in:session_id=[__none__]");
  });

  it("uten sessionIds settes ikke in-filter", async () => {
    const supabase = fakeSupabase([ROW]);
    await getCleanTrades(supabase, "u1");
    expect(supabase._calls().some((c) => c.startsWith("in:"))).toBe(false);
  });

  it("viderefører mode/status/limit-opsjoner", async () => {
    const supabase = fakeSupabase([ROW]);
    await getCleanTrades(supabase, "u1", undefined, {
      mode: "paper",
      status: "filled",
      limit: 4000,
    });
    const calls = supabase._calls();
    expect(calls).toContain("eq:mode=paper");
    expect(calls).toContain("eq:status=filled");
    expect(calls).toContain("limit:4000");
  });

  it("normaliserer numeriske strenger til tall (supabase-js JSON-strenger)", async () => {
    const supabase = fakeSupabase([
      { ...ROW, quantity: "1.5", realized_pnl: "123.45", total_value: "150000" },
    ]);
    const [trade] = await getCleanTrades(supabase, "u1");
    expect(trade.quantity).toBe(1.5);
    expect(trade.realized_pnl).toBe(123.45);
    expect(trade.total_value).toBe(150000);
  });

  it("ugyldige numeriske verdier → null (aldri NaN inn i statistikken)", async () => {
    const supabase = fakeSupabase([
      { ...ROW, quantity: "ikke-et-tall", realized_pnl: "abc" },
    ]);
    const [trade] = await getCleanTrades(supabase, "u1");
    expect(trade.quantity).toBeNull();
    expect(trade.realized_pnl).toBeNull();
  });

  it("kaster ved Supabase-feil", async () => {
    const supabase = fakeSupabase([], new Error("boom"));
    await expect(getCleanTrades(supabase, "u1")).rejects.toThrow("boom");
  });
});

describe("clean-trades → buildTradingAnalytics (PROMPT #16)", () => {
  it("clamped verdier flyter inn i analytics — oversell gir ingen inflasjon", () => {
    const trades: CleanTrade[] = [
      mkTrade({ id: "t1", side: "buy", quantity: 1 }),
      mkTrade({
        id: "t2",
        side: "sell",
        quantity: 2,
        realized_pnl: 200,
        executed_at: "2026-08-01T01:00:00.000Z",
        created_at: "2026-08-01T01:00:00.000Z",
      }),
    ];

    const clamped = clampedRealizedPnl(trades);
    const input: TradeAnalyticsInput[] = trades.map((t) => ({
      id: t.id,
      trading_pair: t.trading_pair,
      side: t.side,
      realized_pnl: clamped.get(t.id) ?? null,
      mode: t.mode,
      created_at: t.created_at,
      executed_at: t.executed_at,
      total_value: t.total_value,
    }));

    const payload = buildTradingAnalytics(input);
    expect(payload.aggregates.totalEffectivePnl).toBe(100);
    expect(payload.aggregates.totalRealizedPnl).toBe(100);
    expect(payload.aggregates.winCount).toBe(1); // clamped 100 > 0
  });
});
