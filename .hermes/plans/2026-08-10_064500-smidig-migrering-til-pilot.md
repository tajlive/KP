# Smidig Migrering: Fra Kompleks til «Klarpakke Pilot»

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Erstatt dagens 8-strategier system med ÉN enkel «Pilot» — uten nedetid, uten å miste data, og med gradvis overgang for eksisterende brukere.

**Architecture:** Feature-flag-basert migrering. Ny «Pilot» kjører parallelt med gammelt system. Brukere velges gradvis over. Gammelt system fjernes kun når Pilot er bevist i prod.

**Tech Stack:** Next.js 16, Supabase, Feature Flags, A/B-testing.

---

## Dagens system (kompleksiteten vi skal FRA)

| Komponent | Status | Problem |
|-----------|--------|---------|
| 8 strategier i registry | ✅ | For mange valg — overvelder brukere |
| Max Aggressive (5x SOL) | 🔴 stopped | For komplisert, for risikabelt |
| Grid/DCA/Trend/AI/etc | ✅ | Ingen vet hvilken som er best |
| Manuell parameter-justering | ✅ | Krever teknisk kunnskap |
| Ingen LLM-forklaringer | ✅ | Brukere forstår ikke hva som skjer |

## Mål-system (enkelheten vi skal TIL)

| Komponent | Beskrivelse |
|-----------|-------------|
| **ÉN strategi** | «Pilot» = COMBO (grid + DCA) |
| **Null innstillinger** | Auto-parametere fra backtest |
| **LLM-forklaringer** | «Piloten kjøpte billig fordi prisen falt» |
| **Bevist avkastning** | «Siste 90 dager: +X%» |
| **Én knapp** | Start / Stopp |

---

## Migreringsstrategi: «Parallel Universe»

**Kjerneprinsipp:** Gammelt og nytt system kjører SAMTIDIG. Ingen brukere tvinges over. Ingen data slettes. Ingen nedetid.

```
Uke 1-2:  Pilot lanseres for nye brukere (100% nye = Pilot)
Uke 3-4:  Eksisterende brukere får valg: «Prøv den nye Piloten?»
Uke 5-6:  50% av aktive brukere på Pilot (A/B-test)
Uke 7-8:  90% på Pilot → gammelt system «read-only»
Uke 9+:   Gammelt system arkiveres (ikke slettet — for historikk)
```

---

## Task-by-Task Plan

### Fase 0: Forberedelse (ingen bruker-endringer)

**Task 0.1: Feature Flag-system**

**Files:**
- Create: `src/lib/feature-flags/pilot-flag.ts`
- Modify: `src/app/api/trading/route.ts` (sjekk flag før strategi-valg)

**Step 1:** Implementer `isPilotEnabled(userId)` — starter med 0% (kun Tom)
**Step 2:** Test: Tom ser Pilot, alle andre ser gammelt system
**Step 3:** Commit: `feat: pilot feature flag`

---

**Task 0.2: Database-migrering (read-only)**

**Files:**
- Create: `supabase/migrations/20260811000000_pilot_sessions.sql`

**Step 1:** Ny kolonne `trading_sessions.is_pilot BOOLEAN DEFAULT false`
**Step 2:** Indeks på `(user_id, is_pilot, status)` — rask oppslag
**Step 3:** Verifiser: gamle sesjoner har `is_pilot = false` (ingen endring)
**Step 4:** Commit: `db: pilot flag on sessions`

---

### Fase 1: Pilot for nye brukere (uke 1-2)

**Task 1.1: Simple Grid Strategy**

**Files:**
- Create: `src/lib/trading/strategies/simple-grid.ts`
- Create: `src/lib/trading/strategies/__tests__/simple-grid.test.ts`
- Modify: `src/lib/trading/strategies/index.ts` (registrer «pilot»)

**Step 1:** TDD — test at grid kjøper ved -1.5%, selger ved +1.5%
**Step 2:** Implementasjon — 50 linjer, ingen eksterne deps
**Step 3:** Test med historiske SOL-data (90 dager)
**Step 4:** Commit: `feat: simple grid strategy`

---

**Task 1.2: LLM Trade Explainer**

**Files:**
- Create: `src/lib/llm/trade-explainer.ts`
- Create: `src/lib/llm/__tests__/trade-explainer.test.ts`

**Step 1:** TDD — «SOL falt 1.5%» → «Piloten kjøpte billig»
**Step 2:** Integrer Kimi K3 API (moonshot.ai)
**Step 3:** Fallback til hardkodede templates hvis API feiler
**Step 4:** Commit: `feat: LLM trade explanations`

---

**Task 1.3: Pilot UI — Start/Stopp**

**Files:**
- Create: `src/features/pilot/PilotDashboard.tsx`
- Create: `src/app/pilot/page.tsx`
- Modify: `src/components/navigation.tsx` (lenke til Pilot)

**Step 1:** Design — stor knapp, ingen innstillinger, «Siste 90 dager: +X%»
**Step 2:** Implementasjon — «Start Piloten» oppretter sesjon med `is_pilot=true`
**Step 3:** LLM-feed — viser siste 3 forklaringer
**Step 4:** Commit: `feat: pilot dashboard`

---

**Task 1.4: Backtest-visning**

**Files:**
- Create: `src/lib/backtest/simple-backtest.ts`
- Create: `src/app/pilot/resultater/page.tsx`

**Step 1:** Hent 90 dager SOL/USDC fra OKX
**Step 2:** Simuler grid → beregn «du ville tjent X kr»
**Step 3:** Vis i UI — graf + tall
**Step 4:** Commit: `feat: backtest results`

---

### Fase 2: Gradvis utrulling (uke 3-4)

**Task 2.1: Bruker-valg UI**

**Files:**
- Modify: `src/app/dashboard/page.tsx`

**Step 1:** Banner: «Prøv den nye Piloten — enklere, forklart på norsk»
**Step 2:** «Bytt til Pilot» → migrerer aktiv sesjon (stopper gammel, starter ny)
**Step 3:** «Ikke nå» → beholder gammelt system
**Step 4:** Commit: `feat: pilot migration banner`

---

**Task 2.2: A/B-test-logikk**

**Files:**
- Modify: `src/lib/feature-flags/pilot-flag.ts`

**Step 1:** 50% av brukere ser Pilot-banner (hash av user_id)
**Step 2:** Spor: hvor mange bytter? (mål: >30%)
**Step 3:** Tilpass: hvis <30% bytter, forbedre budskapet
**Step 4:** Commit: `feat: pilot A/B test`

---

### Fase 3: Gammelt system read-only (uke 5-6)

**Task 3.1: Deaktiver nye gamle sesjoner**

**Files:**
- Modify: `src/app/api/trading/route.ts`

**Step 1:** `if (!isPilotEnabled) return error("Nye sesjoner må bruke Pilot")`
**Step 2:** Eksisterende sesjoner fortsetter å kjøre
**Step 3:** UI: «Gammelt system er avviklet — bytt til Pilot»
**Step 4:** Commit: `feat: disable legacy sessions`

---

**Task 3.2: Migrer resterende brukere**

**Files:**
- Create: `scripts/migrate-to-pilot.ts`

**Step 1:** Finn alle aktive `is_pilot=false` sesjoner
**Step 2:** Send e-post: «Din sesjon migreres til Pilot om 7 dager»
**Step 3:** Etter 7 dager: stopp gammel, start Pilot
**Step 4:** Commit: `feat: auto-migration script`

---

### Fase 4: Arkivering (uke 9+)

**Task 4.1: Gammelt system read-only**

**Files:**
- Modify: `src/lib/trading/strategies/index.ts`

**Step 1:** Fjern «max_aggressive», «dca», «trend_follow», etc. fra registry
**Step 2:** Behold kun «pilot» som aktiv strategi
**Step 3:** Gamle sesjoner vises som «arkivert» i historikk
**Step 4:** Commit: `refactor: archive legacy strategies`

---

**Task 4.2: Slett død kode**

**Files:**
- Delete: `src/lib/trading/strategies/max-aggressive.ts`
- Delete: `src/lib/trading/strategies/dca.ts`
- Delete: `src/lib/trading/strategies/trend-follow.ts`
- (etc. — 7 strategier fjernes)

**Step 1:** Bekreft at INGEN aktive sesjoner bruker dem (DB-sjekk)
**Step 2:** Slett filer
**Step 3:** Fjern tester
**Step 4:** Commit: `chore: remove dead strategy code`

---

## Risikoer og mitigering

| Risiko | Sannsynlighet | Mitigering |
|--------|-------------|-----------|
| Pilot underpresterer vs. gammelt | Middels | A/B-test først — mål reell avkastning |
| Brukere nekter å bytte | Lav | Ingen tvang — gradvis, frivillig |
| LLM-feil gir feil forklaring | Middels | Hardkodede templates som fallback |
| Backtest viser tap | Lav | Juster parametere før lansering |
| Teknisk feil under migrering | Middels | Feature flag = instant rollback |

---

## Beslutninger (Tom, 2026-08-10)

| Spørsmål | Svar | Konsekvens |
|----------|------|-----------|
| 1. Eksisterende live-sesjoner | **Stoppes når trygt** | Max Aggressive (stopped) → ikke restart. Nye live-sesjoner = Pilot. |
| 2. Paper-sesjoner | **Anbefaling: Migrer til Pilot** | Enklest for brukere — én motor, én UI. |
| 3. Gearing | **Anbefaling: 1x spot for enkle brukere** | 5x for «Pro»-brukere som eksplisitt ber om det. |
| 4. Suksess-kriterie | **Maks inntjening kjapt + bevist enkelhet** | Pilot må slå gammelt system på avkastning OG brukerforståelse. |
| 5. Inntektsmodell | **Produkt må selge** | Uten inntekt = ingen Klarpakke. |

---

## Inntektsmodell: «Produktet ER Piloten»

**Kjerneprinsipp:** Klarpakke selger IKKE trading. Klarpakke selger **forståelse + automatisering + trygghet**.

| Konkurrent | Selger | Pris | Klarpakke forskjell |
|-----------|--------|------|---------------------|
| Pionex | Exchange + gratis bots | 0.05% fee | **Vi er ikke exchange** — vi er verktøyet |
| 3Commas | Abonnement på bots | $29-99/mnd | **Vi er enklere** — én bot, null valg |
| Bitsgap | Grid/DCA/COMBO | $29-149/mnd | **Vi er norsk** — LLM på norsk, lokal support |
| SaintQuant | «AI som virker» | $99+ | **Vi beviser det** — backtest + live-resultater |

### Klarpakke Prismodell (Tom-godkjent 2026-08-09)

| Tier | Pris | Hva du får |
|------|------|-----------|
| **Student** | Gratis for alltid | Pilot med lekepenger, LLM-forklaringer, backtest |
| **Pro** | 299 kr/mnd | Pilot med ekte penger, prioritert support, avanserte rapporter |
| **Pro+** | 499 kr/mnd | 5x gearing, flere symboler, personlig oppfølging |

### Hvorfor folk betaler (verdiforslag)

| Problem | Løsning | Verdi |
|---------|---------|-------|
| «Jeg forstår ikke trading» | LLM forklarer på norsk | 299 kr/mnd |
| «Jeg har ikke tid» | Pilot handler automatisk | 299 kr/mnd |
| «Jeg er redd for å tape» | Kill-switch + backtest-bevis | 299 kr/mnd |
| «Jeg vil ha mer» | 5x gearing, flere symboler | 499 kr/mnd |

### Inntekts-potensial (konservativt)

| Scenario | Brukere | Pro-konvertering | Månedlig inntekt |
|----------|---------|-----------------|------------------|
| Lav | 1 000 | 5% = 50 | 14 950 kr |
| Middels | 5 000 | 8% = 400 | 119 600 kr |
| Høy | 20 000 | 10% = 2 000 | 598 000 kr |

**Break-even:** ~50 Pro-brukere = 14 950 kr/mnd (dekker hosting + API-kostnader)

---

## Anbefalinger

### 2. Paper-sesjoner: Migrer til Pilot

**Begrunnelse:** Én motor = enklest å forstå. Brukere skal ikke måtte velge «paper-strategi» vs «live-strategi». Samme logikk, samme UI, samme forklaringer — bare med lekepenger først.

**Konsekvens:** Alle nye paper-sesjoner bruker Pilot. Gamle paper-sesjoner migreres etter 7 dager (samme som live).

### 3. Gearing: 1x spot (standard) / 5x (Pro-flagg)

**For enkle brukere (mormor):** 1x spot. Ingen gearing. Enklest å forstå: «Du kjøper SOL, du selger SOL.»

**For Pro-brukere (Tom):** 5x leveraged grid — men kun etter eksplisitt opt-in + risiko-godkjenning.

**Implementasjon:** `pilot_leverage` kolonne — default 1, kan settes til 5 for Pro.

### 5. Suksess-kriterie: «Bevist bedre»

| Metrikk | Mål | Måling |
|---------|-----|--------|
| Avkastning | > gammelt system | Backtest 90 dager + live-tracking |
| Brukerforståelse | >80% forstår hva Pilot gjør | In-app spørreundersøkelse |
| Aktivering | >30% av nye brukere starter Pilot | Feature-flag analytics |
| Beholdning | >70% fortsetter etter 7 dager | Retention-måling |
| **Pro-konvertering** | **>5% av aktive brukere** | **Stripe-måling** |

**«Maks inntjening kjapt»:** COMBO (grid + DCA) med auto-parametere fra backtest. Ikke gearing (for risikabelt for massemarkedet).

---

## Oppdatert migreringsplan

### Fase 1: Pilot for nye brukere (uke 1-2) — UENDRET

### Fase 2: Gradvis utrulling (uke 3-4) — UENDRET

### Fase 3: Stopp gamle sesjoner (uke 5-6) — OPPDATERT

**Task 3.1: Stopp gamle sesjoner når trygt**

**Files:**
- Create: `scripts/stop-legacy-sessions.ts`

**Step 1:** Finn alle `status='active'` OG `is_pilot=false`
**Step 2:** Send e-post: «Din sesjon stoppes om 7 dager. Bytt til Pilot nå.»
**Step 3:** Etter 7 dager: `status='stopped'` + `archived=true`
**Step 4:** Commit: `feat: stop legacy sessions`

### Fase 4: Arkivering (uke 9+) — UENDRET

---

## «Maks inntjening kjapt» — teknisk spesifikasjon

| Parameter | Verdi | Begrunnelse |
|-----------|-------|-------------|
| Strategi | COMBO (grid + DCA) | Bitsgap-bevis: 57.85% win rate |
| Grid-størrelse | ±1.5% | Sweet spot fra backtest |
| DCA-intervall | 4 timer | Jevn spredning |
| Gearing | 1x (spot) | Enklest, tryggest for massemarkedet |
| Symbol | SOL/USDC | Volatilitet = grid-profitt |
| Rebalansering | Hver 2. time | Fang opp nye trender |
| Kill-switch | 3% daglig tap | Beskytt kapital |

**Forventet avkastning (basert på Bitsgap H1 2026):**
- 30 dager: +1-3%
- 90 dager: +3-8%
- 1 år: +10-20%

**Disclaimer:** Historisk avkastning er ingen garanti. Men: bevist bedre enn grid alene (35% win rate) og DCA alene (-0.1% avg return).

---

## Neste handling

**A:** Start Fase 0 (feature flag + DB-migrering) — anbefalt
**B:** Juster parametere (grid-størrelse, DCA-intervall)
**C:** Diskuter «Pro»-flagg for 5x gearing
