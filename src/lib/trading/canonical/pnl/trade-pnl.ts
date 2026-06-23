/**
 * Kanonisk trade P&L-beregning for Klarpakke trading.
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

export type QuoteCurrency = "USDT" | "NOK";

export interface TradePnlInput {
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  fee: number;
  timestamp?: string;
  /** Valuta for pris og gebyr. Alle trades i samme beregning må ha samme valuta. */
  currency: QuoteCurrency;
}

export interface TradePnlResult {
  realizedPnl: number;
  unrealizedPnl: number;
  totalFee: number;
  remainingQuantity: number;
  averageEntryPrice: number;
  /** Valuta resultatet er denominated i. */
  currency: QuoteCurrency;
}

class CurrencyMismatchError extends Error {
  constructor(
    public expected: QuoteCurrency,
    public actual: QuoteCurrency,
  ) {
    super(`Currency mismatch in P&L calculation: expected ${expected}, got ${actual}`);
    this.name = "CurrencyMismatchError";
  }
}

function getPositionQuantity(ledger: LedgerState): number {
  return ledger.lots.reduce((sum, lot) => sum + lot.quantity, 0);
}

function getAverageEntryPrice(ledger: LedgerState): number {
  const qty = getPositionQuantity(ledger);
  if (qty <= 0) return 0;
  return (
    ledger.lots.reduce((sum, lot) => sum + lot.quantity * lot.entryPrice, 0) / qty
  );
}

/**
 * Beregner P&L for en sekvens av trades ved hjelp av FIFO-ledger.
 *
 * Støtter både long- og short-posisjoner. En sell uten eksisterende long
 * åpner en short; en buy med eksisterende short dekker den. Ved overgang
 * mellom long og short splittes trade i en lukke-del og en åpnings-del.
 *
 * Modusspesifikke forskjeller (gebyrer, slippage, fills) skal legges til
 * av execution-adapteren FØR denne funksjonen kalles, slik at input er identisk.
 */
export function calculatePnlFromTrades(
  trades: TradePnlInput[],
  currentPrice?: number,
): TradePnlResult {
  if (trades.length === 0) {
    return {
      realizedPnl: 0,
      unrealizedPnl: 0,
      totalFee: 0,
      remainingQuantity: 0,
      averageEntryPrice: 0,
      currency: "USDT",
    };
  }

  const currency = trades[0].currency;
  for (const trade of trades) {
    if (trade.currency !== currency) {
      throw new CurrencyMismatchError(currency, trade.currency);
    }
    if (!Number.isFinite(trade.quantity) || trade.quantity <= 0) {
      throw new Error(`Invalid trade quantity: ${trade.quantity}`);
    }
    if (!Number.isFinite(trade.price) || trade.price <= 0) {
      throw new Error(`Invalid trade price: ${trade.price}`);
    }
    if (!Number.isFinite(trade.fee) || trade.fee < 0) {
      throw new Error(`Invalid trade fee: ${trade.fee}`);
    }
  }

  let ledger: LedgerState = createLedger("long");
  let totalFee = 0;
  let realizedPnl = 0;

  for (const trade of trades) {
    totalFee += trade.fee;

    const positionQty = getPositionQuantity(ledger);

    if (trade.side === "buy") {
      if (ledger.side === "short" && positionQty > 0) {
        // Dekk short-posisjon
        const coverQty = Math.min(trade.quantity, positionQty);
        if (coverQty > 0) {
          const sellResult: SellResult = sellFIFO(ledger, coverQty, trade.price);
          const feeForCover = trade.fee * (coverQty / trade.quantity);
          realizedPnl += sellResult.realizedPnl - feeForCover;
          ledger = { ...ledger, lots: sellResult.remainingLots };
        }

        const remainingBuy = trade.quantity - coverQty;
        if (remainingBuy > 0) {
          // Short er fullstendig dekket; gjenstående kjøp åpner long
          ledger = createLedger("long");
          const effectivePrice = trade.price + trade.fee / trade.quantity;
          ledger = addLot(ledger, remainingBuy, effectivePrice, trade.timestamp);
        } else if (getPositionQuantity(ledger) === 0) {
          ledger = createLedger("long");
        }
      } else {
        // Øk/reduser long-posisjon
        const effectivePrice = trade.price + trade.fee / trade.quantity;
        ledger = addLot(ledger, trade.quantity, effectivePrice, trade.timestamp);
      }
    } else {
      // trade.side === "sell"
      if (ledger.side === "long" && positionQty > 0) {
        // Selg fra long-posisjon
        const sellQty = Math.min(trade.quantity, positionQty);
        if (sellQty > 0) {
          const sellResult: SellResult = sellFIFO(ledger, sellQty, trade.price);
          const feeForSell = trade.fee * (sellQty / trade.quantity);
          realizedPnl += sellResult.realizedPnl - feeForSell;
          ledger = { ...ledger, lots: sellResult.remainingLots };
        }

        const remainingSell = trade.quantity - sellQty;
        if (remainingSell > 0) {
          // Long er fullstendig solgt; gjenstående sell åpner short
          ledger = createLedger("short");
          const effectivePrice = trade.price - trade.fee / trade.quantity;
          ledger = addLot(ledger, remainingSell, effectivePrice, trade.timestamp);
        } else if (getPositionQuantity(ledger) === 0) {
          ledger = createLedger("long");
        }
      } else {
        // Sell uten eksisterende long åpner/øker short
        if (ledger.side !== "short") {
          ledger = createLedger("short");
        }
        const effectivePrice = trade.price - trade.fee / trade.quantity;
        ledger = addLedgerLot(ledger, trade.quantity, effectivePrice, trade.timestamp);
      }
    }
  }

  const remainingQuantity =
    ledger.side === "short"
      ? -getPositionQuantity(ledger)
      : getPositionQuantity(ledger);
  const averageEntryPrice = getAverageEntryPrice(ledger);

  let unrealizedPnl = 0;
  if (currentPrice !== undefined && getPositionQuantity(ledger) > 0) {
    // For shorts er P&L motsatt: profitt når pris faller
    const direction = ledger.side === "short" ? -1 : 1;
    unrealizedPnl = direction * getPositionQuantity(ledger) * (currentPrice - averageEntryPrice);
  }

  return {
    realizedPnl,
    unrealizedPnl,
    totalFee,
    remainingQuantity,
    averageEntryPrice,
    currency,
  };
}

/**
 * Hjelper for å legge til lot uavhengig av ledger-side.
 * `addLot` ignorerer negativt kvantum, så vi bruker alltid positivt kvantum her.
 */
function addLedgerLot(
  ledger: LedgerState,
  quantity: number,
  entryPrice: number,
  timestamp?: string,
): LedgerState {
  return addLot(ledger, quantity, entryPrice, timestamp);
}
