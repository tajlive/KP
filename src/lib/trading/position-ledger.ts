/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FIFO POSITION LEDGER — Correct cost basis for multi-buy positions
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Tracks each buy as a separate Lot. On sell, matches against oldest lots
 * first (FIFO). Handles partial sells by splitting lots.
 *
 * @module lib/trading/position-ledger
 */

import Decimal from "decimal.js";

// ============================================================================
// TYPES
// ============================================================================

export interface Lot {
  /** Unique lot ID for audit trail */
  id: string;
  /** Remaining quantity in this lot */
  quantity: number;
  /** Entry price for this lot */
  entryPrice: number;
  /** ISO timestamp of when this lot was created */
  timestamp: string;
  /** Original quantity at creation (immutable, for audit) */
  originalQuantity: number;
}

export interface LedgerState {
  /** Lots sorted oldest-first (FIFO order) */
  lots: Lot[];
  /** Position direction */
  side: "long" | "short";
}

export interface LotMatch {
  /** ID of the lot that was matched */
  lotId: string;
  /** Quantity consumed from this lot */
  matchedQuantity: number;
  /** Entry price of the matched lot */
  entryPrice: number;
  /** Exit price at which the sell occurred */
  exitPrice: number;
  /** Realized P&L for this lot match */
  pnl: number;
}

export interface SellResult {
  /** Total realized P&L across all matched lots */
  realizedPnl: number;
  /** Details of each lot that was matched */
  lotMatches: LotMatch[];
  /** Remaining lots after sell (new state) */
  remainingLots: Lot[];
  /** Weighted average entry price for remaining position */
  avgEntryPrice: number;
  /** Total remaining quantity */
  remainingQuantity: number;
}

// ============================================================================
// ERRORS
// ============================================================================

export class InsufficientQuantityError extends Error {
  constructor(
    public requested: number,
    public available: number,
  ) {
    super(
      `Insufficient quantity: requested ${requested}, available ${available}`,
    );
    this.name = "InsufficientQuantityError";
  }
}

// ============================================================================
// LOT ID GENERATION
// ============================================================================

let lotCounter = 0;

function generateLotId(): string {
  lotCounter++;
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `lot-${ts}-${rand}-${lotCounter}`;
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Create a new empty ledger state.
 */
export function createLedger(side: "long" | "short" = "long"): LedgerState {
  return { lots: [], side };
}

/**
 * Add a new lot (buy) to the ledger.
 * Lots are appended at the end (newest last = FIFO order maintained).
 */
export function addLot(
  state: LedgerState,
  quantity: number,
  entryPrice: number,
  timestamp?: string,
): LedgerState {
  if (quantity <= 0) {
    return state;
  }

  const lot: Lot = {
    id: generateLotId(),
    quantity,
    entryPrice,
    timestamp: timestamp ?? new Date().toISOString(),
    originalQuantity: quantity,
  };

  return {
    ...state,
    lots: [...state.lots, lot],
  };
}

/**
 * Sell using FIFO: match against oldest lots first.
 * Handles partial sells by splitting lots.
 *
 * @throws InsufficientQuantityError if selling more than available
 */
export function sellFIFO(
  state: LedgerState,
  sellQuantity: number,
  exitPrice: number,
): SellResult {
  const totalAvailable = getTotalQuantity(state);

  // Use Decimal for precise comparison (avoid float issues like 0.3 + 0.2 !== 0.5)
  const sellDec = new Decimal(sellQuantity);
  const availDec = new Decimal(totalAvailable);

  if (sellDec.gt(availDec.plus(new Decimal("0.00000001")))) {
    throw new InsufficientQuantityError(sellQuantity, totalAvailable);
  }

  const lotMatches: LotMatch[] = [];
  const remainingLots: Lot[] = [];
  let quantityToSell = new Decimal(sellQuantity);
  let totalRealizedPnl = new Decimal(0);

  for (const lot of state.lots) {
    if (quantityToSell.lte(0)) {
      // No more to sell — keep remaining lots as-is
      remainingLots.push(lot);
      continue;
    }

    const lotQty = new Decimal(lot.quantity);

    if (lotQty.lte(quantityToSell)) {
      // Consume entire lot
      const matched = lotQty.toNumber();
      const pnl = calculateLotPnl(
        state.side,
        lot.entryPrice,
        exitPrice,
        matched,
      );

      lotMatches.push({
        lotId: lot.id,
        matchedQuantity: matched,
        entryPrice: lot.entryPrice,
        exitPrice,
        pnl,
      });

      totalRealizedPnl = totalRealizedPnl.plus(new Decimal(pnl));
      quantityToSell = quantityToSell.minus(lotQty);
    } else {
      // Partial consume — split lot
      const matched = quantityToSell.toNumber();
      const pnl = calculateLotPnl(
        state.side,
        lot.entryPrice,
        exitPrice,
        matched,
      );

      lotMatches.push({
        lotId: lot.id,
        matchedQuantity: matched,
        entryPrice: lot.entryPrice,
        exitPrice,
        pnl,
      });

      totalRealizedPnl = totalRealizedPnl.plus(new Decimal(pnl));

      // Keep remainder of this lot
      const remaining = lotQty.minus(quantityToSell).toDP(8).toNumber();
      if (remaining > 0) {
        remainingLots.push({
          ...lot,
          quantity: remaining,
        });
      }

      quantityToSell = new Decimal(0);
    }
  }

  // Filter out zero-quantity lots (safety)
  const cleanedLots = remainingLots.filter((l) => l.quantity > 0);

  return {
    realizedPnl: totalRealizedPnl.toDP(2).toNumber(),
    lotMatches,
    remainingLots: cleanedLots,
    avgEntryPrice: getWeightedEntryPrice({ ...state, lots: cleanedLots }),
    remainingQuantity: cleanedLots.reduce(
      (sum, l) => new Decimal(sum).plus(new Decimal(l.quantity)).toNumber(),
      0,
    ),
  };
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Total quantity across all lots.
 */
export function getTotalQuantity(state: LedgerState): number {
  return state.lots.reduce(
    (sum, lot) => new Decimal(sum).plus(new Decimal(lot.quantity)).toNumber(),
    0,
  );
}

/**
 * Weighted average entry price across all lots.
 * Returns 0 if no lots exist.
 */
export function getWeightedEntryPrice(state: LedgerState): number {
  if (state.lots.length === 0) return 0;

  const totalQty = new Decimal(getTotalQuantity(state));
  if (totalQty.eq(0)) return 0;

  const totalValue = state.lots.reduce(
    (sum, lot) =>
      new Decimal(sum)
        .plus(new Decimal(lot.quantity).mul(new Decimal(lot.entryPrice)))
        .toNumber(),
    0,
  );

  return new Decimal(totalValue).div(totalQty).toDP(8).toNumber();
}

/**
 * Calculate unrealized P&L for all open lots at current price.
 */
export function getUnrealizedPnl(
  state: LedgerState,
  currentPrice: number,
): number {
  if (state.lots.length === 0) return 0;

  let totalPnl = new Decimal(0);

  for (const lot of state.lots) {
    const pnl = calculateLotPnl(
      state.side,
      lot.entryPrice,
      currentPrice,
      lot.quantity,
    );
    totalPnl = totalPnl.plus(new Decimal(pnl));
  }

  return totalPnl.toDP(2).toNumber();
}

/**
 * Calculate unrealized P&L as a percentage of total cost basis.
 */
export function getUnrealizedPnlPct(
  state: LedgerState,
  currentPrice: number,
): number {
  if (state.lots.length === 0) return 0;

  const totalCostBasis = state.lots.reduce(
    (sum, lot) =>
      new Decimal(sum)
        .plus(new Decimal(lot.quantity).mul(new Decimal(lot.entryPrice)))
        .toNumber(),
    0,
  );

  if (totalCostBasis === 0) return 0;

  const unrealized = getUnrealizedPnl(state, currentPrice);
  return new Decimal(unrealized).div(totalCostBasis).mul(100).toDP(2).toNumber();
}

/**
 * Check if position is empty (no lots).
 */
export function isEmpty(state: LedgerState): boolean {
  return state.lots.length === 0 || getTotalQuantity(state) === 0;
}

// ============================================================================
// MIGRATION
// ============================================================================

/**
 * Migrate legacy OpenPosition (single entry_price) to FIFO LedgerState.
 * Used for backward compatibility with existing trading sessions.
 */
export function migrateFromLegacy(openPosition: {
  side: "long" | "short";
  quantity: number;
  entry_price: number;
  entry_time: string;
}): LedgerState {
  if (!openPosition || openPosition.quantity <= 0) {
    return createLedger(openPosition?.side ?? "long");
  }

  return {
    side: openPosition.side,
    lots: [
      {
        id: generateLotId(),
        quantity: openPosition.quantity,
        entryPrice: openPosition.entry_price,
        timestamp: openPosition.entry_time,
        originalQuantity: openPosition.quantity,
      },
    ],
  };
}

/**
 * Convert LedgerState back to legacy OpenPosition format.
 * Uses weighted average entry price for backward compatibility.
 */
export function toLegacyPosition(
  state: LedgerState,
): {
  side: "long" | "short";
  quantity: number;
  entry_price: number;
  entry_time: string;
  lots: Lot[];
} | null {
  if (isEmpty(state)) return null;

  // Use the earliest lot's timestamp as entry_time
  const earliestTimestamp = state.lots.reduce(
    (earliest, lot) =>
      lot.timestamp < earliest ? lot.timestamp : earliest,
    state.lots[0].timestamp,
  );

  return {
    side: state.side,
    quantity: getTotalQuantity(state),
    entry_price: getWeightedEntryPrice(state),
    entry_time: earliestTimestamp,
    lots: state.lots,
  };
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Calculate P&L for a single lot match.
 * For long: (exit - entry) * qty
 * For short: (entry - exit) * qty
 */
function calculateLotPnl(
  side: "long" | "short",
  entryPrice: number,
  exitPrice: number,
  quantity: number,
): number {
  const entry = new Decimal(entryPrice);
  const exit = new Decimal(exitPrice);
  const qty = new Decimal(quantity);

  if (side === "long") {
    return exit.minus(entry).mul(qty).toDP(8).toNumber();
  } else {
    return entry.minus(exit).mul(qty).toDP(8).toNumber();
  }
}
