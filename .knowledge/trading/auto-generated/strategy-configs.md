# strategy-configs

**Fil:** `src/lib/trading/strategy-configs.ts`
**Tester:** ❌ Nei

## Beskrivelse
Strategy Configs — Per-strategi default-konfigurasjoner
 
  Hver strategi i DB får unike parametere som gjør at den oppfører seg
  annerledes enn andre strategier, selv innen samme engine-type.
 
  Mål: Ingen to bots skal ha identiske signaler.

## Eksporterte funksjoner
- `getStrategyConfig()`
- `resolveStrategyEngine()`
- `shouldUseDarkFleet()`
- `getDarkFleetConfig()`

## Typer/Interfaces
- `MultiSignalConfig`
- `TrendFollowConfig`
- `DCAConfig`
- `GridConfig`
- `AICopyConfig`
- `HybridArbitrageConfig`
- `StrategyConfig`

## Konstanter
- `STRATEGY_UUID_CONFIGS`

---
*Auto-generert av trading-knowledge-miner.mjs*
