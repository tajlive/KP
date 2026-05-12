# position-ledger

**Fil:** `src/lib/trading/position-ledger.ts`
**Tester:** ❌ Nei

## Beskrivelse
═══════════════════════════════════════════════════════════════════════════════
  FIFO POSITION LEDGER — Correct cost basis for multi-buy positions
  ═══════════════════════════════════════════════════════════════════════════════
 
  Tracks each buy as a separate Lot. On sell, matches against oldest lots
  first (FIFO). Handles partial sells by splitting lots.
 
  @module lib/trading/position-ledger

## Eksporterte funksjoner
- `createLedger()`
- `addLot()`
- `sellFIFO()`
- `getTotalQuantity()`
- `getWeightedEntryPrice()`
- `getUnrealizedPnl()`
- `getUnrealizedPnlPct()`
- `isEmpty()`
- `migrateFromLegacy()`
- `toLegacyPosition()`

## Typer/Interfaces
- `Lot`
- `LedgerState`
- `LotMatch`
- `SellResult`

## Konstanter
*Ingen eksporterte konstanter*

---
*Auto-generert av trading-knowledge-miner.mjs*
