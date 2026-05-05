import { describe, it, expect } from "vitest";
import { estimateSlippage } from "../slippage-estimator";
import type { OrderBookSnapshot } from "../../order-executor";

function makeOrderBook(
  bids: [number, number][],
  asks: [number, number][]
): OrderBookSnapshot {
  return {
    bids: bids.map(([price, quantity]) => ({ price, quantity })),
    asks: asks.map(([price, quantity]) => ({ price, quantity })),
    timestamp: new Date(),
  };
}

describe("estimateSlippage", () => {
  it("returns no slippage for tiny order within top level (buy)", () => {
    const ob = makeOrderBook(
      [[99, 10]],
      [[101, 10]]
    );
    const result = estimateSlippage(ob, 1, "buy");
    expect(result.slippageBps).toBeGreaterThanOrEqual(1);
    expect(result.estimatedPrice).toBeCloseTo(101, 0);
  });

  it("calculates slippage across multiple ask levels (buy)", () => {
    const ob = makeOrderBook(
      [[99, 10]],
      [
        [100, 5],
        [101, 5],
        [102, 5],
      ]
    );
    const result = estimateSlippage(ob, 8, "buy");
    // 5@100 + 3@101 = 803 / 8 = 100.375
    expect(result.estimatedPrice).toBeCloseTo(100.375, 2);
    expect(result.slippageBps).toBeGreaterThan(1);
  });

  it("calculates slippage across multiple bid levels (sell)", () => {
    const ob = makeOrderBook(
      [
        [100, 5],
        [99, 5],
        [98, 5],
      ],
      [[101, 10]]
    );
    const result = estimateSlippage(ob, 8, "sell");
    // 5@100 + 3@99 = 797 / 8 = 99.625
    expect(result.estimatedPrice).toBeCloseTo(99.625, 2);
  });

  it("adds penalty when order book is too thin (buy)", () => {
    const ob = makeOrderBook(
      [[99, 10]],
      [[100, 2]]
    );
    const result = estimateSlippage(ob, 10, "buy");
    // 2@100 + 8@102 = 1016 / 10 = 101.6
    expect(result.estimatedPrice).toBeCloseTo(101.6, 1);
  });

  it("adds penalty when order book is too thin (sell)", () => {
    const ob = makeOrderBook(
      [[100, 2]],
      [[101, 10]]
    );
    const result = estimateSlippage(ob, 10, "sell");
    // 2@100 + 8@98 = 984 / 10 = 98.4
    expect(result.estimatedPrice).toBeCloseTo(98.4, 1);
  });

  it("returns at least 1 bps slippage", () => {
    const ob = makeOrderBook(
      [[100, 100]],
      [[100, 100]]
    );
    const result = estimateSlippage(ob, 1, "buy");
    expect(result.slippageBps).toBeGreaterThanOrEqual(1);
  });
});
