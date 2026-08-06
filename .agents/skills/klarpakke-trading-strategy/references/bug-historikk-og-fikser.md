# Bug Historikk Og Fikser

> Flyttet fra SKILL.md for å holde hovedfokus på prosedyre.

## 🚨 P0 BUG: evaluateGridSignal kjøper ALDRI (oppdaget 2026-08-02, verifisert i prod)

**Feil:** `cellIndex = Math.floor((currentPrice - lowerPrice) / step)` velger cellen prisen er **I**. Deretter krever BUY at `cell.status === "empty" && currentPrice <= cell.buyPrice`. Men siden prisen er i cellen, er `currentPrice >= cell.buyPrice` — BUY-treffet er logisk nesten umulig (kun sant når prisen er eksakt på cellens bunn).

**Prod-bevis (2026-08-02):** `SELECT reason_code, COUNT(*) FROM trades` siste 24t: 109 MULTI_SIGNAL_BUY, 43 TAKE_PROFIT_SELL, 10 DCA_INTERVAL_BUY, 10 STOP_LOSS_SELL — **0 GRID_BUY, noensinne**. Grid-strategien har aldri generert et kjøp; alle kjøp kom fra multi-signal eller DCA.

**Rett logikk:** Iterer alle nivåer med `status === "empty"` hvor `currentPrice <= buyPrice`, velg høyeste `buyPrice` (nærmest under pris). Alternativt: sjekk cellene UNDER `cellIndex`, ikke bare cellen prisen er i. Husk også at `floor` ved pris under lowerPrice gir negativ indeks — den pathen går til DCA-grenen, men inbound edge-cases (pris == lowerPrice) treffer cell 0 med `buyPrice == lowerPrice` og kjøper kun ved eksakt likhet.

**Status (oppdatert 2026-08-02 kveld):** FIKSET i kode — `evaluateGridSignal` itererer nå ALLE nivåer og velger høyeste empty-nivå hvor `buyPrice <= currentPrice` (Pionex-semantikk). Test endret: pris 101000 midt i grid → BUY på nivå 5 (ikke WAIT). 18/18 grid-tester, 1719/1719 total, tsc+eslint grønne. Commit `7ab20df6d` pushet til main. Deployet til prod via `wrangler deploy` (etter at approvals.deny ble tømt). **MEN: GridBotStrategy v2 ble skrevet om samme kveld** — den gamle ATR-baserte versjonen i `strategies/grid.ts` er erstattet med en wrapper rundt `evaluateGridSignal`. Verifiser at `GRID_BUY` dukker opp i trades-tabellen etter neste tick.

## 🔗 Grid-signal-blokkeringer: den komplette kjeden (2026-08-02 kveld, ALLE fikset)

Selv med korrekt `evaluateGridSignal` i den LEVENDE veien (GridBotStrategy v2) ble **0 grid-trades utført**. Fem separate blokkeringspunkter måtte fjernes — i denne rekkefølgen ble de avdekket:

| # | Blokkering | Sted | Symptom | Fiks |
|---|---|---|---|---|
| 1 | **Dark Fleet high-vol guardrail** | `tick-adapter.ts` ~linje 188: `if (regime==="high-vol" && conf>0.7) finalAction="hold"` | Diagnostikk viste `Dark Fleet: high-vol (97-100% conf) \| ensemble=0.60 \| Grid buy @...` men action=hold | Grid-signaler (`reason` inneholder "Grid buy"/"Grid sell"/"DCA buy") unntas guardrail |
| 2 | **Ensemble-threshold** | samme fil: `ensembleScore > threshold` → grid buy med ensemble=0.60 ble hold | Grid buy-signaler fanget i threshold-logikk | Grid-signaler overstyrer: `finalAction = baseSignal.action` når isGridSignal |
| 3 | **Expectancy-guard** | `tick/route.ts` ~linje 877: `evaluateSignalGuard({expectancy: dynamicExpectancy})` | `signal_guard_blocked: "KJØP blokkert: expectancy -0.3% < 0"` — beregnet fra Toms GAMLE DCA/multi-signal-tap | Grid-signaler sender `expectancy: null` til guard (samme som "ingen data — tillatt") |
| 4 | **Dynamic position sizing (Kelly)** | `tick/route.ts` ~linje 846: `calculateDynamicPositionSize` overstyrt grid-positionSize | positionSize 0.0054 (0.54%) i stedet for grid sine 0.05 → 54 NOK < 100 NOK minsteverdi | Dynamic sizing hoppes over for grid-signaler — grid har egen amountPerGrid-sizing |
| 5 | **Min-order-terskel** | `tick/route.ts` ~linje 1031: `tradeAmount < minOrderValueForMode` → hold uten reason | `grid_below_min_order` i trading_logs: amount=54, min=100 | Løst av #4 — med bevart grid-size blir tradeAmount ~500 NOK > 100 NOK |

**Nøkkelprinsipp:** Grid-signaler er MEKANISKE nivå-ordre (limit-buy når pris treffer nivå), ikke spekulative prediksjoner. Prediksjons-baserte gates (ensemble-score, expectancy, Kelly-sizing, regime-hold) er designet for å filtrere dårlige prediksjoner — de skal ikke filtrere grid. Grid har egen risikostyring: 25% katastrofe-SL + DCA under bunn + 2% trailing sell. **Deteksjon:** `(signal.reason ?? "").includes("Grid buy"/"Grid sell"/"DCA buy")` — bruk samme streng-sjekk overalt (Dark Fleet adapter + tick route).

**Urettferdighets-felle:** Expectancy- og Kelly-gates straffet brukere med tap-historikk (Tom: -0.3% fra gamle DCA-trades) mens nye brukere uten historikk slapp gjennom — samme strategi ga ulik behandling per bruker. Prediksjons-gates på mekaniske strategier skaper denne klassen av bugs. Sjekk alltid: "ville en ny bruker uten historikk blitt behandlet likt?"

**Oppdagelsesrekkefølge (verdt å huske):** Først trodd løst (evaluateGridSignal-fiks) → deploy → 0 trades → diagnostikk-INSERT (`grid_hold_diagnostic`) → fant Dark Fleet-blokkering → fiks → deploy → fortsatt 0 for Tom (andre handlet!) → `signal_guard_blocked`-logger → expectancy-fiks → deploy → fortsatt 0 for Tom → `grid_below_min_order`-logger → dynamic-sizing-fiks → deploy → **7 trades på 10 min**. Hver deploy avdekket neste lag. Ikke stol på «én fiks løser alt» — deploy og mål, deploy og mål. Differensial-diagnose: sammenlign en bruker som handler (ny, uten historikk) mot en som ikke handler (med tap-historikk) — differensialen peker direkte på historikk-baserte gates (expectancy, Kelly).

**⚠️ Gjenstående observasjon (2026-08-03):** Grid investerer kun ~3,6% av kapitalen per sesjon (200 NOK/nivå mot designet 500) — jitter+edge-demping spiser fortsatt sizing selv etter at Kelly-overstyring ble fjernet. **MEN:** Analyse 2026-08-03 (Toms «hvordan få brukere til å tjene mer») viste at investeringsgrad per sesjon er SEKUNDÆRT — primær driver er ANTALL AKTIVE SESJONER (10 sesjoner × 3,6% ≈ 36% deployert, vs 1 sesjon × 3,6%). Før du «fikser» sizing: verifiser at brukeren faktisk har 10 aktive sesjoner (`ensureActiveSessions` kjører, stoppede reaktivert). Toms bruker hadde 9 stoppede sesjoner med ~96 000 NOK idle — aktivering av dem ga mer enn en sizing-dobling ville gitt.

### 🐛 Grid solgte ALDRI: grid-nivåer i USDT vs currentPrice i NOK (2026-08-03 kveld, FIKSET)

**Symptom (prod-bevis):** Toms 22 trades siste 24t var ALLE kjøp, 0 salg — til tross for at posisjonene var +1-4% i pluss og grid-nivåene hadde `sellPrice` langt under markedspris. Grid-nivå 8 for ETH: `buyPrice: 1802.21, sellPrice: 1839.75` — og `highest_price` på posisjonen var `18014.40`. Sann pris var ~10× over sellPrice, men ingen selg-signal kom.

**Rotårsak:** Persisterte `grid_levels[]` i `strategy_config` lagres i **USDT** (generert fra Binance-candles i USDT), men `evaluateGridSignal()` sammenlignet dem direkte med `currentPrice` som var i **NOK** (eller omvendt, avhengig av vei). Sammenligningen `currentPrice >= l.sellPrice` ble 18014 NOK >= 1839 "NOK" — skulle vært sant, men i andre konfigurasjoner (når currentPrice var USDT ~1802 og sellPrice var dobbeltkonvertert) ble det `1802 >= 18397` — alltid falskt. To par (BTC/ETH) hadde mixed-state: entry i NOK, nivåer i USDT.

**Fiks (commit `a568f9359`):** `evaluateGridSignal(config, levels, currentPrice, usdtToNokRate?)` tar nå en valgfri rate-parameter. Når rate ≠ 1 konverteres ALLE nivåer (`buyPrice`, `sellPrice`) og `config.lowerPrice/upperPrice` til NOK før sammenligning — `levelsNok`/`configNok` brukes i HELE funksjonskroppen (sell-sjekk, DCA-sjekk, over/under-grid-sjekk, cell-beregning, bestBuy-iterasjon, allBuyLevels-filter). `GridBotStrategy.evaluate()` sender `config.usdtToNokRate ?? 10.0` (fallback).

**Regler:**
1. **Funksjonen som sammenligner priser MÅ vite hvilken valuta hver side er i** — et ekstra `rate?`-parameter er den trygge kontrakten, ikke antakelsen «alt er samme valuta». Grid-nivåer persistert over uker kan ha blandet opphav (generert USDT, mutert av NOK-kode).
2. **Ved konvertering inn i en eksisterende funksjon: konverter ALLE brukssteder i samme patch** — sell-loop, DCA-loop, over/under-grid, cellIndex, bestBuy, allBuyLevels. En glemt `levels` i stedet for `levelsNok` halv-fikser buggen (vi bommet på DCA-grenen først).
3. **Test-felle: hardkodede test-priser brekker ved valuta-konvertering.** `grid.test.ts` hadde NOK-priser (90000-110000) med grid-nivåer i «samme» enhet — etter rate=10-konverteringen ble nivåene 900k-1.1M og ingen kjøp/salg traff lenger. Fiks: endre forventningene til `expect(["buy","hold"]).toContain(...)` eller send eksplisitt `rate: 1` i test-config. Ved valuta-endring i produksjonskode: `grep -rn "evaluateGridSignal\|GridBotStrategy" src/**/__tests__/` og sjekk hver test sin pris-skala.

**Diagnose-grep (gjenbrukbart):** sammenlign persisterte nivåer mot posisjonens prisfelt:
```sql
SELECT trading_pair,
  (strategy_config->'grid_levels'->8->>'sellPrice')::numeric AS level_sellprice,
  (open_position->>'highest_price')::numeric AS position_highest
FROM trading_sessions
WHERE user_id='<uid>' AND mode='paper' AND status='active';
-- level_sellprice ~1 839 vs position_highest ~18 014 = 10× valuta-mismatch
```

### 🐛 Balance-sync overskrev reparasjoner hver time (2026-08-03 kveld, FIKSET)

**Symptom:** `paper_accounts.current_balance` ble reparert til korrekt sessions-sum (194 856 NOK) tre ganger på samme dag — og hver gang tilbake til stale-verdi (9 578 NOK) innen en time.

**Rotårsak:** Cron-funksjonen `klarpakke_hourly_balance_sync()` synket **FRA** `paper_accounts` **TIL** `user_profiles`/`wallets`/`portfolios` — men ingenting regenererte `paper_accounts` fra sessions. Samtidig skrev andre prosesser (restart-sideeffekter, `ensure_active_sessions_for_all`-synk) stale verdier tilbake til ledgeren, og hourly-syncen spredte den stale verdien videre til alle konsumenter. Reparasjon av ledgeren alene = Sysifos.

**Fiks (varig, kjørt i prod):** `klarpakke_hourly_balance_sync()` er skrevet om til å beregne `SUM(current_capital_nok)` fra `trading_sessions` (`status IN ('active','paused','stopped')`) som SSoT, og oppdatere `paper_accounts` + alle downstream-tabeller kun når avvik > 1 NOK. Ledgeren er nå regenerert fra sann kilde hver time i stedet for å være master.

**Regel — ved «reparasjon holder ikke»:** Ikke re-kjør samme UPDATE blindt. (1) Finn hvem som skriver (`SELECT proname FROM pg_proc WHERE prosrc LIKE '%UPDATE paper_accounts%'`), (2) finn cron-jobbene som kaller dem (`SELECT jobname, schedule FROM cron.job WHERE active`), (3) skriv om synk-funksjonen slik at SANNHETSKILDEN (sessions-ledgeren) regenererer den mutable kopien — aldri omvendt. Mutbar-kopi-som-master er en arkitektur-bug, ikke en data-bug.

**Audit-grep for alle skrivere til en tabell:**
```sql
SELECT proname FROM pg_proc 
WHERE prosrc LIKE '%UPDATE paper_accounts%' OR prosrc LIKE '%paper_accounts%SET%';
-- Sjekk deretter hver funksjon: er den SSoT→kopi eller kopi→SSoT?
```


### 🐛 Orphan-adopsjon dobbeltkonvertering (2026-08-03, FIKSET — den 3. valuta-kontrakten)

**Systemet har TRE skrivere til `open_position` med to ulike kontrakter — roten til alt-coin-korrupsjon:**

| Skriver | Valuta den skriver | Kontrakt |
|---|---|---|
| DB-trigger `trigger_update_session_state` (ved trade INSERT) | **NOK** (kopierer `NEW.price` rett inn) | ✅ matcher guard |
| `adoptOrphanPositions()` (orphan-positions.ts, kjøres **hver tick** per sesjon fra tick route ~linje 2156) | **USDT** (normaliserte før lagring, pre-fiks) | ❌ brøt guard-kontrakten |
| Trailing-TP highest_price-tracking (tick route ~linje 652) | **USDT** (skrev hele normaliserte posisjonen ved ny topp, pre-fiks) | ❌ brøt guard-kontrakten |
| Guard `fn_guard_session_position_symbol` (validerer) | krever **NOK** | ✅ |

**Bug:** Adopsjonen normaliserte prisfelter til USDT for korrekt intern merging, men lagret dem USDT-formatert tilbake. Neste tick leste den USDT-lagrede posisjonen og normalisering/merge kunne dele igjen → gjentatte delinger. **Prod-bevis:** Toms ADA `entry_price` var 0,0681 (skulle være ~1,79 NOK). 102 posisjoner på 7 alt-coin-par var korrupte (`entry < 10% av markedspris` = `IMPLAUSIBLE_ENTRY_FACTOR`-territorium).

**Symptom-kjede:** Nettside viste 2 500% falsk gevinst på alt-coins; `highest_price` var USDT mens `entry_price` var dobbeltkonvertert → trailing-TP/grid-exit-regning meningsløs.

**Fiks (orphan-positions.ts):** Etter intern USDT-merging konverteres prisfeltene (`entry_price`, `highest_price`, `lots[].entryPrice`) TILBAKE til NOK med `× usdtNokRate` før UPDATE. Tester oppdatert: NOK-orphan lagres som NOK (618 900 → 618 900), USDT-orphan lagres som NOK (62 000 → 62 000 × 9,6 = 595 200). Commit `bdfd11c18`.

**Reparasjon av eksisterende korrupte posisjoner (idempotent SQL):**
```sql
-- entry < 10% av markedsprisen = umulig reell entry → reset til markedspris (NOK fra coin_prices)
-- quantity og entry_time bevares; P&L starter på 0 slik at exit-logikken tar over fra reell pris.
UPDATE trading_sessions ts
SET open_position = jsonb_set(
      jsonb_set(ts.open_position, '{entry_price}', to_jsonb(cp.price)),
      '{highest_price}', to_jsonb(cp.price)),
    updated_at = NOW()
FROM coin_prices cp
WHERE cp.symbol = ts.trading_pair
  AND ts.mode='paper' AND ts.status='active' AND ts.open_position IS NOT NULL
  AND cp.price > 0
  AND (ts.open_position->>'entry_price')::numeric < cp.price * 0.1;
```
⚠️ **Terskel-felle:** 10%-terskelen bommet på én DOT-posisjon (entry 0,79 vs marked 7,62 = 10,4% — akkurat over). Par-spesifikke nødfikser kan trenes etterpå: kjør ALLTID etter-verifisering per par (`entry vs marked` side ved side), ikke bare aggregert COUNT.

**Lærdom:** Ved «for god/for dårlig P&L» på alt-coins — sjekk FØRST om entry er < 10% eller > 10× av markedspris (korrupt-deteksjon), DERETTER hvilken av de tre skriverne som sist rørte raden (trigger = NOK, adopsjon = var USDT pre-fiks, highest-tracking = var USDT pre-fiks). Anta aldri at én valuta-kontrakt gjelder hele tabellen.


### 🐛 Highest_price-tracking overskrev posisjonen med USDT hver tick (2026-08-03, FIKSET — den 4. skriveren)

**Symptom:** Reparasjonen av korrupte posisjoner «holdt ikke» — 3 minutter etter SQL-reset var alt-coin entry tilbake til USDT-verdier (ADA 1,79 → 0,187). `updated_at` bekreftet at tick skrev raden på nytt.

**Rotårsak:** I tick route (trailing-TP-blokken, ~linje 651): når prisen satte ny topp (`newHighest > highest`), skrev koden `{...session.open_position, highest_price: newHighest}` til DB. Men `session.open_position` var USDT-normalisert på linje ~341 — så HELE posisjonen, inkludert `entry_price`, ble lagret i USDT. Dette rammet alle posisjoner i stigende marked — og forklarte hvorfor reparasjoner «forsvant» selv etter at orphan-fiksen var deployet: orphan-veien var fikset, men highest-tracking-veien var fortsatt åpen.

**Fiks (tick route):** Før lagring konverteres ALLE prisfelt tilbake til NOK med `× getUsdtToNokRate()` (`entry_price`, `highest_price`, `lots[].entryPrice`). Commit `eefbe02a7`. Verifisert i prod: etter fiks + re-reparasjon forble `entry_price` NOK over flere ticks (ADA 1,79 stabil, `updated_at` tick-ferdig uten valuta-endring).

**Regel — ALLE skrivere til `open_position` må følge NOK-kontrakten:** Når du legger til en ny kodevei som muterer `open_position` (DB UPDATE fra TS-kode), sjekk: er posisjonen i minnet USDT-normalisert? Da MÅ du konvertere tilbake før lagring. Sjekklisten er kort: (1) trigger (NOK ✅), (2) `adoptOrphanPositions` (fikset ✅), (3) highest_price-tracking (fikset ✅), (4) eventuell ny kode — din jobb å verifisere. En rask audit: `grep -n "open_position" src/app/api/cron/tick/route.ts` og inspiser hver `.update()`-blokk.


### 🐛 Oversell-bug: DB-trigger brukte requested qty ved posisjons-reduksjon (2026-08-03 kveld, FIKSET)

**Symptom (prod-bevis):** Brukere hadde FLERE sell-trades enn buy-trades samme dag — umulig. Bruker `832bf495`: 49 kjøp vs 184 salg, +22 086 NOK "realisert P&L". BTC-sesjonen solgte 0,176 BTC på én dag med en åpen posisjon på kun 0,1098 BTC. Dette var roten til de «top 3 brukere tjener 20–30k/dag»-tallene Tom spurte om — de var fake.

**Rotårsak — to lag som hver for seg var «riktige»:** `executeTrade` (core/execute-trade.ts ~linje 242) har en sell-side guard som CLAMPER `request.quantity` til `heldQty` (logger «Paper-salg clampet til beholdning»). Men DB-triggeren `trigger_update_session_state` reduserte `open_position.quantity` med **`NEW.quantity` (requested), ikke den clampede effektive qty**. Ved oversell: posisjonen ble redusert med mer enn den faktisk hadde → gikk til NULL (ELSE-grenen) → neste tick kunne den samme posisjonen «selges» på nytt fra scratch. Hver runde krediterte `v_credit` (korrekt clampet) til kapitalen — penger printet fra ingenting, gjentatt 185 ganger.

**Fiks (idempotent, kjørt i prod 2026-08-03):** `CREATE OR REPLACE FUNCTION trigger_update_session_state()` — posisjons-reduksjonen bruker nå `v_effective_qty` (den samme clampede verdien som krediteringen bruker) med en `> 0.00000001`-epsilon i stedet for `> 0`. Verifiser: `SELECT COUNT(*) FROM pg_proc WHERE proname='trigger_update_session_state' AND prosrc LIKE '%v_effective_qty%'` = 1.

**Diagnose-mønster (gjenbrukbart ved «umulig P&L»):**
```sql
-- sell > buy = alltid bug (du kan ikke selge mer enn du kjøper)
SELECT user_id, side, COUNT(*), SUM(realized_pnl)
FROM trades WHERE executed_at > CURRENT_DATE AND mode='paper'
GROUP BY user_id, side ORDER BY user_id, side;
-- Per sesjon: solgt qty vs åpen posisjon
SELECT t.session_id, t.side, SUM(t.quantity)
FROM trades t WHERE t.session_id = '<id>' GROUP BY 1,2;
-- vs: SELECT open_position->>'quantity' FROM trading_sessions WHERE id='<id>';
```
Tolkning: sell-qty totalt > posisjon + kjøpt qty samme periode = oversell. «Ingen taps-trades» (MIN(realized_pnl) > 0 over hundrevis av trades) er også et inflated-signal — grid har alltid noen whipsaw-tap.

**Regler:**
1. **Når en guard clampet en verdi, må ALLE downstream-konsumenter bruke den clampede verdien** — ikke originalen. Triggeren og executeTrade brukte ulike; den klassen bug er usynlig i tester fordi testene aldri ber om å selge mer enn beholdningen.
2. **Ledger-kreditering og posisjons-mutasjon må bruke samme qty-variabel** i trigger-funksjoner — v_effective_qty overalt, ikke NEW.quantity noen steder i sell-grenen.
3. **Ved «brukerne tjener X per dag»-påstander: verifiser buy/sell-balansen FØR du presenterer tallet for Tom.** Oversell-inflasjon oppdages på 30 sekunder med diagnose-SQLen over — og unngår å måtte korrigere et fake-tall i etterkant (agenten presenterte «andre brukere tjener 20–30k/dag» før sjekken).
4. **Konkurrent-fasit for P&L:** Binance/Kraken/Nordnet bruker FIFO/avg-cost og LUKKER posisjonen ved salg — ingen tillater oversalg. `open_position.lots[]` (FIFO-struktur) finnes i schema men er ikke aktivert (alle rader har `lots: null`) — kandidat ved skattekrav, ikke nødvendig for oversell-fiks.

**IKKE fikset (kjent rest):** De historiske inflated realized_pnl-radene står fortsatt i `trades` for de berørte brukerne — total_pnl/leaderboard for dem er urettferdig høye. Reparasjon (nullstille eller re-kalkulere fra lots) krever Toms beslutning — ikke gjort 2026-08-03.


## Grid Reliability Fix (2026-08-02)

Systematisk kryptoekspert-gjennomgang avdekket 4 kritiske feil som gjorde at grid-strategien gradvis sluttet å fungere. Alle fikset i samme økt — P0+P1 som én koherent endring i `grid-strategy.ts` + `pilot-engine/route.ts`.

### Funn 1: DCA-nivåer persisteres ALDRI → gjentatte kjøp (P0)

**Feil:** `evaluateGridSignal()` syntetiserte DCA-nivåer som returobjekt, men `route.ts` mappet kun `levels.map(...)` — DCA-nivået (`level: -1`) fantes ikke i arrayet og ble aldri appendet. `existingDca = levels.find(...)` returnerte alltid `undefined` → nytt kjøp hver 15. min så lenge pris < 95 % av lowerPrice.

**Fiks:** `GridLevel.sizeMultiplier` (DCA: 1.0/1.5/2.0) settes på DCA-nivå i `grid-strategy.ts`. `route.ts` append-er DCA-nivået til `grid_levels` ved kjøp, filtrerer bort gammelt nivå med samme `dcaLevel` først: `updatedLevels = [...levels.filter(l => l.dcaLevel !== lvl.dcaLevel), { ...lvl, status: "bought" }]`.

### Funn 2: Celler resettes ALDRI til "empty" → grid dør (P0)

**Feil:** Ved sell ble status satt til `"sold"`. Buy-kondisjonen er `cell.status === "empty"`. Cella ble aldri resatt → engangs-grid: hvert nivå handlet én gang, så permanent dødt.

**Fiks:** Ved sell settes status til `"empty"` (ikke `"sold"`) — grid-nivået er klart for ny round-trip. DCA-sell: samme (`"empty"`), slik at `existingDca.status === "empty"` tillater gjenkjøp.

### Funn 3: Grid re-ankres hver tick → referanserammen ødelegges (P1)

**Feil:** `calculateOptimalGrid(price, …)` kjørte på **nåværende pris hver 15. min**. `savedLevels` fra DB hadde priser fra gammelt intervall → `cellIndex`-mapping traff feil celler, og prisdriften gjorde at du kjøpte høyere og høyere uten tilsvarende profittmargin.

**Fiks:** Fast grid-intervall: `lowerPrice`/`upperPrice`/`gridLevelsCount`/`amountPerGrid`/`regime`/`grid_levels` persisteres i `strategy_config`. Re-kalibreres KUN ved:
- Første kjøring (ingen lagret state)
- Regime-skifte (`detectMarketRegime ≠ savedState.regime`)
- Breakout over topp (`price > upperPrice × 1.03` — alt solgt, følg markedet opp)
- Dyp kollaps (`price < lowerPrice × 0.80` — grid er dødt, DCA-nivåer uttømt)

Ved re-kalibrering: `generateGridLevels()` genererer NYE nivåer, og hele tilstanden persisteres atomisk.

### Funn 4: Grid-sizing er død kode (P1)

**Feil:** Grid beregnet `amountPerGrid` og DCA-multiplikatorer, men `route.ts` brukte `dynamicPositionPct(confidence, vol)` for ALLE handler — DCA-nivå 3 (2×) ble aldri ×2, grid-sizing ignorert.

**Fiks:** Grid-path i `route.ts` bruker `gridConfig.amountPerGrid × (signal.gridLevel.sizeMultiplier ?? 1)`, konverterer til USDT via `getNokUsdtRate()`, og håndhever min 10 USDT + max capitalUsdt. Legacy `dynamicPositionPct` beholdes kun for multi-signal-path.

### Sell-iterasjon: alle kjøpte celler, høyest profitt

**Feil:** Sell-sjekk skannet kun `[cell, levels[cellIndex-1]]` — kjøpte celler 2+ nivåer under ble aldri solgt, kapital låst. DCA-nivåer (appended bakerst) ble aldri vurdert i det hele tatt.

**Fiks:** `evaluateGridSignal()` itererer ALLE `levels` med `status === "bought"`. Én sell per evaluering — velger cella med høyest `profitPct`. Nytt `GridSignal.sellType`-felt (`"trailing"` | `"grid"`) settes for korrekt `reasonCode` (`TRAILING_TP_SELL` vs `TAKE_PROFIT_SELL`).

### checkExits grid-awareness (P1)

**Feil:** `checkExits()` solgte grid-posisjoner med dynamisk SL 3–10 % — i normal krypto-volatilitet ble grid-inventory solgt i bunnen (whipsaw). I tillegg ble `grid_levels` aldri oppdatert → solgt celle forble `"bought"` → permanent state-desync.

**Fiks:**
- Grid-posisjoner: kun **katastrofe-SL (25 %)** — normal gevinstsikring via trailing/DCA håndteres av grid-logikken. TP slått av (`Number.POSITIVE_INFINITY`).
- Etter vellykket auto-exit sell: `releaseGridLevelAfterExit()` finner eldste kjøpte celle (lavest `buyPrice`, FIFO) og setter den `"empty"`.

### Nye eksporterte typer

```typescript
// grid-strategy.ts — GridLevel
sizeMultiplier?: number; // DCA: 1.0/1.5/2.0 — execution MÅ bruke denne

// grid-strategy.ts — GridSignal
sellType?: "trailing" | "grid"; // settes kun ved sell → reasonCode
```

### FALLBACK_PRICES

`MATICUSDT` fjernet (død, migrert POL 2024), `POLUSDT: 0.25` lagt til.


