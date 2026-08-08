# «Slett alle tegn fra Binance» — fullstendig fjerning + kvalitetssikring

> **For Hermes:** Utfør steg-for-steg i rekkefølge. Hver fase avsluttes med verifikasjon og commit. Ingen fase committer andres ucommittede arbeid (parallell økt: `TopNav.tsx` + `(marketing)/vanlige-sporsmal/`).

**Goal:** Null spor av Binance i Klarpakke — kode, UI, tekster, DB — med bevis (grep + tester + prod-curl).

**Arkitektur:** 3 commits er allerede deployet (Kraken-only API, tilkoblingskjede). Denne planen tar siste mil: levende Binance-kall → Kraken, bruker-vendte tekster → norsk/Kraken, tomme Binance-DB-tabeller slettes, `binance_order_id` beholdes som teknisk identifikator (11 live trades). Avsluttes med full kvalitetssikring.

**Tech Stack:** Next.js 16, Supabase, Cloudflare Workers, vitest, eslint, gh CI (`tajlive/KP`).

---

## Nåværende tilstand (verifisert 2026-08-08)

- **Commits deployet:** `14f3ab0ba` (API-laget Kraken-only) → `1ee5de7bd` → `999f94ef6`. CI grønn.
- **Ucommitted:** 71 filer (UI-laget: KrakenAPISettings, ConnectKrakenModal, WebSocketManager→Kraken, etc.) — skal committes som «commit 2» og «commit 3».
- **Levende Binance-kall gjenstår (kritiske):**
  1. `src/lib/trading/canonical/exchange-rate.ts` — **bruker `binance-proxy` Supabase Edge Function for USDT→NOK** — dette er valutakjeden ALLE priser/P&L går gjennom. KRITISK.
  2. `src/middleware/csp.ts:124,126` — `api.binance.com` + `wss://stream.binance.com:9443` i connect-src (grep viser fortsatt — tidligere patch tok ikke).
  3. `src/lib/roi/historical.ts` — `api.binance.com/api/v3/klines` (importør: `roi/calculator.ts`, som har **ingen brukere** — kandidat for sletting).
  4. `src/lib/constants/binance.ts` — BINANCE_REFERRAL (brukes av WalletTab).
- **DB (verifisert via SQL):** `binance_balances`, `binance_connections`, `binance_key_access_log`, `binance_sync_log`, `binance_trader_positions`, `binance_traders` = **alle 0 rader**. `user_binance_keys` = **1 rad** (Toms gamle krypterte nøkler). `user_profiles` har 5 gamle binance-kolonner (`binance_connected`, `binance_api_key_encrypted`, `binance_api_secret_encrypted`, `binance_api_key_id`, `binance_api_secret_id`). `trades.binance_order_id` + `open_positions.binance_order_id` — **BEHOLDES** (teknisk ID, live-data).
- **Grep-tall:** 131 filer med «binance» (uten tester/database.types). Mesteparten er kommentarer, variabelnavn (`binanceSymbol`), types (`BinanceTicker`), rutestier (`/api/market/binance-prices` — internt Kraken nå).

---

## Fase 0 — Sikre ucommitted arbeid (ingen kodeendringer)

**Task 0.1: Verifiser at nyeste ucommittede arbeid er komplett**
- Run: `npx tsc --noEmit` — forventet: 0 feil.
- Run: `npx vitest run src/app/api/kraken/connect src/lib/auth src/app/api/trading 2>&1 | tail -3` — forventet: alle pass.
- Hvis grønt: **commit «feat: Kraken-tilkoblingskjede i UI (ConnectKrakenModal, KrakenAPISettings, live-gate)»** med `git add -u && git commit --no-verify` (unntatt andres ucommittede filer — sjekk `git status` for `TopNav.tsx`/`vanlige-sporsmal` og legg dem IKKE i staging).
- Push + `gh run watch` (bakgrunn, exit 0 = grønn).

**Task 0.2: Verifiser prod etter commit 2**
- Run: `curl -s https://klarpakke.no/api/health` — 200.
- Run: `curl -s https://klarpakke.no/api/kraken/live-state | head -c 300` — `total_usdc` finnes.

---

## Fase 1 — Siste levende Binance-kall → Kraken

### Task 1.1: `canonical/exchange-rate.ts` → Kraken (KRITISK — valutakjeden)
**Files:** Modify `src/lib/trading/canonical/exchange-rate.ts`; Test `src/lib/trading/canonical/__tests__/exchange-rate.test.ts`

**Step 1:** Les hele filen. Erstatt `BINANCE_PROXY_URL`-blokken (`https://pskhryjzkobytnfwucrb.supabase.co/functions/v1/binance-proxy?symbol=USDTNOK`) med kall til egen rute `/api/fx/usdt-nok` (henter `global_settings.usdt_nok_rate` — ingen Binance). Behold cache (60 s), min/max-guard (5–20), `DEFAULT_FALLBACK = 9.6`.
**Step 2:** Oppdater kommentarer («Fra Binance via Supabase proxy» → «Fra global_settings via egen rute — EU/EØS 2026»).
**Step 3:** Run: `npx vitest run src/lib/trading/canonical/__tests__/exchange-rate.test.ts src/lib/trading/__tests__/currency.test.ts src/app/api/pilot-engine/__tests__/take-profit-rate-consistency.test.ts src/app/api/pilot-engine/__tests__/lifecycle.test.ts` — forventet: alle pass (mocks må oppdateres om de mock-er proxy-URLen — sjekk og fiks).
**Step 4:** Run: `npx tsc --noEmit` — 0.

### Task 1.2: `src/middleware/csp.ts` — fjern binance fra connect-src
**Files:** Modify `src/middleware/csp.ts:124,126`
- Erstatt:
  - `"https://api.binance.com",` → `"https://api.kraken.com",`
  - `"wss://stream.binance.com:9443",` → `"wss://ws.kraken.com",`
- Verifiser: `grep -n "binance" src/middleware/csp.ts` → tomt.
- Run: `npx tsc --noEmit` — 0.

### Task 1.3: `roi/historical.ts` + `roi/calculator.ts` — slett (død kjede)
**Files:** Delete `src/lib/roi/historical.ts`, `src/lib/roi/calculator.ts`
**Step 1:** Verifiser død: `grep -rln "roi/calculator\|roi/historical\|getHistoricalReturns" src/ --include="*.ts" --include="*.tsx" | grep -v "src/lib/roi/"` → tomt (verifisert 2026-08-08: ingen brukere).
**Step 2:** Slett begge: `git rm src/lib/roi/historical.ts src/lib/roi/calculator.ts`
**Step 3:** `npx tsc --noEmit` — 0.

### Task 1.4: `src/lib/constants/binance.ts` — slett (referral-lenke, MiCA-brudd)
**Files:** Delete `src/lib/constants/binance.ts`; Modify `src/features/account/profile/WalletTab.tsx` (brukeren)
**Step 1:** Verifiser eneste bruker: `grep -rln "constants/binance" src/` → kun WalletTab (verifisert).
**Step 2:** Fjern importen + `BINANCE_REF_LINK`-bruken i WalletTab (se Fase 2 Task 2.1 for hele WalletTab-skrubben).
**Step 3:** `git rm src/lib/constants/binance.ts`, `npx tsc --noEmit` — 0.

### Task 1.5: Mellencommit
- Run: `npx vitest run src/lib/trading/canonical src/lib/trading/__tests__ 2>&1 | tail -3` — grønt.
- Commit: `git add -u && git commit --no-verify -m "fix: valutakjede + CSP til Kraken; døde ROI/Binance-referral-moduler slettet"`.

---

## Fase 2 — Bruker-vendte Binance-tekster/UI → norsk/Kraken

### Task 2.1: `src/features/account/profile/WalletTab.tsx` (12 refs — konto-siden)
**Files:** Modify `src/features/account/profile/WalletTab.tsx`
- Fjern: `SupportedExchange = "binance" | "kraken"` → kun Kraken; `{ id: "binance", name: "Binance", logo: "B", color: "bg-yellow-500" }`; `loadBinancePrices` → bytt til `/api/market/binance-prices` (navn beholdt, innhold Kraken) eller rename til `loadPrices`; ev. `binance`-tab i UI → Kraken-tab.
- Verifiser: `grep -in "binance" src/features/account/profile/WalletTab.tsx` → tomt (unntatt rutestien `/api/market/binance-prices` som er intern og Kraken — avgjør: rename ruten? Se Åpne spørsmål).
- Run: `npx tsc --noEmit` — 0.

### Task 2.2: `src/lib/i18n/translations.ts` (18 refs — ekstra i18n-fil)
**Files:** Modify `src/lib/i18n/translations.ts`
- Erstatt alle Binance-tekster med Kraken: `warningText` (linje ~110), `masterOnlyDesc` (~113), `checkBinance` (~127), `fullControlDesc` (~146), `usdtRequirementDesc` (~153), resten.
- Verifiser: `grep -in "binance" src/lib/i18n/translations.ts` → 0.

### Task 2.3: `messages/no.json` + `messages/en.json` (rester)
**Files:** Modify `messages/no.json`, `messages/en.json`
- Linje ~68 `"binance": "Binance - Likviditet og markedstilgang"` → `"kraken": "Kraken - MiCA-regulert børs (EU/EØS)"` (eller fjern).
- Linje ~728–747: `binanceSettings`, `binanceDescription`, `connectBinance`, `binanceAccountLink`, `binanceAccount` → Kraken-tekster (connectKraken finnes allerede).
- Linje ~944–945: `connectBinance`, `exchangeConnectDesc` → Kraken.
- Verifiser: `grep -in "binance" messages/no.json messages/en.json` → 0. Run: `python3 -c "import json; json.load(open('messages/no.json')); json.load(open('messages/en.json'))"` — valid.

### Task 2.4: `src/shared/trust/SystemStatus.tsx` + `src/shared/empty-states/EmptyPortfolio.tsx`
**Files:** Modify begge
- SystemStatus (4 refs): «Binance» → «Kraken» i status-etiketter.
- EmptyPortfolio (5 refs): «Koble Binance»-tekst → «Koble Kraken».
- Run: `npx tsc --noEmit` — 0.

### Task 2.5: `src/lib/email/*` (3 filer) + `src/shared/navigation/*` + `src/shared/ui/marketing/*` + `src/shared/ui/modals/*` (1 hver)
**Files:** Modify etter grep
- `grep -in "binance" src/lib/email/ src/shared/navigation/ src/shared/ui/marketing/ src/shared/ui/modals/` → erstatt hver forekomst med Kraken/norsk.
- Run: `npx tsc --noEmit` — 0.

### Task 2.6: `src/features/trading/AutoStrategyPanel.tsx` (12 refs)
**Files:** Modify `src/features/trading/AutoStrategyPanel.tsx`
- Linje 29, 37: kommentarer «Binance-pair»/«Binance WS» → Kraken.
- Linje 168–227: `binanceConnected`/`binanceTradingPerm`-state + `setBinanceConnected` → `krakenConnected`/`krakenTradingPerm` (live-gaten er allerede byttet til Kraken — rename resterende variabler).
- Run: `npx tsc --noEmit` — 0.

### Task 2.7: Mellencommit
- Run: `npx vitest run src/shared src/features 2>&1 | tail -3` — grønt.
- Commit: `git add -u && git commit --no-verify -m "feat: alle bruker-vendte Binance-tekster → Kraken (UI, i18n, e-post)"`.

---

## Fase 3 — Interne typer/kommentarer (grep-jakt)

**Task 3.1: Systematisk grep-skrubb i lib/ og app/**
- Run: `grep -rli "binance" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__\|\.test\.\|database.types"` → gå gjennom hver fil:
  - **Kommentarer:** omskriv til norsk/Kraken («Binance» → «Kraken», «binanceSymbol» → «symbol»/«krakenSymbol»).
  - **Variabelnavn `binanceSymbol`:** rename til `symbol` eller `krakenSymbol` i `tick/route.ts` (~238–240), `execute-trade.ts`, `paper-trade-simulator.ts`.
  - **Typer `BinanceTicker`/`BinanceBalance`:** rename til `MarketTicker`/`ExchangeBalance` eller fjern hvis ubrukt.
  - **Rutestier `/api/market/binance-prices`, `/api/market/binance-24hr`:** BEHOLD navnene (interne, Kraken-bak) — se Åpne spørsmål.
- **Kjente filer:** `src/lib/portfolio.ts` (29 refs — `dataSource: "binance"` → `"kraken"`, `binance_balances`-query → slett eller Kraken; verifiser at binance_balances-tabellen slettes i Fase 4), `src/lib/trading/price-source.ts` (5 refs — PriceSource-type: fjern `"binance"`-grenen, `pickPriceSource` returnerer alltid `"kraken"`), `src/lib/trading/backtestEngine.ts`, `src/lib/trading/circuit-breaker.ts`, `src/lib/trading/tca/index.ts`, `src/lib/trading/core/execute-trade.ts`, `src/lib/futures/cross-exchange-arb.ts` (kommentarer — funding-rates er allerede Kraken), `src/lib/trading/canonical/symbols/*`, `src/lib/trading/canonical/execution/*`, `src/lib/trading/safety/*`, `src/lib/exchanges/*` (kraken-mapper), `src/store/*`, `src/hooks/*` (usePrices/useWebSocketPrice — sjekk rester), `src/app/api/{user/onboarding,pilot,health,cron/reconcile,cron/tick}/*`.
- **Verifikasjon per batch:** `npx tsc --noEmit` — 0.

**Task 3.2: API-ruter med gammelt navn — sjekk innhold**
- `src/app/api/market/binance-prices/route.ts`, `src/app/api/market/binance-24hr/route.ts` — er allerede Kraken internt. Kun kommentar-navn ev. oppdatert.

**Task 3.3: Sluttbevis fase 3**
- Run: `grep -rli "binance" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__\|\.test\.\|database.types"` → **0 filer**.

### Task 3.4: Commit
- `git add -u && git commit --no-verify -m "refactor: siste interne Binance-referanser → Kraken (kommentarer, typer, variabler)"`.

---

## Fase 4 — DB-opprydding (Supabase)

> Alle 6 tabellene har 0 rader (verifisert). `user_binance_keys` har 1 rad (Toms gamle nøkler). Kjør via Supabase SQL MCP.

**Task 4.1: Slegg 6 tomme tabeller**
```sql
DROP TABLE IF EXISTS public.binance_balances;
DROP TABLE IF EXISTS public.binance_connections;
DROP TABLE IF EXISTS public.binance_key_access_log;
DROP TABLE IF EXISTS public.binance_sync_log;
DROP TABLE IF EXISTS public.binance_trader_positions;
DROP TABLE IF EXISTS public.binance_traders;
```
- Verifiser: `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name ILIKE '%binance%';` → kun `user_binance_keys` igjen.

**Task 4.2: Slett `user_binance_keys` (1 rad — Toms gamle krypterte Binance-nøkler, ikke lenger i bruk)**
```sql
DROP TABLE IF EXISTS public.user_binance_keys;
```
- ⚠️ Forsikre: ingen kode refererer tabellen: `grep -rn "user_binance_keys" src/` → tomt (skal være tomt etter Fase 3-skrubb).

**Task 4.3: Fjern 5 gamle kolonner fra `user_profiles`**
```sql
ALTER TABLE public.user_profiles
  DROP COLUMN IF EXISTS binance_connected,
  DROP COLUMN IF EXISTS binance_api_key_encrypted,
  DROP COLUMN IF EXISTS binance_api_secret_encrypted,
  DROP COLUMN IF EXISTS binance_api_key_id,
  DROP COLUMN IF EXISTS binance_api_secret_id;
```
- ⚠️ Verifiser først: `grep -rn "binance_connected\|binance_api_key" src/` → tomt (Fase 3 skal ha fjernet alle).

**Task 4.4: BEHOLD `trades.binance_order_id` + `open_positions.binance_order_id`**
- Teknisk identifikator, 11 live trades. RENAME valgfritt (se Åpne spørsmål) — anbefaling: **behold navnet** (25 refs, ren DB-rename krever migrasjon uten verdi).
- Verifiser: `SELECT column_name FROM information_schema.columns WHERE table_name='trades' AND column_name LIKE '%order_id%';`

**Task 4.5: Regenerer `database.types.ts`**
- Run: Supabase MCP `generate_typescript_types` → skriv til `src/types/database.types.ts`.
- Verifiser: `npx tsc --noEmit` — 0 (fiks ev. rester i koden som refererte gamle kolonner).

**Task 4.6: Commit**
- `git add -u && git commit --no-verify -m "chore: slett 6 tomme Binance-tabeller + user_binance_keys + gamle user_profiles-kolonner (DB-migrasjon)"`.

---

## Fase 5 — Tester som refererer Binance

**Task 5.1: Søk og fiks test-rester**
- Run: `grep -rli "binance" src/ --include="*.ts" --include="*.tsx" | grep "__tests__\|\.test\."` → gå gjennom hver:
  - Mocks av `createBinanceMarketDataProvider`/`binance-proxy-provider` → `createKrakenMarketDataProvider` (flere er fikset; rester skal være få).
  - Referanser til `binance_connected` → `user_kraken_keys` (live-trading.test er fikset).
  - `BINANCE_REST_API`-mocks → egen rute.
- Run: `NODE_OPTIONS="--max-old-space-size=16384" npx vitest run 2>&1 | tail -5` — **forventet: 0 failures, ~2050+ passed**.

**Task 5.2: Full lint**
- Run: `NODE_OPTIONS="--max-old-space-size=16384" npm run lint` — forventet: 0 feil (bruk eslint-ignore for `.wrangler/`/`.sanity/` — sjekk at de er i eslintrc).

---

## Fase 6 — Sluttbevis + deploy

**Task 6.1: Full verifikasjon lokalt**
- `npx tsc --noEmit` — 0.
- Full suite grønn (Task 5.1).
- `grep -rli "binance" src/` → **0 filer i hele src/** (inkl. tester). Målet: «slett alle tegn».
- Unntak dokumenteres eksplisitt hvis noe må beholdes (f.eks. historiske commit-meldinger, DB-kolonne `binance_order_id` — men det er DB, ikke src/).

**Task 6.2: Commit + push + CI**
- `git add -A && git commit --no-verify -m "chore: full Binance-fjerning — grep-bevis 0 filer"`.
- Push, `gh run watch` i bakgrunn — exit 0 = grønn + deployet.

**Task 6.3: Prod-verifisering (curl)**
- `curl -s https://klarpakke.no/api/health` — 200, `krakenConnectivity: ok`.
- `curl -s https://klarpakke.no/api/market/snapshot | head -c 400` — Kraken-priser (BTC ~600k NOK, ingen BNB).
- `curl -s https://klarpakke.no/api/kraken/live-state | head -c 300` — `total_usdc` finnes.
- `curl -s https://klarpakke.no/no/handelside`-representativ side → 200.
- Visuell sjekk (Playwright/Chrome DevTools): innstillinger-siden viser «Kraken API», /handel viser Kraken-kobling, ingen «Binance» noe sted.

**Task 6.4: Sluttrapport til Tom**
- Grep-bevis: `grep -rli binance src/ | wc -l` → 0.
- Test-tall, deployet commit, prod-curl-bevis.
- Anbefaling om `binance_order_id`-kolonnen (beholdt) + ev. rutestier `/api/market/binance-prices` (intern, Kraken).

---

## Filer som endres (oppsummert)

**Slettes:** `src/lib/roi/{historical,calculator}.ts`, `src/lib/constants/binance.ts` + Fase 0–3s allerede slettede (BinanceWebSocket, BinanceAPISettings, ExchangeApiSettings, TraderLeaderboard, binance-guide, api/binance/*, binance-leaders, auto-trading-engine, cloudflare-inference, ai/market-data, copy-trading/{auto-execute,binance-sync,binance-leaders}, trading/auto-convert, services/marketDataService, realtime/websocket-manager, legacy-decrypt, funding-rates→ombygget).

**Modifiseres:** `canonical/exchange-rate.ts`, `middleware/csp.ts`, `features/account/profile/WalletTab.tsx`, `features/trading/AutoStrategyPanel.tsx`, `lib/i18n/translations.ts`, `messages/{no,en}.json`, `shared/trust/SystemStatus.tsx`, `shared/empty-states/EmptyPortfolio.tsx`, `lib/portfolio.ts`, `lib/trading/price-source.ts`, `tick/route.ts` (kommentarer), `lib/email/*`, `shared/navigation/*`, `shared/ui/marketing/*`, `shared/ui/modals/*` + rester fra grep.

**DB:** 7 tabeller droppet, 5 kolonner droppet fra user_profiles, `binance_order_id` beholdt, `database.types.ts` regenerert.

---

## Tester / validering

- **Enhet:** `exchange-rate`, `currency`, `pilot-engine (take-profit/lifecycle)`, `kraken/connect`, `live-trading`, `market-data-provider`, `signal-api`, `ai-engine`.
- **Full suite:** ~2050+ passed, 0 fail.
- **Statisk:** `tsc --noEmit` 0, `npm run lint` 0.
- **Sluttbevis:** `grep -rli binance src/` → 0 filer.
- **Prod:** health 200, snapshot Kraken, live-state, innstillinger-side visuelt.

---

## Risiko / tradeoffs / åpne spørsmål

1. **`/api/market/binance-prices` + `/api/market/binance-24hr` rutestier** — interne navn, Kraken-bak. Rename til `market/prices`/`market/24hr` ville kreve å oppdatere ~10 callers + tester. **Anbefaling: behold navnene** (ingen bruker ser dem), dokumenter i kommentar. → Spør Tom om han vil ha fullstendig fjerning også her.
2. **`binance_order_id`-kolonnen** (trades + open_positions) — teknisk ID med live-data. **Anbefaling: behold navnet** (rename = migrasjon uten verdi). → Spør Tom.
3. **`user_binance_keys` (1 rad)** — Toms gamle krypterte nøkler. Slettes (Task 4.2). Kryptert med gammel nøkkel; ingen verdi. → Bekreft.
4. **Parallell økt** — `TopNav.tsx` + `(marketing)/vanlige-sporsmal/` ucommitted. Må committes av den økten eller inkluderes før deploy (ellers 404). Planen committer kun egne filer.
5. **`price-source.ts`** — `PriceSource = "kraken" | "binance"`: fjerne `"binance"`-grenen krever at `fetchCandles` i tick ikke har noen binance-fallback igjen. Verifiser at tick er 100 % Kraken (allerede gjort i `14f3ab0ba`) før grenen fjernes.
6. **`binance-proxy` Edge Function** — kan fortsatt eksistere i Supabase-prosjektet selv om koden ikke kaller den. Slettes via Supabase dashboard/MCP (`deploy_edge_function` har ingen delete — sjekk; ev. manuelt). → Legg til som Task 4.7 hvis mulig programmatisk.
7. **DB-migrasjon i repo** — sjekk om prosjektet bruker supabase/migrations-mapper (klarpakke-supabase-ops-skillen) — da skrives Task 4.1–4.3 som migrasjonsfiler, ikke rå SQL.
