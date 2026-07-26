/**
 * Posisjonsmatematikk for paper-trading — speiler DB-triggeren
 * trigger_update_session_state (supabase/migrations/20260727000000_fix_trigger_weighted_entry.sql).
 *
 * Bakgrunn (E2E-funn F2, prod 2026-07-25): open_position kan avvike fra
 * trade-ledgeret. Disse hjelperne definerer den KORREKTE oppførselen
 * eksplisitt, slik at tester kan låse den:
 *   - kjøp av X enheter til pris P → quantity øker med nøyaktig X
 *   - entry_price er ALLTID vektet snitt (aldri "siste kjøpspris")
 *   - entry_time er ALLTID tidligste kjøp (aldri overskrevet)
 *   - salg reduserer quantity; entry_price/entry_time beholdes
 *
 * Hold denne filen og SQL-triggeren i sync ved endringer.
 */

export interface LegacyPosition {
  side: "long" | "short";
  quantity: number;
  entry_price: number;
  entry_time: string;
  highest_price?: number;
}

export interface PositionTrade {
  side: "buy" | "sell";
  quantity: number;
  price: number;
  executed_at: string;
}

/** Anvend et kjøp på posisjonen (FIFO-nøytralt, vektet snittinngang). */
export function applyBuyToPosition(
  position: LegacyPosition | null,
  trade: PositionTrade,
): LegacyPosition {
  if (!(trade.quantity > 0) || !(trade.price > 0)) {
    throw new Error(
      `applyBuyToPosition: ugyldig kjøp (qty=${trade.quantity}, price=${trade.price})`,
    );
  }
  const prevQty = position?.quantity ?? 0;
  const prevEntry = position?.entry_price ?? trade.price;
  const newQty = prevQty + trade.quantity;
  const weightedEntry =
    (prevQty * prevEntry + trade.quantity * trade.price) / newQty;

  return {
    side: "long",
    quantity: newQty,
    entry_price: weightedEntry,
    entry_time:
      position?.entry_time && position.entry_time < trade.executed_at
        ? position.entry_time
        : position?.entry_time ?? trade.executed_at,
    highest_price: Math.max(
      position?.highest_price ?? 0,
      trade.price,
    ),
  };
}

/** Anvend et salg på posisjonen. Returnerer null når alt er solgt. */
export function applySellToPosition(
  position: LegacyPosition | null,
  trade: PositionTrade,
): LegacyPosition | null {
  if (!position) return null;
  const remaining = position.quantity - trade.quantity;
  if (remaining <= 0) return null;
  return {
    ...position,
    quantity: remaining,
  };
}

/**
 * Verifisér en posisjon mot trade-ledgeret (F2 phantom-guard).
 * Returnerer forventet mengde fra trades, eller null hvis ingen trades.
 */
export function deriveQuantityFromTrades(
  trades: PositionTrade[],
): number | null {
  if (trades.length === 0) return null;
  let qty = 0;
  for (const t of trades) {
    qty += t.side === "buy" ? t.quantity : -t.quantity;
  }
  return Math.max(0, qty);
}

/** Relativ differanse mellom to mengder (for phantom-deteksjon). */
export function quantityDeviation(a: number, b: number): number {
  const scale = Math.max(a, b);
  if (scale <= 0) return 0;
  return Math.abs(a - b) / scale;
}
