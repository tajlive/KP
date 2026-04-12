# Task Plan: TASK-20240411-EXAMPLE

**Status:** 🟡 PLANNING  
**Created:** 2024-04-11 14:30:22  
**Description:** Implementer mean reversion trading strategy med backtest

## Detected Agents
klarpakke-auto-trade-strategy-research-agent

## Plan (Genereres av Gemini/Antigravity)

<!-- 
INSTRUKSJON TIL GEMINI/ANTIGRAVITY:
1. Les denne filen
2. Analyser oppgaven
3. Fyll ut seksjonene under
4. Lagre filen
5. Marker som READY og kjør: npm run tell:kimi TASK-20240411-EXAMPLE.md
-->

### 1. Executive Summary
Implementer en mean reversion trading strategi som:
- Identifiserer overkjøpte/overgitte markeder med RSI og Bollinger Bands
- Åpner posisjoner når prisen divergerer fra SMA med 2 standardavvik
- Inkluderer backtest-modul for historisk verifisering
- Integrerer med eksisterende auto-trading infrastruktur

### 2. Arkitektur
**Teknisk design:**
- Følger ADR KLA-91 (Strategy Interface)
- Bruker eksisterende `BaseStrategy` klasse
- Implementerer `IStrategy` interface fra `src/lib/auto-trading/strategies/`

**Avhengigheter:**
- `src/lib/auto-trading/indicators/rsi.ts`
- `src/lib/auto-trading/indicators/bollinger.ts`
- `src/lib/auto-trading/backtest/engine.ts`

### 3. Files to Create/Modify
- [x] `src/lib/strategies/mean-reversion.ts` - Hovedstrategi
- [x] `src/lib/strategies/mean-reversion.types.ts` - TypeScript interfaces
- [x] `src/lib/strategies/mean-reversion.test.ts` - Unit tests
- [x] `src/app/api/strategies/mean-reversion/route.ts` - API endpoint
- [x] `supabase/functions/mean-revision/index.ts` - Edge Function

### 4. Implementation Steps
1. **Sett opp strategi-klasse**
   - Utvid `BaseStrategy`
   - Definer parametere (period=20, stdDev=2, rsiThreshold=70/30)
   
2. **Implementer signal-generering**
   - Bollinger Bands beregning
   - RSI confirmation
   - Entry/exit logikk
   
3. **Legg til backtest-støtte**
   - Integrer med backtest engine
   - Historisk data fetching
   - Performance metrics
   
4. **API og deployment**
   - REST endpoint for konfigurasjon
   - Edge Function for scheduling
   - Database migrasjon for ny strategi-type

### 5. Testing Strategy
- [x] Unit tests: Signal-generering (minst 80% coverage)
- [x] Integration tests: Backtest med historiske data
- [x] E2E tests: Full trading loop med paper trading
- [x] Performance: Strategien må kjøre <100ms per signal

### 6. Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Feil i Bollinger-beregning | Bruk eksisterende tested `indicators/bollinger.ts` |
| Overfitting i backtest | Out-of-sample testing, walk-forward analysis |
| Performance issues | Profiling før deploy, caching av indikatorer |
| Database migration feil | Test på staging først, rollback plan klar |

### 7. Konfigurasjon
```typescript
// Default parametere
const DEFAULT_CONFIG = {
  smaPeriod: 20,
  stdDevMultiplier: 2,
  rsiPeriod: 14,
  rsiOverbought: 70,
  rsiOversold: 30,
  positionSize: 0.1, // 10% av portfolio
  stopLoss: 0.05,    // 5%
  takeProfit: 0.1    // 10%
};
```

---

**Status:** ✅ READY FOR IMPLEMENTATION  
**Next Action:** Kjør `npm run tell:kimi TASK-20240411-EXAMPLE.md`
