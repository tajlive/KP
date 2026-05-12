# risk

**Fil:** `src/lib/trading/risk.ts`
**Tester:** ❌ Nei

## Beskrivelse
Trading Risk Validation
  
  VIKTIG: Dette er den AUTORITATIVE kilden for risiko-validering.
  Alle trading-operasjoner MÅ gå gjennom disse funksjonene.
  
  Regel: Aldri trade uten validert risk config!

## Eksporterte funksjoner
- `getRiskConfig()`
- `validateRiskConfig()`
- `calculatePositionSize()`
- `canTrade()`
- `createDefaultRiskConfig()`

## Typer/Interfaces
- `TradingRiskConfig`

## Konstanter
*Ingen eksporterte konstanter*

---
*Auto-generert av trading-knowledge-miner.mjs*
