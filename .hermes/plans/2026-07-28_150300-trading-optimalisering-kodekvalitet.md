# Trading-optimalisering, Kodekvalitet, Infrastruktur & Deploy — Implementeringsplan

> **For Hermes:** Bruk delegate_task for å kjøre agenter parallelt. Plan = plan only; utfør etter save.

**Goal:** Optimalisere Klarpakke på 4 akser: profit/signaler/auto-heal, kodekvalitet, database/infrastruktur, og deploy/monitorering.

**Nåstatus:** 1496 tester grønne · 6 skipped · 0 TS-feil · 191 testfiler

**Arkitektur:** 4 parallelle arbeidsstrømmer — hver uavhengig, ingen delte filendringer.

---

## Strøm 1: Trading-optimalisering (profit, signaler, auto-heal)

### Task 1.1: Finn tapende mønstre i trading-historikk

**Objective:** Analyser siste 30 dagers handler og identifiser mønstre som taper penger

**Files:** `scratch/analyze-trades.mjs` (finnes allerede), evt ny `src/lib/trading/profit-analysis.ts`

**Steg:**
1. Kjør eksisterende analyse-script mot Supabase
2. Identifiser topp 3 tapsmønstre (f.eks. exit for tidlig, confidence < 0.3 gir tap, visse symboler)
3. Skriv funn til `.hermes/analysis/profit-leaks-2026-07-28.md`

**Verifikasjon:** Alle tall skal spores til DB-spørring

---

### Task 1.2: Forbedre signal-kvalitet (confidence-gates)

**Objective:** Gjennomgå signal-guard og stram inn confidence-terskler basert på historikk

**Files:** `src/lib/trading/signal-guard.ts`, `src/lib/trading/__tests__/signal-guard.test.ts`

**Steg:**
1. Les historiske confidence-verdier vs faktisk P&L per trade
2. Juster `SIGNAL_GUARD_CONFIG` — f.eks. hev MIN_CONFIDENCE fra 0 til 0.15 for kjøp
3. Legg til A/B-testing-annotering i loggen
4. Skriv 3 nye tester for de justerte grensene

**Verifikasjon:** `npx vitest run src/lib/trading/__tests__/signal-guard.test.ts`

---

### Task 1.3: Auto-heal forbedring — proaktiv sesjonsovervåking

**Objective:** Utvid session-invariants med prediktiv helsescore

**Files:** `src/lib/trading/session-invariants.ts`, `src/lib/trading/__tests__/session-invariants.test.ts`

**Steg:**
1. Legg til `predictSessionHealth()`: sjekker heartbeat-intervall, trade-frekvens, error-rate
2. Returner `health_score` (0-100) + `recommended_action` (none/restart/pause)
3. Integrer i auto-trader.ts sin hovedløkke
4. Skriv 4 tester

**Verifikasjon:** `npx vitest run src/lib/trading/__tests__/session-invariants.test.ts`

---

### Task 1.4: Maksimer profit — optimaliser take-profit/stop-loss ratio

**Objective:** Analyser historiske trades for å finne optimal TP/SL ratio per symbol

**Files:** Ny `src/lib/trading/profit-optimizer.ts` + test

**Steg:**
1. Hent alle avsluttede handler siste 90 dager
2. Grupper på symbol og beregn optimal TP% og SL% basert på faktisk prisbevegelse
3. Oppdater `DEFAULT_RISK_PARAMS` i risk-engine
4. Skriv 5 tester

**Verifikasjon:** `npx vitest run src/lib/trading/canonical/__tests__/risk-engine.test.ts`

---

## Strøm 2: Kodekvalitet (tester, TypeScript, refaktorering)

### Task 2.1: Øk testdekning — finn utestede kritiske paths

**Objective:** Identifiser og test utestede funksjoner i trading/core

**Files:** Søk i `src/lib/trading/`

**Steg:**
1. Kjør coverage: `npx vitest run --coverage --include='src/lib/trading/**'`
2. Identifiser funksjoner med <80% coverage
3. Skriv tester for topp 5 utestede funksjoner
4. Mål: minst +3% coverage

**Verifikasjon:** Coverage-rapport viser forbedring

---

### Task 2.2: TypeScript strict — eliminer implisitte any

**Objective:** Aktiver `noImplicitAny` og fiks alle feil i trading-modulen

**Files:** `tsconfig.json` (midlertidig), `src/lib/trading/**/*.ts`

**Steg:**
1. Legg `"noImplicitAny": true` i tsconfig (kun for sjekk)
2. `npx tsc --noEmit --project tsconfig.json 2>&1 | grep "src/lib/trading"` → tell feil
3. Fiks alle — legg typer på parametre og returverdier
4. Fjern `noImplicitAny` fra tsconfig (global aktivering utsatt)

**Verifikasjon:** 0 feil fra trading-mappen med `noImplicitAny: true`

---

### Task 2.3: Refaktorer duplisert kode

**Objective:** Finn og eliminer duplisert kode i trading-modulen

**Files:** `src/lib/trading/**/*.ts`

**Steg:**
1. Kjør `npx jscpd src/lib/trading/` for å finne duplikater
2. Trekk ut felles funksjonalitet til delte utilities
3. Oppdater imports
4. Kjør tester for å bekrefte ingen regresjon

**Verifikasjon:** Alle 1496 tester grønne

---

## Strøm 3: Database & Infrastruktur

### Task 3.1: DB-indeksering for trading-spørringer

**Objective:** Analyser slow queries og legg til manglende indekser

**Files:** `supabase/migrations/` (ny migrasjon)

**Steg:**
1. Sjekk `paper_trades` og `trading_sessions` for manglende indekser (user_id, symbol, created_at)
2. Skriv migrasjon med `CREATE INDEX IF NOT EXISTS`
3. Vis SQL-diff — IKKE kjør uten godkjenning

**Verifikasjon:** `EXPLAIN ANALYZE` viser index scan istedenfor seq scan

---

### Task 3.2: Edge-function cold-start optimalisering

**Objective:** Reduser cold-start tid for smart-trader-v3

**Files:** `supabase/functions/smart-trader-v3/index.ts`

**Steg:**
1. Analyser import-kjeden — fjern ubrukte avhengigheter
2. Bruk dynamisk import for tunge moduler
3. Legg til oppvarmingsping i helsesjekken

**Verifikasjon:** `supabase functions deploy smart-trader-v3` + målt responsforbedring

---

### Task 3.3: Rate-limiting på trading API

**Objective:** Legg til rate-limiting på `/api/paper-trading/execute`

**Files:** `src/app/api/paper-trading/execute/route.ts`

**Steg:**
1. Implementer in-memory rate-limit (max 10 requests/sekund per bruker)
2. Returner 429 med retry-after header
3. Logg rate-limit treff til monitoring

**Verifikasjon:** `curl`-loop viser 429 etter 10 requests

---

## Strøm 4: Deploy & Monitorering

### Task 4.1: Automatisk deploy etter grønne tester

**Objective:** CI/CD: auto-deploy til staging når main er grønn

**Files:** `.github/workflows/deploy-production.yml`

**Steg:**
1. Utvid workflow med staging-deploy etter `test:unit` + `lint` + `check` passerer
2. Legg til smoke-test mot staging-url
3. Notifikasjon til Hermes ved feil

**Verifikasjon:** Push til main → auto-deploy til staging → smoke-test grønn

---

### Task 4.2: Health dashboard — sanntidsstatus

**Objective:** Bygg en `/api/health/metrics` endpoint med alle nøkkeltall

**Files:** `src/app/api/health/metrics/route.ts`, `src/lib/trading/health-metrics.ts`

**Steg:**
1. Samle alle helsesjekker i én endpoint: DB-status, aktive sesjoner, siste handler, P&L, error-rate
2. Cache i 30 sekunder
3. Vis på admin-dashboard

**Verifikasjon:** `curl localhost:3000/api/health/metrics` returnerer JSON med alle felt

---

### Task 4.3: Alarmering — push-varsel ved kritiske feil

**Objective:** Send Resend-epost når trading-sesjoner krasjer eller P&L faller >5%

**Files:** `src/lib/trading/alerting.ts` (ny)

**Steg:**
1. Implementer `sendAlert(type, message)` via Resend API
2. Koble til auto-heal og session-invariants
3. Rate-limit: maks 1 alarm per time per type

**Verifikasjon:** Simuler en krasjet sesjon → epost sendes til tomarnejensen@gmail.com

---

## Sekvensiell flyt

```
Strøm 1 ──┐
Strøm 2 ──┼── Parallelle → Kjør alle 4 samtidig via delegate_task
Strøm 3 ──┤
Strøm 4 ──┘
         │
         ▼
    Samle resultater → Oppdater plan med funn → deploy (med godkjenning)
```

---

## Risikoer

| Risiko | Sannsynlighet | Mitigering |
|--------|--------------|------------|
| Signal-guard-endringer stopper legitime handler | Medium | A/B-test, feature flag |
| DB-migrasjon låser tabell | Lav | `CONCURRENTLY` for indekser |
| Rate-limiting blokkerer ekte brukere | Lav | Høy grense (10 req/s), logging |
| Auto-deploy pusher broken build | Lav | Smoke-test før deploy |

---

## Leveranser

1. Trading-rapport: `.hermes/analysis/profit-leaks-2026-07-28.md`
2. Kodeendringer: 8-12 commits over 4 strømmer
3. DB-migrasjon: 1 SQL-fil (klar for godkjenning)
4. Deploy: staging auto-deploy aktivert
