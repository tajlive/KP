# Research Og Konkurrent Analyse

> Flyttet fra SKILL.md for å holde hovedfokus på prosedyre.

## 🏆 Konkurrent-grid-faktum: limit-ordre-modellen (2026-08-03, web-verifisert)

**Tom ba om «invester HELE kapitalen». Før du «fikser» grid til å kjøpe alt umiddelbart — stopp og husk hva konkurrentene faktisk gjør:**

Pionex (3M+ brukere), Bitsgap, 3Commas deployer all kapital **som limit-ordre i ordreboka med en gang** — 8 kjøpsordre under pris, 8 salgsordre over. Kapitalen er «investert» fordi den er RESERVERT i ordre, men brukeren kjøper IKKE coin før prisen faller til nivået. De market-kjøper ALDRI alt på nåværende pris — det ville vært å kjøpe på topp.

**Klarpakke-ekvivalent:** Grid vår er allerede korrekt (kjøper når pris treffer nivå = fylt limit-ordre). Det som mangler er PRESENTASJON: 96 000 NOK vises som «cash som ikke gjør noe» i UI, mens konkurrentene viser det som «plassert i grid-ordre». Det er en UI/forklarings-fiks, ikke en strategi-fiks. IKKE implementer «kjøp alle nivåer under pris i ett market-kjøp» — det er verre enn konkurrentenes modell. (I sesjonen 2026-08-03 startet agenten et slikt «deploy-all»-market-kjøp-design før konkurrent-sjekken — Tom avbrøt. Lærepenge: konkurrent-research FØR strategi-endring, ikke etter.)

**Ny kapital (innskudd):** Ingen av konkurrentene re-kalibrerer automatisk; brukeren starter ny bot eller øker beløpet manuelt. For Klarpakke: grid re-kalibrerer kun ved breakout — ny kapital deployes ikke uten eksplisitt handling.

**Prosess-regel (2026-08-03, Tom-korreksjon):** Ved «gjør strategien mer aggressiv/ambisiøs»-forespørsler (invester alt, større posisjoner, raskere fills): **konkurrent-research FØR design, ikke etter**. Sesjonen bevis: agent designet et «deploy-all market buy»-system og var i ferd med å implementere det da Tom avbrøt — web-research etterpå viste at Pionex/Bitsgap/3Commas ALDRI market-kjøper, de bruker limit-ordre-reservasjon. Hadde research kommet først, ville designet vært riktig med en gang. Minimum før strategi-design: 1 web_search på «hvordan gjør Pionex/Bitsgap X». En grønn test-suite redder deg ikke fra et feil design.


## 📢 Bruker-forklaringskrav (2026-08-03, Toms direktiv — GJELDER ALL STRATEGI-UI)

**«Dette må forklares til alle brukere, til og med jeg forsto ikke dette!!!»**

Enhver trading-mekanisme som påvirker brukerens penger MÅ ha en bestemor-forklaring i UI-et FØR den rulles ut. Konkret kravliste for grid/kapital-deployment:
1. Hvor er pengene mine NÅ? (cash vs i posisjon vs «plassert i ordre»)
2. Når kjøper boten? (når prisen TREFFER nivået — ikke tilfeldig)
3. Hva skjer hvis prisen stuper? (DCA under bunn + 25% katastrofe-SL)
4. Hva skjer med nye innskudd? (deployes ikke automatisk — forklar hvordan)
Tone: «bestemor-nivå» (emojis, tabeller, metaforer — se user-profil). En feature uten forklaring er ikke ferdig. Dette er et hardt gate-krav ved alle trading-endringer: forklaringstekst (i18n, no+en) hører til samme commit som mekanikken.

**Referanse-implementasjon (2026-08-03, `PortfolioDashboard.tsx` porteføljekort):** Kapital-fordelings-chips under balanse-tallet: 🟢 `X NOK i posisjoner` (emerald-prikk), 🔵 `X NOK i aktive grid-ordre` (sky-prikk + tooltip: «Pengene dine er plassert som kjøpsordre i grid-botten. De kjøper automatisk når prisen faller — akkurat som Pionex/Bitsgap. Du trenger ikke gjøre noe.»), ⚪ `X NOK ledig`. Under: 💡-forklaringstekst som svarer på «hvor er pengene» + «hva skjer med nye innskudd». Beregning: `investedInPositions = Σ|position.value|`; `gridReserved = isGridSession ? displayBalance − investedInPositions : 0`; `freeCapital = resten`. `isGridSession` = `strategy_id==='grid'` ELLER `strategy_config.grid_levels != null` (grid_levels-beviset er mer robust enn strategy_id alene). Plasser beregningen ETTER `positionList` (declaration-order-felle: `const` brukt før deklarasjon = TS2448). `formatNOK(value, locale)` tar locale som string andre arg.

**`GridSignal.allBuyLevels` (2026-08-03):** feltet finnes i interfacet (`grid-strategy.ts`) med alle empty nivåer under pris — men er IKKE wired i execution og SKAL ikke brukes til market-kjøp av alle nivåer (se «Konkurrent-grid-faktum» over: limit-ordre-modellen er korrekt; deploy-all-via-market-buy ble avbrutt av Tom). Feltet er der for en eventuell fremtidig «fyll alle nivåer i samme tick ved prisfall»-semantikk — aldri for å kjøpe alt på nåpris.

## 🚀 Deploy-prosedyre

> **FLYTTET:** Deploy-prosedyren (wrangler OAuth-fallback, R2-patch, token-typer, auth-feilklassifisering) eies av `klarpakke-operations` — se `klarpakke-operations/references/deploy-og-cdn.md`.

## 📡 Bruker-spesifikk overvåkning via cronjob (2026-08-02)

For aktiv testperiode av en spesifikk brukers konto: opprett en Hermes `cronjob` (ikke pg_cron) med self-contained prompt som kjører `mcp__supabase__execute_sql`-spørringer mot: trades siste 60 min, blokkeringer (`signal_guard_blocked`/`risk_blocked`/`regime_gate_blocked`/`grid_below_min_order`), tick-helse (`last_tick_at` < 3 min), balanse, realized P&L. Rapporter 🟢/🟡/🔴 med konkret aksjon. Desktop-økter: `deliver: local` (output lagres, ikke levert live — CLI/TUI har ingen delivery-kanal). Toms jobb: `b33953763d6c` (hver time, user 0dd08529).

**`PAIR_NOT_ALLOWED` har TO kilder — sjekk begge (2026-08-02):** (1) `auto_trading_configs.config.markets` (JSONB-array) begrenser hvilke par som handles — Tom hadde 5 par i config men 10 sesjoner → 2 par blokkert. Ved sesjons-utvidelse MÅ `config.markets` oppdateres: `jsonb_set(config, '{markets}', '[...alle par...]')`. (2) **Risk-validatorens kanoniske liste** `PAPER_TRADING_UI_SYMBOLS` i `src/lib/trading/paper-ui-symbols.ts` — `resolveRiskLimits()` (paper) UNIONER profilens `allowed_pairs` med denne listen. Listen manglet UNIUSDT/POLUSDT (og hadde død MATICUSDT) → 112 `risk_blocked: PAIR_NOT_ALLOWED` på én time SELV ETTER at config.markets var utvidet. Ved nytt standard-par: legg til i ALLE TRE listene — `TOP_SYMBOLS`, `TICKER_SYMBOLS` og `PAPER_TRADING_UI_SYMBOLS` — de må holdes i sync. Symptom-skille: `trading_logs` med `action='risk_blocked'` og `details.reason='PAIR_NOT_ALLOWED'` = kilde (2); kjøp som aldri når risk-validator i det hele tatt = kilde (1).

## Valuta-kart (KRITISK — les før du dømmer «feil pris»)

| Sted | Valuta | Bevis |
|---|---|---|
| `coin_prices.price` (DB) | **NOK** | BTC ≈ 606 000, ADA ≈ 1.82 |
| `fetchMarketData()` / Binance-proxy | **USDT** | BTC ≈ 63 000 |
| `FALLBACK_PRICES` (pilot-engine) | **USDT** | BTCUSDT: 60000 |
| `trades.price` / `total_value` / `fee` (paper) | **NOK** | executeTrade konverterer via `usdtToNok` |
| `open_position.entry_price` (paper) | **NOK** | Lagres etter valuta-guard |
| `session.capital` i pilot-engine | **NOK** | = `current_capital_nok`; deles på `getNokUsdtRate()` (~9.6) for USDT-sizing |

Grid-beregninger (`calculateOptimalGrid`, `evaluateGridSignal`) kjøres i **USDT** (Binance-pris), men `amountPerGrid` er NOK — sizing gjøres om i route.ts via `getNokUsdtRate()`. Bland aldri de to domenene uten eksplisitt konvertering. `trades`-kolonner: `trading_pair` (IKKE `symbol`), `total_value` (IKKE `total_amount`).

**`coin_prices`-schema-felle (2026-08-03):** Kolonnen `name` er `NOT NULL` — INSERT uten den feiler med `23502: null value in column "name"`. Riktig form: `INSERT INTO coin_prices (name, symbol, price, created_at) VALUES ('UNI', 'UNIUSDT', 39.18, NOW()) ON CONFLICT (symbol) DO UPDATE SET price = EXCLUDED.price`. `name` = kort basis-navn ('BTC', 'UNI', 'POL'), ikke fullt navn. Tabellen er også **visnings-cache, ikke trading-kilde**: radene kan være uker gamle (oppdaget 2026-08-03: priser fra 19. juni) — tick henter live-priser fra Binance-proxy via candles, ikke fra coin_prices. Manglende symbol her brekker KUN dashboard-prising (posisjonsverdi/P&L-visning), aldri selve tradingen. Oppdater med live-pris × NOK-rate (~9,49) når du legger til nye par.

### ⚠️ Valuta-dualitet i open_position — IKKE en bug (2026-08-03, verifisert)

**Felle:** Rå DB-lesing av `open_position.entry_price` for BTC viser ~602 000 (ser "korrupt" ut vs USDT-marked ~63k) — og ALT-coins (ADA 0,07, AVAX 2,37) ser USDT-lagret ut. Første instinkt: migrer alt til USDT. **FEIL.**

**Fasit:** DB-kontrakten er NOK for paper-posisjoner — håndhevet av DB-guard `fn_guard_session_position_symbol` (BTC krever entry > 100 000, ETH 5 000–50 000, SOL 100–2 000 — alle NOK-intervaller). En UPDATE til USDT-verdier FEILER med `open_position entry_price X is not valid for BTCUSDT`. Tick kaller `normalizePositionPricesToUsdt()` (position-currency.ts) per tick: deler prisfelt på `usdtNokRate` KUN når `value > currentPriceUsdt × 2.5`. BTC/SOL i NOK konverteres korrekt; alt-coins i USDT forblir urørte fordi de er < 2,5×-terskelen. Exit-logikk (trailing-TP, SL) opererer dermed alltid i USDT — korrekt.

**Regler ved mistenkt valuta-korrupsjon:**
1. Les DB-guard (`SELECT prosrc FROM pg_proc WHERE proname='fn_guard_session_position_symbol'`) FØR du erklærer data korrupt — guard-intervallet AVSLØRER hvilken valuta DB forventer.
2. Simuler ALDRI konvertering i rå SQL med fast rate (f.eks. `/9.6`) på tvers av par — BTC/SOL er NOK, alt-coins er USDT; blind divisjon gir 2 500% falske gevinster.
3. Reell P&L for NOK-lagrede posisjoner: `(currentUsdt - entry/9.49) / (entry/9.49)` — men bruk helst kode-veien (`normalizePositionPricesToUsdt`) som referanse, ikke SQL.
4. Ved UPDATE av entry_price: husk at guard blokkerer USDT-verdier for paper — enten hold NOK-kontrakten (anbefalt) eller dropp/endre guard først (krever Toms godkjenning, arkitektur-sannhet-territorium).


## 🧠 LLM-genererte per-trade forklaringer (2026-08-03, IMPLEMENTERT — verdensledende)

**Beslutning:** Tom ba om AI-forklaringer på hvert trade («moderne og spennende for enkle forklaringer»). Konkurrent-research: INGEN av Pionex/3Commas/Bitsgap/Cryptohopper har per-trade AI-forklaringer i sanntid. Bybit TradeGPT er en chat brukeren må spørre selv (generisk, kjenner ikke brukerens trades). Zella/TradeZella analyserer post-trade (journaling), ikke live. **Vi er eneste med automatisk norsk per-trade-forklaring.**

**Arkitektur (commit `d10d3ccd2`):**
1. **Service:** `src/lib/trading/ai-explanations.ts` — `generateTradeExplanation(ctx)` kaller `chatWithAI({provider:"kimi", maxTokens:200})` fra `src/lib/ai/providers.ts`. Prompt: rolig norsk assistent, MAKS 2-3 setninger, nevn faktiske tall (RSI/grid-nivå/pris/regime), forklar HVORFOR, ingen hype/gevinstløfter, start ikke med «Jeg», maks 1 emoji. Template-fallback (`templateExplanation`) ved LLM-feil — grid buy/sell-templates med emoji.
2. **Wiring:** I tick route ETTER `executeTrade` + audit-logging (søk etter «AI-forklaring (2026-08-03)»): dynamisk `await import("@/lib/trading/ai-explanations")`, generer med symbol/side/priceNok/amountNok/strategy/reason/indicators (rsi, regime, grid_level, buy_price, sell_price, profit_pct, confidence, ensembleScore), UPDATE `trades SET pilot_explanation = text`. **Alt i try/catch med console.warn — AI-feil må ALDRI stoppe trading.**
3. **UI:** Statistikk-fanen (StatsTab i UnifiedTradeTerminal) viser forklaringen i eget 🧠-kort: `bg-[#0D1117] border-[#1E2530]/50` med `text-[#A8B8D8]`. KJØP/SALG som fargede badges (emerald/red `bg-*-500/10`), P&L som chip, `rounded-xl` + hover-border. Tom-tilstand: «Start Auto-handel for å se AI-forklaringer her.»

**Scope-felle:** `nokPrice`/`nokTotalValue` var definert inne i en tidligere try-blokk (audit-logging) — ikke tilgjengelig i explanation-blokken. Beregn på nytt: `const rate = getUsdtToNokRate(); const execPrice = result.executedPrice ?? currentPrice; usdtToNok(execPrice, rate)`.

**Kostnad:** ~200 output-tokens per trade ≈ ubetydelig. Batch-funksjon `generateExplanationsBatch` finnes (3 parallelt) men brukes ikke ennå.

**Provider-felle (2026-08-03, prod-bevis — DeepSeek→Kimi, commit `2ca82754d`):** Servicen kalte opprinnelig `provider:"deepseek"` — men `DEEPSEEK_API_KEY` er IKKE deployet som Worker-secret. Resultat: 162 trades på 30 min, ALLE med `pilot_explanation = NULL` (LLM-kallet kastet internt i try/catch — servicen falt tilbake til template, men wiring-en i tick feilet stille slik at ingenting ble lagret). Først etter bytte til `provider:"kimi"` dukket forklaringer opp i DB. **Regel: bruk den provideren som har en secret i `wrangler secret list`, ikke den du har i `.env.local` eller Hermes-config — Workers-miljøet er separat.** Deployede AI-secrets per 2026-08-03: `KIMI_OAUTH_TOKEN` (✅), `DEEPSEEK_API_KEY` (❌), `KIMI_API_KEY` (❌). Sjekk FØR provider-valg: `npx wrangler secret list | grep -iE 'KIMI|DEEPSEEK|AI'`. Ved Kimi: IKKE send `temperature`-param (fiksert 1.0 — å sende 0.7 gir HTTP 400, se debug-patterns #4). Verifisering etter provider-bytte: `SELECT pilot_explanation FROM trades WHERE executed_at > NOW() - INTERVAL '5 minutes'` — skal være non-NULL.

**Strategy-navn-felle i template-fallback (2026-08-03 kveld, commit `715400a41`):** Toms 23 trades hadde ALLE `pilot_explanation = NULL` selv ETTER provider-fiksen — mens andre brukeres trades hadde forklaringer. Differensial-diagnose: Toms trades hadde `reason_code = DARK_FLEET_ENSEMBLE_BUY` og `strategy`-feltet sendt til `generateTradeExplanation` var `"dark_fleet"` (resolvedEngine), mens `templateExplanation()` KUN matchet `strategy === "grid"`. LLM-kallet feilet (OAuth/rate-limit) → template-fallback traff ingen gren → generisk tekst skulle vises, men wiring gav NULL for ikke-matchende strategier. **Regel: en template-fallback som branches på strategi-navn MÅ dekke ALLE verdier `resolvedEngine` kan ha i prod** — `grid`, `dark_fleet`, `ensemble`, `dca`, `multi_signal`, `cryptopilot`. Grep etter faktiske verdier: `SELECT DISTINCT strategy_signal->>'reason' FROM trades WHERE executed_at > NOW() - INTERVAL '1 day'` + sjekk `resolveStrategy()`-mappingen. En «generisk fallback til slutt» (`🤖 AI-kjøp: ...`) er ikke nok hvis branchene før den returnerer/tommer ut. Verifisering etter fiks: sammenlign `COUNT(pilot_explanation)` gruppert på `reason_code` — alle reason_codes skal ha forklaringer, ikke bare GRID_*.

**TradeContext-indicators-kontrakt:** `signal.indicators` fra strategiene er løst typet — cast hvert felt (`as number | undefined`) når du sender til servicen. GridBotStrategy v2 leverer grid_level/buy_price/sell_price/profit_pct; Dark Fleet leverer regime/ensembleScore; rsi finnes ikke alltid (undefined-tolerant).

**Genbruk:** Samme service kan drive fremtidig «spør AI om denne traden»-chat (nivå 3 fra konkurrent-analysen) — context-objektet er allerede komplett. Ikke bygg ny prompt-pipeline for chat; ekstraher buildPrompt/TradeContext.

## Pitfalls

