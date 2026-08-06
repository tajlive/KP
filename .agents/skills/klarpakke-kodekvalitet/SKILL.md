---
title: Klarpakke Kodekvalitet
name: klarpakke-kodekvalitet
description: Use when doing a systematic code quality pass on a Klarpakke module —
  dead code, type errors, lint, test coverage.
category: klarpakke
version: 1.0.0
created: 2026-07-28
triggers:
- øk testdekning
- kodekvalitet
- refaktorer duplikater
- increase test coverage
- improve code quality
- reduce duplication
- code quality pass
whenToUse: Når bruker ber om systematisk kodegjennomgang av Klarpakke.
---

# Klarpakke Kodekvalitet

Systematisk code quality pass for en spesifikk modul i Klarpakke. Består av 5 steg som kjøres sekvensielt med verifikasjon etter hvert.

## Steg 1: Coverage-analyse

Finn hvilke filer som har lav/ingen testdekning:

```bash
npx vitest run --coverage <modul-sti>
```

Søk etter filer med `0%` eller veldig lav coverage. Fokuser på **source-filer** (ikke test-filer, index/barrel-filer). De mest verdifulle målene har eksporterte funksjoner/klasser som er helt uten tester.

Kjør også `npx vitest run --coverage src/lib/trading/ 2>&1 | grep -E "src/lib/trading/" | grep -E "\|\s+0\s"` for en rask liste over 0%-coverage-filer.

### Utvalgskriterier for hva som skal testes:
- Filer med reell forretningslogikk (ikke bare typer/kontrakter)
- Eksporterte funksjoner og klasser (testes av eksterne konsumenter)
- Unit-testbare funksjoner (pure functions, ingen eksterne API-kall)
- For DB/API-avhengige klasser: mock avhengighetene, test logikken

## Steg 2: Skriv tester for uncovered kode

Bruk Vitest (globals: true, environment: jsdom). Følg eksisterende testmønstre i modulen.

### Mønster for Supabase-mocking:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => ({ data: mockData, error: null })),
      })),
    })),
  })),
  rpc: vi.fn(),
} as unknown as SupabaseClient;
```

### Mønster for ExecutorFactory-tester:
- **Paper mode**: returnerer `PaperExecutor` — verifiser at konstruktør ble kalt med riktige args
- **Live mode**: må fetche profil + dekryptere nøkler — mock RPC og verifiser feilhåndtering
- **Live uten tier**: mock profile mangler riktig tier → forvent Error
- **createFromSession**: mock session lookup, verifiser at `create()` kalles med riktig userId/mode

### Verifikasjon:
```bash
npm run test:unit
```

Se etter at de nye testene er inkludert i utfallet.

## Steg 3: TypeScript strictness — noImplicitAny

**Merk:** Klarpakkes `tsconfig.json` har allerede `"strict": true`, som inkluderer `noImplicitAny`. Steget er **verifikasjon**:

```bash
cd /Users/taj/klarpakke && npx tsc --noEmit 2>&1 | grep "src/lib/<modul>/" | head -80
```

Hvis det er feil:
1. Se på hver fil som rapporteres
2. Legg til eksplisitte typer på `any`-parametere
3. Fiks én og én fil — ikke fjern `noImplicitAny` fra tsconfig på nytt

Hvis ingen feil (tom output) — bekreft og gå videre.

## Steg 4: Finn og refaktorer duplisert kode

Bruk jscpd:

```bash
npx jscpd src/lib/<modul>/ --pattern "**/*.ts" --min-lines 5 --min-tokens 50
```

### Prioritering av kloner å fikse:
1. **Source-filer med >= 20 linjer duplisert** — høy verdi
2. **Self-duplication** i én fil (f.eks. samme mønster på tvers av 2+ funksjoner) — lett å ekstrahere
3. **Kryss-fil-kloner** — ekstraher til delt hjelpefunksjon
4. **Test-fil kloner** — lavest prioritet (test boilerplate er akseptabelt)

### Refaktoreringsmønster:
- **walk-forward.ts**: Ekstraher `buildWindow(w, isCandles, oosCandles, strategyConfig, initialCapitalUSD)` for å erstatte 33-linjers duplikat mellom `runWalkForward` og `runAnchoredWalkForward`
- **indicators.ts**: Ekstraher `computeTrueRange(high, low, prevClose)` for True Range-beregning som dupliseres i `atr()` og `adx()`
- **execute-live-trade.ts / execute-paper-trade.ts**: Begge er deprecated wrappers — vurder om de faktisk trenger refaktorering eller om de skal merkes tydeligere
- **Erstatt lokal duplikat med kanonisk import** (f.eks. `calculateRSI` i route.ts → `indicators.ts`):
  1. Sjekk signatur-forskjeller — den lokale returnerer `number`, den kanoniske returnerer `(number | null)[]`.
  2. Oppdater ALLE kallesteder i source-filer + test-filer — test-filer som dupliserte den lokale funksjonen er like sårbare.
  3. Tilpass test-assertions til kanonisk returtype: `expect(rsi[rsi.length-1]).toBeCloseTo(99, 0)` ikke `expect(rsi).toBe(100)`.
  4. Wilder's smoothing (kanonisk) gir 99.01 for rent opp-trend, ikke 100. Ikke kopier gammel test-verdi blindt — kjør faktisk output og juster forventning.
  5. Slett den lokale duplikaten etter at alle referanser peker til kanonisk import.

### Verifikasjon etter refaktorering:
```bash
# Kjør jscpd på nytt — se at klonen er borte
npx jscpd src/lib/<modul>/ --pattern "**/*.ts" --min-lines 5 --min-tokens 50

# Kjør ALLE berørte tester (tsc --noEmit fanger IKKE test-filer — tsconfig ekskluderer **/*.test.ts)
npx vitest run src/app/api/jokertrade/__tests__/route.test.ts

# Kjør lint på endrede filer
npx eslint <endret-fil>
```

## Steg 5: Endelig verifikasjon

```bash
npm run test:unit          # Alle tester grønne
npm run lint               # Ingen nye feil i modulen
npx tsc --noEmit           # Ingen TS-feil i modulen
```

## Fallgruver / Pitfalls

- **Ikke refaktorer deprecated filer** som `execute-live-trade.ts` / `execute-paper-trade.ts` med mindre de aktivt vedlikeholdes — merk dem som deprecated og gå videre
- **Ikke fjern `noImplicitAny` midlertidig** — tsconfig har `strict: true` allerede. Bare verifiser at det ikke er feil.
- **Ikke test index/barrel-filer** — de re-eksporterer bare
- **Eksterne API-avhengigheter** (Binance, Supabase RPC) — mock alltid, test logikken isolert
- **jscpd finner mange kloner** — prioriter de som har størst effekt (33-linjers vs 7-linjers)
- **Aksepter 4-7 linjers "boilerplate"** som candle-ekstraksjon (`closes.map(c => c.close)`) — dette er idiomatisk kode, ikke duplikasjon verdt å abstrahere
- **Bruk `delegate_task`** for test-skriving om det er mange filer — send context med mock-mønstre og eksisterende test-eksempler
- **tsc --noEmit fanger IKKE test-filer** — Klarpakkes tsconfig.json ekskluderer `**/*.test.ts`. En ren tsc er ikke bevis for at testene fungerer. Etter deduplisering, kjør ALLTID `npx vitest run <testfil>` for testfilene du endret.
- **Wilder's RSI ≠ enkel sum-RSI** — når du bytter fra en lokal RSI-implementasjon til den kanoniske i `indicators.ts`, gir den kanoniske 99.01 (ikke 100) for rent opp-trend på 14 perioder, og 0.41 (ikke 0) for rent ned-trend. Forskjellen er smoothed EMA vs. enkel SMA av gevinster/tap. Justér test-assertions til faktisk output, ikke gammel forventning.
