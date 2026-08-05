# Optimaliser Klarpakke-traderen — backtest-bevis + valuta-lærdom Implementasjonsplan

> **For Hermes:** Bruk subagent-driven-development — én fersk subagent per task med to-stegs review (spec-compliance → kodekvalitet). Alle backtest- og verifikasjonskommandoer står i planen.

**Goal:** Optimalisere Klarpakkes trading (live Kraken-grid + paper-ruting) med evidensbaserte endringer: (1) valuta-lærdommen (NOK/USDT-blanding = fabrikkerte P&L-er — aldri stol på urene tall), (2) OOS-verifisert backtest-simulering for par- og parameter-valg, (3) fill-fysikk (fee-økonomi) som dimensjoneringsregel.

**Architecture:** Backtest-scripts (finnes: `scripts/trading-agent/*.ts`) → OOS-resultater lagres i `reports/trading-agent/` → par-univers + parametere velges kun fra grønne gates → endringer i `scripts/kraken-grid-manager.mjs` (live) og `src/app/api/pilot/route.ts` (ruting) → A/B-gate før prod-ruting.

**Tech Stack:** TypeScript, vitest, Node 24, Kraken REST (public+private), Binance-proxy, Supabase, tsx.

---

## Kontekst / Antagelser (verifisert i kveld)

| Faktum | Kilde |
|---|---|
| Paper-grid P&L (før 2026-07-30 11:00 UTC) er **forurenset**: NOK-priser mot USDT-basis → +31 %/trade «wins» (umulig for 2 % trailing-grid) | DB: kjøp 602 405 vs salg 597 000 (negativ spread), realized_pnl likevel +155/fill; 357 `pnl_skipped_implausible_basis`-varsler |
| **Guard finnes**: `trigger_compute_realized_pnl` skipper P&L med `basis_ratio` utenfor [0.4, 2.5]; `src/lib/trading/clean-trades.ts` eier `CONTAMINATION_CUTOFF` + clamping for alle statistikk-lesere | DB + kode |
| Backtest (ukesforslag 2026-08-05): **grid positiv på ALLE 10 par, OOS PF 4.24–25.98**, win 70–93 %, maxDD ≤ 3,7 %; **multi_signal negativ på 9/10 par** (PF 0,60) | `reports/trading-agent/2026-08-05-forslag.md` |
| Live-grid (Tom): 138,66 USDC i 15 ordre (BTC/ETH/SOL × 5 nivåer), 0 fills hittil, kill-switch 15 % fra baseline **153,44** (inkl. XBT-beholdning) | Live Kraken + state |
| Fill-fysikk: 9,24 USDC-nivå, +2 % trailing, 0,26 % taker ×2 → **netto 0,137 USDC/syklus (1,48 %)** | Beregnet |
| Kraken ordremin (live): ADAUSDC 20 (~3,81 USDC), AVAXUSDC 0,5 (~3,35), SOLUSDC 0,06 (~4,47), ETHUSDC 0,001 (~1,92) — alle under våre nivåer | AssetPairs live |
| 24h-range (grid-kandidat-skåre): ADA 5,2 % > ETH 3,8 % > DOT 2,9 % > AVAX 2,5 % > SOL 2,2 % > LINK 2,0 % > BTC/DOGE 1,8 % | Ticker live |
| 250 USDC-mål → utvid til 5 par (BTC/ETH/SOL/ADA/AVAX); watchdog varsler én gang ved kryssing (allerede bygget + testet) | Forrige økt |

**Forutsetning for hele planen:** ALDRI bruk paper-P&L-absoluttverdier til noe. Kun RELATIVE signaler (hvilket par er mer volatilt) og OOS-backtest på rene priser teller.

---

## Forskningstillegg — «Hva gjør verdens beste krypto-tradere?» (2026-08-05, forum + profiler)

**Syntese fra r/algotrading, Chat With Traders, Market Wizards-intervjuer (Larry Hite, Tom Basso), whale-analyse (Cyclop $8k→$3M, 100%-win-rate-whale, James Wynn) og topp-trader-lister (Margex, Webopedia):**

1. **Risiko FØR profitt (universell regel #1).** Larry Hite (Mint Investments): «same bet size each time — hver bette lik i potensielt tap». Tom Basso: «risk the same percentage of equity on every trade». Cyclop (kr 8k→3M): «rigorous risk protocols, capital preservation through stablecoins». Whales som James Wynn (milliarder → nesten-ni-sifret → blåst ut) beviser at posisjonsstørrelse er viktigere enn retning. **Vår ekvivalent finnes allerede: kill-switch -15 %, ordre-limit 20, likt nivå-beløp per celle.** ✅
2. **Size for regimet, ikke én fast oppskrift (r/algotrading, 2026 — viktigste forum-leksjon).** «Your strategy does not have an edge. It has an edge in ONE regime, and your backtest hid it by averaging.» Eksempel fra tråden: 300 trades, trend +0,30R/trade, ranging −0,10R/trade, blende = +0,17R — «looks like a solid edge, isn't». Regler: (a) size ned/null i feil regime, (b) å sitte ute i feil regime ER edge-en, (c) aldri presenter blended backtest-tall som stabile. **Vår grid er eksplisitt «sideways»-strategi (backtest PF 7,4 i blandet regime) — men vi mangler regime-deteksjon som skrur av/tynner grid i sterk trend. Dette er P0-funn nr. 1 for optimalisering.** ⚠️
3. **Cut losers, let winners run — men mot menneskelig instinkt.** Tom Basso: «when you have a loss you're hopeful it will come back — that's when you should be fearful it gets bigger; when you have big profits you're fearful — that's when you should hope it's a huge winner». **Grid-tilpasning: trailing-salg (2 %+) fanger winners; fast sellPrice er instinkt-feilen. Behold trailing.** ✅
4. **Reduser posisjoner dobbelt så raskt som drawdown.** «If you're down 10%, reduce positions by 20%». **Vår kill-switch er binær (på/av). En progressiv reduksjon (f.eks. -7 % → halver nivåstørrelser, -15 % → full stopp) matcher proff-metodikken bedre.** ⚠️
5. **Disiplin/system > intelligens.** Robb Reinhold (Maverick): «Consistency beats intelligence every time»; Flat Earth Trading Society-eksperimentet (ett år med konsistens). Over-trading er den største selv-påførte feilen («most of that came from over-trading and not following my systems»). **Vår mekaniske grid = system-disiplin; idle-nivå-utlegging må ha tak (har det: MAX_OPEN_ORDERS).** ✅
6. **Data og on-chain, ikke hype.** Topp-tradere: Glassnode, CryptoQuant, funding-rates, order book. **Vår backtest-pipeline (fetch-klines, sweep, OOS) matcher denne disiplinen.** ✅
7. **Whale-innsikt — det meste av «topp-trader»-rikdommen er EXCHANGE/stablecoin-infrastruktur, ikke trading.** (CZ, Saylor, Armstrong, Devasini, Winklevoss). Kun et mindretall (Cyclop, GCR, on-chain-whales) er faktiske tradere. **Nøkternhets-regel: lov ALDRI «X tjente Y»-påstander i Klarpakke-UI uten verifisert fasit (alltid-fakta-regelen).** ✅

**Konsekvens for planen (nye/endrede tasks):**
- **Task 4b (NY):** Legg til progressiv drawdown-reduksjon i grid-manageren (første trinn: -7 % → halver nivå-USD, -15 % → eksisterende full kill). TDD via `kraken-kill-switch.ts`.
- **Task 6b (NY):** Regime-flagg i manageren: hvis 24h-endring > ±5 % OG volatilitet > 8 % (eksisterende `detectMarketRegime`-logikk) → ingen nye idle-nivåer (grid kjører kun i sideways; trend = vent). Ikke full auto-stopp — mekanisk grid fortsetter å selge fylte celler.
- Resten av planen uendret.

---

## Fase 1 — Backtest-grunnlag (evidens før endring)

### Task 1: Kjør grid-backtest med walk-forward (hele universet)

**Objective:** Få ferske OOS-tall for grid på alle 10 par med dagens SSoT-engines.

**Files:** Ingen kodeendringer — kjør eksisterende script.

**Step 1:** Run:
```bash
cd /Users/taj/klarpakke && npx tsx scripts/trading-agent/grid-backtest.ts 2>&1 | tee /tmp/grid-backtest-20260805.txt
```
**Expected:** 10 rader med full/IS/OOS; OOS-kolonne med PF per par.

**Step 2:** Sjekk at ingen rad sier `DATA-FEIL` eller `FOR LITE DATA`.

**Step 3:** Lagre resultatet som SSoT:
```bash
cp /tmp/grid-backtest-20260805.txt reports/trading-agent/2026-08-05-grid-backtest-fersk.txt
```

**Step 4:** Commit:
```bash
git add reports/trading-agent/2026-08-05-grid-backtest-fersk.txt && git commit -m "data: fersk grid-backtest OOS (2026-08-05)"
```

---

### Task 2: Kjør universe-backtest (grid vs multi_signal) + engine-walkforward

**Objective:** Bekrefte at grid > multi_signal også med dagens data, og at offisiell engine gir konsistente signaler.

**Step 1:** Run:
```bash
cd /Users/taj/klarpakke && npx tsx scripts/trading-agent/universe-backtest.ts 2>&1 | tee /tmp/universe-20260805.txt
npx tsx scripts/trading-agent/engine-walkforward.ts 2>&1 | tee /tmp/walkforward-20260805.txt
```

**Step 2:** Verifiser konklusjonene fra ukesforslaget: grid OOS PF ≥ 1,1 på ≥ 8 av 10 par; multi_signal OOS PF < 1,1 på ≥ 8 av 10 par.

**Step 3:** Lagre + commit (samme mønster som Task 1).

---

### Task 3: Bygg par-kandidat-tabell for live (backtest ∩ volatilitet ∩ ordremin)

**Objective:** Velge utvidelses-par for Toms grid med trippel-filter: OOS PF ≥ 1,1 (backtest) OG 24h-range ≥ 2,5 % (volatilitet) OG ordremin×1,1 ≤ 8 USDC (dimensjonerbar).

**Files:**
- Create: `scripts/trading-agent/par-kandidater.ts` (ren, konsoll-output)

**Step 1: Write failing test**
- Create: `src/lib/trading/__tests__/par-kandidater.test.ts`
- Test: `velgParKandidater(backtestOos, ranges, ordremin)` returnerer kun par som passerer alle tre filtre; ADA og AVAX passerer; LINK/DOGE faller ut (range < 2,5 %); BTC/ETH/SOL alltid med (allerede live).

**Step 2:** Run: `npx vitest run src/lib/trading/__tests__/par-kandidater.test.ts` — Expected: FAIL (funksjon finnes ikke).

**Step 3: Write minimal implementation** — ren funksjon `src/lib/trading/par-kandidater.ts` med tre filtere.

**Step 4:** Run test — Expected: PASS.

**Step 5:** Run: `npx tsx scripts/trading-agent/par-kandidater.ts` → skriv konklusjon til `reports/trading-agent/2026-08-05-par-univers.md`.

**Step 6:** Commit.

---

## Fase 2 — Live-grid-optimalisering (kraken-grid-manager.mjs)

### Task 4: Parameterisér PAIR_CFG fra backtest (spacing/trailing-fysikk)

**Objective:** Erstatte hardkodede spacing-verdier med backtest-verifiserte, og gjøre `TRAIL_SELL_PCT`/`spacing` lesbare fra én config-kilde.

**Files:**
- Modify: `scripts/kraken-grid-manager.mjs` (PAIR_CFG, ~linje 89–93; TRAIL_SELL_PCT ~linje 24)
- Test: `src/lib/trading/__tests__/kraken-grid-config.test.ts`

**Step 1: Write failing test** — `gridConfigForPair(pair)` returnerer { dec, ordremin, spacing, trailPct } og spacing ≥ 2 × taker-fee × 1,9 (fill-fysikk-regelen: `spacing ≥ 0,52 % × 1,9 ≈ 1,0 %`).

**Step 2:** Run test — FAIL.

**Step 3:** Flytt konfig til ren modul `src/lib/trading/kraken-grid-config.ts` (importers av `.mjs` via `node` kan lese `.mjs`-eksport — lag `src/lib/trading/kraken-grid-config.mjs` for kompatibilitet, eller dupliser minimalt med én kilde-kommentar; velg den som gir tsc=0 uten brudd på edge-bytte). Inkluder ADAUSDC (dec 4, ordremin 20, spacing 0,012) og AVAXUSDC (dec 3, ordremin 0,5, spacing 0,012) i config-en, men **ikke aktiver dem ennå** (aktiveres av Task 6).

**Step 4:** Run test — PASS. `node --check scripts/kraken-grid-manager.mjs` — OK.

**Step 5:** Commit.

---

### Task 5: Utvid kill-switch + watchdog til nye par (uten å aktivere dem)

**Objective:** Equity-beregning og overvåkning skal dekke ADA/AVAX FØR de aktiveres — ingen blinde flekker.

**Files:**
- Modify: `scripts/kraken-grid-manager.mjs` (kill-sjekk-balansen, ~linje 117–127: asset-sett utvides til `["XBT","ETH","SOL","ADA","AVAX"]` med `PAIR_CFG`-mapping)
- Modify: `~/.hermes/scripts/kraken-grid-watchdog.sh` (equity-node-delen: samme asset-sett)
- Test: utvid `src/lib/trading/__tests__/kraken-kill-switch.test.ts` — `equityUsdc(balanser, ticker)` med ADA/AVAX-beholdning summeres korrekt.

**Step 1:** Skriv test (PASS-mål: equity inkluderer ADA/AVAX × pris).
**Step 2:** Run — FAIL.
**Step 3:** Implementer.
**Step 4:** Run — PASS. Kjør manageren live: `node scripts/kraken-grid-manager.mjs` → **Expected: stille (exit 0, ingen ordre-endringer)**. Kjør watchdog: `bash ~/.hermes/scripts/kraken-grid-watchdog.sh` → stille.
**Step 5:** Commit.

---

### Task 6: Terskel-styrt aktivering av 5-par-modus (250 USDC)

**Objective:** Når equity ≥ 250 USDC: legg ADA+AVAX-grid automatisk (ikke bare varsel). Mekanikk: manager leser equity; ved ≥ 250 og `state.five_pair_activated !== true` → plasser 5 kjøpsnivåer per nytt par (samme dimensjonering som BTC/ETH/SOL: ~8–10 USDC/nivå, spacing 1,2 % under nåpris), sett flagget.

**Files:**
- Modify: `scripts/kraken-grid-manager.mjs` (ny seksjon 0.5 — etter kill-sjekk, før fill-loop)
- Test: `src/lib/trading/__tests__/kraken-grid-config.test.ts` + `kraken-kill-switch.test.ts` (ny funksjon `shouldActivateFivePair(equity, activated)`)

**Step 1:** Test: `shouldActivateFivePair(249, false)` → false; `shouldActivateFivePair(250, false)` → true; `shouldActivateFivePair(300, true)` → false (idempotent).
**Step 2:** Run — FAIL.
**Step 3:** Implementer (ren funksjon + wiring i manageren; aktiverings-loggen setter `state.five_pair_activated = true` og legger ordrene med `validate`-probe først).
**Step 4:** Run — PASS. Live-kjøring → stille (equity 153 < 250). Simulert test: sett terskel midlertidig til 1 og bekreft at manageren rapporterer «AKTIVERER 5-PAR» (uten å faktisk legge ordre hvis `DRY_RUN=1`-env står).
**Step 5:** Commit.

---

## Fase 3 — Paper-ruting (ukesforslaget, system-nivå)

### Task 7: Grid som default-strategi for nye auto-sesjoner (TDD + A/B-plan)

**Objective:** Implementere ukesforslagets Task-1-endring: `/api/pilot` oppretter nye sesjoner med `strategy_id: "grid"` i stedet for `multi_signal`/`cryptopilot` — bak en feature-flag slik at A/B-gaten kan styres.

**Files:**
- Modify: `src/app/api/pilot/route.ts` (~linje 175: `strategy_id: mode === "auto" ? "multi_signal" : "cryptopilot"` → `"grid"`; ~linje 223: `strategy: mode === "pilot" ? "grid" : "multi_signal"` → `"grid"`)
- Test: `src/app/api/pilot/__tests__/route.test.ts` (hvis mangler: opprett — verifiser `strategy_id === "grid"` for auto-modus)

**Step 1:** Skriv test for at ny auto-sesjon får grid.
**Step 2:** Run — FAIL (nåværende kode gir multi_signal).
**Step 3:** Implementer endringen + feature-flag `process.env.GRID_DEFAULT_ROUTING !== "off"` (A/B: sett off for kontrollgruppe).
**Step 4:** Run — PASS. `npx tsc --noEmit` — 0.
**Step 5:** Full suite: `npm run test` — 0 regresjoner (forrige grønne: 1903 passed).
**Step 6:** Commit. **IKKE deploy** — A/B-gaten (Task 8) må først godkjennes.

---

### Task 8: A/B-oppsett for ruting-endringen (48t, siste gate)

**Objective:** Dokumentere og sette opp A/B: halvparten av nye auto-brukere får grid-default, halvparten multi_signal-kontroll; måling: win rate ≥ 60 % og PF ≥ 2,0 på grid-armen etter 48t.

**Files:**
- Create: `reports/trading-agent/2026-08-05-ruting-ab-plan.md` (definisjon: bruker-ID-hash mod 2 → arm; målepunkt: `trades WHERE executed_at > deploy-tidspunkt`, `cleanTradeStats`; stopp-kriterium: grid-arm PF < 1,3 eller win < 40 % → revert flag)

**Step 1:** Skriv A/B-planen (konkret SQL for måling).
**Step 2:** Verifiser at feature-flag fra Task 7 støtter `GRID_DEFAULT_ROUTING=off` for kontroll.
**Step 3:** Commit. Deploy-plan: flag default ON, overvåk 48t, deretter hardkode grid og fjern flag.

---

## Fase 4 — Overvåkning av optimaliseringen

### Task 9: Utvid daglig analyse med backtest-paritet + fill-fysikk-rapport

**Objective:** Daglig-rapporten (cron 07:00) skal rapportere: realiserte sykluser, netto/syklus vs forventet (0,137), og par-vis fill-rate — så vi ser om optimaliseringene faktisk øker aktiviteten.

**Files:**
- Modify: daglig-analyse-cron-prompten (job `ada921a4e191`) — legg til fill-fysikk-seksjonen (spesifikasjon i planen, ikke i cron)

**Step 1:** Oppdater cron-prompten med ny seksjon (sykluser/dag, netto vs teoretisk, par-ranking etter fill-rate).
**Step 2:** Kjør manuell analyse for å verifisere at nye tall kan hentes (0 fills nå → rapporten skal vise «0 sykluser — teoretisk 0,137/syklus venter på 1 %-fall»).

---

## Fase 5 — Deploy og verifikasjon

### Task 10: Full verifikasjonsgate før deploy

**Step 1:** `npx tsc --noEmit` → 0.
**Step 2:** `npm run test` → 1903+ passed, 0 feil (nye tester inkludert).
**Step 3:** `node --check scripts/kraken-grid-manager.mjs` → OK.
**Step 4:** Live-tørrkjøring av manageren + watchdog → begge stille.
**Step 5:** Commit alle endringer; **deploy kun Task 4–6 og 9** (live-grid-optimalisering + overvåkning). Task 7–8 (ruting) deployes kun etter A/B-godkjenning.
**Step 6:** Etter deploy: verifiser `git log origin/main` + prod 200 + tick-kjøring HTTP 200.

---

## Filer som endres (oversikt)

| Fil | Task | Endring |
|---|---|---|
| `scripts/trading-agent/par-kandidater.ts` | 3 | NY: par-filter (OOS ∩ range ∩ ordremin) |
| `src/lib/trading/par-kandidater.ts` | 3 | NY: ren filtreringsfunksjon (TDD) |
| `src/lib/trading/kraken-grid-config.ts` (eller .mjs) | 4 | NY: PAIR_CFG SSoT inkl. ADA/AVAX (inaktive) |
| `scripts/kraken-grid-manager.mjs` | 4, 5, 6 | Parameterisert config, equity-utvidelse, 5-par-aktivering |
| `src/lib/trading/kraken-kill-switch.ts` + test | 5 | equity inkluderer ADA/AVAX; `shouldActivateFivePair` |
| `~/.hermes/scripts/kraken-grid-watchdog.sh` | 5 | equity-assets utvidet |
| `src/app/api/pilot/route.ts` + test | 7 | grid som default-ruting (flagget) |
| `reports/trading-agent/*.md/.txt` | 1, 2, 3, 8 | Backtest-SSoT, par-univers, A/B-plan |
| Daglig-analyse cron (`ada921a4e191`) | 9 | fill-fysikk-seksjon |

## Tester / Validering

- `npx vitest run src/lib/trading/__tests__/par-kandidater.test.ts` — nye
- `npx vitest run src/lib/trading/__tests__/kraken-kill-switch.test.ts` — utvidet
- `npx vitest run src/lib/trading/__tests__/kraken-grid-config.test.ts` — ny
- `npx vitest run src/app/api/pilot/__tests__/route.test.ts` — ny/utvidet
- `npx tsc --noEmit` → 0; `npm run test` → full grønn
- Live-tørrkjøring: manager + watchdog stille; kill-simulering fungerer
- Etter deploy: prod 200, tick HTTP 200, ingen ordre-endringer uten fills

## Risikoer / Tradeoffs

1. **Backtest ≠ live på Kraken-fills** — backtest kjører Binance-klines (gratis, rik data) mot kraken-USDC-kvoter. Prisforskjellen er < 0,5 % (verifisert), men fill-sannsynlighet i tynne USDC-bøker kan avvike. Mitigasjon: 5-par-modus starter med ADA/AVAX med 1,2 %-spacing og 8–10 USDC-nivåer; watchdog varsler ved 0 fills på nytt par etter 7 dager.
2. **ADA/AVAX-ordermin overraskelser** — ordremin er verifisert live i kveld, men `validate=true`-probe i Task 6 beskytter uansett.
3. **5-par-aktivering bruker hele idle-kapitalen** — ved equity 250 er ~230 USDC i grid; nye par tar ~80–100 USDC. Kill-switch-dekning (Task 5) må være deployet FØR aktivering kan skje.
4. **Ruting-endring uten A/B** = ukesforslagets forbud brutt. Task 8 er derfor ikke-valgfri.
5. **Valuta-renhet** — alle nye beregninger må bruke USDC-kontrakt; ingen NOK-konvertering i grid-manageren (lærdommen). Kill-switch-baseline er 153,44 USDC (inkl. XBT).

## Åpne spørsmål

1. Skal ADA/AVAX aktiveres automatisk ved 250, eller skal manageren kun foreslå og vente på bekreftelse? (Planen antar automatisk med `state.five_pair_activated`-idempotens + watchdog-varsel i forkant; Tom kan velge manuelt.)
2. Skal A/B-flagget starte ON (grid-default for alle nye) eller 50/50? (Planen antar ON + kontrollgruppe via flag-off; 50/50-hash krever litt mer kode.)
3. Skal `TRAIL_SELL_PCT` (1.02) justeres fra backtest-sweep, eller beholdes som fill-fysikk-sikkert (1.02 = 3,8× fee-margin)? (Planen antar behold — tryggest med liten kapital.)
