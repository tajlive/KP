# currency

**Fil:** `src/lib/trading/currency.ts`
**Tester:** ❌ Nei

## Beskrivelse
Paper trading uses NOK balance (current_capital_nok) while Binance prices are in USDT.
  This module provides USDT -> NOK conversion so order value is correct.
  Rate: env USDT_NOK_RATE > global_settings.usdt_nok_rate (cron) > fallback 10.8.

## Eksporterte funksjoner
- `getUsdtToNokRate()`
- `getUsdtToNokRateAsync()`
- `usdtToNok()`

## Typer/Interfaces
*Ingen eksporterte typer*

## Konstanter
*Ingen eksporterte konstanter*

---
*Auto-generert av trading-knowledge-miner.mjs*
