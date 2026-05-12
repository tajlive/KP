# fallback-signals

**Fil:** `src/lib/trading/fallback-signals.ts`
**Tester:** ✅ Ja

## Beskrivelse
Fast anker for `created_at` i fallback-rader før data er hentet.
  Unngår hydration mismatch (server vs klient `Date.now()` etter millisekunder).

## Eksporterte funksjoner
- `getFallbackTradingSignals()`

## Typer/Interfaces
- `FallbackTradingSignal`

## Konstanter
- `LANDING_SIGNAL_FALLBACK_ANCHOR_MS`

---
*Auto-generert av trading-knowledge-miner.mjs*
