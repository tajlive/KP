/**
 * OrderExecutor contract parity test (C5 parity test plan, Task 3).
 *
 * Verifies that `PaperExecutor` and `KrakenExecutor` both honour the shared
 * `OrderExecutor` interface: identical method signatures, the same result
 * shapes, and consistent failure/success semantics.
 *
 * EU/EØS (2026): Kraken er Klarpakkes eneste live-børs.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { PaperExecutor } from "@/lib/trading/paper-executor";
import { KrakenExecutor } from "@/lib/trading/kraken-executor";
import type {
  OrderExecutor,
  OrderParams,
  OrderResult,
  BalanceInfo,
  Position,
  OrderBookSnapshot,
} from "@/lib/trading/order-executor";

const { FIXED_PRICE, FIXED_RATE } = vi.hoisted(() => ({
  FIXED_PRICE: 50_000,
  FIXED_RATE: 10.92,
}));

// Mock KrakenClient — vi trenger ikke ekte signaturer for kontrakttesten.
vi.mock("@/lib/exchanges/kraken/client", () => {
  const KrakenLockoutError = class extends Error {};
  class MockKrakenClient {
    marketBuy = vi.fn();
    marketSell = vi.fn();
    limitBuy = vi.fn();
    limitSell = vi.fn();
    getTradeHistory = vi.fn();
    getTicker = vi.fn();
    getBalance = vi.fn();
  }
  return { KrakenClient: MockKrakenClient, KrakenLockoutError };
});

// Mock priskilde: PaperExecutor henter nå priser fra KrakenProvider.
// Vi stuber den til en fast pris slik at kontrakttesten er deterministisk.
vi.mock("@/lib/trading/canonical/market-data", () => ({
  createKrakenMarketDataProvider: () => ({
    getPrice: vi.fn(async () => FIXED_PRICE),
    getKlines: vi.fn(async () => []),
    getDepth: vi.fn(async () => ({
      bids: [{ price: FIXED_PRICE * 0.999, quantity: 1 }],
      asks: [{ price: FIXED_PRICE * 1.001, quantity: 1 }],
      timestamp: new Date(),
    })),
  }),
  KrakenMarketDataProvider: class {},
}));

vi.mock("@/lib/trading/currency", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/trading/currency")>();
  return {
    ...actual,
    getUsdtToNokRateAsync: vi.fn(async () => FIXED_RATE),
    getUsdtToNokRate: vi.fn(() => FIXED_RATE),
  };
});

import { KrakenClient } from "@/lib/exchanges/kraken/client";

function createMockSupabase() {
  const noopQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: {
        id: "sess-paper-1",
        current_capital_nok: 1_000_000,
        open_position: null,
      },
      error: null,
    }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return {
    from: vi.fn(() => noopQuery),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  } as unknown as SupabaseClient<Database>;
}

function mockKrakenClient() {
  const client = new KrakenClient("k", "s") as InstanceType<
    typeof KrakenClient
  >;
  vi.mocked(client.marketBuy).mockResolvedValue({
    txid: ["TX-PARITY"],
    descr: { pair: "XBTUSDC", type: "buy", ordertype: "market" },
  } as never);
  vi.mocked(client.marketSell).mockResolvedValue({
    txid: ["TX-PARITY"],
    descr: { pair: "XBTUSDC", type: "sell", ordertype: "market" },
  } as never);
  vi.mocked(client.getTradeHistory).mockResolvedValue({
    trades: {
      T1: {
        ordertxid: "TX-PARITY",
        price: FIXED_PRICE.toString(),
        vol: "0.01",
        fee: "4",
        time: Date.now() / 1000,
      },
    },
  } as never);
  vi.mocked(client.getBalance).mockResolvedValue({
    result: { USDC: "100000", XBT: "0.01" },
  } as never);
  vi.mocked(client.getTicker).mockResolvedValue({
    c: [FIXED_PRICE.toString(), "1"],
    b: [(FIXED_PRICE * 0.999).toString(), "1"],
    a: [(FIXED_PRICE * 1.001).toString(), "1"],
  } as never);
  return client;
}

function assertOrderResultShape(result: OrderResult) {
  expect(result).toHaveProperty("success");
  expect(typeof result.success).toBe("boolean");
  expect(result).toHaveProperty("orderId");
  expect(typeof result.orderId).toBe("string");
  expect(result).toHaveProperty("executedPrice");
  expect(typeof result.executedPrice).toBe("number");
  expect(result).toHaveProperty("executedQuantity");
  expect(typeof result.executedQuantity).toBe("number");
  expect(result).toHaveProperty("fee");
  expect(typeof result.fee).toBe("number");
  expect(result).toHaveProperty("timestamp");
  expect(result.timestamp).toBeInstanceOf(Date);
}

function assertBalanceInfoShape(balance: BalanceInfo) {
  expect(balance).toHaveProperty("available");
  expect(typeof balance.available).toBe("number");
  expect(balance.locked === undefined || typeof balance.locked).toBe(
    "number",
  );
  expect(balance.total === undefined || typeof balance.total).toBe("number");
}

function assertPositionShape(position: Position | null) {
  if (position === null) return;
  expect(position).toHaveProperty("symbol");
  expect(position).toHaveProperty("quantity");
  expect(position).toHaveProperty("entryPrice");
  expect(position).toHaveProperty("entryTime");
  expect(position).toHaveProperty("unrealizedPnL");
  expect(position).toHaveProperty("unrealizedPnLPct");
}

function assertOrderBookShape(book: OrderBookSnapshot) {
  expect(book).toHaveProperty("bids");
  expect(book).toHaveProperty("asks");
  expect(book).toHaveProperty("timestamp");
  expect(book.timestamp).toBeInstanceOf(Date);
  expect(Array.isArray(book.bids)).toBe(true);
  expect(Array.isArray(book.asks)).toBe(true);
  if (book.bids.length > 0) {
    expect(book.bids[0]).toHaveProperty("price");
    expect(book.bids[0]).toHaveProperty("quantity");
  }
}

describe("OrderExecutor contract parity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PaperExecutor and KrakenExecutor both satisfy the OrderExecutor interface", () => {
    const supabase = createMockSupabase();
    const paper = new PaperExecutor(supabase, "user-1");
    const live = new KrakenExecutor(mockKrakenClient() as never);

    // Compile-time contract check: both must be assignable to OrderExecutor.
    const _paper: OrderExecutor = paper;
    const _live: OrderExecutor = live;
    expect(_paper.executeOrder).toBeTypeOf("function");
    expect(_live.executeOrder).toBeTypeOf("function");
  });

  it("executeOrder returns the same OrderResult shape for a successful market buy", async () => {
    const params: OrderParams = {
      symbol: "BTCUSDT",
      side: "buy",
      quantity: 0.01,
      orderType: "market",
    };

    const supabase = createMockSupabase();
    const paper = new PaperExecutor(supabase, "user-1");
    const live = new KrakenExecutor(mockKrakenClient() as never);

    const paperResult = await paper.executeOrder(params);
    const liveResult = await live.executeOrder(params);

    assertOrderResultShape(paperResult);
    assertOrderResultShape(liveResult);

    expect(paperResult.success).toBe(true);
    expect(liveResult.success).toBe(true);

    expect(paperResult.orderId).not.toBe("");
    expect(liveResult.orderId).not.toBe("");

    expect(paperResult.executedQuantity).toBe(params.quantity);
    expect(liveResult.executedQuantity).toBe(params.quantity);

    expect(paperResult.executedPrice).toBeGreaterThan(0);
    expect(liveResult.executedPrice).toBeGreaterThan(0);

    expect(paperResult.fee).toBeGreaterThanOrEqual(0);
    expect(liveResult.fee).toBeGreaterThanOrEqual(0);
  });

  it("executeOrder returns a failure result with an error message", async () => {
    const supabase = createMockSupabase();
    const paper = new PaperExecutor(supabase, "user-1");

    const invalidParams: OrderParams = {
      symbol: "BTCUSDT",
      side: "buy",
      quantity: -0.01,
      orderType: "market",
    };

    const paperFailure = await paper.executeOrder(invalidParams);
    assertOrderResultShape(paperFailure);
    expect(paperFailure.success).toBe(false);
    expect(paperFailure.error).toBeTruthy();
    expect(paperFailure.executedQuantity).toBe(0);
    expect(paperFailure.executedPrice).toBe(0);

    // Live failure path: ugyldig kvantum → strukturert OrderResult, ikke throw.
    const live = new KrakenExecutor(mockKrakenClient() as never);
    const liveFailure = await live.executeOrder(invalidParams);

    assertOrderResultShape(liveFailure);
    expect(liveFailure.success).toBe(false);
    expect(liveFailure.error).toBeTruthy();
    expect(liveFailure.executedQuantity).toBe(0);
    expect(liveFailure.executedPrice).toBe(0);
  });

  it("getBalance returns a BalanceInfo shape from both executors", async () => {
    const supabase = createMockSupabase();
    const paper = new PaperExecutor(supabase, "user-1");
    const live = new KrakenExecutor(mockKrakenClient() as never);

    const paperBalance = await paper.getBalance();
    const liveBalance = await live.getBalance();

    assertBalanceInfoShape(paperBalance);
    assertBalanceInfoShape(liveBalance);
  });

  it("getPosition returns a Position shape or null from both executors", async () => {
    const supabase = createMockSupabase();
    const paper = new PaperExecutor(supabase, "user-1");
    const live = new KrakenExecutor(mockKrakenClient() as never);

    const paperPosition = await paper.getPosition("BTCUSDT");
    const livePosition = await live.getPosition("BTCUSDT");

    assertPositionShape(paperPosition);
    assertPositionShape(livePosition);
  });

  it("validateApiKeys returns a boolean from both executors", async () => {
    const supabase = createMockSupabase();
    const paper = new PaperExecutor(supabase, "user-1");
    const live = new KrakenExecutor(mockKrakenClient() as never);

    expect(await paper.validateApiKeys()).toBe(true);
    expect(await live.validateApiKeys()).toBe(true);
  });

  it("getMarketPrice and fetchOrderBook return the same types from both executors", async () => {
    const supabase = createMockSupabase();
    const paper = new PaperExecutor(supabase, "user-1");
    const live = new KrakenExecutor(mockKrakenClient() as never);

    const paperPrice = await paper.getMarketPrice("BTCUSDT");
    const livePrice = await live.getMarketPrice("BTCUSDT");
    expect(typeof paperPrice).toBe("number");
    expect(typeof livePrice).toBe("number");

    const paperBook = await paper.fetchOrderBook("BTCUSDT", 5);
    const liveBook = await live.fetchOrderBook("BTCUSDT", 5);
    assertOrderBookShape(paperBook);
    assertOrderBookShape(liveBook);
  });
});
