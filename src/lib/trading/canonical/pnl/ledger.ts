/**
 * Kanonisk P&L-ledger for Klarpakke trading.
 *
 * Wrapper rundt FIFO position-ledger som sikrer at både test- og live-trading
 * bruker samme kostnadsbasis og realisert P&L-beregning.
 */

export {
  createLedger,
  addLot,
  sellFIFO,
  getTotalQuantity,
  getWeightedEntryPrice,
  getUnrealizedPnl,
  getUnrealizedPnlPct,
  isEmpty,
  type LedgerState,
  type Lot,
  type LotMatch,
  type SellResult,
  InsufficientQuantityError,
} from "@/lib/trading/position-ledger";
