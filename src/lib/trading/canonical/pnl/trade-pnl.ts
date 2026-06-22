/**
 * Kanonisk trade P&L-beregning for Klarpakke.
 *
 * Brukes av både test- og live-trading for å sikre identisk P&L gitt
 * samme snapshot og ordreinput før execution-adapteren.
 */

import {
  addLot,
  createLedger,
  sellFIFO,
  type LedgerState,
  type SellResult,
} from "./ledger";

export interface TradePnlInput {
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  fee: number;
  timestamp?: string;
}

export interface TradePnlResult {
  realizedPnl: number;
  unrealizedPnl: number;
  totalFee: number;
  remainingQuantity: number;
  averageEntryPrice: number;
}

/**
 * Beregner P&L for en sekvens av trades ved hjelp av FIFO-ledger.
 *
 * Modusspesifikke forskjeller (gebyrer, slippage, fills) skal legges til
 * av execution-adapteren FØR denne funksjonen kalles, slik at input er identisk.
 */
export function calculatePnlFromTrades(
  trades: TradePnlInput[],
  currentPrice?: number,
): TradePnlResult {
  let ledger: LedgerState = createLedger("long");
  let totalFee = 0;
  let realizedPnl = 0;

  for (const trade of trades) {
    totalFee += trade.fee;

    if (trade.side === "buy") {
      // Inkluder fee i kostnadsbasis for lotten; dette gir konsistent P&L
      // både for test og live når execution-adapter har lagt til modusspesifikke gebyrer.
      const effectivePrice = trade.quantity > 0
        ? trade.price + trade.fee / trade.quantity
        : trade.price;
      ledger = addLot(ledger, trade.quantity, effectivePrice, trade.timestamp);
    } else {
      const sellResult: SellResult = sellFIFO(ledger, trade.quantity, trade.price);
      realizedPnl += sellResult.realizedPnl - trade.fee;
      ledger = { ...ledger, lots: sellResult.remainingLots };
    }
  }

  const remainingQuantity = ledger.lots.reduce((sum, lot) => sum + lot.quantity, 0);
  const averageEntryPrice =
    remainingQuantity > 0
      ? ledger.lots.reduce((sum, lot) => sum + lot.quantity * lot.entryPrice, 0) /
        remainingQuantity
      : 0;

  let unrealizedPnl = 0;
  if (currentPrice !== undefined && remainingQuantity > 0) {
    unrealizedPnl = remainingQuantity * (currentPrice - averageEntryPrice);
  }

  return {
    realizedPnl,
    unrealizedPnl,
    totalFee,
    remainingQuantity,
    averageEntryPrice,
  };
}
