/**
 * Paper executor vs backtest engine fill parity test (C5 parity test plan, Task 2).
 *
 * Verifies that `PaperExecutor.executeOrder` and `runBacktest` invoke the same
 * canonical fill model with identical deterministic inputs, producing the same
 * `executedQuantity`, `executedPrice`, and `fee`.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import * as fillModel from "@/lib/trading/canonical/execution/fill-model";
import type {
  FillModelParams,
  FillModelResult,
} from "@/lib/trading/canonical/execution/fill-model";
import {
  runBacktest,
  STRATEGY_CONFIGS,
  type OHLCV,
} from "@/lib/trading/backtestEngine";
import { PaperExecutor, PAPER_PARAMS } from "@/lib/trading/paper-executor";

const { FIXED_PRICE, FIXED_RATE, INITIAL_CAPITAL_USD } = vi.hoisted(() => ({
  FIXED_PRICE: 50_000,
  FIXED_RATE: 10.92,
  INITIAL_CAPITAL_USD: 100_000,
}));

const originalComputeFill = fillModel.computeFill;

vi.mock("@/lib/trading/canonical/market-data", () => ({
  createBinanceMarketDataProvider: vi.fn().mockReturnValue({
    getPrice: vi.fn().mockResolvedValue(FIXED_PRICE),
    getDepth: vi.fn().mockResolvedValue({
      bids: [],
      asks: [],
      timestamp: new Date(),
    }),
    getKlines: vi.fn().mockResolvedValue([]),
    get24hChange: vi.fn().mockResolvedValue(0),
  }),
  BinanceMarketDataProvider: class {},
}));

vi.mock("@/lib/trading/currency", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/trading/currency")>();
  return {
    ...actual,
    getUsdtToNokRateAsync: vi.fn().mockResolvedValue(FIXED_RATE),
    getUsdtToNokRate: vi.fn().mockReturnValue(FIXED_RATE),
    usdtToNok: vi.fn(
      (amount: number, rate?: number) => amount * (rate ?? FIXED_RATE),
    ),
  };
});

function createMockSupabase(capitalNok: number) {
  const session = {
    id: "paper-session-1",
    user_id: "user-1",
    current_capital_nok: capitalNok,
    current_capital: capitalNok,
    status: "active",
    mode: "paper",
    open_position: null,
    trading_pair: "BTCUSDT",
  };

  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: session, error: null }),
    single: vi.fn().mockResolvedValue({ data: session, error: null }),
  };

  return {
    from: vi.fn().mockReturnValue(chain),
  } as unknown as SupabaseClient<Database>;
}

function makeCandles(options: {
  count: number;
  buyIndex: number;
  buyPrice: number;
  preBuyPrice: number;
  postBuyPrice: number;
}): OHLCV[] {
  const {
    count,
    buyIndex,
    buyPrice,
    preBuyPrice,
    postBuyPrice,
  } = options;
  const startTime = 1_700_000_000_000;
  const candles: OHLCV[] = [];

  for (let i = 0; i < count; i++) {
    const close =
      i < buyIndex ? preBuyPrice : i === buyIndex ? buyPrice : postBuyPrice;
    candles.push({
      timestamp: startTime + i * 24 * 60 * 60 * 1000,
      open: close,
      high: close * 1.001,
      low: close * 0.999,
      close,
      volume: 1_000_000,
    });
  }

  return candles;
}

type CapturedFill = { params: FillModelParams; result: FillModelResult };

function spyOnComputeFill(captured: CapturedFill[]) {
  return vi.spyOn(fillModel, "computeFill").mockImplementation((params) => {
    const result = (originalComputeFill as typeof fillModel.computeFill)(params);
    captured.push({ params: { ...params }, result });
    return result;
  });
}

function spyOnComputeFillAsLimit(captured: CapturedFill[]) {
  return vi.spyOn(fillModel, "computeFill").mockImplementation((params) => {
    const limitParams = {
      ...params,
      orderType: "limit" as const,
      limitPrice: params.marketPrice,
    };
    const result = (originalComputeFill as typeof fillModel.computeFill)(limitParams);
    captured.push({ params: limitParams, result });
    return result;
  });
}

async function executePaperOrder(
  side: "buy" | "sell",
  quantity: number,
  orderType: "market" | "limit" = "market",
  price?: number,
) {
  // Plenty of NOK capital so USD buying power comfortably exceeds any test fill.
  const mockSupabase = createMockSupabase(10_000_000);
  const executor = new PaperExecutor(
    mockSupabase as unknown as SupabaseClient<Database>,
    "user-1",
  );

  return executor.executeOrder({
    symbol: "BTCUSDT",
    side,
    quantity,
    orderType,
    price,
  });
}

function assertFillParity(
  paperResult: Awaited<ReturnType<PaperExecutor["executeOrder"]>>,
  backtestFill: CapturedFill,
  requestedQuantity: number,
) {
  expect(paperResult.success).toBe(true);
  expect(paperResult.error).toBeUndefined();
  expect(paperResult.executedQuantity).toBe(requestedQuantity);
  expect(paperResult.executedQuantity).toBe(backtestFill.result.executedQuantity);
  expect(paperResult.executedPrice).toBeCloseTo(
    backtestFill.result.executedPrice,
    10,
  );
  expect(paperResult.fee).toBeCloseTo(backtestFill.result.fee, 10);

  if (backtestFill.params.orderType === "limit") {
    expect(paperResult.executedPrice).toBeCloseTo(
      backtestFill.params.limitPrice ?? backtestFill.params.marketPrice,
      10,
    );
  } else {
    expect(paperResult.executedPrice).toBeCloseTo(
      backtestFill.params.marketPrice *
        (1 +
          (backtestFill.params.side === "buy"
            ? PAPER_PARAMS.marketSlippageRate
            : -PAPER_PARAMS.marketSlippageRate)),
      10,
    );
  }
}

describe("paper executor vs backtest engine fill parity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("produces identical market buy fills", async () => {
    const config = STRATEGY_CONFIGS.konservativ;
    const candles = makeCandles({
      count: 150,
      buyIndex: 100,
      preBuyPrice: 49_000,
      buyPrice: FIXED_PRICE,
      postBuyPrice: FIXED_PRICE,
    });

    const captured: CapturedFill[] = [];
    const spy = spyOnComputeFill(captured);

    try {
      runBacktest(candles, config, INITIAL_CAPITAL_USD);
    } finally {
      spy.mockRestore();
    }

    const backtestBuy = captured.find((c) => c.params.side === "buy");
    expect(backtestBuy).toBeDefined();
    if (!backtestBuy) throw new Error("No backtest buy fill captured");

    const paperResult = await executePaperOrder(
      "buy",
      backtestBuy.params.quantity,
    );

    assertFillParity(paperResult, backtestBuy, backtestBuy.params.quantity);
    expect(backtestBuy.params.marketPrice).toBe(FIXED_PRICE);
  });

  it("produces identical market sell fills", async () => {
    const config = STRATEGY_CONFIGS.konservativ;
    const candles = makeCandles({
      count: 150,
      buyIndex: 100,
      preBuyPrice: 45_000,
      buyPrice: 45_000,
      // Rise ~11 % above entry to trigger the first DCA partial take-profit
      // so the first sell fill executes at the fixed parity price.
      postBuyPrice: FIXED_PRICE,
    });

    const captured: CapturedFill[] = [];
    const spy = spyOnComputeFill(captured);

    try {
      runBacktest(candles, config, INITIAL_CAPITAL_USD);
    } finally {
      spy.mockRestore();
    }

    const backtestSell = captured.find((c) => c.params.side === "sell");
    expect(backtestSell).toBeDefined();
    if (!backtestSell) throw new Error("No backtest sell fill captured");

    const paperResult = await executePaperOrder(
      "sell",
      backtestSell.params.quantity,
    );

    assertFillParity(paperResult, backtestSell, backtestSell.params.quantity);
    expect(backtestSell.params.marketPrice).toBe(FIXED_PRICE);
  });

  it("produces identical limit buy fills via the canonical fill model and backtest", async () => {
    const limitPrice = FIXED_PRICE;

    // Deterministic backtest limit-entry scenario: every candle closes at the
    // limit price, so the captured backtest fill (forced to orderType=limit)
    // should match the paper limit result exactly.
    const config = STRATEGY_CONFIGS.konservativ;
    const candles = makeCandles({
      count: 150,
      buyIndex: 100,
      preBuyPrice: FIXED_PRICE,
      buyPrice: FIXED_PRICE,
      postBuyPrice: FIXED_PRICE,
    });

    const captured: CapturedFill[] = [];
    const spy = spyOnComputeFillAsLimit(captured);

    try {
      runBacktest(candles, config, INITIAL_CAPITAL_USD);
    } finally {
      spy.mockRestore();
    }

    const backtestLimitBuy = captured.find((c) => c.params.side === "buy");
    expect(backtestLimitBuy).toBeDefined();
    if (!backtestLimitBuy) throw new Error("No backtest limit buy fill captured");

    expect(backtestLimitBuy.params.orderType).toBe("limit");
    expect(backtestLimitBuy.params.limitPrice).toBe(FIXED_PRICE);

    const quantity = backtestLimitBuy.params.quantity;
    const availableUsdt = 10_000_000 / FIXED_RATE;

    const paperResult = await executePaperOrder("buy", quantity, "limit", limitPrice);

    const canonical = originalComputeFill({
      side: "buy",
      quantity,
      orderType: "limit",
      limitPrice,
      marketPrice: FIXED_PRICE,
      feeRate: PAPER_PARAMS.feeRate,
      marketSlippageRate: PAPER_PARAMS.marketSlippageRate,
      minOrderValue: PAPER_PARAMS.minOrderValue,
      availableCapital: availableUsdt,
      quoteCurrency: "USDT",
    });

    expect(paperResult.success).toBe(true);
    expect(paperResult.executedQuantity).toBe(quantity);
    expect(paperResult.executedPrice).toBeCloseTo(canonical.executedPrice, 10);
    expect(paperResult.fee).toBeCloseTo(canonical.fee, 10);

    assertFillParity(paperResult, backtestLimitBuy, quantity);
  });
});
