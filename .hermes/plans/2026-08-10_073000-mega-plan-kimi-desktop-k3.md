# MEGA-PLAN FOR KIMI K3 (1M) PÅ KIMI DESKTOP

> **Formål:** Dette dokumentet er komplett kontekst + oppgavefordeling for KIMI K3 med 1M tokens kontekst på Kimi Desktop (via kimi-webbridge, port 3100 — gir repo/DB/CI-tilgang).
> **Bruk:** Lim inn hele dette dokumentet som første melding i en NY Kimi Desktop-økt. Ikke del det opp — 1M-konteksten er poenget: K3 skal laste HELE systemet i én kontekst.

---

# DEL 1: HVA KLARPAKKE ER (forretningskontekst)

**Klarpakke** er en norsk krypto-plattform for småsparere med LAV teknisk innsikt. Ikke profesjonelle tradere.

- **Vi er VERKTØY + OPPLÆRING — ALDRI broker.** Brukere kobler SIN EGEN exchange (OKX/Kraken). Vi rører aldri brukerens penger. API-nøkler: KUN trade-tilgang, ALDRI withdrawal.
- **Forretningsmodell:** Freemium. Student = gratis for alltid. Pro = 299 kr/mnd. Pro+ = 499 kr/mnd (5x gearing).
- **FOUNDER-LOVEN:** De 100 første registrerte får gratis tilgang for livet. Gjelder ALL copy.
- **Målgruppe:** «Mormor på 60» skal forstå ALT. Stor tekst (20px+), gevinst/tap størst (48px, i kr ikke %), trafikklys 🟢🟡🔴, ærlig om risiko («5x gevinst = 5x tap»), alltid «Hvorfor?»-forklaring med én setning, stor rød STOPP-knapp.
- **Alltid fakta:** ALDRI fabrikkerte tall, brukertall eller avkastningsløfter. Uten reelle data → utelat seksjonen.
- **Språk:** Norsk på brukerflate. post@klarpakke.no er ENESTE e-postadresse.
- **75% verktøy / 25% opplæring.** Verktøyet må fungere perfekt først.

---

# DEL 2: TEKNISK STACK + REPO

- **Repo:** `/Users/taj/klarpakke` (GitHub: tajlive/KP, branch main)
- **Stack:** Next.js 16, React 19, TypeScript 5.9, Tailwind CSS 4, Supabase (Postgres), Cloudflare Workers (prod)
- **Prod:** https://www.klarpakke.no (CF Workers via OpenNext)
- **Supabase-prosjekt:** `pskhryjzkobytnfwucrb`
- **Build:** `npm run cf:build` (next build → opennextjs). Deploy via CI (`deploy.yml`: test-gate → deploy → e2e-smoke).
- **Tester:** Vitest — 244/245 filer, 2121/2127 grønne. `npx tsc --noEmit` = 0 feil. ESLint = 0.
- **Node:** 24.18.0
- **Kritisk:** CF Workers = edge-runtime (V8 isolates) — INGEN Buffer, INGEN fs. Kun Web Crypto / Uint8Array.
- **DB-er-hellig-regel:** SQL-differ presenteres til Tom FØR kjøring. Aldri kjør DB-endringer uten godkjenning.

---

# DEL 3: NÅVÆRENDE SYSTEM-TILSTAND (verifisert 2026-08-10)

## Trading-motoren i dag
- **Tick-motor:** `src/app/api/cron/tick/route.ts` — pg_cron hvert 5. min (jobid 1143), eneste motor for BÅDE paper og live.
- **Strategi-registry:** `src/lib/trading/strategies/index.ts` — 8 strategier registrert (dca, trend_follow, multi_signal, grid, ai_copy, hybrid_arbitrage, ensemble_ai, max_aggressive).
- **Kritisk regel:** Ny strategi MÅ inn i TRE registre, ellers hoppes sesjonen STILLE over: `TickStrategyEngineKey` (types.ts) + `validEngines` (strategy-id-aliases.ts) + `engineDefaults` (strategy-configs.ts).
- **Executor-veier:** paper = simulert, live = OkxExecutor (`eea.okx.com`, USDC-kvote, nøkler fra `user_okx_keys` i DB — ALDRI process.env i prod).

## Sannhet om live-status
- Toms live-sesjon `d10c6096-67e4-4b60-b870-4b2dd1ed04b6` (max_aggressive, SOLUSDC, 1 457,64 kr): **status = stopped**. 0 reelle ordre noensinne. Saldo trygg: 151.84 USDC på OKX EU.
- **Max Aggressive er DØD som produkt** — erstattes av Pilot (se Del 4).

## Paper-saldo (P0 fikset 2026-08-10)
- Rotårsak: `klarpakke_hourly_balance_sync()` + `syncPaperAccountBalance()` + 2 API-ruter summerte ALLE sesjoner (inkl. stoppede) inn i `paper_accounts` hver time/5-min → eksponentiell inflasjon (100k → 697k uten én trade).
- **FIKSET:** Alle 4 kodeveier teller nå KUN `['active','paused']`. Toms saldo = 99 646,50 (fasit). Drift-alarm (`balance_inflation_detected`) aktiv i `klarpakke_hourly_consistency_check()`.
- **Regel:** `paper_accounts` er eneste fasit (SSoT). Stoppede sesjoner = fryst historikk, ALDRI levende penger.

## DevOps (2026-standard, live)
- CI: test-gate (tsc+eslint+vitest) → deploy → e2e-smoke-auth-prod (innlogget Playwright) → auto-rollback ved feil.
- Syntetisk monitor hvert 5. min (`synthetic-monitor.yml`).
- Sentry webhook → Trello «🚨 Varsler» (`/api/webhooks/sentry`).
- Playwright-feller: `auth.setup.ts` krever egen `playwright.auth.config.ts`; `storageState` KUN i `chromium-auth`-prosjekt (aldri globalt).

## Kjente gjenværende feil (P1/P2)
- Header viser «Logg inn / Start gratis» selv innlogget (server-auth 200, klient-AuthContext null).
- `/handel` viser live-tall i Lekepenger-modus.
- Død lenke i e-postmaler: `/no/profil` → 404 (email/index.ts:427, branded-templates.ts:116).
- Resultater-siden: «0 handler siste 30 dager» mens historikk viser 13.
- P2: tittel-feil på /handel, /marked, 404-side; verveprogram «Kommer snart» lenket i meny.

---

# DEL 4: VISJONEN — «KLARPAKKE PILOT» (det nye produktet)

**ÉN motor. ÉN strategi. ÉN knapp. Null innstillinger.**

## Konsept
- **«Start Piloten» / «Stopp Piloten»** — det er HELE brukerflaten.
- Strategi: **COMBO (grid ±1.5% + DCA hver 4. time)** på SOL/USDC, 1x spot. Auto-parametere fra backtest.
- Basert på Bitsgap H1 2026-data: COMBO = 57.85% win rate, 15.77% avg return (grid alene: 35.14%, DCA alene: -0.10%).
- **LLM forklarer HVER handel på mormor-norsk:** «Prisen falt, Piloten kjøpte billig. Når den stiger igjen, selger den.»
- **Backtest-bevis i UI:** «Siste 90 dager ville du tjent +2 340 kr» — med disclaimer «historisk ≠ fremtidig».
- **Kill-switch:** 3% daglig tap → auto-stopp + popup.

## Backtest-standard (López de Prado — ALDRI data-mining)
- Deflated Sharpe Ratio (DSR) ≥ 0.95 ved valg blant >10 varianter.
- ≥100 lukkede handler før «bevist»-stempel.
- Gebyr (0.1% OKX taker) + slippage ALLTID i modellen.
- Regime-dekning: bull, bear, sidelengs.
- Live-overvåking: rolling Sharpe < 50% av backtest → re-optimaliser eller skru av.
- Repo har allerede: `monte-carlo.ts`, `backtest-live-gap.ts` — bygg videre på disse.

## Konkurrent-forankring
- **Pionex** (5M brukere): 16 gratis bots, «ett klikk», 0.05% fee — enklest i markedet. Vår forskjell: norsk + LLM-forklaringer + bevist backtest.
- **3Commas**: kraftig men overveldende. **Cryptohopper**: for komplisert. **Bitsgap**: beste backtest-data.
- **Vår posisjon:** Én bot som er bevist, norsk, og forklarer alt. «Pionex-enkelhet × SaintQuant-transparens».

---

# DEL 5: MIGRERINGSSTRATEGI («Parallel Universe»)

Gammelt og nytt kjører SAMTIDIG. Ingen nedetid. Ingen tvang. Ingen datasletting.

| Fase | Uke | Handling |
|------|-----|----------|
| **0** | 0 | Feature flag `isPilotEnabled(userId)` + DB-kolonne `trading_sessions.is_pilot` |
| **1** | 1-2 | Pilot live for NYE brukere (Simple Grid + LLM + backtest-visning) |
| **2** | 3-4 | Eksisterende brukere får valg-banner: «Prøv den nye Piloten?» |
| **3** | 5-6 | Gamle sesjoner stoppes når trygt (7 dagers e-post-varsel først) |
| **4** | 9+ | Gammelt system arkiveres (read-only historikk, 7 strategifiler slettes) |

**Toms beslutninger (2026-08-10, låst):**
1. Gamle live-sesjoner: stoppes når trygt. Max Aggressive restartes IKKE.
2. Paper-sesjoner: migreres også til Pilot (én motor = enklest).
3. Gearing: 1x spot standard. 5x KUN som Pro+-flagg med eksplisitt risiko-godkjenning.
4. Suksess = «bevist bedre»: Pilot må slå gammelt system på avkastning OG brukerforståelse.

---

# DEL 6: INNTEKTSMODELL (låst)

**Klarpakke selger forståelse + automatisering + trygghet — IKKE trading.**

| Kilde | Andel | Detalj |
|-------|-------|--------|
| **Pro-abonnement** (299 kr/mnd) | 60% | Stripe, allerede integrert |
| **OKX Affiliate** (30-50% av trading fees) | 30% | Søknad IKKE sendt ennå — P0 |
| **Kraken Affiliate** (20-50%, cap $1000/ref) | 10% | Backup, krever 5000+ følgere — vent |
| **Pro+** (499 kr/mnd) | — | 5x gearing, flere symboler — Fase 2 |

- **Break-even:** ~50 Pro-brukere = ~15 000 kr/mnd.
- **Exchange-strategi:** OKX først (0.08-0.10% fee, CASP EU-lisens, timevis affiliate-utbetaling). Kraken backup. Binance DØD (geo-blokkert EU). Coinbase for dyr (1%+).
- **ALDRI egen handel/broker** — regulatorisk mareritt + interessekonflikt.

---

# DEL 7: NETTSIDE-REDESIGN (2026-standard)

## Scope
| Side | Nytt |
|------|------|
| `/` (landing) | **FULLSTENDIG NY** — Hero + 15s video-loop + «Start gratis» + tillitsseksjon + «Slik virker det» + backtest-bevis + FAQ |
| `/kurs` | **FULLSTENDIG NY** — 4 moduler (Kom-i-gang, Grid-strategi, Gå-live, Risiko) med video + tekst + fremdriftsindikator |
| `/priser` | **FULLSTENDIG NY** — Visuell tier-sammenligning (Student/Pro/Pro+) med «Mest populær»-merke, årspris-rabatt, FAQ |
| `/om-oss` | **FULLSTENDIG NY** — Toms historie (ordrett fra founder-avtale), bilder, «Hvorfor jeg bygget dette», verdi-fakta |
| `/pilot` | **NY side** — Start/Stopp-knapp + LLM-feed + backtest-tall |
| `/dashboard` | Pilot-dashboard (erstatter BestemorPanel) |
| `/handel`, `/marked`, 404 | P1/P2-feil fikses (titler, døde lenker, grammatikk) |

## Design-system
- Farger: mørk blå `#0f172a` (bakgrunn), grønn `#22c55e` (gevinst), rød `#ef4444` (tap), gul `#eab308` (venter).
- Typografi: Inter, STORRE (hero 4rem, gevinst/tap 48px+).
- Ikoner: Lucide + custom «Pilot»-ikon.
- Media: AI-genererte bilder (norsk fjord, rolig, tillitsvekkende), 15s hero-video.
- Animasjoner: Framer Motion — subtile, profesjonelle.
- Mobil-først (80% av trafikken er mobil).

---

# DEL 8: OPPGAVER TIL KIMI K3 (KIMI DESKTOP)

Du har 1M kontekst og repo-tilgang via kimi-webbridge. Last HELE relevante filer i én kontekst — ikke iterer med små lesinger (Tom-mandat: «Vivice 1M maksimalt»).

## Oppgave 1: DESIGN + ALLE SIDER (Kimi Desktop sin styrke)
1. **Landingsside `/`** — 3 design-varianter som ferdig HTML/Tailwind. Hero + video + «Start gratis» + tillitsseksjon + «Slik virker det» (3 steg) + backtest-bevis + FAQ. Ingen fabrikkerte tall — kun verifiserte fakta (100 000 kr lekepenger, null risiko, norsk, 5000 KLT til 100 første).
2. **Kursside `/kurs`** — 4 moduler (Kom-i-gang, Grid-strategi, Gå-live, Risiko). Hver modul: video-embed (YouTube) + tekst + «Merk som fullført». Fremdriftsindikator. YouTube-videoer lages separat (ikke denne oppgaven).
3. **Prisside `/priser`** — Student/Pro/Pro+ visuell sammenligning. «Mest populær»-merke på Pro. Årspris-rabatt (2 mnd gratis). FAQ-seksjon. FOUNDER-LOVEN: «De 100 første får gratis tilgang for livet» prominent.
4. **Om-oss `/om-oss`** — Toms historie ORDRETT fra founder-avtale (han godkjente ordlyden 2026-08-08). «Hvorfor jeg bygget dette». Verdi-fakta: norsk, transparent, verktøy-ikke-broker. Bilder: AI-generert (norsk, autentisk, ikke stock).
5. **Pilot-dashboard** — Start/Stopp-knapp (stor), trafikklys-status, gevinst/tap 48px, LLM-feed-kort.
6. Alt: mormor-testet (20px+, ingen fagjargong), norsk, mørk blå base, mobil-først.

## Oppgave 2: PILOT-MOTOR (kode)
1. `src/lib/trading/strategies/simple-grid.ts` — grid ±1.5%, TDD, registrert i ALLE 3 registre (types/aliases/configs).
2. `src/lib/llm/trade-explainer.ts` — Kimi K3 (api.moonshot.ai) → norsk forklaring per trade. Hardkodede templates som fallback.
3. `src/lib/backtest/simple-backtest.ts` — 90 dager OKX-historikk → «du ville tjent X kr». DSR-sjekk.
4. `src/features/pilot/PilotDashboard.tsx` + `src/app/pilot/page.tsx` — hele Pilot-siden.
5. Feature flag: `src/lib/feature-flags/pilot-flag.ts` + migrasjon `is_pilot`-kolonne.

## Oppgave 3: P1/P2-BUGS (quick wins)
1. Header «Logg inn» innlogget → bruk `/api/auth/me` i stedet for klient-AuthContext.
2. `/handel` live-tall i Lekepenger-modus → skill paper/live-data strengt.
3. E-post død lenke `/no/profil` → 404 → pek til `/no/innstillinger`.
4. Resultater-side «0 handler» → samme datakilde som historikk.

## Oppgave 4: OKX AFFILIATE (forberedelse)
1. Søknadstekst til OKX Affiliate Program (engelsk, «norsk trading-plattform for nybegynnere»).
2. `src/lib/affiliate/okx-referral.ts` — spor referral ved «Koble til OKX», lagre i `user_profiles`.

## REGLER FOR ALT ARBEID
- **TDD:** test FØRST (vitest), se den feile, implementer, se den passere.
- **Gates før commit:** `npx tsc --noEmit` = 0, eslint = 0, vitest grønn.
- **Commit:** `bash scripts/quick-commit.sh "feat: ..."` — CI kjører resten.
- **DB:** ALDRI kjør SQL-endringer — lag diff, presenter for Tom, vent på «kjør».
- **Prod-verifisering:** «fikset» er ikke fikset før verifisert i EKTE prod-HTML (curl/playwright).
- **Ingen fabrikkerte tall noe sted.** Historiske tall = fra DB/backtest med kilde.
- **Ikke fjern synlig UI uten eksplisitt Tom-OK** — beskriv hva som forsvinner, vent på bekreftelse.

## KJENTE FALLGRUVER (lært den harde veien)
- Edge-runtime: ingen Buffer (`encrypt-api-keys.ts` krasjet i prod pga dette).
- Supabase-cookie kan være chunked (`.0/.1`) — slå sammen før JSON.parse.
- API-ruter henter exchange-nøkler fra `user_okx_keys` i DB — ALDRI `process.env` i prod.
- EU-OKX: `eea.okx.com` (IKKE www → 50119), kvote USDC (IKKE USDT).
- useQuery krever QueryClientProvider — `/dashboard` hadde ikke, hele siden krasjet.
- Ny strategi uten registry-oppdatering i 3 filer = stille skip (0 trades, ingen feil).
- Stoppede sesjoner i kapital-summering = eksponentiell inflasjon (P0 2026-08-10).

---

# DEL 9: AGENTIC AI — FULL AUTOMASJON

## Mål
Kimi Desktop K3 jobber **autonomt** fra oppgave til commit, uten å vente på menneskelig input mellom hver task.

## Arkitektur: «Auto-Pilot Development Loop»

```
┌─────────────────────────────────────────────────────────────┐
│  KIMI DESKTOP K3 (1M kontekst)                              │
│                                                             │
│  1. Les Trello-kort / oppgave                               │
│  2. Last HELE repo-kontekst (Vivice 1M-mandat)              │
│  3. TDD: Skriv test → se den feile → implementer → pass     │
│  4. Kjør gates: tsc → eslint → vitest                       │
│  5. Commit via scripts/quick-commit.sh                      │
│  6. CI kjører automatisk (test-gate → deploy → e2e-smoke)   │
│  7. Rapporter til Tom: «Commit abc123 — hva ble gjort»      │
│  8. Neste oppgave                                           │
└─────────────────────────────────────────────────────────────┘
```

## Regler for autonom drift

| Regel | Beskrivelse |
|-------|-------------|
| **Ingen DB-endringer uten Tom** | SQL-differ presenteres, vent på «kjør» |
| **Ingen synlige UI-fjerninger uten Tom** | Beskriv hva som forsvinner, vent på OK |
| **Ingen live-trading uten Tom** | Alltid Toms valg |
| **Alt annet = autonomt** | Kode, tester, commits, deploy (CI håndterer) |

## Commit-hastighet

| Nåværende | Mål |
|-----------|-----|
| Manuell review per commit | K3 auto-committer ved grønne gates |
| 1-2 commits/dag | 5-10 commits/dag |
| Tom venter på rapport | Tom får rapport ETTER commit (ikke før) |

## Feilhåndtering (autonom)

| Feil | K3 sin aksjon |
|------|---------------|
| tsc feiler | Fiks TypeScript-feil, prøv igjen (maks 3 forsøk) |
| eslint feiler | Fiks lint, prøv igjen |
| vitest feiler | Fiks test eller kode, prøv igjen |
| CI feiler | Sjekk logs, fiks, push ny commit |
| 3 forsøk feilet | **Stopp, rapporter til Tom** — ikke gjett |

## K3s daglige rapportering (automatisk)

```
## Daglig rapport — [dato]

### Commits i dag: X
- abc123: feat: ny landingsside hero
- def456: fix: header login-state
- ...

### Gates: tsc ✅ | eslint ✅ | vitest ✅ (244/245)

### CI: deploy ✅ | e2e-smoke ✅

### Neste: [neste Trello-kort / oppgave]

### Blokkert (trenger Tom): [eventuelle DB/UI/live-spørsmål]
```

---

## Trello-integrasjon (krav-kanal)

**Trello er eneste krav-kanal** (Tom-mandat 2026-08-08). K3 MÅ integrere mot Trello for å plukke oppgaver.

| Element | Verdi |
|---------|-------|
| Board | «Klarpakke Drift» `6a77a7ac73020977260a3931` |
| Varsler-liste | `6a77a7b720d121385c010083` |
| API | REST via curl (TRELLO_KEY + TRELLO_TOKEN i GH secrets) |
| Flyt | Kort plukkes → flytt til «Under arbeid» → kommenter med bevis → flytt til «Ferdig» |

### K3s Trello-loop (autonom)

```
Hver 30. minutt:
  1. GET /boards/6a77a7ac73020977260a3931/cards?list=under-arbeid
  2. Hvis ledig kort i «Todo»:
     a. Flytt til «Under arbeid»
     b. Kommenter: «K3 starter nå»
     c. Utfør oppgaven (TDD → gates → commit)
     d. Kommenter: «Ferdig: commit abc123»
     e. Flytt til «Ferdig»
  3. Hvis ingen kort: sjekk «Varsler» for nye hendelser
```

### K3 MÅ IKKE
- Opprette kort i «Todo» (det er Toms kanal)
- Flytte kort til «Ferdig» uten bevis (commit-hash + CI-grønn)
- Slette kort (arkiver i stedet)

### Varsler (Sentry → Trello)
- K3 overvåker «🚨 Varsler»-listen
- Nytt kort = ny hendelse i prod
- K3 vurderer: kan jeg fikse? → ja: fiks + commit. nei: eskaler til Tom

---

# DEL 10: ARBEIDSFORDELING HERMES vs KIMI DESKTOP (oppdatert)

| Oppgave | Verktøy | Autonom? |
|---------|---------|----------|
| Design, copy, landingsside, kurs, priser, om-oss | **Kimi Desktop K3** | ✅ Ja — committer direkte |
| Pilot-motor + backtest + LLM-explainer | **Kimi Desktop K3** | ✅ Ja — committer direkte |
| P1/P2-bugs (header, lenker, titler) | **Kimi Desktop K3** | ✅ Ja — committer direkte |
| OKX affiliate-søknad + integrasjon | **Kimi Desktop K3** | ⚠️ Søknad autonom, API-integrasjon trenger secrets |
| DB-migrasjoner, SQL-differ | **Hermes** | ❌ Aldri autonomt — Tom godkjenner |
| Deploy-overvåking, CI-watch, prod-verifisering | **Hermes** | ✅ Ja — automatisk |
| Live-trading beslutninger | **Tom** | ❌ Alltid Toms valg |
| UI-fjerninger (synlige endringer) | **Tom** | ❌ Alltid Toms valg |

## Konflikt-sone (unngås)
Kimi Desktop eier: `src/features/pilot/`, `src/lib/llm/`, `src/lib/backtest/`, `src/app/pilot/`, `src/app/kurs/`, `src/app/priser/`, `src/app/om-oss/`, `src/app/page.tsx` (landing).

Hermes eier: `src/app/api/`, `src/lib/trading/`, `src/lib/crypto/`, `supabase/migrations/`, `.github/workflows/`.

**Overlapp:** Ingen. Kimi Desktop rører ikke API/trading/crypto. Hermes rører ikke Pilot/features/sider.

---

# DEL 11: SUKSESSKRITERIER (målbart)

| Metrikk | Mål | Måling |
|---------|-----|--------|
| Avkastning Pilot | > gammelt system | Backtest 90d + live |
| Brukerforståelse | >80% forstår hva Pilot gjør | In-app spørsmål |
| Aktivering | >30% av nye starter Pilot | Feature-flag analytics |
| Retention | >70% aktive etter 7 dager | DB |
| Pro-konvertering | >5% | Stripe |
| OKX Affiliate | Søknad sendt + godkjent | OKX-portal |
| P1-bugs | 4/4 fikset + verifisert i prod | curl/playwright |
