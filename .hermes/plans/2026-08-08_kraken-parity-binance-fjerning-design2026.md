# Klarpakke 2026: Samme Trade Engine (Paper=Live), Fjern Binance, Konkurrent-Nivå Design + Hermes/Honcho-Optimalisering

> **For Hermes:** Implementer task-for-task. Kjør TDD: test først, så kode. Commit etter hver task.
> Dato: 2026-08-08. Status: Plan ferdig, 0 kode commitet for disse mandatene.

**Goal:** Gjøre lekepenger og live 100% identiske i utregning (samme engine, samme priser, samme fee — Kraken som eneste kilde), fjerne ALLE Binance-kontroller (geo-blokkert i EU/MiCA), og løfte UI til 2026-konkurrent-nivå (bevisbart pent, enkelt, oversiktlig).

**Architecture:** Én kanonisk `executeTrade`-pipeline for BÅDE paper og live (allerede 80% bygget). PaperExecutor og KrakenExecutor er kun adaptere på samme motor. Fjern BinanceExecutor/BinanceProxyExecutor helt. Priser: Kraken default for alle (fallback Binance ved feil — fjernes gradvis). Design: konkurrent-benchmark (Robinhood, M1, Saxo) → visuelt hierarki, progressive disclosure, konsistente P&L-definisjoner.

**Tech Stack:** Next.js 16, Supabase, Cloudflare Workers, Kraken API, Tailwind, lucide-react, vitest.

---

## Del A: Same Trade Engine — 100% lik utregning (fakta-bevis)

### A0. Nåværende tilstand (verifisert 2026-08-08)

| Flate | Paper | Live | Status |
|---|---|---|---|
| Auto-tick (cron) | `executeTrade` (kanonisk) | `executeLiveTrade` → ExecutorFactory | DELT: live har egen rute i tick |
| Manuell /handel | `executeTrade` | `executeTrade` | ✅ SAME |
| Priskilde | PaperExecutor bruker **Binance-provider** | KrakenExecutor (USDC-par) | ❌ DIVERGENS |
| Fee | `FILL_CONSTANTS.feeRate = 0.001` (0.1% = Binance-taker) | Ekte fee fra Kraken TradesHistory (Tier 1 taker = 0.80%) | ❌ DIVERGENS |
| Slippage | 0.2% (konstant) | Ekte utført pris | OK (dokumentert) |

**Kjernefakta (bevis):**
- `src/lib/trading/executor-factory.ts` — live-vei: KrakenExecutor.fromUser() først, Binance legacy-fallback (skal fjernes)
- `src/lib/trading/kraken-executor.ts` — NY (2026-08-08): market/limit, fill fra TradesHistory, USDC-par, 9/9 tester
- `src/lib/trading/canonical/execution/fill-constants.ts` — feeRate 0.001 er BINANCE-verdi; Kraken spot-taker (juli 2026, cross-platform tiers): Tier 1 = 0.80%, Tier 3 ($10K+) = 0.38%
- `src/lib/trading/paper-executor.ts:29` — `createBinanceMarketDataProvider()` (skal bli Kraken)
- `src/lib/trading/price-source.ts` — pickPriceSource → "kraken" for ALLE (fikset 2026-08-08)

### Task A1: PaperExecutor → Kraken-priser

**Objective:** Paper henter priser fra Kraken (USDC-kvote), ikke Binance.

**Files:**
- Modify: `src/lib/trading/paper-executor.ts:24,29` — bytt `createBinanceMarketDataProvider` → `createKrakenMarketDataProvider`
- Test: `src/lib/trading/__tests__/paper-executor.test.ts`

**Step 1:** Skriv test som mock'er `createKrakenMarketDataProvider` og assert at getPrice kalles med kraken-provider.
**Step 2:** Kjør test → FAIL (import feiler).
**Step 3:** Patch import + instantiering.
**Step 4:** Kjør `npx vitest run src/lib/trading/__tests__/paper-executor.test.ts` → PASS.
**Step 5:** Commit: `fix: paper henter priser fra Kraken (EU-sannhet)`

### Task A2: Fee-parity — FILL_CONSTANTS → Kraken-taker

**Objective:** Paper simulerer Kraken-fee, ikke Binance-fee.

**Files:**
- Modify: `src/lib/trading/canonical/execution/fill-constants.ts`
- Test: `src/lib/trading/canonical/execution/__tests__/fill-model.test.ts`

**Step 1:** Skriv test: `computeFill` med `FILL_CONSTANTS.feeRate = 0.008` (0.80% Tier 1 taker) gir korrekt fee.
**Step 2:** Kjør → FAIL (feeRate 0.001).
**Step 3:** Patch: `feeRate: 0.008` + kommentar med kilde (Kraken fee-schedule juli 2026, Tier 1 taker 0.80%). Oppdater doc-kommentar: fjern "Binance taker fee".
**Step 4:** Kjør tester → PASS. Sjekk at backtest-engine (bruker FILL_CONSTANTS) ikke har egne fee-verdier: `grep -rn "0.001" src/lib/backtest/`.
**Step 5:** Commit: `fix: paper fee = Kraken taker 0.80% (var Binance 0.1%)`

### Task A3: Fjern BinanceExecutor + BinanceProxyExecutor fra ExecutorFactory

**Objective:** Live-veien har KUN Kraken (og paper). Binance-fallback slettes.

**Files:**
- Modify: `src/lib/trading/executor-factory.ts` — slett all Binance-kode (linje ~14-15 imports, ~40-233 Binance-grener)
- Delete: `src/lib/trading/binance-executor.ts` (443 l.), `src/lib/trading/binance-proxy-executor.ts` (318 l.)
- Delete: `src/lib/auto-trading/binance-executor.ts`, `src/lib/auto-trading/binance-websocket.ts`
- Modify: `src/lib/trading/__tests__/executor-factory.test.ts` — fjern Binance-mocks; behold Kraken-tester

**Step 1:** Kjør `npx tsc --noEmit` — kartlegg alle importer som brytes.
**Step 2:** Fiks kallere: `grep -rn "BinanceExecutor\|BinanceProxyExecutor" src/ --include="*.ts" --include="*.tsx"` → erstatt med KrakenExecutor-vei eller fjern.
**Step 3:** Slett filer. Oppdater tester.
**Step 4:** `npx vitest run src/lib/trading` → PASS (1058+).
**Step 5:** Commit: `refactor: live = kun Kraken; slett Binance-executors`

### Task A4: Parity-bevis-test (paper vs live, samme input)

**Objective:** Bevis at paper og live gir IDENTISKE P&L-beregninger for samme markedsdata.

**Files:**
- Create: `src/lib/trading/__tests__/paper-live-parity.test.ts`

**Testinnhold:**
- Samme symbol/kvantum/pris → `computeFill`-modellen brukes identisk
- Fee: paper bruker FILL_CONSTANTS (0.80%), live bruker ekte Kraken-fee → dokumenter at differansen ER fee-raten (begge er "taker" på Kraken)
- P&L: `totalPnl/startingCapital` — samme formel på begge (FIKS 8-definisjon)

**Verifiser:** `npx vitest run src/lib/trading/__tests__/paper-live-parity.test.ts` → PASS.

### Task A5: Oppdater e2e pnl-accuracy til å dekke Kraken-fee

**Files:**
- Modify: `e2e/smoke/pnl-accuracy.spec.ts` — legg til fee-assertion (0.80% vs 0.1%)

---

## Del B: Fjern ALLE Binance-kontroller (bruker-vendt)

> Kartlagt 2026-08-08: 196 filer nevner Binance i src/. Koblings-UI, marketing-side, 4 API-ruter, 2 executors.

### Task B1: Slett koblings-UI

**Files:**
- Delete: `src/features/account/settings/BinanceAPISettings.tsx` (410 l.)
- Delete: `src/shared/ui/modals/ConnectBinanceModal.tsx`
- Modify: `src/features/account/settings/ExchangeApiSettings.tsx` — fjern Binance-seksjonen (linje ~332), behold Kraken. Fjern "Binance Referral".
- Modify: `src/lib/constants/binance.ts` — BINANCE_REFERRAL slettes (eller filen slettes)
- Modify: `src/features/account/settings/` — eventuelle tester

**Step 1:** `grep -rn "BinanceAPISettings\|ConnectBinanceModal" src/` — finn importer.
**Step 2:** Fjern importer + bruk i settings-sidene.
**Step 3:** Slett filer.
**Step 4:** `npx tsc --noEmit` → 0. Commit: `feat: fjern Binance-kobling-UI (Kraken er eneste børs)`

### Task B2: Slett Binance marketing + API-ruter

**Files:**
- Delete: `src/app/[locale]/(marketing)/binance-guide/` (side + content)
- Delete: `src/app/api/binance/` (test/encrypt/execute), `src/app/api/binance-leaders/`
- Delete: `src/app/api/market/binance-prices/route.ts`, `src/app/api/market/binance-24hr/route.ts`
- Delete: `src/lib/copy-trading/binance-sync.ts`, `binance-leaders.ts`, `src/lib/websocket/BinanceWebSocket.ts`
- Delete: `src/lib/trading/binance-signer.ts`

**Step 1:** Finn alle kallere: `grep -rn "api/binance\|binance-prices\|binance-24hr\|binance-leaders" src/`.
**Step 2:** Sjekk at `/api/market/snapshot` ikke avhenger av binance-24hr (den skal bruke Kraken). Sjekk `src/lib/trading/canonical/market-data/binance-provider.ts` — beholder vi som fallback? **Beslutning:** slett binance-provider også; KrakenProvider har fallback-struktur. Hvis noe kaller `marketDataProvider.getKlines` direkte, bytt til kraken.
**Step 3:** Slett filer. tsc → 0.

### Task B3: i18n-sanering (no/en/th/zh)

**Files:**
- Modify: `messages/no.json`, `en.json`, `th.json`, `zh.json`

**Step 1:** `grep -rn "binance" messages/` — fjern nøkler som refererer til koblings-UI/marketing (ikke historiske kommentarer).
**Step 2:** Verifiser: `python3 -c "import json; json.load(open('messages/no.json'))"` → OK.

### Task B4: Ledende referanser i komponenter (non-UI)

**Files:** Sjekk disse for Binance-tekst og fjern/erstatt med Kraken:
- `src/features/dashboard/UpgradeBanner.tsx`, `UpgradeGate.tsx`
- `src/features/copy-trading/CopyTradingDashboard.tsx`, `TraderLeaderboard.tsx`
- `src/features/portfolio/PortfolioDashboard.tsx`, `PortfolioClientPage.tsx`
- `src/shared/trust/TrustBanner.tsx`, `SystemStatus.tsx`
- `src/features/trading/UnifiedTradingDashboard.tsx`, `AutoStrategyPanel.tsx`
- `src/shared/navigation/BottomTabs.tsx`

**Regel:** ALLE bruker-vendte Binance-referanser borte. Kun historiske kommentarer i DB-migreringer/kodekommentarer får stå.

### Task B5: Sluttverifisering Binance-fjerning

**Step 1:** `grep -rli "binance" src/ --include="*.ts" --include="*.tsx" | grep -v database.types` → forvent: 0 filer (eller kun dokumenterte unntak).
**Step 2:** Full test-suite: `npx vitest run` → alle pass.
**Step 3:** `npx eslint src/ --max-warnings 0` → 0.
**Step 4:** Commit: `feat: Binance fjernet fullstendig fra plattformen`

---

## Del C: Design 2026 — konkurrent-benchmark (bevisbart pent)

> Kilder (web-søk 2026-08-08): merge.rocks "10 best trading platform design 2026", lollypop.design "Trading App Design Guide 2026".
> Konkurrent-funn: **Robinhood** = clean minimalistisk mobile-first, stor høy-kontrast typografi for priser, trade-knapp i ETT trykk fra alle flater, progressive disclosure (avansert i sekundærlag). **M1 Finance** = portefølje som pie-charts. **SaxoTraderGO** = balanse mellom enkelhet og funksjon. **Fidelity/Schwab** = konsistens + trust-signaler. **AI-innsikter** integrert i kontekst (reduserer kognitiv last).

### Task C1: Visuelt hierarki — pris/P&L øverst i stor typografi

**Objective:** Robinhood-mønster: primær-tall (balanse, P&L-%) store og høy-kontrast; sekundær-info (volum, 24h) mindre og dempet.

**Files:**
- Modify: `src/features/dashboard/DashboardTopBar.tsx` — balanse/P&L tydeligst
- Modify: `src/features/dashboard/SimplifiedHero.tsx` — hero-tall skaleres riktig
- Modify: `src/features/portfolio/PortfolioClientPage.tsx` — "Total verdi" + P&L hierarki

**Verifiser:** AX-snapshot i Chrome — primær-tall ≥ 2× sekundær-tall.

### Task C2: Trade-knapp i ett trykk (mobil)

**Objective:** Robinhood: kjøp/selg-knapp alltid tilgjengelig — bunnbar på mobil, synlig CTA på desktop.

**Files:**
- Modify: `src/features/trading/UnifiedTradingDashboard.tsx` / `PaperTradeButton.tsx` — sticky trade-CTA
- Sjekk: `src/shared/navigation/BottomTabs.tsx` — har allerede /handel-tab

### Task C3: Progressive disclosure — avansert bak "Vis mer"

**Objective:** Nybegynner ser: pris, kjøp/selg, P&L. Avansert (risikoscore, indikatorer, ordretyper) bak ekspander.

**Files:**
- Modify: `src/features/trading/UnifiedTradeTerminal.tsx`, `AutoStrategyPanel.tsx`
- Modify: `src/features/dashboard/DashboardPro.tsx` — AI-innsikt/risikoscore seksjoner kollapset som standard med tydelig "Vis mer"

### Task C4: Konsistente P&L-definisjoner (fakta-verifisering)

**Objective:** ALLE flater viser samme P&L: `totalPnl/startingCapital × 100` (FIKS 8). Ingen konto-differanse noe sted.

**Files:**
- Audit: `grep -rn "current_balance - \|initial_balance\|accountBalance - accountStart" src/` → 0 treff
- Audit: `grep -rn "totalPnl\|total_pnl" src/features/` — alle flater bruker totalPnl-formelen
- Test: `src/features/dashboard/__tests__/DashboardPro-pnl-definition.test.tsx` eksisterer ✅

### Task C5: M1-stil portefølje-fordeling (pie-chart)

**Objective:** Lekepenger-dashboard viser fordeling BTC/ETH/SOL som enkel donut.

**Files:**
- Create: `src/features/portfolio/AllocationDonut.tsx` (lucide/tailwind, ingen ny dep)
- Integrer i: `src/features/dashboard/DashboardPro.tsx` eller PortfolioClientPage

### Task C6: 2026-følelse — spacing, avrunding, glassmorphism

**Objective:** Oppgrader "kort-stil": større avrunding (rounded-2xl), konsistent spacing, subtle glass-effekt på sticky-elementer (allerede backdrop-blur i TopNav).

**Files:**
- Audit: `grep -rn "rounded-lg\|rounded-xl" src/features/dashboard/` — konsistent skala
- Modify: nøkkel-kort til rounded-2xl + border-kp-border

---

## Del D: Hermes + Honcho-optimalisering (maks, mer diskplass OK)

### D0. ✅ ALLEREDE GJORT (2026-08-08):
- **Guard-rotårsak FIKSET:** `config.yaml memory.memory_char_limit` var **1** (skrivefeil fra tidligere økt) → nå **20000**. Dette var årsaken til "Memory er full (4 788 tegn)" + drift-guard-feilene. `user_char_limit` 2500 → **8000**.
- MEMORY.md skrevet rent (25 entries, 4689 tegn) + USER.md (11 entries, 2494 tegn) — verifisert round-trip-ren, guard passerer ved neste sesjon.
- Lagt til kritisk fakta: "BINANCE ER DØD" (fee-fakta, mandat).

### Task D1: state.db-vedlikehold (diskplass)

**Step 1:** Mål: `du -sh ~/.hermes` (5.5G nå). `ls -lh ~/.hermes/state.db*`.
**Step 2:** Slett gammel emergency-backup (rollback fra update, ikke sesjonsdata): `rm ~/.hermes/state.db.pre-update-emergency-*.bak` (597 MB).
**Step 3:** Kjør `hermes sessions optimize-storage --yes` (v23-layout, reclaim ~530 MB i reell case).
**Step 4:** `hermes sessions prune --source cron --older-than 3d --yes` (5-min tick = hoveddriver for vekst).
**Step 5:** Aktiver `sessions.auto_prune: true` i config.yaml (YAML-verifisert).
**Step 6:** Verifiser: `du -sh ~/.hermes` → forvent < 4G.

### Task D2: Curator + preload-tuning

**Step 1:** `curator.interval_hours: 24` + `curator.consolidate: true` (var 168h/prune-only) — config.yaml.
**Step 2:** `hermes curator run` — rydd stale skills.
**Step 3:** Sjekk `skills.preload` — hold kun 1-2 kjerne-skills (klarpakke-qa).
**Step 4:** Verifiser: `hermes curator status`.

### Task D3: Honcho-optimalisering

**Step 1:** `hermes honcho status` — verifiser hybrid/async (allerede OK).
**Step 2:** Seed Honcho med MEMORY.md-fakta (skill: honcho-memory): kjør `hermes chat -q "Bruk honcho_conclude til å lagre: <25 fakta fra MEMORY.md>"`.
**Step 3:** Verifiser: `hermes chat -q "Bruk honcho_search for å finne <fakta>"` → treff.
**Step 4:** Vurder `dialecticReasoningLevel: low → medium` for bedre peer-cards (kostnad: mer LLM-kall — OK, Tom sier "bruk så mye du vil").

### Task D4: Cron-helse + disk-hygiene (vedlikehold)

**Step 1:** `cronjob action=list` — sjekk last_status for alle (kjent: pilot-engine PAUSET, refresh-kimi-token aktiv).
**Step 2:** Skriv vedlikehold-script: `~/.hermes/scripts/memory-disk-maintenance.sh` — pruner state.db cron >3d + varsler ved >6G.

---

## Del E: Deploy + verifisering

### Task E1: Løs TopNav-konflikt (parallell økt)

**Step 1:** `git diff src/shared/navigation/TopNav.tsx` — skill mine endringer ("Auto-handel aktiv") fra parallell økts (useAuth-header).
**Step 2:** Commit kun mine filer. Koordiner med parallell økt før push.

### Task E2: Full verifikasjon

**Step 1:** `npx tsc --noEmit` → 0
**Step 2:** `npx vitest run` → alle pass (forvent 1058+)
**Step 3:** `npx eslint src/ --max-warnings 0` → 0

### Task E3: Commit + push + CI + deploy

**Step 1:** Commit i logiske grupper (A: engine, B: Binance-fjerning, C: design, D: hermes).
**Step 2:** Push → `gh run watch --repo tajlive/KP` → grønn.
**Step 3:** Deploy via CI (wrangler versions upload + deploy).

### Task E4: Prod-verifisering (bevis)

**Step 1:** `curl -s https://www.klarpakke.no/api/health` → 200.
**Step 2:** Chrome AX-snapshot (testbruker): /no/dashboard — ingen Binance-tekst, konsistent P&L, hierarki OK.
**Step 3:** `curl -s https://www.klarpakke.no/api/market/snapshot | jq '.source'` → kraken.
**Step 4:** Verifiser paper-trade med ekte Kraken-fee: kjør paper-sesjon, sjekk fee i trades-tabellen = 0.80% av notional.

---

## Risiko / Åpne spørsmål

1. **Fee-rate valg:** 0.80% (Tier 1 taker) er konservativt — Toms volumer er lave. Når volumer vokser, bør fee-rate hentes dynamisk fra Kraken fee-schedule. Åpent: hardkode 0.008 nå, eller hente tier fra Kraken API? **Anbefaling: hardkode 0.008, dokumenter; dynamisk senere.**
2. **Binance-provider som fallback:** Hvis Kraken mangler par (POLUSDC finnes ikke — POLUSD brukes), trenger vi ikke Binance-fallback. KrakenProvider dekker alle 9 par. ✅
3. **TopNav-konflikt:** Parallell økt skriver samme fil — koordiner FØR commit.
4. **copy-trading:** `binance-sync.ts`/`binance-leaders.ts` brukes av copy-trading — må erstattes med Kraken-data eller fjernes med funksjonen.
5. **sitemap/SEO:** `src/app/sitemap.ts` refererer binance-guide — fjern ruten der.
6. **Backtest-engine:** bruker FILL_CONSTANTS — fee-endringen påvirker backtest-resultater (forventet og korrekt: de var optimistiske med 0.1%).

## Verifikasjons-checklist (slutt)

- [ ] `grep -rli "binance" src/ | grep -v database.types` → 0
- [ ] FILL_CONSTANTS.feeRate = 0.008 med Kilde-kommentar
- [ ] PaperExecutor bruker Kraken-provider
- [ ] ExecutorFactory: kun Paper/Kraken
- [ ] parity-test grønn (paper fee == live fee-modell)
- [ ] tsc 0, vitest alle pass, eslint 0
- [ ] CI grønn, prod verifisert (AX-snapshot + curl)
- [ ] state.db < 4G, emergency-bak slettet
- [ ] Honcho seedet + verifisert
