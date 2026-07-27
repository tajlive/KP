/**
 * Inflasjonsfiks 2026-07-27 — paper sell-side guard + valuta-hygiene.
 *
 * Prod-bevis: DCA-sesjon gikk 100 000 → 1 485 074 NOK på 7,5 t (54W/0L)
 * fordi (1) orphan-adopsjon tok inn korrupte/NOK-denominerte posisjoner,
 * (2) trailing-TP sammenlignet dem mot USDT-candles og fyrte salg hver tick,
 * (3) verken executeTrade eller DB-trigger sjekket at sesjonen EIDE det
 * den solgte — hvert salg krediterte ubetinget.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import {
  getPositionBaseQuantity,
  normalizePositionPricesToUsdt,
  isPositionEntryPlausible,
} from "../position-currency";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/trading/safety/risk-validator", () => ({
  validateTradeAgainstRiskProfile: vi.fn().mockResolvedValue({ allowed: true }),
  recordTradeRejection: vi.fn().mockResolvedValue(undefined),
  recordTradeDecision: vi.fn().mockResolvedValue(undefined),
}));

const executeOrderMock = vi.fn();

vi.mock("@/lib/trading/executor-factory", () => ({
  ExecutorFactory: {
    create: vi.fn(() =>
      Promise.resolve({
        executeOrder: executeOrderMock,
      }),
    ),
    canTradeLive: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("@/lib/trading/currency", () => ({
  getUsdtToNokRateAsync: vi.fn().mockResolvedValue(9.6),
  usdtToNok: vi.fn((amount: number, rate?: number) => amount * (rate ?? 9.6)),
}));

vi.mock("@/lib/trading/core/distributed-lock", () => ({
  acquireTradeLock: vi.fn().mockResolvedValue({
    acquired: true,
    release: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@/lib/trading/idempotency", () => ({
  makeIdempotencyKey: vi.fn().mockReturnValue("test-idempotency-key"),
  withIdempotency: vi.fn((_db, _key, _scope, _hash, operation) => operation()),
}));

// ─── Rene hjelpefunksjoner ──────────────────────────────────────────────────

describe("getPositionBaseQuantity", () => {
  it("returnerer 0 for null/undefined", () => {
    expect(getPositionBaseQuantity(null)).toBe(0);
    expect(getPositionBaseQuantity(undefined)).toBe(0);
  });

  it("leser trigger-skrevet posisjon (kun quantity)", () => {
    expect(getPositionBaseQuantity({ side: "long", quantity: 0.0321 })).toBeCloseTo(0.0321, 8);
  });

  it("summerer FIFO-lots når de finnes", () => {
    expect(
      getPositionBaseQuantity({
        side: "long",
        quantity: 999, // skal ignoreres når lots finnes
        lots: [{ quantity: 0.01 }, { quantity: 0.02 }, { quantity: 0.005 }],
      }),
    ).toBeCloseTo(0.035, 8);
  });

  it("returnerer 0 for negativ/ugyldig quantity", () => {
    expect(getPositionBaseQuantity({ quantity: -0.5 })).toBe(0);
    expect(getPositionBaseQuantity({ quantity: Number.NaN })).toBe(0);
  });
});

describe("normalizePositionPricesToUsdt", () => {
  const market = 64429; // BTC-USDT
  const rate = 9.6;

  it("deler NOK-denominerte priser på raten", () => {
    const pos = {
      side: "long",
      quantity: 0.0321,
      entry_price: 618900, // NOK (~64 469 USDT)
      highest_price: 624080,
      entry_time: "2026-07-27T19:38:00Z",
    };
    const normalized = normalizePositionPricesToUsdt(pos, market, rate);
    expect(normalized.entry_price).toBeCloseTo(618900 / 9.6, 2);
    expect(normalized.highest_price).toBeCloseTo(624080 / 9.6, 2);
    // Beholdning røres aldri
    expect(normalized.quantity).toBe(0.0321);
  });

  it("lar USDT-denominerte priser stå urørt", () => {
    const pos = { side: "long", quantity: 0.5, entry_price: 62000, highest_price: 65000 };
    const normalized = normalizePositionPricesToUsdt(pos, market, rate);
    expect(normalized.entry_price).toBe(62000);
    expect(normalized.highest_price).toBe(65000);
  });

  it("normaliserer korrupt høy highest_price (196 801 > 2.5× marked)", () => {
    const pos = { side: "long", quantity: 0.5, entry_price: 4492, highest_price: 196801 };
    const normalized = normalizePositionPricesToUsdt(pos, market, rate);
    expect(normalized.highest_price).toBeCloseTo(196801 / 9.6, 2);
    // Lav entry røres ikke (kan være ekte gammel USDT-verdi)
    expect(normalized.entry_price).toBe(4492);
  });

  it("normaliserer lots-entryPrice", () => {
    const pos = {
      side: "long",
      quantity: 0.02,
      lots: [
        { quantity: 0.01, entryPrice: 618900, timestamp: "2026-07-20T10:00:00Z" },
        { quantity: 0.01, entryPrice: 64500, timestamp: "2026-07-21T10:00:00Z" },
      ],
    };
    const normalized = normalizePositionPricesToUsdt(pos, market, rate);
    expect(normalized.lots![0].entryPrice).toBeCloseTo(618900 / 9.6, 2);
    expect(normalized.lots![1].entryPrice).toBe(64500);
  });

  it("muterer ikke input", () => {
    const pos = { side: "long", quantity: 0.1, entry_price: 618900 };
    normalizePositionPricesToUsdt(pos, market, rate);
    expect(pos.entry_price).toBe(618900);
  });
});

describe("isPositionEntryPlausible", () => {
  it("avviser korrupt entry >90 % under marked (prod-tilfellet: 4,5k vs 64,5k)", () => {
    expect(isPositionEntryPlausible(4492, 64429)).toBe(false);
  });

  it("godtar NOK-entry (normaliseres separat)", () => {
    expect(isPositionEntryPlausible(618900, 64429)).toBe(true);
  });

  it("godtar normal USDT-entry", () => {
    expect(isPositionEntryPlausible(60000, 64429)).toBe(true);
  });

  it("avviser ugyldig entry (0/negativ/NaN)", () => {
    expect(isPositionEntryPlausible(0, 64429)).toBe(false);
    expect(isPositionEntryPlausible(-100, 64429)).toBe(false);
    expect(isPositionEntryPlausible(Number.NaN, 64429)).toBe(false);
  });

  it("uten markedspris kan vi ikke vurdere → tillatt (legacy)", () => {
    expect(isPositionEntryPlausible(4492, 0)).toBe(true);
  });
});

// ─── executeTrade sell-guard ────────────────────────────────────────────────

describe("executeTrade paper sell-guard (inflasjonsfiks)", () => {
  let insertCalls: Array<{ table: string; payload: Record<string, unknown> }>;

  function makeMockSupabase(openPosition: unknown) {
    const sessionRow = {
      id: "session-123",
      user_id: "user-123",
      current_capital_nok: 100000,
      current_capital: 100000,
      status: "active",
      mode: "paper",
      strategy_config: {},
      open_position: openPosition,
    };
    return {
      from: vi.fn((table: string) => {
        const chain = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn((payload: Record<string, unknown>) => {
            insertCalls.push({ table, payload });
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: "trade-123" }, error: null }),
              }),
            };
          }),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: sessionRow, error: null }),
          single: vi.fn().mockResolvedValue({ data: sessionRow, error: null }),
          rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
        return chain;
      }),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    insertCalls = [];
    executeOrderMock.mockResolvedValue({
      success: true,
      executedQuantity: 0.05,
      executedPrice: 64429,
      fee: 0.5,
      timestamp: new Date("2026-07-27T20:00:00Z"),
    });
  });

  it("SALG UTEN POSISJON avvises med NO_POSITION — ingen trade insertes", async () => {
    const { executeTrade } = await import("../core/execute-trade");
    const mockSupabase = makeMockSupabase(null);

    const result = await executeTrade(mockSupabase as unknown as SupabaseClient<Database>, {
      userId: "user-123",
      symbol: "BTCUSDT",
      side: "sell",
      quantity: 0.1,
      price: 64429,
      orderType: "market",
      mode: "paper",
      sessionId: "session-123",
    });

    expect(result.success).toBe(false);
    expect(result.rejectionReason).toBe("NO_POSITION");
    // Ingen trade → ingen trigger-kreditering → ingen pengemengde-inflasjon
    expect(insertCalls.find((c) => c.table === "trades")).toBeUndefined();
    expect(executeOrderMock).not.toHaveBeenCalled();
  });

  it("SALG STØRRE ENN BEHOLDNING clampes til faktisk qty", async () => {
    const { executeTrade } = await import("../core/execute-trade");
    const mockSupabase = makeMockSupabase({
      side: "long",
      quantity: 0.05,
      entry_price: 618900,
      entry_time: "2026-07-27T19:00:00Z",
    });

    const result = await executeTrade(mockSupabase as unknown as SupabaseClient<Database>, {
      userId: "user-123",
      symbol: "BTCUSDT",
      side: "sell",
      quantity: 0.25, // 5× beholdningen — slik skjedde inflasjonen i prod
      price: 64429,
      orderType: "market",
      mode: "paper",
      sessionId: "session-123",
    });

    expect(result.success).toBe(true);
    // Executor fikk KUN faktisk beholdning
    expect(executeOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({ side: "sell", quantity: 0.05 }),
    );
  });

  it("KJØP påvirkes ikke av sell-guarden", async () => {
    const { executeTrade } = await import("../core/execute-trade");
    const mockSupabase = makeMockSupabase(null);

    const result = await executeTrade(mockSupabase as unknown as SupabaseClient<Database>, {
      userId: "user-123",
      symbol: "BTCUSDT",
      side: "buy",
      quantity: 0.01,
      price: 64429,
      orderType: "market",
      mode: "paper",
      sessionId: "session-123",
    });

    expect(result.success).toBe(true);
    expect(executeOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({ side: "buy", quantity: 0.01 }),
    );
  });
});
