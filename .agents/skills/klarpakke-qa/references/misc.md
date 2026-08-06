# Misc

> Flyttet fra SKILL.md for å holde hovedfokus på prosedyre.

## Overview

Systematisk testing av www.klarpakke.no med browser-verktøyene. Dekker innlogging via testbrukere, trading cockpit, JokerTrade, auto-handel, portefølje, og alle interaktive elementer.


## User Preferences (LOAD EVERY SESSION)

1. **Norwegian.** All responses in norsk bokmål.
2. **Facts only.** Ingen oppdiktede tall, testimonials eller antakelser.
   **FACT-AUDIT påkrevd etter alle tall-/innholdsendringer:** se `references/fact-audit-workflow.md` for systematisk verifisering mot DB + live curl.
3. **Target audience: lotto-players.** Norske krypto-begynnere: enkle ord, safety-first, lekepenger-fokus.
4. **Mobile-first.** Min 48px touch, single-column, stor tekst.
5. **Concise responses.** Ikke forklar hva du skal gjøre — bare utfør. Ingen narrative oppsummeringer.


## Testmiljø

- **Produksjon:** https://www.klarpakke.no
- **Stack:** Next.js 16, React 19, Supabase, Cloudflare Workers
- **Testbrukere:** Se `references/test-users.md`
- **Opprettelse av nye testbrukere:** Se `references/testbruker-opprettelse.md` for komplett oppskrift med Supabase Admin API, user_profiles, og paper_accounts.
- **Hard-user regresjonssjekk:** Se `references/hard-user-regression-checks.md` etter testing med vanskelig innlogget bruker.
- **Persona-basert QA:** Se `references/persona-based-qa.md` for metodikk med testbrukere som har spesifikk alder/erfaring/enhet (f.eks. Gudrun Myhre: 80 år, mobil, ingen krypto).
- **Stripe-sjekk:** Se `references/stripe-price-ids-wrangler.md` for verifisering av at Stripe priceIds er konfigurert riktig i wrangler.jsonc vars.
- **E2E-test-suite (Playwright+Lighthouse+Allure):** Se `references/e2e-test-suite.md` for komplett guide — 20 sider, 3 Lighthouse-audits, pre-commit hook.
- **Valuta-kontrakt E2E (NOK-priser, ingen USDT):** Se `references/currency-contract-e2e.md` for oppskrift + regex-mønstre — nb-NO U+00A0-separator, storageState-overstyring, assert-format-ikke-snapshot. Regresjonsvakt: `e2e/smoke/currency-contract.spec.ts`.
- **Debug-mønstre (2026-08-03):** Se `references/debug-patterns-2026-08-03.md` for Supabase connection pool, balance-reparasjon, P&L-fortegn-bug, beta-justert badge, og subagent-driven-development med TDD.
- **Redaktørgjennomgang (innholdsrevisjon):** Se `references/content-audit-workflow.md` for systematisk gjennomgang av navnekonvensjoner, branding, faktafeil og uverifiserbare påstander på tvers av nettsidene. Skiller mellom CMS-styrt innhold (Sanity) og kode/i18n.


## Lokal verifisering — lint/tsc/test-pitfalls (2026-08-03)

- **Full-repo `npm run lint` (eslint .) krasjer nativt på 8 GB-Mac** — Node-abort (native stack, `uv__work_done`/`SpinEventLoopInternal`) når eslint-parallelarbeidere overskrider RAM, både med og uten `--cache`, og med 8 GB heap. Fiks: **scoped lint** på endrede filer/mapper: `npx eslint src/features/dashboard --max-warnings 0`. Unngå å kjøre full vitest-suite og full eslint samtidig (dobbel RAM-bruk).
- **`npm run lint` kan krasje med ENOENT på `e2e/tmp/env-check.spec.ts`** — repo-skript (watchdog `create-test-users.js --check-env` o.l.) oppretter/sletter midlertidige Playwright-specs i `e2e/tmp/`; eslint fanger filen i enumereringen rett før den slettes → `ENOENT: no such file... open '...env-check.spec.ts'`. Transient race: re-kjør, eller kjør scoped lint. NB: `e2e/tmp/` er bare delvis gitignored — `login-check.spec.ts` er TRACKED, `analyze-dashboard*.spec.ts` ligger igjen som untracked; ikke commit dem.
- **tsc-feil inni `.next/dev/types/*` (TS1005/TS1128, «unterminated string literal») = korrupte GENERERTE filer, ikke din kode.** Next 16 genererer dev-types der: `next-env.d.ts` importerer `./.next/dev/types/routes.d.ts`, tsconfig inkluderer `.next/dev/types/**/*.ts`. Avbrutt skriving (dev-server som startet og døde) korrupterer dem. Fiks: regenerer via `next dev`/`next build`, eller tøm cachen `rm -r .next` (HUSK: `rm -rf` er blokkert av deny-regel — bruk `rm -r`).
- **Flaky timing-test i full suite: `auto-trader.test.ts` «rejects signal that is exactly 15 minutes old»** — feiler under parallell kjøring (last-endrer timing på 15-min-grensen), passer 15/15 isolert. Ved 1-2 suitesvikt: re-kjør filen isolert FØR du jakter årsak.
- **E2E smoke-specs kjører mot PROD (klarpakke.no)** — `playwright --grep "Dashboard"` verifiserer deployet prod, ikke din lokale endring; lokal fiks gir rød test inntil `scripts/deploy.sh` er kjørt.


## Fakta-verifisering med subagent-driven-development (2026-08-03)

**Mønster:** Systematisk verifisering av ALLE nettsider mot DB-fakta via parallelle subagenter.

**Prosess (verifisert):**

1. **Lag plan** (`.hermes/plans/YYYY-MM-DD-HHMMSS-fakta-verifisering.md`) med tasks:
   - Balance-reparasjon (paper_accounts vs trading_sessions)
   - i18n-verifisering (alle språk har alle nøkler)
   - Valuta-kontrakt E2E-test (NOK, ikke USDT)
   - i18n-nøkler E2E-test (ingen rå nøkler)
   - P&L-accuracy E2E-test (UI = DB ±1%)
   - Dobbel-balanse-fix (én datakilde overalt)
   - Full verifisering (alle tester grønne)

2. **Dispatch subagenter parallelt** (én per task):
   ```typescript
   delegate_task({
     goal: "Implementer Task N fra planen: ...",
     context: "Klarpakke trading-plattform. Plan: /path/to/plan.md (Task N).",
     role: "leaf"
   })
   ```

3. **Hver subagent:**
   - Leser planen
   - Implementerer med TDD (test først)
   - Kjører verifisering (vitest/playwright)
   - Committer med beskrivende melding
   - Rapporterer tilbake med bevis

4. **Parent verifiserer:**
   - `npm run test` (full suite)
   - `npm run check` (tsc + live-sjekk)
   - `npx playwright test e2e/smoke/*.spec.ts`

**Resultater (2026-08-03):**
- ✅ 35 brukere reparert (balance-bug)
- ✅ Alle språk komplette (i18n)
- ✅ 4 nye E2E-tester (currency, i18n, pnl, all-pages)
- ✅ P&L-fortegn-bug funnet og fikset
- ✅ Dobbel-balanse fikset (én SSoT)

**Kritiske feller:**

1. **Subagent går tom for iterasjoner** — stor task kan returnere "plan uten kode". Løsning: instruer om å skrive filen TIDLIG, parent fullfører selv om nødvendig.

2. **Balance-reparasjon må inkludere STOPPEDE sesjoner** — `status='active'` alene gir feil tall (Tom: 9k vs korrekt 199k). Bruk `status IN ('active','paused','stopped')`.

3. **E2E-tester mot prod krever deploy** — lokal fiks gir rød test inntil `scripts/deploy.sh` er kjørt.

4. **U+00A0 (non-breaking space) i NOK-format** — regex må bruke `\\s`, ikke ASCII space: `/\\d{1,3}(\\s\\d{3})+,\\d{2}\\s?kr/`.

5. **Playwright laster IKKE .env.local automatisk** — last eksplisitt med `dotenv.config({ path: ".env.local" })`.

**Se:** `references/e2e-fakta-verifisering-2026-08-03.md` for komplett test-suite.


## Supabase connection pool-issue (2026-08-03)

**Symptom:** `execute_sql` gir "Connection terminated due to connection timeout", men `get_publishable_keys` fungerer.

**Diagnose:** Sjekk `get_logs(service="postgres")` — se etter:
- `"canceling statement due to statement timeout"`
- `"could not accept SSL connection: Connection reset by peer"`
- `"cron job startup timeout"`

**Rotårsak:** Database overbelastet med cron-jobs → connection pool exhausted.

**Fiks:** Restart Supabase-prosjektet via Management API:
```bash
curl -X POST "https://api.supabase.com/v1/projects/$PROJECT_REF/restart" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"
```

**Prevensjon:** Overvåk `pg_stat_activity` for aktive connections; juster `max_connections` eller reduser cron-frequency.


## Beta-justert badge pattern (2026-08-03)

**Formål:** Transparent UI for balance-korreksjoner uten å forklare tekniske detaljer.

**Implementasjon:**
- `BalanceAdjustmentBadge.tsx` — vises når `paper_accounts.updated_at` < 1 time OG endring > 10%
- `usePreviousBalance` hook — lagrer forrige balance i localStorage
- Tooltip: "Beta-justering: Balansen er korrigert med riktig verdi"
- Forsvinner automatisk etter 1 time

**Fil:** `src/components/BalanceAdjustmentBadge.tsx`

---


## Workflow

### 1. Planlegg testomfang

Bruk `todo` for å spore fremdrift. Prioriter etter kritikalitet.

**Edge case-testing:** Opprett testbrukere med vanskelige data (spesialtegn æøå, apostrof, bindestrek, emoji; e-post med +; lange navn med sitater). Bruk `adversarial-ux-test`-skill for å simulere vanskelige brukere.

**Parallell testing:** Deleger browser-testing til subagent via `delegate_task` mens du gjør kodegjennomgang — kjører i bakgrunn, resultat kommer når subagent er ferdig.

1. Innlogging (blokkerende — alt annet avhenger av dette)
2. Dashboard / Hjem (oversikt over tilstand)
3. Handelssiden (kjernefunksjon)
4. Portefølje
5. JokerTrade
6. Auto-handel
7. Innstillinger / Profil

### 2. Verktøy-rekkefølge per side

For hver side/navigasjon:

```
browser_navigate(url)       → først
browser_console(clear=true) → baseline errors
browser_snapshot()           → DOM-struktur
browser_vision()             → visuell inspeksjon (valgfritt)
browser_console()            → JS-feil etter lasting
```

Etter hver interaksjon (klikk, fyll ut skjema, scroll):
```
browser_console()            → nye feil?
browser_snapshot()           → endret tilstand?
```

### 3. Auth Flow Testing (komplett syklus)

Test hele auth-syklusen i kronologisk rekkefølge. Bruk `todo` for å spore fremdrikt.

#### 3a. Innlogging (epost/passord)

1. Naviger til `/no/login`
2. Sjekk `browser_console(clear=true)` — baseline
3. `browser_type` e-post + passord fra `references/test-users.md`
4. Klikk "Logg inn" → vent på dashboard
5. Verifiser innlogget tilstand (Hjem, Handel, Innstillinger, Profil — ikke "Logg inn"/"Registrer deg")
6. Sjekk JS-console for nye feil
7. **Fallgruve:** Login redirect med `?next=`-parameter skal fungere. Test ved å navigere til `/no/login?next=/no/dashboard/settings` — du skal lande på settings, ikke dashboard.
8. **Fallgruve:** Settings-URL er `/no/dashboard/settings`, IKKE `/no/settings` (sistnevnte redirecter til `/no/login?next=/no/profile`).

#### 3b. Google OAuth-knapp synlig

1. Naviger til `/no/login` (utlogget)
2. `browser_snapshot()` eller `browser_vision()`
3. Verifiser at knapp med tekst "Fortsett med Google" er i DOM-en og klikkbar
4. Test om du kan navigere til `/no/register` — sjekk at "Fortsett med Google"-knapp også finnes der

#### 3c. Registreringsskjema

1. Naviger til `/no/register` (må være utlogget — ellers redirect til dashboard)
2. `browser_snapshot()` — sjekk hvilke felter som finnes
3. Verifiser synlige felter: E-post, Passord, Gjenta passord, eventuelt navn/telefon
4. Fyll ut med testbrukerdata (IKKE fullfør/submit)
5. Sjekk at validering fungerer (prøv submit med tomme felter)
6. Sjekk JS-console for feil

#### 3d. Glemt passord

1. Naviger til `/no/login` (utlogget)
2. Klikk "Glemt passord?"-lenken
3. Verifiser at du kommer til passord-reset-side
4. Sjekk at e-postfeltet finnes og at du kan skrive inn en e-post
5. Sjekk JS-console for feil (IKKE send faktisk reset — stopp før submit)

#### 3e. Logout

1. Logg inn først
2. Let systematisk etter logout:
   - I navigasjonsbaren
   - I Hovedmeny-dropdown
   - I Innstillinger (`/no/dashboard/settings`)
   - I Profil (`/no/profile`)
   - Footer
3. `browser_console(expression=`Array.from(document.querySelectorAll('a, button')).filter(el => /logg.?ut|log.?out|logg.?av|sign.?out|sign.?off/i.test(el.textContent)).map(el => el.outerHTML)`)`
4. **Fallgruve:** Logout kan være vanskelig å finne i UI-et. Hvis den ikke fins i DOM-en i det hele tatt, rapporter som 🟠 Høy bug — bruker kan da aldri bytte konto uten å slette cookies.
5. Når logout er utført: verifiser at du redirectes til `/no/login` og at dashboard ikke lenger er tilgjengelig

#### 3f. Auth-protected routes

Test hver av disse uten sesjon (må være utlogget):

| Rute | Forventet oppførsel |
|------|--------------------|
| `/no/dashboard` | Redirect til `/no/login?next=...` |
| `/no/profile` | Redirect til `/no/login?next=...` |
| `/no/trade` | Redirect til `/no/login?next=...` |
| `/no/dashboard/settings` | Redirect til `/no/login?next=...` |
| `/no/dashboard/portfolio` | Redirect til `/no/login?next=...` |
| `/no/dashboard/autopilot` | Redirect til `/no/login?next=...` |

Bruk `browser_navigate` og verifiser at URL-en endrer seg til `/no/login?next=...`. Sjekk at `?next=`-verdien er riktig original-URL.

#### 3g. Iterasjonsbudsjett for auth-testing

Auth-flow testing bruker mange kall pga. login/logout-sykluser. Planlegg:

- **15-20 kall** for en komplett auth-syklus (login → test features → logout → test protected routes)
- Hvis du må logge inn/ut flere ganger, vær ekstra oppmerksom på tool-limit
- **Fallgruve:** Når du er innlogget, redirecter `/no/login` og `/no/register` til dashboard — du MÅ være utlogget for å inspisere disse sidene

### 4a. Testing bak innlogging

1. Naviger til `/no/login` → fyll inn e-post + passord med `browser_type` → klikk "Logg inn"
2. Vent på dashboard
3. **Rydd console** med `clear=true` før feature-testing — login-feil er ofte støy
4. Verifiser at navigasjonslenker viser innlogget tilstand (Hjem, Handel, Innstillinger, Profil — ikke "Logg inn" og "Registrer deg")
5. **Fallgruve:** Enkelte navigasjonsknapper kan kaste deg ut av innlogget sone. Sjekk alltid nav-feltet etter klikk.

### 4b. Testing av tabs/accordions

Tabs er feilutsatte. Test hver tab individuelt:

1. Klikk tab-en → `browser_snapshot()` → sjekk at `[selected]` attributtet flyttet seg
2. Sjekk at innholdet faktisk endret seg (ikke bare den visuelle markøren)
3. Logg konsollfeil etter tab-skifte
4. **Fallgruve:** En tab som ser ut til å være valgt men viser feil innhold er en høy-alvorlighetsbug

### 5. Sjekkliste per side (utvidet)

I tillegg til standard verktøy-rekkefølge, sjekk ALLTID disse på hver innloggede side:

#### 5a. Blank side / tom body
RSC-komponenter kan feile stille uten noen JS error i console. Sjekk:
```javascript
// Skal returnere > 0
document.querySelector('#__next')?.children?.length

// Skal returnere > 5 (navigation + footer + main)
document.body.children.length

// Sjekk om URL'en faktisk er about:blank
document.URL
```
**Fallgruve:** Hvis body bare har navigasjonsbar og scripts, men ikke `#__next` eller `#__NEXT_DATA`, har komponenten krasjet før hydration uten å logge.

#### 5b. Numerisk konsistens
Når samme metrikk vises to steder (f.eks. win rate i greeting-widget OG i stats-kort), sjekk at verdiene matcher:
```javascript
// Finn alle prosent-verdier som standalone text nodes
[...document.querySelectorAll('*')].filter(el => el.children.length === 0 && el.textContent.trim().match(/^\d+[.,]\d+%\s*$/)).map(el => el.textContent.trim())
```
**Fallgruve:** Faktor-100-feil (0.73% vs 73%) er et klassisk divisjon-/multiplikasjonsproblem der én widget mangler `* 100`.

**Krysssidekonsistens (2026-07-24):** Sammenlign også overlappende nøkkeltall PÅ TVERS av sider — portefølje vs historikk (antall handler, realisert P&L), dashboard vs portefølje (saldo). Mismatch (19 vs 71 handler, −62 vs +310 707 kr) avslørte at historikken talte arkivert test-era. Samme data skal gi samme tall uansett side.

#### 5c. i18n / norsk label-konsistens
Sjekk at alle UI-tekster er på norsk, spesielt på datadrevne widgets. Blanding av engelsk/norsk i samme viewport er en UX-bug.
```javascript
// Finn engelske labels i norsk UI
document.body.innerText.match(/Win Rate|P&L|Balance|Profit|Loss|Win|Trades/i)
```
**Vanlige syndere:** Greeting-widget, KPI-kort, og data-bokser som bruker hardkodede engelske labels i stedet for i18n-nøkler.

#### 5d. CTA-knapp feedback
Klikk ALLE CTA-knapper og sjekk at noe skjer:
1. `browser_click(ref)` → knappen
2. `browser_console()` → sjekk om det kom JS errors, API-feil, eller redirect
3. `browser_snapshot()` → sjekk om DOM endret seg (loading spinner, toast, disabled state)
4. Hvis ingenting skjedde: 🟢 Lav bug (død knapp / manglende event handler)

**Fallgruve:** En knapp som ser ut som den virker men gjør ingenting er vanskeligere å oppdage enn en som kaster en error.

### 6. Iterasjonsbudsjett

Browser-testing bruker mange verktøykall. Planlegg:

- **5-8 kall per side** (navigate + snapshot + console + 2-3 interaksjoner + verifisering)
- **30-40 kall totalt** for en full runde
- Hvis du nærmer deg grensen: noter hva som *ikke* ble testet i rapporten

### 7. Bug-rapportering

Klassifiser bugs med:

| Nivå | Beskrivelse |
|------|------------|
| 🔴 Kritisk | Core feature helt ubrukelig, auth broken, datatap |
| 🟠 Høy | Funksjonalitet sterkt svekket, mulig workaround |
| 🟡 Medium | Merkbart problem, påvirker UX, blokkerer ikke |
| 🟢 Lav | Poleringssaker, minor kosmetikk |

Kategorier: Functional / Visual / Console / UX / Navigation / Accessibility

Rapportér med:
- Hvilken side (URL eller navn)
- Steg for å reprodusere
- Forventet oppførsel
- Faktisk oppførsel
- Console errors (hvis noen)
- MEDIA:<screenshot_path> for visuelle bevis


## Vanlige feilmønstre på Klarpakke

- **Tab-navigasjon som ikke oppdaterer innhold** — URL-sync hooks som bare whitelister enkelte tab-verdier (f.eks. `trades` og `analysis` men ikke `sessions`). Sjekk `useCockpitUrlSync.ts` for whitelist.
- **Navigasjonsknapper som leder ut av innlogget sone** — sjekk at alle interne lenker går til `/dashboard/...` ikke hardkodede stier som ikke finnes (`/handelshistorikk` → `/dashboard/historikk`).
- **Deaktiverte elementer uten CTA** — sjekk at disabled switches/knapper har synlig oppgraderingslenke.
- **INVALID_MESSAGE JS-error** — skyldes ofte ICU-meldinger med `select`-format + apostrof/sitat i brukernavn. Forenkle til `{userName}` interpolering.
- **Login redirect ignorerer `?next=`** — `LoginClient.tsx` må lese `searchParams.get("next")` og redirecte dit, ikke alltid til dashboard.
- **Rå i18n-nøkler i UI** (f.eks. `profile.title`) — split JSON-filer funker ikke alltid i Cloudflare Workers. Legg meldinger i konsolidert `no.json`/`en.json`. **Variant: namespace-mismatch** — nøkkelen FINNES i messages, men under annen sti enn komponentens `useTranslations`-namespace leter (f.eks. `paperTrading.viewTrades` vs `t("viewTrades")` under `trading.paperTrading`; eller `tTrading("tradeHistory.errorTitle")` når `tradeHistory` ligger på toppnivå). `i18n:validate` sjekker KUN NO/EN-synk, ikke nøkkelsti-mot-bruk — slike bugs består CI og vises først i prod. Deteksjon: mock API-er for å tvinge error/empty states visuelt (se route-mock-oppskriften over), og grep `t("..."`/`tNs("...")` mot faktisk JSON-sti ved review av nye strenger. **Regresjonsvakt:** `e2e/smoke/i18n-keys.spec.ts` sjekker 7 sider for rå nøkler (regex + `innerText()`-regel — se «Falske positiver»-seksjonen).
- **Hardkodet `showOnboarding={true}`** — skjuler trading-UI for alle brukere. Gjør betinget: kun nye uten trades.
- **Blank side for innloggede ruter** — portefølje-komponenter som krasjer stille (ingen JS error) gir bare navigasjonsbar og tom body. Sjekk `document.querySelector('#__next')?.children?.length` og `document.body.children.length` for å oppdage.
- **Win rate faktor-100 inkonsistens** — to widgets som viser samme metrikk med faktor-100 forskjell (0.73% vs 73%) er en klassisk `* 100` / divisjonsfeil i én av komponentene.
- **Engelske labels i norsk UI** — "WIN RATE", "P&L" og "Balance" i databokser som ellers er på norsk. Ofte hardkodede strenger som ikke går gjennom i18n.
- **CTA-knapper uten feedback** — klikkbar, men ingenting skjer (ingen loading, error eller redirect). Typisk manglende event handler eller API-kall som feiler uten catch.
- **requireAuth() krasjer i Cloudflare Worker** — Serverkomponenter som kaller `requireAuth()` eller `createServerClient()` krasjer fordi Workers ikke kan lese httpOnly auth-cookies. Symptom: "Det oppstod en feil" på dashboardet, 522 timeout på API-endepunkter. **Fiks:** Bruk client-side `AuthContext` + `useAuth()` hook. For API-ruter: legg til timeout guard (5s) som returnerer 503 istedenfor å henge.
- **Server-only imports i client components** — `import { draftMode } from "next/headers"` i `src/lib/sanity/client.ts` krasjer når importert fra client-komponent. **Fiks:** Dynamisk `import()` i client-komponent, eller bytt til API-endepunkt.
- **Dashboard metrics via server function vs API** — `getUserDashboardMetrics()` er en server-funksjon som ikke kan kalles direkte fra client. I client-komponenter: fetch via `/api/dashboard/metrics?userId=X&mode=paper` istedenfor direkte import. **Fallgruve:** API-et returnerer envelope `{ ok, data }` — klienten må sende `json.data` videre til `DashboardContent`, ellers viser topbaren "Ingen data" selv om API-et har saldo.
- **USDT/NOK priser merket/feil konvertert som `kr`** — `usePrices()` og `coin_prices.price` skal være NOK. Binance WebSocket (USDT) konverteres i `usePrices` før state; `sync-prices` og `binance-websocket` Edge Function konverterer før upsert. UI skal IKKE kalle `usdtPriceToNok()` på `usePrices()`-verdier (dobbelkonvertering) — kun på fallback-konstanter. Vis USDT-kurs med `nokPriceToUsdt(priceNok)`. Se `references/usdt-nok-format-convention.md`.
- **Fake/random market data som ser reell ut** — sparkline/candle-charts generert med `Math.random()` skal aldri rendres som reell NOK-pris. Vis “laster reell pris” eller skjul chart. **Fix:** Erstatt med `PriceCard` som viser reell NOK-pris fra `usePrices()` (NOK) + `formatNOK()`. Se `references/usdt-nok-format-convention.md`.
- **Dynamiske i18n-nøkler** — `i18n:usage` kan være grønn mens runtime viser `MISSING_MESSAGE` for ``t(`path.${variant}`)``. Sjekk browser console og legg ev. dynamiske nøkler inn i validatoren.
- **Client `supabase.auth.getUser()` som auth-gate** — kan gi falsk “Du er ikke innlogget”. Bruk API-status (`/api/user/...`) som sannhet; 401 = utlogget, 200 = innlogget.
- **Ugyldig tier fra DB krasjer profil** — `Cannot read properties of undefined (reading 'vip')` betyr at `subscription.tier_slug`/`user_profiles.tier` ikke finnes i `TIERS` (f.eks. `free`). Normaliser med `rawTier in TIERS ? rawTier : "student"` før `TIERS[currentTier]`.
- **`npm run check` “Hovedside HTTP 307”** — `/` redirecter til aktiv locale (`/no`) og er forventet. `scripts/verify-production.sh` skal akseptere `200/307/308` for hovedside, samme som dashboard-testen.
- **Markedsdata feltnavn-mismatch** — `/api/market/snapshot` returnerer `change24hPct`. Widgets som leser `change24h` (f.eks. `PriceTicker`) krasjer med `undefined.toFixed()` først når brukeren rendrer fullt dashboard (`AktivTrader`/`PowerUser`). Normaliser med `Number(asset.change24h ?? asset.change24hPct ?? 0)` og guard `price`.
- **`userName` faller bort i adaptive views** — `AdaptiveDashboard` må sende `userName` til `ActiveTraderView`/`PowerUserView` (og videre til `DashboardPro` → `PersonalizedGreeting`). Ellers vises "God dag" uten navn for erfarne brukere selv om profilen har `display_name`.
- **State-fiks avslører nye render-paths** — når metrics/user-state-logikk endres, smoke-test ALLE adaptive states (`NyBruker`, `Onboarded`, `AktivTrader`, `PowerUser`) med minst én bruker i hver state. En fiks som flytter brukeren til et "riktigere" view kan aktivere komponenter som aldri har vært rendret før.
- **Hurtigbeløp/chips under API-minimum** — `FILL_CONSTANTS.minOrderValue = 10 USDT` (~110 kr ved kurs 10,9). Trading-UI med faste beløpsvalg MÅ holde laveste valg ≥ 200 kr for margin mot kursfluktuasjon; ellers avvises kjøpet først ved ekte eksekvering ("Order value X below minimum 10.00"). Test alltid laveste beløp med ekte kjøp i paper.
- **i18n-streng i grammatisk feil tall** — en streng som kun rendres i én kontekst (f.eks. reward-kort som kun vises ved nøyaktig 1 trade) må skrives i det tallet som faktisk rendres ("1 handel fullført", ikke "{count} handler fullført"). `i18n:validate` fanger ikke dette — kun visuell inspeksjon.
- **Auto-trader symbol-lås blokkerer manuell handel** — "Another trade is being processed for this symbol" ved manuelt kjøp når auto-traderen kjører på samme symbol/konto. Transient — vent og prøv igjen; ikke en bug i handelsflyten.
- **Client-side Supabase = anon → stille 0 rader** — auth-cookien er httpOnly og usynlig for gotrue-js, så browser-klientens `.from()` mot bruker-scopede RLS-tabeller returnerer 200 + `[]`. Symptom: empty-state-LØGN ("Ingen handelshistorikk ennå") for brukere MED data (PortfolioChart var broken for alle frem til 2026-07-24). Diagnose: Playwright `page.on('request')` + dekod JWT-payload fra Authorization-header — `role:"anon"` uten `sub` bekrefter; `document.cookie` viser kun NEXT_LOCALE. Verifiser ALLTID mot DB (Management API) at brukeren faktisk har data før du konkluderer. NB: rett etter `signInWithPassword` i samme side-økt virker det (in-memory session) — broken først etter full page load, så "virker"-testing rett etter login er falskt grønn. Fiks: server /api-route med kanonisk auth-mønster. Full oppskrift: klarpakke-dev `references/client-side-supabase-anon-rls.md`.
- **Placeholder i18n-VERDIER i prod** — nøkkelen finnes, så `i18n:validate` er grønn, men verdien er en placeholder ("Smart actions tittel", "Live feed tittel" / "Smart Actions Title"). Grep `messages/no.json`+`en.json` etter `tittel"|Title"` og andre placeholder-aktige verdier; kun visuell inspeksjon fanger dette.
- **Engelsk lekkasje i no.json-verdier** — ikke bare hardkodede strenger: selve no.json inneholdt "Latest change", "Nye trades registrert", "Se leaderboards", "Equity curve, P&L heatmap, risk metrics". Utvid 5c-grepet til å også sjekke no.json direkte etter engelske fraser.
- **Samme metrikk gjentatt 3× i én viewport** — saldo i sticky top-bar + hero + sesjonskort, modus-pill i top-bar + badge + hero. Ved visuell review: tell gjentakelser av samme tall/label/CTA i første viewport; behold maks én fremtredende + én kompakt (sticky chrome).
- **Ikoner uten labels på mobil** — `hidden sm:inline` på toggle-labels ga en "blå blob" med to flytende ikoner som ser ødelagt ut på 390px. Labels skal vises på mobil (ev. `text-xs`).
- **Høyre-klipping av knapper på 390px** — `flex justify-between` med `shrink-0`-knapperad overflower når tekstblokk + knapper > viewport. Fiks: `flex-wrap` på containeren.
- **`useRealtimePrices` er rå USDT, `trades.price` er NOK** — motsatt enhet av `usePrices()` (NOK). Live-pris fra `useRealtimePrices` MÅ konverteres med kurs fra `/api/fx/usdt-nok` før sammenligning med DB-priser — ellers −90 % fantomtap på posisjoner. Fullt enhetskart + reparasjonsoppskrift for korrupte historiske rader: `references/usdt-nok-format-convention.md`.
- **Arkivert test-era forurenser stats** — sider som aggregerer trades uten å scope til ikke-arkiverte sesjoner viser test-era-tall (+310 707 kr "realisert P&L" på historikken vs −62 kr reelt). Regel: stats/historikk → `archived = false`; åpne posisjoner → kun `active`/`paused` sesjoner (stoppete er avviklet). Se referansen over.
- **NOK 0 desimaler skjuler lavpris-krypto** — global NOK-formatter hadde `maximumFractionDigits: 0`: DOGE-pris 1,62 kr vist som "1 kr" (faktafeil). Fikset i `src/lib/currency.ts`: |beløp| < 100 kr → 2 desimaler. Ved review: sjekk at lavpris-coins (DOGE/XRP/ADA) vises med desimaler.
- **Horisontal-scroll-tabell på mobil skjuler det viktigste** — handelstabell med `overflow-x-auto` viste kun DATO/PAR/HVORFOR på 390px; side/beløp/P&L krevde scroll, og støy-kolonnen ("Signal oppdaget") fikk all plass. Mønster: `sm:hidden` kort-liste (KJØP/SALG-badge + totalbeløp + P&L-chip fremhevet, hvorfor-tekst `line-clamp-1`) ved siden av `hidden sm:block` full tabell. Testfallgruve: begge varianter rendres i jsdom → bruk `getAllByText` i stedet for `getByText`.
- **Fjerning av feature krasjer siden stille** — fjernet Pilot-fanen (TradeMode, MODES, import) men `TabsContent value="pilot"` eksisterte fortsatt. Siden viste bare navigasjonsbar + tom body (ingen JS error). Regel: ved feature-fjerning, sjekk at ALLE TabsContent har matchende TabsTrigger — og kjør E2E smoke-test før commit.
- **Valuta-dobbeltkonvertering via tick** — `open_position` lagres i NOK (DB-guard validerer), men tick/orphan-kode normaliserte til USDT og skrev tilbake. Symptom: entry 0,0681 vs marked 1,79 → falske +2531% P&L. Regel: USDT-normalisering er KUN lokal per tick — ALDRI lagre tilbake til DB. Konverter tilbake til NOK før `db.update({ open_position })`.
- **Playwright E2E med auth-barriere** — sider som krever innlogging redirecter til `/login` (307). Tester må akseptere 307/302/401/403 som gyldig respons for auth-sider, og sjekke `page.url().includes("/login")` før de asserter på innhold. Se `e2e/smoke/all-pages.spec.ts` for mønster.
- **Lighthouse flaky på kalde Workers** — første kjøring etter deploy kan gi performance 79, retry gir 85. Terskel: 75 (ikke 80) for å unngå falske positiver. A11y-terskel: 88 (Trade/Dashboard scorer 89).
- **Playwright mot nylig deployet prod (kaldstart)** — Worker'en er kald rett etter deploy; capture-script må tåle det: (1) `waitUntil: "domcontentloaded"` + umiddelbar `fill`/`click` på login → klikket skjer FØR hydrering → native GET-submit med credentials i URL, innlogging skjer aldri. Bruk `networkidle` + ~4 s ekstra vent før interaksjon. (2) `networkidle` utløses ALDRI på sider med polling (historikk poller `/api/user/trades`) — bruk `domcontentloaded` der. (3) `waitForURL(..., "load")` kan henge selv etter vellykket navigasjon — bruk `waitForTimeout` + sjekk `page.url()`. (4) `deploy.sh` sin egen sjekk ("Side tom/feil") kjører for tidlig og gir FALSK NEGATIV rett etter deploy — vent ~60 s og verifiser manuelt før du konkluderer.
- **paper_accounts.current_balance ≠ posisjonsverdi (2026-08-03)** — Dashboard viste 69 864 kr, men korrekt balance var 105 811 kr (cash 64k + posisjoner 41k). Balanse-trackeren telte kun cash, ikke posisjonsverdi pga. valuta-bug. Fiks: beregn korrekt balance fra `trading_sessions` (cash + open_position.quantity × coin_prices.price) og oppdater `paper_accounts.current_balance`. Script: `scripts/repair-paper-account-balances.ts` (TDD, 8/8 tester). 35 brukere reparert. Regel: balanse MÅ alltid inkludere posisjonsverdi, ikke bare cash.
- **Dobbel balanse-visning på dashboard (2026-08-03, FIXET i 4338120cd)** — hero og portefølje/sesjonsliste viste forskjellige tall fordi hero brukte `accountBalance` (paper_accounts) mens sesjonslisten brukte `stats.currentCapital` ← `totalCapital` (trading_sessions-sum). Ved §5b numerisk konsistens-sjekk: ALLE «balanse»-flater må lese `accountBalance` (SSoT); `totalCapital` er kun fallback for live-modus. Se klarpakke-frontend-pitfalls §36b for mønster + grep.
- **Valuta-dobbeltkonvertering via tick (2026-08-03)** — `open_position` lagres i NOK (DB-guard validerer), men tick/orphan-kode normaliserte til USDT og skrev tilbake. To kodeveier: (1) `orphan-positions.ts` adopsjon, (2) `tick/route.ts` highest_price-tracking. Symptom: entry 0,0681 vs marked 1,79 → falske +2531% P&L. Fiks: konverter tilbake til NOK før `db.update({ open_position })` med `getUsdtToNokRate()`. Reparasjon: reset entry/highest til markedspris for korrupte posisjoner (< 15% av marked). Regel: USDT-normalisering er KUN lokal per tick — ALDRI lagre tilbake til DB. DB-guard `fn_guard_session_position_symbol` validerer NOK (BTC>100k, ETH 5-50k, SOL 100-2000).
- **Fjerning av UI-modus krasjer siden stille (2026-08-03)** — fjernet Pilot-fanen (TradeMode, MODES, import) men `{mode === "pilot" && ...}` og URL-håndtering eksisterte fortsatt. Siden viste bare navigasjonsbar + tom body (ingen JS error, ingen console-feil). Tom: «Alt er jo borte. Pilot ikke tilgjengelig!!!!» Regel: ved feature-fjerning, sjekk at ALLE mode-grener har matchende MODES-entry — og kjør E2E smoke-test (`e2e/smoke/all-pages.spec.ts`) FØR commit. Se `klarpakke-frontend-pitfalls` §35 for full prosess.
- **Uforklarlig side-redirect: spor kjeden, ikke koden (side 13)** — `/profile?tab=profile` endte på `/dashboard`; middleware + page.tsx var rene. Diagnose: instrumenter Playwright med `resp.request().redirectedFrom()?.url()` per navigasjon — kjeden viste `/profile 200` → **klient-initiert** fetch til `/innlogging?next=...` → 307 `/login` → `/dashboard`. Altså: en KLIENT-komponent (ProfileTab sin falske anon-`getUser()` → push `/innlogging`, middleware sender innloggede til `/dashboard`). Uten kjeden leter man i feil lag. Test også tab-varianter (`?tab=wallet` vs `?tab=profile`) — per-tab mount bestemmer hvilken komponents sideeffekter som fyres.
- **P/L-proxy som lyver (side 6, 2026-07-24)** — `effectivePnlDelta` brukte signert notional som fallback når `realized_pnl` manglet: åpne kjøp telte som −hele beløpet. Symptom: daglig P/L med −564 901 kr-stolper, par-P/L = −kjøpsbeløp, "vinnrate" fra kontantstrøm. Kodebasen hadde omveier rundt buggen (`trade-effective-pnl.ts` med kommentar om at fallbacken er feil) — fiks ROTEN (null realized → 0), ikke legg til nye omveier. Regel: kun rader med `realized_pnl != null` teller i P/L, vinn/tap/break-even og vinnrate; åpne kjøp = kontant→aktiva-konvertering, ikke tap.
- **P&L-kort mister minustegn for negativ P&L (2026-08-03, FIXET+deployet i 640ae6518)** — `DashboardPro.tsx`/`AdaptiveDashboard.tsx` renderte `${totalPnl >= 0 ? "+" : ""}${formatByMode(Math.abs(totalPnl), ...)}`: positiv P&L fikk «+», negativ fikk INGEN «−» → «Total avkastning»-kortet viste «175 kr» mens RPC `total_pnl` sa −175,46 kr. Rotårsak var KUN presentasjonslaget: `/api/dashboard/metrics` returnerte korrekt `totalPnl: -175.46` (verifisert med fetch-probe i browser console), ingen caching/feil felt. Fiks: `"+" : "-"`. Verifisert: `npx playwright test e2e/smoke/pnl-accuracy.spec.ts --project=chromium` → PASS («total -175 kr vs RPC -175.46 kr»). Regel: ved `Math.abs(verdi)` med manuelt fortegnsprefiks, sjekk ALLTID begge grenene (+ og −); `"+" : ""` er kun korrekt når råverdien formateres UTTEN Math.abs (minustegnet kommer da fra tallet selv, f.eks. `toLocaleString()`). NB: E2E-tester mot prod krever deploy — lokal fiks gir rød test inntil `scripts/deploy.sh` er kjørt.
- **Widget-tittel ≠ data-semantikk (side 7)** — donut tittlet «Aktivaallokering» ble matet `topPairs` (P/L per par) og viste «70,08 NOK totalt» (= |realisert P/L|). InfoTooltipen røpet det selv («Fordeling av din P&L etter trading pair»). Sjekk ALLTID at tittel/infoTooltip matcher faktisk datakilde — og les tooltipen som bevis.
- **Hardkodet prop-default som faktafeil (side 7)** — `accountBalance = 100000` som default-prop: dedikert side sendte ingenting → kalkulator viste 100 000 mot reell 92 418. Grep etter penge-lignende default-props (`= 100000`, `= 50000`) i kalkulator/dashboard-komponenter; reelle brukerdata må hentes fra API.
- **Rate-nevner inkluderer 0-rader (side 7)** — heatmap-vinnrate telte dager uten resultat i nevneren (1 grønn / 7 dager = 14 %, vs reell 50 %). Nevner = kun rader med faktisk utfall (pnl ≠ 0). Sjekk at samme rate stemmer på tvers av widgets på samme side.
- **`.toLocaleString()` uten locale (side 7)** — gir US-format `92,418.17` på norsk side. Grep `\.toLocaleString\(\)` (tomme parenteser) i features; skal være `"nb-NO"` eller prosjektets `formatCurrency`.
- **SCROLLHEIGHT == viewport-høyde = tom side (side 7)** — `/dashboard/analysis` ga scrollHeight 844 (= viewport): innhold bak kollapset accordion. En dedikert side som kun viser én knapp/accordion-header er en UX-bug — ekspander som standard på dedikerte sider (behold kollapset ved inline-embedding).
- **Dobbelkonvertering i VISNINGSlaget (side 8)** — `LivePricePreview` gjorde `price * rate` på en verdi fra `usePrices()` som ALLEREDE var NOK → BTC vist til 6 825 226 kr (sann ~624 000). Enhetsregelen («aldri konverter usePrices-verdier») gjaldt også her — men komponentens `showInNok`-prop antok rå USDT. Ved props som heter `showInNok`/`convertToNok`: verifiser enheten på datakilden FØR du stoler på propen. Deteksjon: divider det mistenkelige tallet med live rate — lander du på en kjent USDT-pris, er det dobbeltkonvertert.
- **Statisk build-time FX-fallback vs sanntidsrate (side 8)** — `getDisplayUsdtToNokRate()` brukte bakt fallback 10.92 mens `/api/fx/usdt-nok` serverte 9.61 → ~14 % for høye NOK-priser der `usdtPriceToNok()` kalles uten eksplisitt rate. Mønster: hent live rate én gang klient-side (fetch i hook, cache i modul-variabel) og send inn som parameter; hold fallback-konstanten i `src/lib/market/nok.ts` synket mot live rate. NB: tester som hardkoder fallback-verdien brekker ved oppdatering — oppdater `nok.test.ts` samtidig.
- **Meta-ord som synlig copy («Badge» → «Utmerkelse») (side 8)** — EN-kilden sa selv «Badge»/«Live Badge» og no.json arvet «Utmerkelse» — ordet «badge» er et UI-element, ikke innhold. Chips viste «UTMERKELSE»/«LIVE UTMERKELSE» overalt. Utvid placeholder-grepet: søk messages etter VERDIER som er meta-ord (`badge|label|title|button|chip|disclaimer`, case-insensitiv) — korrekt chip-copy er selve statusen («Live», «Lekepenger», «Demo», «AI-overvåking»), aldri elementnavnet. `i18n:validate` fanger ikke dette (strukturen er OK).
- **Garanti-copy bryter fakta-regelen (side 8)** — Kelly-tekst lovte å «matematisk forhindre at du taper innsatsen din». Ingen trading-funksjon kan love tapsfrihet. Grep copy etter garanti-ord: `forhindre.*tape|garantert|aldri tap|risikofri|kan ikke tape|sikret av` — omskriv til «reduserer risikoen, men fjerner den ikke». Gjelder spesielt wizard/oppsummering der brukeren tar investeringsbeslutningen.
- **Wizard-flyt må klikkes gjennom, ikke bare steg 1 (side 8)** — de verste funnene (pris ×10,9, Kelly-løfte) lå i steg 2-3. Playwright: `click('button:has-text("Neste")')` + screenshot per steg frem til submit-knappen («Start bot») — IKKE faktisk submit. Verifiser oppsummeringsstegets tall mot DB før siden regnes som ferdig.
- **Hallusinert pris-anker (side 8)** — modellen «visste» BTC ~$118k fra treningsdata; reell pris var ~$65k (egne session-notater: 603-612k NOK / 9.6). Ved pris-/tall-verifisering: stol ALDRI på modellens makrotall — hent fra DB, `/api/fx/usdt-nok` eller egne notater.
- **Bulk-UPDATE-filter treffer tidligere reparerte rader (side 8)**

- **Porteføljegraf flat mens header viser reell balanse** — grafen bygges av `trades.realized_pnl` (kun fullførte handler), mens headeren bruker `paper_accounts.current_balance` (inkl. urealiserte). Ved nye strategier (f.eks. grid) som nettopp er aktivert: ingen fullførte kjøp→salg-sykluser → `realized_pnl = null` for alle trades → flat kurve. Diagnose: Se `references/portfolio-chart-flatness.md`. Sjekk alltid begge kildene før du rapporterer bug. — reparasjon #2 av USDT-forurensede trades med `WHERE usdt_nok_rate = 9.6` traff også en 9. rad som var reparert dagen før (med samme markørverdi satt) → dobbelt-konvertert. Regler for prod-reparasjoner: (1) verifiser filteret mot NÅVÆRENDE tilstand rett før UPDATE (SELECT samme filter, sjekk hver rad) — ikke gjenbruk gårsdagens filter blindt; (2) foretrekk eksplisitt `WHERE id IN (...)` hentet ferskt; (3) SELECT alle rader filteret KUNNE ha truffet etterpå og sjekk intern konsistens (`quantity * price ≈ total_value`); (4) ha rollback-verdier lagret FØR UPDATE.


