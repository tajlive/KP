# multi-timeframe

**Fil:** `src/lib/trading/multi-timeframe.ts`
**Tester:** ❌ Nei

## Beskrivelse
Multi-Timeframe Filter — 4h Trend + 1h Signal + 15m Entry Confirmation
 
  Combines three timeframes for higher-quality signals:
  - 4h: Trend direction (SMA20 + ADX)
  - 1h: Signal generation (from strategy)
  - 15m: Entry confirmation (momentum + volume)
 
  Final score = trendScore(4h)  signalScore(1h)  entryConfirm(15m)
  Require: trendScore > 0.6 && entryConfirm > 0.8

## Eksporterte funksjoner
- `fetchMultiTimeframeCandles()`
- `applyMultiTimeframeFilter()`

## Typer/Interfaces
- `MultiTimeframeResult`
- `MTFFilterOptions`

## Konstanter
*Ingen eksporterte konstanter*

---
*Auto-generert av trading-knowledge-miner.mjs*
