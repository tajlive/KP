# Trading-logikk: realisert/urealisert P&L + exit-strategi — Implementation Plan

> **For Hermes:** Implementeres task-for-task (TDD). Ingen merge/deploy — PR til Tom.

**Goal:** Gjøre Handelshistorikk og bot-logikken logisk konsistent: åpne posisjoner synlige med urealisert P&L, og aldri forlatte åpne posisjoner uten exit-håndtering.

**Architecture:** Exit-logikk finnes allerede i tick-motoren (trailing TP, time-exit, partial TP) men er låst til `session.open_position` på *aktive* sesjoner. Rotårsaken til 0/0/+0 er at **stoppete sesjoner forlater åpne posisjoner** (orphans) — de tickes aldri igjen. Fiksen: posisjoner eies av bruker+par (ikke sesjons-livssyklus), UI viser åpne posisjoner à la eToro/Revolut.

**Tech Stack:** Next.js 16, Supabase (paper_accounts/trading_sessions/trades), Vitest, cron tick-motor (`src/app/api/cron/tick/route.ts`).

---

## Funn-dokumentasjon (prod-verifisert 2026-07-25, konto tomarnejensen)

| Funn | Bevis |
|---|---|
| Historikk 8 kjøp / 0 salg / +0 er **korrekt visning** | `/api/user/trades` filtrerer `archived=false`; aktive æra har kun kjøp |
| All realisert P&L i arkiverte test-sesjoner | 19 salg +320 894 kr (archived=true), korrekt gjemt |
| **59 stopped DCA-sesjoner på 7 dager** (18–25.07) — sesjon-churn | `trading_sessions` grouped: BTCUSDT/dca/stopped=59 |
| **Orphan-posisjoner**: kjøp 18–24.07 tilhører stopped sesjoner → tickes aldri → selges aldri | trades m/ `strategy_signal` DCA, session status=stopped |
| **Par-format splitt**: `BTCUSDT` vs `BTC/USDT` sameksisterer → bryter unik-indeks + gruppering | grouped query viser begge |
| Exit-logikk finnes men kun for aktive sesjoner | `tick/route.ts:551–650` (trailing TP, time-exit 7d, partial TP) |
| 3 av 4 DCA-kjøp m/ `expectancy < 0` + `confidence: 0` — kjøper likevel | `strategy_signal.position_size_reason` |
| Aktive sesjoner HAR open_position (opprettet i dag 25.07) — exit har bare ikke rukket å fyres | `open_position` jsonb verifisert |

## Konkurrent-analyse (ledende plattformer)

| Plattform | Mønster |
|---|---|
| **eToro / Revolut** | Åpne posisjoner m/ urealisert P&L front-and-center; handelshistorikk er sekundær. Aldri bare "0 vinn/0 tap" for en bruker som holder beholdning |
| **3Commas DCA** | Multiple Take Profit + Trailing TP på siste nivå; posisjon ("deal") eies av botten, men **stenger du botten håndteres dealen eksplisitt** |
| **Bitsgap** | "Close position by market" ved bot-stopp; Trailing TP; manuell averaging |
| **Pionex** | Bot-historikk-tab viser lukkede botter m/ P&L; posisjon følger bot-livssyklus med eksplisitt close |
| **Felles standard** | Ingen plattform etterlater en åpen posisjon *umanngjort* ved stopp. Enten market-close eller eksplisitt overføring |

---

## Beslutningspunkter (Tom velger — anbefaling markert)

### Alternativer for exit/orphan-håndtering

- **Alt 1 (ANBEFALT): Close-on-stop + posisjons-arv**
  - Stopper en sesjon med åpen posisjon → market-selg posisjonen (Bitsgap-mønster), realized_pnl bokføres.
  - Ny sesjon for samme bruker+par+strategi **arver** eventuell orphan-posisjon fra stopped sesjon (migrering av eksisterende orphans).
  - Minimalt inngripende, bakoverkompatibelt, fikser både fremtid og fortid.
- **Alt 2: Posisjoner eies av bruker+par (ny `positions`-tabell)**
  - Mest korrekt langsiktig (3Commas SmartTrade-nivå). Større refaktor: tick, executor, UI, migrasjon. Anbefalt som **fase 2** etter Alt 1.
- **Alt 3: Kun UI-fiks** (urealisert P&L fra trades-aggregering, ingen exit-endring)
  - Raskest, men strategien selger fortsatt aldri — symptomfiks. Ikke anbefalt alene.

### Alternativer for historikk-UI

- **UI-A (ANBEFALT): Posisjonskort øverst** — "Åpne posisjoner: mengde, snittinngang, nåpris, urealisert P&L" + eksisterende tabell under. eToro-mønster.
- **UI-B: FIFO lot-matching per salg** — per-trade realisert P&L også i tabellen. Kommer gratis med Alt 1 (salg får realized_pnl ved eksekvering, bevist i archived-æra).

---

## Tasks

### Task 1: Kanonisk par-normalisering

**Objective:** Én par-format (`BTCUSDT`) overalt — stopper unik-indeks-brudd og grupperingsfeil.

**Files:**
- Modify: `src/lib/trading/currency.ts` (eller der par parses — finn med `grep -rn "BTC/USDT" src/lib`)
- Create: `src/lib/trading/__tests__/pair-normalize.test.ts`

**Step 1:** Failing test: `normalizePair("BTC/USDT") === "BTCUSDT"`, idempotent på `BTCUSDT`.
**Step 2:** `npm run test:unit -- pair-normalize` → FAIL.
**Step 3:** Implementer `normalizePair` + bruk i tick-sesjonsoppretting (`tick/route.ts:~1480`) og executor-paths.
**Step 4:** Test grønn.
**Step 5:** DB-sjekk: `UPDATE trading_sessions SET trading_pair='BTCUSDT' WHERE trading_pair='BTC/USDT'` (egen migrasjon, idempotent). Commit.

### Task 2: `positions`-visning (UI-A) — urealisert P&L

**Objective:** Historikk-siden viser åpne posisjoner m/ urealisert P&L øverst.

**Files:**
- Modify: `src/app/api/user/trades/route.ts` — legg til `positions`-aggregering (FIFO cost-basis fra kjøp−salg per par, archived=false-sesjoner)
- Modify: `src/app/[locale]/(user)/dashboard/historikk/ClientHandelshistorikk.tsx` — posisjonskort over tabellen
- Test: `src/app/api/user/trades/__tests__/route.test.ts`, `historikk/__tests__/ClientHandelshistorikk.test.tsx`
- i18n: nye nøkler i **både** `messages/no.json` og `messages/en.json` (paritet-krav)

**Step 1:** Failing test: API returnerer `positions: [{pair, quantity, avg_entry, unrealized_pnl}]` for kjøp uten salg.
**Step 2:** Kjør → FAIL.
**Step 3:** Implementer FIFO-aggregering server-side; nåpris fra eksisterende price-cache (10s TTL).
**Step 4:** API-test grønn.
**Step 5:** Failing UI-test: kortet rendrer "Urealisert P&L" m/ verdi.
**Step 6:** Implementer mobil-først kort (48px touch, én CTA-regel).
**Step 7:** `npm run test:unit` + `npm run lint` + `npx tsc --noEmit` + i18n:validate. Commit.

### Task 3: Close-on-stop (Alt 1, del 1)

**Objective:** Stoppes en sesjon med åpen posisjon → market-selg + bokfør realized_pnl.

**Files:**
- Modify: stopp-path — finn med `grep -rn "status.*stopped\|'stopped'" src/app/api src/lib | grep -i session`
- Modify: `src/app/api/cron/tick/route.ts` (selg-eksekvering gjenbrukes)
- Test: `src/lib/trading/__tests__/close-on-stop.test.ts`

**Step 1:** Failing test: stopp m/ open_position → sell-trade opprettet m/ realized_pnl, open_position null.
**Step 2:** FAIL.
**Step 3:** Implementer (gjenbruk eksisterende sell-executor + slippage 0,2 %).
**Step 4:** Grønn. Commit.

### Task 4: Posisjons-arv + orphan-migrasjon (Alt 1, del 2)

**Objective:** Ny sesjon arver orphan-posisjon; eksisterende orphans (Toms 8 kjøp) tilordnes aktiv sesjon.

**Files:**
- Modify: `src/app/api/cron/tick/route.ts:1442–1520` (`ensurePaperSessions`)
- Create: `supabase/migrations/YYYYMMDDHHMMSS_adopt_orphan_positions.sql`
- Test: `src/lib/trading/__tests__/adopt-orphan.test.ts`

**Step 1:** Failing test: stopped sesjon m/ posisjon + ny aktiv sesjon samme par → posisjonen flyttes (open_position på nye, null på gamle).
**Step 2:** FAIL.
**Step 3:** Implementer adopt-logikk i ensurePaperSessions.
**Step 4:** Grønn.
**Step 5:** Migrasjon: for hver stopped sesjon m/ trades uten motpart — aggreger til aktiv sesjon (idempotent, `WHERE open_position IS NULL`). Verifiser mot staging-datasett først.
**Step 6:** Commit.

### Task 5: Negative expectancy-guard (D)

**Objective:** Ingen kjøp når signal selv sier `expectancy < 0` eller `confidence = 0`.

**Files:**
- Modify: signal-evaluering i `tick/route.ts` (der action settes, ~linje 394/448)
- Test: `src/lib/trading/__tests__/expectancy-guard.test.ts`

**Step 1:** Failing test: signal m/ expectancy<0 → action tvinges til `hold`.
**Step 2:** FAIL. **Step 3:** Implementer guard (logg "blokkert kjøp" til trading_logs). **Step 4:** Grønn. Commit.

### Task 6: Sesjon-churn-brems

**Objective:** Ikke 59 nye sesjoner i uka — gjenbruk aktiv sesjon per bruker+par+strategi.

**Files:**
- Modify: `tick/route.ts:1442–1520` + der sesjoner stoppes
- Test: utvid `execute-trade-currency.test.ts`

**Step 1:** Failing test: tick med eksisterende aktiv sesjon → ingen ny insert.
**Step 2:** FAIL (hvis reproduserbar — ellers dokumentér churn-kilden: JokerTrade-toggle?). **Step 3:** Fiks kilden. **Step 4:** Grønn. Commit.

---

## Verifisering (gates, alle må være grønne)

```bash
node scripts/validate-migrations.mjs --staged   # nye migrasjoner idempotente
npm run lint          # 0 nye
npm run test:unit     # 1385+ nye tester
npx tsc --noEmit      # 0 feil
npm run i18n:validate # no/en paritet
```

**Prod-verifisering etter deploy (Toms steg):**
1. Historikk viser posisjonskort m/ urealisert P&L ≠ 0
2. Neste bot-stopp → salg synlig i historikk m/ realized_pnl
3. `SELECT count(*) FROM trading_sessions WHERE status='active' AND archived=false` ≤ 3 (én per par+strategi)
4. Ingen `BTC/USDT` (slash) rader igjen

## Risiko / tradeoffs / åpne spørsmål

- **Orphan-migrasjon (Task 4) berører brukerdata** — kun én konto i prod med orphans (Toms). Krever eksplisitt go fra Tom før migrasjon kjøres; kjør SELECT-verifikasjon først.
- **Close-on-stop endrer brukerforventning**: noen vil kanskje beholde posisjonen ved stopp → vurder toggle `close_on_stop` i strategy_config (default true). Åpent spørsmål til Tom.
- **Par-normalisering**: verifiser at Binance-executor forventer `BTCUSDT` (uten slash) alle steder før migrasjon.
- **Fase 2 (Alt 2, positions-tabell)** utsettes bevisst — YAGNI inntil Alt 1 viser seg utilstrekkelig.
