/**
 * OrderExecutor contract parity test (C5 parity test plan, Task 3).
 *
 * Verifies that `PaperExecutor` and `BinanceExecutor` both honour the shared
 * `OrderExecutor` interface: identical method signatures, the same result
 * shapes, and consistent failure/success semantics.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { PaperExecutor } from "@/lib/trading/paper-executor";
import { BinanceExecutor } from "@/lib/trading/binance-executor";
import type {
  OrderExecutor,
  OrderParams,
  OrderResult,
  BalanceInfo,
  Position,
  OrderBookSnapshot,
} from "@/lib/trading/order-executor";
import {
  binanceCircuitBreaker,
  resetAllCircuitBreakers,
} from "@/lib/trading/circuit-breaker";

const { FIXED_PRICE, FIXED_RATE } = vi.hoisted(() => ({
  FIXED_PRICE: 50_000,
  FIXED_RATE: 10.92,
}));

vi.mock("@/lib/trading/currency", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/trading/currency")>();
  return {
    ...actual,
    getUsdtToNokRateAsync: vi.fn().mockResolvedValue(FIXED_RATE),
    getUsdtToNokRate: vi.fn().mockReturnValue(FIXED_RATE),
    usdtToNok: vi.fn(
      (amount: number, rate?: number) => amount * (rate ?? FIXED_RATE),
    ),
  };
});

function createMockSupabase(): SupabaseClient<Database> {
  const position = {
    quantity: 0.01,
    entry_price: 49_000,
    entry_time: Date.now() - 60_000,
  };

  const session = {
    id: "paper-session-1",
    user_id: "user-1",
    current_capital_nok: 10_000_000,
    current_capital: 10_000_000,
    status: "active",
    mode: "paper",
    open_position: position,
    trading_pair: "BTCUSDT",
  };

  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: session, error: null }),
    single: vi.fn().mockResolvedValue({ data: session, error: null }),
  };

  return {
    from: vi.fn().mockReturnValue(chain),
  } as unknown as SupabaseClient<Database>;
}

function mockBinanceFetch() {
  return vi.fn(async (input: string | URL) => {
    const url = input.toString();

    if (url.includes("/api/v3/order")) {
      return new Response(
        JSON.stringify({
          orderId: 12345,
          clientOrderId: "client-1",
          transactTime: Date.now(),
          price: "0",
          origQty: "0.01",
          executedQty: "0.01",
          cummulativeQuoteQty: "500",
          status: "FILLED",
          type: "MARKET",
          side: "BUY",
          fills: [
            {
              price: FIXED_PRICE.toString(),
              qty: "0.01",
              commission: "0.5",
              commissionAsset: "USDT",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (url.includes("/api/v3/account")) {
      return new Response(
        JSON.stringify({
          balances: [
            { asset: "USDT", free: "100000", locked: "0" },
            { asset: "BTC", free: "0.01", locked: "0" },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (url.includes("/api/v3/openOrders")) {
      return new Response(
        JSON.stringify([
          {
            orderId: 1,
            symbol: "BTCUSDT",
            side: "BUY",
            price: FIXED_PRICE.toString(),
            origQty: "0.01",
            executedQty: "0.01",
            status: "FILLED",
            time: Date.now(),
          },
        ]),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (url.includes("/api/v3/ticker/price")) {
      return new Response(
        JSON.stringify({ symbol: "BTCUSDT", price: FIXED_PRICE.toString() }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (url.includes("/api/v3/depth")) {
      return new Response(
        JSON.stringify({
          bids: [[(FIXED_PRICE * 0.999).toString(), "1"]],
          asks: [[(FIXED_PRICE * 1.001).toString(), "1"]],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    throw new Error(`Unexpected fetch in parity test: ${url}`);
  });
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
    resetAllCircuitBreakers();
  });

  it("PaperExecutor and BinanceExecutor both satisfy the OrderExecutor interface", () => {
    const supabase = createMockSupabase();
    const paper = new PaperExecutor(supabase, "user-1");
    const live = new BinanceExecutor({
      apiKey: "dummy-key",
      apiSecret: "dummy-secret",
      testnet: true,
    });

    // Compile-time contract check: both must be assignable to OrderExecutor.
    const _paper: OrderExecutor = paper;
    const _live: OrderExecutor = live;
    expect(_paper.executeOrder).toBeTypeOf("function");
    expect(_live.executeOrder).toBeTypeOf("function");
  });

  it("executeOrder returns the same OrderResult shape for a successful market buy", async () => {
    globalThis.fetch = mockBinanceFetch();

    const params: OrderParams = {
      symbol: "BTCUSDT",
      side: "buy",
      quantity: 0.01,
      orderType: "market",
    };

    const supabase = createMockSupabase();
    const paper = new PaperExecutor(supabase, "user-1");
    const live = new BinanceExecutor({
      apiKey: "dummy-key",
      apiSecret: "dummy-secret",
      testnet: true,
    });

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

    // Live mode failure path is the circuit-breaker-open path, which also
    // returns a structured OrderResult rather than throwing.
    binanceCircuitBreaker.forceState("OPEN");
    const live = new BinanceExecutor({
      apiKey: "dummy-key",
      apiSecret: "dummy-secret",
      testnet: true,
    });
    const liveFailure = await live.executeOrder({
      symbol: "BTCUSDT",
      side: "buy",
      quantity: 0.01,
      orderType: "market",
    });

    assertOrderResultShape(liveFailure);
    expect(liveFailure.success).toBe(false);
    expect(liveFailure.error).toBeTruthy();
    expect(liveFailure.executedQuantity).toBe(0);
    expect(liveFailure.executedPrice).toBe(0);
  });

  it("getBalance returns a BalanceInfo shape from both executors", async () => {
    globalThis.fetch = mockBinanceFetch();

    const supabase = createMockSupabase();
    const paper = new PaperExecutor(supabase, "user-1");
    const live = new BinanceExecutor({
      apiKey: "dummy-key",
      apiSecret: "dummy-secret",
      testnet: true,
    });

    const paperBalance = await paper.getBalance();
    const liveBalance = await live.getBalance();

    assertBalanceInfoShape(paperBalance);
    assertBalanceInfoShape(liveBalance);
  });

  it("getPosition returns a Position shape or null from both executors", async () => {
    globalThis.fetch = mockBinanceFetch();

    const supabase = createMockSupabase();
    const paper = new PaperExecutor(supabase, "user-1");
    const live = new BinanceExecutor({
      apiKey: "dummy-key",
      apiSecret: "dummy-secret",
      testnet: true,
    });

    const paperPosition = await paper.getPosition("BTCUSDT");
    const livePosition = await live.getPosition("BTCUSDT");

    assertPositionShape(paperPosition);
    assertPositionShape(livePosition);
  });

  it("validateApiKeys returns a boolean from both executors", async () => {
    globalThis.fetch = mockBinanceFetch();

    const supabase = createMockSupabase();
    const paper = new PaperExecutor(supabase, "user-1");
    const live = new BinanceExecutor({
      apiKey: "dummy-key",
      apiSecret: "dummy-secret",
      testnet: true,
    });

    expect(await paper.validateApiKeys()).toBe(true);
    expect(await live.validateApiKeys()).toBe(true);
  });

  it("getMarketPrice and fetchOrderBook return the same types from both executors", async () => {
    globalThis.fetch = mockBinanceFetch();

    const supabase = createMockSupabase();
    const paper = new PaperExecutor(supabase, "user-1");
    const live = new BinanceExecutor({
      apiKey: "dummy-key",
      apiSecret: "dummy-secret",
      testnet: true,
    });

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
