import type { OrderBookSnapshot } from "../order-executor";

/**
 * Estimate slippage based on order book depth
 */
export function estimateSlippage(
  orderBook: OrderBookSnapshot,
  quantity: number,
  side: "buy" | "sell"
): { estimatedPrice: number; slippageBps: number } {
  const levels = side === "buy" ? orderBook.asks : orderBook.bids;
  let remainingQty = quantity;
  let totalPrice = 0;

  const midPrice =
    (orderBook.bids[0]?.price + orderBook.asks[0]?.price) / 2 ||
    levels[0]?.price;

  for (const level of levels) {
    const fillQty = Math.min(remainingQty, level.quantity);
    totalPrice += fillQty * level.price;
    remainingQty -= fillQty;

    if (remainingQty <= 0) break;
  }

  // If order book is too thin, assume extra slippage for the remainder
  if (remainingQty > 0) {
    const lastLevelPrice = levels[levels.length - 1]?.price || midPrice;
    totalPrice +=
      remainingQty * lastLevelPrice * (side === "buy" ? 1.02 : 0.98);
  }

  const avgPrice = totalPrice / quantity;
  const slippage = Math.abs(avgPrice - midPrice) / midPrice;
  const slippageBps = Math.round(slippage * 10000);

  return {
    estimatedPrice: avgPrice,
    slippageBps: Math.max(1, slippageBps),
  };
}
