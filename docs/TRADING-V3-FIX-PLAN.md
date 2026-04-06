# Trading V3 Fix Plan

**Status:** TypeScript errors + test failures  
**Mål:** Gjør koden kompilerbar og tester grønne  
**Estimert tid:** 2-3 timer  
**Prioritet:** P1 (blokkerer ikke prod, men må fikses før v3 lansering)

---

## Feil Kategorisering

### Kategori A: Type Casting Issues (8 errors)
**Filer:**
- `src/lib/trading/risk/risk-state-store.ts` (3 errors)
- `src/lib/trading/execution/audit-store.ts` (2 errors)

**Problem:** `as PersistedRiskState` og `as ExecutionEvidence` feiler fordi typer ikke overlapper med Supabase `Json` type.

**Løsning:** Bruk `unknown` først, deretter cast:
```typescript
// Før (feil)
const persisted = data.state as PersistedRiskState;

// Etter (riktig)
const persisted = data.state as unknown as PersistedRiskState;
```

---

### Kategori B: Missing Properties (4 errors)
**Filer:**
- `src/lib/trading/regime/policy-ensemble.ts` (3 errors)
- `src/lib/trading/white-label/mifid2-compliance.ts` (2 errors)

**Problem:** Koden refererer til properties som ikke finnes i typene:
- `bbUpper`, `bbLower`, `bbMiddle` på `Candle` type
- `appropriatenessTest` på `SuitabilityAssessment`
- `highWaterMark` på `HighWaterMarkCalculator` (skal være `highWaterMarks`)

**Løsning:** 
1. Enten utvid type-definisjoner
2. Eller bruk optional chaining med fallback

```typescript
// Alternativ 1: Utvid type
interface Candle {
  open: number; high: number; low: number; close: number; volume: number;
  bbUpper?: number; bbLower?: number; bbMiddle?: number; // <-- legg til
}

// Alternativ 2: Optional chaining
const bbUpper = (candle as any).bbUpper ?? calculateBBUpper(candle);
```

---

### Kategori C: String vs Enum Type Mismatch (6 errors)
**Fil:** `src/lib/trading/rollout/champion-challenger.ts` (6 errors)

**Problem:** `winner: string` kan ikke tildeles til `winner: PolicyVersion`.

**Løsning:** Cast til riktig type:
```typescript
// Før (feil)
return { metric, champion, challenger, difference, winner };

// Etter (riktig)
return { 
  metric, 
  champion, 
  challenger, 
  difference, 
  winner: winner as PolicyVersion 
};
```

---

### Kategori D: Function Signature Mismatch (1 error)
**Fil:** `src/lib/trading/risk/risk-kernel.ts` (1 error)

**Problem:** Funksjon kalles med 2 argumenter, forventer 1.

**Løsning:** Sjekk funksjonsdefinisjon og juster kall eller definisjon.

---

### Kategori E: Missing Property in Object (1 error)
**Fil:** `src/lib/trading/regime/policy-ensemble.ts` (1 error)

**Problem:** `regime` mangler i `MarketContext` objekt.

**Løsning:** Legg til påkrevd property.

---

## Test Failures (26 stk)

### 1. Regime Classifier (6 failures)
**Problem:** Klassifier returnerer `'unknown'` i stedet for forventet regime.

**Årsak:** Sannsynligvis feil i threshold-verdier eller feature-extraction.

**Fix:** Debug `classify()` metode, sjekk:
- Er features korrekt normalisert?
- Er threshold-verdier riktige?
- Håndterer koden edge cases?

### 2. Risk Kernel (3 failures)
**Problem:** Violations logges ikke.

**Årsak:** `getViolations()` returnerer tom array.

**Fix:** Sjekk at `logViolation()` faktisk kalles og lagrer til array.

### 3. P0 Safety Tests (12 failures)
**Problem:** Safe-by-default, kill-switch, chaos tests feiler.

**Årsak:** Sannsynligvis manglende implisitt safe-state håndtering.

**Fix:** Implementer eksplisitte safe defaults i alle risk-sjekker.

### 4. Andre (5 failures)
Diverse småfeil i champion-challenger og policy-ensemble.

---

## Implementerings-Rekkefølge

### Fase 1: TypeScript Errors (1 time)
1. [ ] Fiks Kategori A (type casting) - 3 filer
2. [ ] Fiks Kategori B (missing properties) - 2 filer  
3. [ ] Fiks Kategori C (string/enum) - 1 fil
4. [ ] Fiks Kategori D+E (signatures) - 2 filer
5. [ ] Verifiser: `npm run type-check` passerer

### Fase 2: Test Failures (1-2 timer)
1. [ ] Fiks regime-classifier tester
2. [ ] Fiks risk-kernel violations
3. [ ] Fiks P0 safety tests
4. [ ] Verifiser: `npm run test:unit` passerer

### Fase 3: Verifisering (30 min)
1. [ ] `npm run lint`
2. [ ] `npm run build`
3. [ ] `npm run verify`

---

## Konkrete Kode-Endringer

### Fil 1: risk-state-store.ts
```typescript
// Linje 109: Endre til
const persisted = (data.state as unknown) as PersistedRiskState;

// Linje 159: Endre til  
const persisted = (data.state as unknown) as PersistedRiskState;

// Linje 285: Endre til
const persisted = (data.state as unknown) as PersistedRiskState;
```

### Fil 2: audit-store.ts
```typescript
// Samme mønster - bruk `as unknown as ExecutionEvidence`
```

### Fil 3: champion-challenger.ts
```typescript
// Linje 362-368: Endre return statement
return {
  metric,
  champion, 
  challenger,
  difference,
  winner: winner as PolicyVersion // <-- cast her
};
```

### Fil 4: policy-ensemble.ts
```typescript
// Linje 372: Bruk optional chaining eller utvid Candle type
const bbUpper = (candle as any).bbUpper ?? this.calculateBBUpper(candle);
const bbLower = (candle as any).bbLower ?? this.calculateBBLower(candle);
const bbMiddle = (candle as any).bbMiddle ?? this.calculateBBMiddle(candle);

// Linje 424: Legg til regime property
const marketContext: MarketContext = {
  fearGreedIndex,
  fearGreedTrend,
  volatility,
  trendStrength,
  regime: currentRegime // <-- legg til
};
```

### Fil 5: mifid2-compliance.ts
```typescript
// Linje 467: Bruk optional chaining
const test = assessment.appropriatenessTest; // --> assessment.appropriatenessTest?

// Linje 565: Rett property navn
this.highWaterMark; // --> this.highWaterMarks
```

### Fil 6: risk-kernel.ts
```typescript
// Linje 202: Sjekk funksjonskall
// Funksjonen forventer 1 argument, kall med 1 argument
```

---

## Verifiserings-Kommandoer

```bash
# Etter hver fase
npm run type-check

# Etter alle endringer
npm run lint
npm run type-check  
npm run test:unit

# Full sjekk
npm run verify
```

---

## Neste Steg

1. **Godta plan?** → Jeg implementerer fase 1 (TypeScript errors)
2. **Vil du gjøre det selv?** → Følg rekkefølgen over
3. **Vil vi diskutere først?** → Se på spesifikke filer

---

**Merk:** Trading v3 er ikke i produksjon, så vi har tid til å gjøre dette riktig. Fokus på type-sikkerhet nå sparer debugging senere.
