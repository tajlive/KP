# order-executor

**Fil:** `src/lib/trading/order-executor.ts`
**Tester:** ❌ Nei

## Beskrivelse
Unified Order Execution Interface
 
  This abstraction allows strategies to work identically in paper and live mode.
  The strategy doesn't know if it's executing on Binance or simulating - it just
  calls executor.executeOrder() and gets back a result.
 
  Pattern: Strategy Pattern + Factory Pattern

## Eksporterte funksjoner
- `fetchBinancePrice()`
- `fetchBinanceDepth()`
- `calculateFee()`

## Typer/Interfaces
- `OrderBookLevel`
- `OrderBookSnapshot`
- `OrderParams`
- `OrderResult`
- `BalanceInfo`
- `Position`
- `OrderExecutor`

## Konstanter
*Ingen eksporterte konstanter*

---
*Auto-generert av trading-knowledge-miner.mjs*
