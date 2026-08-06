---
name: klarpakke-trading-strategy
description: Trading-gates i tick-motoren. Wiring, testing, pitfalls.
version: 1.4.0
author: Hermes Agent
metadata:
  hermes:
    tags:
    - klarpakke
    - trading
    - strategy
    - gates
    - wiring
    related_skills:
    - klarpakke-trading-agent
    - klarpakke-debug-patterns
whenToUse: Når bruker ber om nye trading-gates, signal-ruting eller strategi-endringer
  i tick-motoren.
---

# Klarpakke Trading Strategy Implementation

Implementering av strategi-gates i tick-motoren — fra modul → tester → wiring → deploy.

## 📚 Referanser (les når du trenger det)

| Fil | Les når... |
|---|---|
| `references/bug-historikk-og-fikser.md` | Du feilsøker en grid/trading-bug |
| `references/research-og-konkurrent-analyse.md` | Du designer ny funksjonalitet eller trenger konkurrent-innsikt |
| `references/tick-pipeline-og-diagnostikk.md` | Du feilsøker «strategi handler ikke» |
| `references/pilot-auto-sammenslåing.md` | Du jobber med UI-moduser (Pilot/Auto) |
| `references/grid-trading-strategy.md` | Du implementerer eller endrer grid-logikk |
| `references/grid-optimization-research.md` | Du optimaliserer grid-parametere |
| `references/grid-strategy-integration.md` | Du integrerer grid i tick |
| `references/bulk-pilot-onboarding.md` | Du onboader mange brukere |
| `references/live-trading-testnet-activation.md` | Du aktiverer live-trading |

---

## 🔄 2026-08-03 kveld: valuta-fiks i grid + balance-SSoT (BEGGE DEPLOYET)

**1. evaluateGridSignal tar nå `usdtToNokRate` (4. parameter, optional).** Prod-bevis: ETH grid-nivåer var lagret i USDT (buyPrice 1 802, sellPrice 1 839) mens `currentPrice` var NOK (18 014) → grid kjøpte men solgte ALDRI (ventet på 1 839 "NOK" som aldri kom). Fiks: `evaluateGridSignal(config, levels, currentPrice, rate)` konverterer `buyPrice/sellPrice/lowerPrice/upperPrice` × rate til NOK før ALLE sammenligninger når rate ≠ 1. `GridBotStrategy` sender `(config?.usdtToNokRate) ?? 10.0` som fallback. **Regel: grid-nivåer persisteres i USDT, men ALL evaluering skjer i NOK — samme mønster som open_position (USDT lokalt, NOK lagret).** Eksisterende grid_levels i DB er USDT og trenger IKKE migrering — konverteringen skjer ved lesing.

**2. Balance-SSoT er nå varig: `klarpakke_hourly_balance_sync()` beregner FRA `trading_sessions` (active+paused+stopped) TIL `paper_accounts`.** Før: paper_accounts var ustabilt (overskrevet 3× av ukjente skrivere; reparasjoner holdt ikke). Nå: sessions er master både for sync-funksjonen, dashboard (`getAccountBalance` inkluderer stopped) OG portefølje-API (`/api/portfolio/summary` beregner fra sessions med paper_accounts kun som fallback). **Ved "balance feil"-rapporter: sjekk sessions-sum FØRST (`SUM(current_capital_nok) WHERE status IN ('active','paused','stopped')`), ikke paper_accounts.** Reparasjonsscriptet `scripts/repair-paper-account-balances.ts` må kjøres med active+paused+stopped-filter (ikke kun active) ellers underrepareres brukere med stoppede sesjoner (Tom: 10 stopped × 9,5k = 95k oversett).

---

## ⚠️ KRITISK: Levende motor vs død kodevei (2026-08-02, LØST)

**Tre grid-implementasjoner eksisterer. Kun ÉN kjører i prod:**

| # | Fil | Kalles av | Status |
|---|---|---|---|
| 1 | `src/lib/trading/grid-strategy.ts` (`evaluateGridSignal` med bestBuy) | `/api/pilot-engine` | ❌ **DØD VE** — ingen cron-job kaller pilot-engine (verifisert: `SELECT command FROM cron.job` — kun `/api/cron/tick`) |
| 2 | `src/lib/trading/strategies/grid.ts` (`GridBotStrategy`) | `/api/cron/tick` → `evaluateDarkFleetSignal` → `resolveStrategy("grid")` | ✅ **LEVENDE** — dette er produksjonsmotoren |
| 3 | `src/lib/trading/signal-generator.ts` (`grid_bot`) | Fallback i `tick-adapter.ts` | ⚠️ Legacy-fallback (1%-grid rundt nåpris, ingen persistert state) |

**Prod-flyt:** `pg_cron (klarpakke-trading-tick, hvert minutt)` → `klarpakke_trigger_cron('/api/cron/tick')` → `processSession()` → `evaluateDarkFleetSignal()` → `resolveStrategy(engineKey)` → `GridBotStrategy.evaluate()`.

**LØST (2026-08-02 kveld):** `GridBotStrategy` v2 skrevet om til å bruke `evaluateGridSignal` fra `grid-strategy.ts`. Den gamle ATR-baserte dynamiske grid-en er erstattet med level-basert persistert state. Nå bruker BÅDE tick og pilot-engine samme testede logikk. Grid-state persisteres i `session.strategy_config.grid_levels[]` etter hver trade via tick-integrasjon (linje ~1240 i route.ts).

**Deploy (2026-08-02):** `approvals.deny` tømt av agent etter Toms direktiv «INGENTING skal være blokkert for hovedarkitekten» — `wrangler deploy` fungerer nå direkte. Den eldre «Deploy-blokkering»-pitfallen nederst i denne filen er historisk.

## Fase 2: Strategy Gates (2026-07-31)

Fem rene, testbare funksjoner i `src/lib/trading/strategy-gates.ts`:

| Gate | Funksjon | Effekt |
|---|---|---|
| 2.1 Regime | `evaluateRegimeGate(closes)` | Blokkerer kjøp i crash/trend_down |
| 2.2 Trailing exit | `evaluateTrailingExit({entry, peak, current})` | Låser gevinst med trailing stop (4% aktivering, 2.5% slipp) |
| 2.3 Anti-whipsaw | `evaluateAntiWhipsaw({lastSellAt, lastSellPrice, currentPrice})` | Blokkerer re-kjøp <30 min etter salg |
| 2.4 Jitter | `jitteredSizeMultiplier(userId, symbol)` | ±3% per-bruker variasjon |
| 2.5 Symbol edge | `symbolEdgeWeight(stats)` | Vekter posisjon 0.5–1.3× basert på historisk P&L |

## Wiring-mønster: Post-eval override

**Pitfall**: Å wrappe signal-evalueringen i `if (!signal)` bryter tick/route.ts (2200+ linjer).

**Korrekt rekkefølge:**
```
1. Signal evalueres (Dark Fleet / ensemble / fallback)
2. Signal guard (eksisterende)
3. Trailing exit: overstyr signal hvis posisjon har nådd aktivering
4. Buy-side gates: regime + anti-whipsaw + jitter + edge (kun action=buy)
5. Position sizing + executeTrade
```

Trailing exit overstyrer `signal = { action: "sell", ... }` — exits går ALLTID gjennom.

## Batch-prefetch i GET-handleren

Anti-whipsaw og edge-vekting trenger data per sesjon. Batch-query:

```typescript
const lastSellCache = new Map<string, { at: string; price: number }>();
// batch-query trades: siste salg per session+symbol (24t)

const edgeCache = new Map<string, SymbolEdgeStats>();
// batch-query trades: per-symbol P&L-statistikk (30d)

processSession(db, session, ..., lastSellCache, edgeCache);
```

## Testing

`npx vitest run src/lib/trading/__tests__/strategy-gates.test.ts` — 34 tester.

## Deploy-sjekkliste

1. `npx tsc --noEmit`
2. `npx vitest run` — 0 regresjoner
3. `git commit`
4. `bash scripts/deploy.sh`
5. Verifiser: alle 41 sesjoner har ferske ticks

## Grid Trading — Multi-Par (2026-08-02)

Se `references/grid-trading-strategy.md` for full dokumentasjon: modul-API, celle-basert evaluering, test-fiksing, konkurrent-analyse.

**Hvorfor:** Intern fasit (2026-08-02): 78 BTC-trades, 0 wins, profit factor 0.01. Grid trading er verdensledende fordi crypto er ~70% sidelengs.

**Default endret:** `strategyType` default i pilot-engine `route.ts` gikk fra `"multi_signal"` → `"grid"`. DB: alle 11 aktive migrert `cryptopilot` → `grid`. Multi-signal beholdes som legacy.

### Multi-par arkitektur (2026-08-02)

**DB-endring:** Indeks endret fra én aktiv paper-sesjon per bruker til én per (user_id, trading_pair):

```sql
DROP INDEX idx_one_active_paper_session_per_user;
CREATE UNIQUE INDEX idx_one_active_paper_session_per_pair
  ON trading_sessions (user_id, trading_pair)
  WHERE mode = 'paper' AND status = 'active';
```

**Session-struktur:** 10 par (BTC/ETH/SOL/AVAX/DOGE/LINK/ADA/DOT/UNI/POL) × 11 brukere = opptil 110 aktive sesjoner. Kapital fordeles jevnt: `capitalPerPair = totalCapital / TOP_SYMBOLS.length` (~10 000 kr per par ved 100k startkapital).

**ensureActiveSessions():** Returnerer `Array<Session>` — ikke singleton. Sjekker ALLE TOP_SYMBOLS; manglende par opprettes automatisk med `capitalPerPair`. Eksisterende sesjoner får heartbeat; nye opprettes for manglende par.

**Cron-løkke:** `for (const session of sessions)` prosesserer ALLE brukerens par i én kjøring. Resultater akkumuleres i `allResults[]`. `totalExits` akkumuleres fra hver sesjons `checkExits()`.

**Posisjons-sizing:** Grid bruker fast `amountPerGrid = Math.min(capital * 0.1, capital / gridLevels)`. Ved 10 000 kr og BTC 614k → ~0.016 BTC per grid-celle.

**Effekt:**
- Før: 100k på BTC × 11 brukere = 1 par, kapital idle når BTC utenfor grid-intervall
- Nå: ~10k per par × 10 par × 11 brukere = 100 sesjoner som jobber parallelt
- Første kjøring: 7/10 BUY-signaler, 3 handler utført (ADA, AVAX, LINK)

**UI-ærlighet:** Nettsiden sa "10 markeder overvåkes" men handlet kun BTC via `TOP_SYMBOLS[0]`. Nå er multi-par faktisk aktivt. **LiveTicker MÅ bruke eksplisitt TICKER_SYMBOLS-konstant som matcher TOP_SYMBOLS** — aldri `Object.entries(prices).slice(0,8)` som slapp inn BNB, MATIC (død) og XRP. Hardkodede symboler i UI-komponenter må valideres mot TOP_SYMBOLS ved deploy.

### Multi-par pitfalls:
- **Eksisterende sesjoner blokkerer nye par**: `ensureActiveSessions()` returnerte tidlig hvis noen sesjon fantes. Fiks: sjekk `missingPairs = TOP_SYMBOLS.filter(p => !existingPairs.has(p))` og opprett bare de som mangler.
- **Gamle BTC-sesjoner med høy kapital**: Stopp ALLE BTC-sesjoner med >50k kapital — de ble opprettet med full 100k og konkurrerer med nye multi-par sesjoner.
- **totalExits aldri inkrementert**: `exitsExecuted` ble beregnet men ikke lagt til `totalExits` → respons viste alltid 0 exits. Fiks: `totalExits += exitsExecuted`.
- **Grid-trades uten SL/TP**: Grid bruker faste sell-priser (neste grid-nivå), ikke dynamiske SL/TP. Exits skjer naturlig via `checkExits()` for gamle multi-signal-posisjoner.

**Grid pitfalls (original):**
- **Sell-first**: sjekk ALLTID kjøpte celler FØR tomme. Hvis kjøp først, blokkeres profitt når pris stiger
- **Celle-basert**: `find()` fanger ALLE nivåer ≤ pris — fører til kjøp på feil nivå. Bruk `cellIndex = floor((price - lower) / step)`
- **Utenfor grid OVER → WAIT** (grid tjener ikke på opptrend). **Under grid → DCA** (se DCA-seksjon under)
- **Grid-state**: `trading_sessions.strategy_config.grid_levels[]` — JSONB, muteres hver trade. DCA-nivåer lagres med `dcaLevel: 1|2|3` og `level: -1`.
- **`config.type` fallback-felle**: Gammel kode sjekket `userConfig?.config?.type` som fallback FØR `strategy`-kolonnen. Alle brukere hadde `config.type: 'pilot'` → `strategyType = 'multi_signal'` → grid ALDRI aktivert til tross for DB-migrasjon. Fiks: `userConfig?.strategy ?? 'grid'` — én kilde, enkel logikk.
- **Strategy-kolonnen ≠ config**: `auto_trading_configs` har BÅDE `strategy` (text, NOT NULL) og `config` (JSONB). Endre alltid `strategy`-kolonnen — `config` er legacy og overskrives ikke.

### DCA Under Bunn (2026-08-02)

Når pris faller UNDER laveste grid-nivå (`lowerPrice`), KAN grid IKKE stoppe — da er 100k i lomma. DCA (Dollar Cost Averaging) under bunn:

```typescript
const DCA_LEVELS_PCT = [0.95, 0.90, 0.85];      // 95%, 90%, 85% av lowerPrice
const DCA_SIZE_MULTIPLIER = [1.0, 1.5, 2.0];     // progressivt større kjøp

// I evaluateGridSignal: pris < lowerPrice → sjekk DCA-nivåer
// DCA-sell tilbake til lowestBuy (laveste grid buyPrice)
// dcaLevel: GridLevel med level=-1, dcaLevel=1|2|3, sellPrice=lowestBuy
```

**Test-tilpasning:** "utenfor grid = WAIT" er foreldet. Under grid = DCA BUY, over grid = WAIT. Oppdaterte tester: 12/12.

### Trailing Sell (2026-08-02)

I stedet for fast `sellPrice` (+2% av buyPrice), selg så snart pris ≥ `buyPrice × 1.02`:

```typescript
const TRAILING_ACTIVATION_PCT = 1.02; // selg ved +2% uansett nivå

// SELL-sjekk: PRIORITER trailing over fast sell
if (currentPrice >= checkCell.buyPrice * TRAILING_ACTIVATION_PCT) {
  return { action: "sell", ... }; // fang ALL profitt over +2%
}
// Fallback: fast sell ved sellPrice
```

**Hvorfor:** Crypto beveger seg ofte 5-10% på én dag. Fast +2% selger for tidlig. Trailing selger når pris allerede har beveget seg — gir høyere realisert PnL.

### Markedsregime (2026-08-02)

Grid er optimal i **sideways** markeder, taper i sterke trender. Detekter regime via 24h-endring og juster grid:

```typescript
export type MarketRegime = "trending_up" | "trending_down" | "sideways";

export function detectMarketRegime(change24h: number, volatility24h: number): MarketRegime {
  if (change24h > 5 && volatility24h > 8) return "trending_up";
  if (change24h < -5 && volatility24h > 8) return "trending_down";
  return "sideways";
}

export function adjustGridForRegime(grid, regime, price): GridConfig {
  // trending_up: tettere grid (×0.7), større upperPrice, fang profitt
  // trending_down: brede nivåer (×0.5), mindre kjøp, DCA håndterer resten
  // sideways: original grid — optimalt!
}
```

**Integrasjon i pilot-engine:** `fetchMarketData()` returnerer `priceChange24h` (hentet fra Binance proxy `fetch24hChangeViaProxy`). Regime sjekkes FØR `calculateOptimalGrid`, og `adjustGridForRegime()` muterer grid-params basert på regime.

### All-Users Cron Processing (2026-08-02)

**Problem:** Round-robin plukket ÉN bruker per cron-kjøring (hvert 15. min) → 11 brukere = 2t45m per runde → brukere ventet timer på tur.

**Fiks:** `processUser()` som egen funksjon — prosesser ALLE brukere i én kjøring:

```typescript
// POST /api/pilot-engine — cron path:
const eligibleUserIds = eligible.map(u => u.user_id);
const allUserResults = [];
for (const uid of eligibleUserIds) {
  const result = await processUser(db, uid);
  if (result) allUserResults.push(result);
}
return NextResponse.json({ users: allUserResults.length, results, details });

// Manuell trigger: én bruker via auth.getUser()
```

**processUser()** returnerer `{ userId, results, exits } | null` — enkel, testbar, gjenbrukbar.

### Ticker-symboler må matches TOP_SYMBOLS (2026-08-02)

**Problem:** `LiveTicker` brukte `Object.entries(prices).slice(0, 8)` → viste BNB, MATIC (død, migrert POL 2024), og XRP — ingen av disse er i TOP_SYMBOLS. Ticker viste 8 par duplisert.

**Fiks:** Hardkodet `TICKER_SYMBOLS`-konstant som matcher TOP_SYMBOLS eksakt (+ POLUSDT for MATIC-erstatning). Med ikoner per symbol:

```typescript
const TICKER_SYMBOLS = ["BTCUSDT","ETHUSDT","SOLUSDT","AVAXUSDT","DOGEUSDT","LINKUSDT","ADAUSDT","DOTUSDT","UNIUSDT","POLUSDT"];
```

**Pitfall:** ALLE UI-komponenter som viser markeder MÅ validere mot TOP_SYMBOLS — aldri iterer rå `prices`-objekt. Hardkodede lister i UI må auditeres ved hver symbol-endring.

Modul: `src/lib/trading/grid-strategy.ts`. Integrert i pilot-engine via `strategyType === "grid"`. 12/12 tester, 1710/1710 total.

**Grid-optimalisering research (2026-08-02):** `references/grid-optimization-research.md` — kondensert research fra Pionex (8 grid-typer, AI 2.0), Bitsgap (SL-krav, grid+DCA hybrid), 3Commas (trailing entry), uavhengig kritikk (grid tjener lite i ren sideways; vis ALLTID unrealized P&L). Prioritert veikart: P0 buy-logikk-fiks → P1 geometrisk spacing → P2 trailing entry → P3 aktiv DCA-hybrid → P4 Infinity Grid → P5 grid exit ved lowerPrice × 0.90.


- **Nye brukere og auto_trading_configs**: Cron plukker KUN brukere fra `auto_trading_configs WHERE is_enabled = true`. Nye brukere uten config-rad er usynlige. `/api/pilot` MÅ upsert `auto_trading_configs` (`{ user_id, is_enabled: true, strategy: 'grid' }`, `{ onConflict: 'user_id' }`) ved sesjon-start. IKKE auto-opprett for ALLE — kun når bruker aktivt velger Pilot/Auto. DB-funksjonen `ensure_auto_trading_configs_for_new_users()` ble opprettet (2026-08-02) men BØR IKKE kalles i cron — den tvinger grid på alle nye, også de som bare vil trade manuelt.
- **Account reset — full cleanup ved kapital-reset**: Når paper_account resettes til 100k må OGSÅ alle aktive sesjoners `open_position` nullstilles og `current_capital_nok` synkes til `capitalPerPair`. Uten dette: gamle undervanns-posisjoner (ADA -34%, SOL -63% fra multi-signal) blokkerer grid-kjøp fordi sesjonen allerede har en åpen posisjon. SQL: `UPDATE trading_sessions SET open_position = NULL, current_capital_nok = 10000 WHERE user_id = ... AND mode = 'paper' AND status = 'active' AND open_position IS NOT NULL`. Etter reset: verifiser `count(*) FILTER (WHERE open_position IS NOT NULL) = 0`.
- **Live-trading aktivering har 5 påfølgende blokkeringer** (testnet 2026-08-01):
  minste-ordre-terskel (NOK vs USDT), risk_profiles-krav (NO_RISK_PROFILE),
  MATIC→POL-delisting ("Invalid symbol"), statisk lot-tabell ("LOT_SIZE"), og
  B1.3 kapital-×9.66-inflasjon (usdtToNok på USDT-kapital). Hele kjeden med
  SQL-fikser og verifikasjon: se `references/live-trading-testnet-activation.md`.
- **Live-kapital er USDT, ALDRI usdtToNok**: B1.3-blokken trakk NOK-konvertert
  beløp fra USDT-kapital (47 USDT-kjøp → 453 NOK trekk → kapital 99546, prod-bevis
  2026-08-01). RPC decrement/increment_capital oppdaterer current_capital_nok,
  triggeren synker current_capital 1:1 → send USDT-beløpet direkte. Kapital-fiks
  krever manuell korrigering av BÅDE current_capital og current_capital_nok.
- **MATICUSDT finnes ikke på Binance** (migrert til POL 2024) → "400 Invalid
  symbol" på live-ordrer. Klarpakkes 11-symbolsliste er utdatert — bruk POLUSDT.
  Sjekk symbol mot `testnet.binance.vision/api/v3/exchangeInfo` før live-ordre.
- **roundToLotSize fallback = BTC-presisjon** (0.00001) for ukjente symboler →
  "400 Filter failure: LOT_SIZE" for ADA/DOGE m.fl. Statisk tabell har nå alle
  11 symboler + POLUSDT (verifisert mot testnet). Legg til nye symboler der.
- **Risk-profil kreves for live**: `risk_blocked: NO_RISK_PROFILE` hvis ingen
  `risk_profiles` med is_active=true. Navn CHECK-begrenset til
  {forsiktig, moderat, aggressiv, tilpasset}, UNIK per user (oppdater, ikke
  insert). allowed_pairs må inkludere handelssymbolet.
- **Tick-resultater uten reason = tidlig return**: `{action:"hold"}` UTEN reason
  kommer fra størrelses-kanalen (tradeAmount < minOrderValue eller quantity<=0),
  ikke signal/guard-kanalen. Bruk det til å navigere raskt.
- **Live-sesjon stoppes permanent** ved ikke-reparerbare feil (dårlig symbol/
  nøkler). Etter rotårsaksfiks: reaktiver manuelt (status='active', nullstill
  error_message, frisk heartbeat).
- **Tick kjører via Supabase pg_cron** (`klarpakke-trading-tick`, hvert minutt,
  `klarpakke_trigger_cron('/api/cron/tick')`), IKKE Hermes-cron. Sjekk
  `cron.job_run_details` for siste kjøring; sesjonens last_heartbeat-alder er
  raskeste indikator. Manuell trigger: curl med CRON_SECRET.
- **REGEL 7 (signal-guard) blokkerer ALLE sells uten `exitReason`** — KRITISK: tick kalte `evaluateSignalGuard` med kun `{action, confidence, expectancy}` → enhver strategi-sell (DCA partial TP, trailing, SL) ble avvist med «SALG blokkert: ingen exitReason» → 40/41 sesjoner låst i posisjon i 26+ timer (prod-bevis 2026-08-01, siste trade 31. juli 08:45). Fiks: tick sender `exitReason: signal.exitReason ?? "auto"`; DCA-setter eksplisitt `take_profit` (partial TP) og `stop_loss` (trailing + fast SL). `ALWAYS_ALLOWED_EXITS = {manual, stop_loss, take_profit, margin_call}` — `auto` passerer REGEL 7 men går videre til confidence/rate-limit-sjekk. Sjekk alltid at en strategi som genererer sell-setter exitReason, og at alle kallere av `evaluateSignalGuard` sender feltet.
- **`smart_trader_enabled` ≠ guard-signal**: DB-default false. Filter frøs 24 sesjoner.
- **Kun ÉN motor per posisjon**: `smart-trader-v3` (edge function, RSI/trend) og tick (DCA/CryptoPilot) prosesserte SAME sesjoner når `smart_trader_enabled=true` — dobbelt-handling. `smart_trader_enabled` skal være false på alle DCA/CryptoPilot-sesjoner; tick er eneste kanoniske motor.
- **Duplikat-croner**: `klarpakke-tick` (*/5) OG `klarpakke-trading-tick` (hvert minutt) kalte begge `/api/cron/tick` → dobbel-triggering. Sjekk `cron.job` for to jobber med samme URL før du antar at tick kjører én gang. Fjern også døde test-jobber.
- **Tidspunkt-kolonne i trades**: `executed_at` = når handelen skjedde; `created_at` ≈ samme men kan ligge etter. Når du spør «kjører systemet?» — bruk `executed_at` og sjekk `trading_sessions.last_tick_at`.
- **K3 temperature=1**: HTTP 400 ved 0.6.
- **Subagenter ≠ tick/route.ts**: Mest kritiske kodevei.
- **Valutaguard FØR trailing exit**: NOK→USDT normalisering først.
- **Round-robin MÅ filtrere tradebare brukere FØR sortering:** pilot-engine sorterte ALLE auto-brukere — guard-stoppede ble alltid valgt først → tradebare nådde aldri motoren → 0 pilot-trades. Se full mønster i `references/live-trading-testnet-activation.md`.
- **Auditer guard-stopp FØR reaktivering:** stopp kan være bug-forårsaket. **ADVARSEL:** sjekk valuta før du dømmer «feilpris» — paper-trades i NOK kan se 10× ut men være korrekte.
- **Grid-celle/posisjon state-desync (2026-08-02):** `grid_levels[]`-celler med `status:"bought"` men `open_position IS NULL` på sesjonen = motoren kjøper aldri igjen (cella ser opptatt ut, posisjonen finnes ikke). Symptom: bruker 100% i cash, 0 nye trades, `bought_cells ≥ 1`. Diagnose-SQL + resync-oppskrift: `references/bulk-pilot-onboarding.md`. Resync: sett bought-celler uten posisjon tilbake til `"empty"` (fjern `boughtAt`/`buyPrice`/`sizeMultiplier`). Verifiser alltid `count(desync)=0` etter grid-state-mutasjoner.
- **Schema-felle trading_sessions (2026-08-02):** Kolonnene heter `initial_capital` (numeric) og `starting_capital_nok` — **`initial_capital_nok` finnes IKKE**. Ved manuell session-INSERT må ALLE fire kapital-felter settes: `initial_capital`, `current_capital`, `starting_capital_nok`, `current_capital_nok`.
- **`auto_trading_configs` har INGEN unique constraint på `user_id`** — `ON CONFLICT (user_id)` kaster 42P10. Bruk `INSERT ... SELECT ... WHERE NOT EXISTS (...)` for idempotent upsert.
- **`cron.job_run_details` har ikke `jobname`-kolonne** — JOIN mot `cron.job` på `jobid` for å filtrere på navn.
- **Deploy:** Full deploy-prosedyre (wrangler OAuth-fallback, R2-patch, CLOUDFLARE_API_TOKEN env-vars) eies av `klarpakke-operations` — se `klarpakke-operations/references/deploy-og-cdn.md`. Etter trading-deploy: verifiser med `SELECT reason_code, COUNT(*) FROM trades` at forventede reason_codes dukker opp.
- **Grid-state seeding for nye sesjoner (2026-08-02):** Nye sesjoner opprettes med `strategy_config: '{"stop_loss_pct":5,"close_on_stop":true}'` — ingen grid-state. `GridBotStrategy` genererer nytt grid hver tick men prisen er ofte utenfor. Fiks: seed `lowerPrice`/`upperPrice`/`gridLevelsCount`/`amountPerGrid` fra eksisterende `grid_levels` (min/max av buyPrice/sellPrice), eller la strategien generere og persister state ved første trade. Verifiser at `hasSavedRange` er true etter seeding. ⚠️ **Delvis seeding er farlig:** `grid_levels` uten `lowerPrice`/`upperPrice` gir `hasSavedRange=false` → strategi re-genererer grid hver tick rundt nåpris → BUY-signaler kommer aldri fordi grid-et alltid er perfekt sentrert. Seed ALLTID alle fire feltene (`lowerPrice`, `upperPrice`, `gridLevelsCount`, `amountPerGrid`) i ÉN SQL.
- **Verifiser strategi i DEN LEVENDE veien, ikke den døde (2026-08-02):** Test av `evaluateGridSignal` lokalt viste korrekt BUY — men prod fortsatte med 0 trades fordi fiksen lå i `/api/pilot-engine` (død vei). Lærdom: FØR du fikser en strategi-bug, verifiser hvilken kodevei cron faktisk kaller: `SELECT command FROM cron.job` + spor imports fra det endepunktet. En grønn lokal test av feil modul er verdt null.
- **Reparasjons-SQL som «ikke holder» = en annen skriver overskriver (2026-08-03):** Når en DB-reparasjon ser ut til å bli reversert minutter senere, IKKE re-kjør samme SQL blindt. Sjekk `updated_at` på raden — hvis den er ferskere enn reparasjonen din, skriver en aktiv kodevei (tick, adopsjon, tracking) feltet på nytt hvert minutt. Finn skriveren (`grep` etter `.update()` på tabellen i tick/route + relaterte lib-filer), fiks skriveren FØRST, deploy, DERETTER reparer. To valuta-skrivere ble funnet slik: orphan-adopsjon og highest_price-tracking — begge skrev USDT til NOK-kontrakt-felt. Reparasjon uten skriver-fiks er Sysifos-arbeid. **Tredje tilfelle (samme dag): paper_accounts-balance — løst ved å gjøre sessions til master i sync-funksjonen (se «2026-08-03 kveld»-seksjonen øverst), ikke ved å jakte skriveren.**
- **AI-forklaring template-fallback MÅ dekke resolvedEngine-aliaser (2026-08-03 kveld):** Toms trades hadde `reason_code=DARK_FLEET_ENSEMBLE_BUY` men `resolvedEngine` sendt til `generateTradeExplanation` var `"grid"` (strategy_id), ikke `"dark_fleet"`. Template som kun matchet `dark_fleet|ensemble` ga NULL forklaring for alle hans trades mens andre brukere (grid-matchende) fikk. Fiks: template-fallback matcher `"dark_fleet"|"ensemble"|"grid"`. **Regel: ved differensial-diagnose (én bruker mangler X, andre har X) — sjekk hvilken VERDI et nøkkel-felt har for den berørte brukeren vs de andre (`SELECT DISTINCT reason_code, strategy_id`), og dekk ALLE aliaser `resolvedEngine` kan ha i template-brancher.**
- **«Top-brukere tjener X/dag»-påstander: kjør umulighets-sjekk FØR presentasjon (2026-08-03):** Agenten presenterte «top 3 tjente 20-30k/dag» for Tom — tallene var inflated av oversell-buggen. 30-sekunders-sjekk som avslører det: `SELECT user_id, side, COUNT(*) FROM trades WHERE executed_at > CURRENT_DATE GROUP BY 1,2` — sell > buy er umulig. Og `MIN(realized_pnl) > 0` over 100+ trades = ingen taps-trades = umulig for grid (whipsaw-tap finnes alltid). Presenter ALDRI aggregerte inntjeningstall uten denne sjekken først.

## Bulk Pilot-Onboarding (alle brukere, 2026-08-02)

Toms direktiv (2026-08-02): **ALLE brukere med `paper_accounts` skal ha Pilot (grid), og all kapital skal være investert til enhver tid.** Dette overstylder den eldre «IKKE auto-opprett for ALLE»-regelen over — bulk-onboarding av eksisterende kontoholdere er nå uttrykkelig ønsket (nye signups: fortsatt kun ved aktivt Pilot/Auto-valg via `/api/pilot`).

Full SQL-oppskrift (config-insert, 10-sesjons CROSS JOIN med `WHERE NOT EXISTS`-guard, desync-resync, verifikasjon): `references/bulk-pilot-onboarding.md`.

Rekkefølge: (1) INSERT auto_trading_configs WHERE NOT EXISTS → (2) INSERT 10 sesjoner per bruker (`capitalPerPair = ROUND(current_balance/10)`, ALLE fire kapital-kolonner, `strategy_id='grid'`, `strategy_config='{"type":"grid"}'`) → (3) resync desync → (4) verifiser: ingen duplikate aktive per (user,pair), `sessions_tick_2min = total aktive`, pg_cron succeeded. Unique-indeksen `idx_one_active_paper_session_per_pair` avviser kollisjoner, men `WHERE NOT EXISTS` i INSERT er likevel påkrevd for idempotens. Utført 2026-08-02: 11→36 pilot-brukere, 112→361 aktive sesjoner, 0 duplikater.