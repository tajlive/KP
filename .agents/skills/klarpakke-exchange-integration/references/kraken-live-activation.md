# Kraken Live Activation — verifiserte fakta (2026-08-05)

Session-detalj fra første reelle live-aktivering (Toms konto, ~102 USD → 138 USD). Alt under er verifisert mot `api.kraken.com` samme dag.

## USDT er blokkert for norske kontoer

Verbatim feil ved USDC→USDT-konvertering:

```
EAccount:Invalid permissions:USDT trading restricted for NO.
```

Gjelder ALLE USDT-par (XBTUSDT, USDTUSD, USDTEUR, USDCUSDT) fra NO-konto. MiCA/Tether-regulering — samme regime som fikk Binance til å fjerne USDT fra EØS. **Basevaluta for Klarpakke-på-Kraken er USDC** (Circle, EU-lisensiert). Verifisert åpne par for NO: XBTUSDC, ETHUSDC, SOLUSDC, XBTUSD, SOLEUR.

**Probe teknikk:** `AddOrder` med `validate=true` sjekker tillatelser/ordremin UTEN å plassere ordre — bruk dette før enhver ny par- eller konto-konfigurasjon.

## Verifiserte ordremin (AssetPairs, 2026-08-05)

| Par | ordremin | Merknad |
|---|---|---|
| XBTUSDC | 0.00005 | ~3,2 USDC ved 64,7k |
| ETHUSDC | 0.001 | ~1,9 USDC |
| SOLUSDC | 0.06 | ~4,5 USDC — strammest i grid-universet |
| XBTUSDT | 0.00005 | (utilgjengelig for NO) |
| SOLUSDT | 0.06 | var 6× feil i kode (0.01) |
| ADAUSDT | 20 | var 20× feil i kode (1) |
| DOTUSDT | 3.9 | var 39× feil i kode (0.1) |
| XDGUSDT | 50 | DOGE heter **XDG** på Kraken |
| USDTUSD | 5 | altname, wsname USDT/USD |
| USDTEUR | 5 | heter IKKE USDTZEUR |
| USDCUSDT | 5 | online |

**POLUSDT finnes ikke på Kraken** — kun POLUSD (ordermin 70) og POLEUR (70). POLUSDT er fjernet fra Kraken-symbol-maps (gyldig kun på Binance).

## Fiat/stablecoin-konvertering — to feller

1. **oflag=viqc for fiat-quote-par:** På USDTUSD/USDTEUR tolkes `volume` som BASE-enheter (USDT) med mindre du sender `oflag: "viqc"` — da tolkes det som quote (EUR/USD). «Konverter 60 EUR til USDT» = `marketBuyQuote(USDTEUR, "60")` med viqc. Uten flagget prøver Kraken å kjøpe 60 USDT — feil beløp eller insufficient funds.
2. **Retning for stablecoin-base:** USDC→USDT er en **SELL** på USDCUSDT (du selger base, får quote). Ikke marketBuy — det kjøper USDC for USDT (motsatt vei). Samme logikk for enhver X→Y der X er base i paret.

## API-nøkkel-oppskrift for bot på Cloudflare Workers

Tillatelser PÅ: Query Funds, Query Open/Closed Orders & Trades, Query Ledger, Modify Orders, Cancel/Close Orders.
Tillatelser AV: **Withdraw** (en handelsbot skal aldri kunne ta ut — lekket nøkkel kan da kun trade, ikke stjele), **Earn/staking** (unødvendig åpning).
IP-begrensning: **AV** — Workers har dynamiske IP-er; whitelist = alt dør (samme felle som Binance TRD_GRP_031).
**Egendefinert nonce-vindu: 10000 (ms)** — feltet er i millisekunder, ikke sekunder. Retry-klienter (1s/2s/4s backoff) + parallelle kall treffer «Invalid nonce» uten dette vinduet.
WebSocket-grensesnitt: AV til det faktisk brukes (REST holder for grid-polling).

## Quote-lock ved grid-plassering

Kraken reserverer quote-valuta per åpen limit-buy. Grid dimensionert til «planlagt kapital» (f.eks. 102 USDC over 15 ordre) feiler på sene nivåer med `EOrder:Insufficient funds` når balansen er lavere (87 USDC) — de første ordrene låser midlene. Dimensioner grid til **fri balanse** og forvent delvis plassering; fyll resten når gevinst frigjør midler.

## Balance-semantikk: TOTAL, ikke ledig

`Balance` returnerer **TOTAL balanse inkl. beløp låst i åpne ordrer** — ikke ledig kapital. En grid-manager som bruker rå `Balance.USDC` som «ledig» plasserer overdrevne ordre → `EOrder:Insufficient funds` (sett live i grid-manager v1).

```
ledig = total − Σ (vol − vol_exec) × pris   # over åpne limit-buy-ordrer i samme quote
```

Assets ≠ par-symboler: balansen rapporterer `XXBT`, `XETH`, `XSOL`, `ZUSD`, `ZEUR`, `USDC` — aldri par-navn. Pris-oppslag per asset: XXBT→XBTUSDC, XETH→ETHUSDC, XSOL→SOLUSDC, USDC→1.0.

## Grid-plassering ved live-oppstart: re-sentrer TETT

Grid 1 (1,2–1,8% spacing, nærmeste kjøp 4–7,5% under nåpris) ga **0 fills på timer** i opptrend — for bredt. Re-sentrert grid 2 (spacing 0,8% BTC / 1,0% ETH / 1,2% SOL, første kjøp ~1% under nåpris) treffes ved normal dagsvolatilitet.

- Spacing-gulv: 2 × taker-fee (0,26% × 2 = 0,52%) × ~2× margin ≈ **1,0%**.
- Allokeringsguard: `kapital/nivå ≥ ordremin × pris × 1,1` ellers skippes nivået. 87 USDC → SOL mistet nivå 3–5; 138 USDC → SOL fikk alle 5.

## Kraken+ (abonnement) — ingen API-fordel

0% fees til $10k/mnd gjelder KUN Kraken web/app — **IKKE API/Kraken Pro** (grid kjører API → full fee). Reelle fordeler: Koinly gratis skatterapport, raskere support, Drops-airdrops (lotteri), stablecoin-APR (3,75% på USDC, men all kapital i grid = ~0 idle). Nøytralt for inntjening.

## Live grid-manager (scripts/kraken-grid-manager.mjs)

- Fill-deteksjon via **state-diff**: persister `.hermes/kraken-grid-state.json` ({txid → {side, pair, price, volume, status}}); ordre som var `open` i state og er borte fra `OpenOrders` = FILLED.
- Fylt kjøp → salgsordre @ buyPrice × 1,02 (trailing-aktivering; 0,52% round-trip × 3,8 margin).
- Fylt salg → `realized_profit += (sellPrice − buyPrice) × vol − fees`; ny kjøpsordre på samme nivå (celle resettes).
- Ledig USDC > 25 → ekstra nivå på par med minst gap (nåpris nærmest laveste kjøpsnivå).
- Kjøres av Hermes-cron (`no_agent=true`, `*/5`, `.sh`-wrapper fordi no_agent kjører bash), stille output når ingen endring (watchdog-mønster).
- Nøkler fra `.env.local` (KRAKEN_API_KEY/SECRET) — aldri inn i Workers.

## Bruker-beskyttelse (2026-08-05, Task 6)

- **Auto-kill ved drawdown:** grid-manager beregner equity hver kjøring (= `Balance.USDC` + markedsverdi av XBT/ETH/SOL-beholdning × fersk ticker). Fall > 15% fra `INITIAL_EQUITY` → kansellerer ALLE åpne ordre, setter `state.drawdown_kill = true`, og slutter å legge nye ordre (fill-rekjøp + idle-nivåer skippes) inntil manuell reset av flagget.
- **⚠️ Kill-baseline MÅ inkludere ALLE holdings' markedsverdi (2026-08-05, live-funn):** `INITIAL_EQUITY` ble først satt til 138.66 (kun USDC) — men startposisjonen var 138.66 USDC + 0.00022872 XBT (~14.78 USDC ved 64 612) = **153.44**. Med 138.66 som baseline slo kill inn ved 117.86 USDC = **23,2% ekte drawdown, ikke 15%** — beskyttelsen var 8 pst.p. slakkere enn lovet. Fiks: baseline = markedsverdi av ALLE eiendeler ved grid-oppsett (verifisert tall: 153.44), og kryss-sjekk start-equity mot fersk ticker når du endrer baseline.
- **Ordre-limit:** `MAX_OPEN_ORDERS = 20` guard — idle-utlegging stopper over grensen (mot ordre-spam/duplikater).
- Ren, TDD-testet beregning: `src/lib/trading/kraken-kill-switch.ts` (`evaluateDrawdownKill`) — manageren bruker samme `Math.max(0, 1 − equity/initial)`-regel. 7 tester i `kraken-kill-switch.test.ts`.
- Kill-trigger-verifikasjonsteknikk: sett `drawdown_kill=true` i state-fila, kjør manageren → må rapportere «🔴 KILL-SWITCH AKTIV» og ikke røre ordre; reset state → stille kjøring. (Backup state først.)

## Overvåkning (2026-08-05, Task 4)

- `~/.hermes/scripts/kraken-grid-watchdog.sh` (Hermes-cron `*/15`, no_agent, deliver origin): stille ved normal drift; varsler ved (1) manager nede > 15 min (state-fil-alder), (2) ny realisert gevinst (state-diff), (3) ordre-tap (< 14 av forventede 15), (4) ledig USDC > 10, (5) **equity-mål nådd — én gang** (`equity_250_hit`-flagg i watch-state; brukes til «tid for å utvide til 5 par»). Watch-state i `/tmp/kraken-grid-watch-state.json`.
- **⚠️ Watchdog-v2-lærdom (2026-08-05):** v1's saldo-sjekk var STILLE DØD i uker — Python `urllib`-signering ga `EAPI:Invalid key` og feilen var skjult av `2>/dev/null || BAL="?"` (fallback til stille). Saldo/equity-sjekk må bruke **samme node-signering som grid-manageren** (bevist fungerer), aldri en separat Python-kopi. **Regel: enhver watchdog-gren med `2>/dev/null || fallback` skal ha en test som beviser at den trigges** — se test-teknikken under.
- **One-shot-alert + test-teknikk (2026-08-05):** equity-terskler varsles kun én gang via flagg i watch-state. For å bevise at triggermekanismen virker uten å vente på ekte 250 USDC: `sed 's/EQUITY_TARGET=250/EQUITY_TARGET=1/' watchdog.sh > /tmp/test.sh`, kjør → skal varsle 🎯 + sette flagg; kjør igjen → skal være STILLE (flagg hindrer duplikat). Nullstill watch-state mellom testene. **Terskelen må være ÉN variabel** (export til python-delen) — to hardkodede kopier (bash + python) gli fra hverandre og gjør testen meningsløs.
- **Bash+node+python-orkestrering i watchdog:** node-utdata → temp-fil (`/tmp/kraken-grid-equity.json`) → python leser fil. Aldri injiser JSON i python-kode via bash-string-interpolasjon (siteringsskjørt, feiler stille). `set -u` krever eksplisitt init av valgfrie variabler (`EQUITY_JSON="${EQUITY_JSON:-}"`).
- Daglig analyse kl 07 (cron `ada921a4e191`): fills, P&L, grid-helse per par, priskilde-sporing (lekepenger-tick vs Kraken-live, avvik < 0,5%), state-fil-ferskhet.

## Lekepenger-priser fra Kraken for tilkoblede brukere (2026-08-05, plan 213000)

- `src/lib/trading/canonical/market-data/kraken-provider.ts`: `KrakenMarketDataProvider` mot **offentlige** endpoints (OHLC/Ticker/Depth, ingen nøkkel). Mapping interne symboler → USDC-kvoter: BTCUSDT→XBTUSDC, ETHUSDT→ETHUSDC, SOLUSDT→SOLUSDC, …, POLUSDT→POLUSD (POLUSDC finnes ikke). Intervaller: 15m→15, 1h→60, 4h→240. **`since`-param = UNIX-sekunder** (del ms på 1000). OHLC-respons har `last`-nøkkel som må filtreres. `get24hChange` beregnes fra 24 stk 1h-klines (tickerens `o[0]` er upålitelig — observert "6").
- `src/lib/trading/price-source.ts`: `pickPriceSource(userId, krakenUserIds)` + `priceCacheKey(source, symbol)` — kilde per BRUKER, cache per (source, symbol) så Tom og papir-bruker kan handle samme symbol i samme tick.
- Tick-route (`/api/cron/tick`): henter kraken-tilkoblede user_ids én gang per tick (`user_kraken_keys WHERE is_active`), prefetcher candleCache per (source, symbol), `processSession` får `source` + `candleCache` (valgfrie — andre kallere faller tilbake til binance). **Fallback: kraken-feil → binance-cache → direkte fetch — tick dør ALDRI på priskilde.**
- Verifisering: integrasjonstest mot ekte API (pris = 1h-close), avvik Kraken vs Binance < 0,5%.

## DB-sync til Klarpakke-appen (papir-brukere upåvirket)

- `kraken_live_state` (1 rad per user: `snapshot` JSONB, `total_usdc`, `open_orders`, `open_buy_orders`, `open_sell_orders`, `realized_profit_usdc`, `base_holdings`, `updated_at`) + `kraken_grid_levels`. RLS: bruker leser egen rad; service_role alt.
- `/api/cron/kraken-balance-sync`: per aktiv nøkkel → `getBalance` + `getOpenOrders` (+ ticker for asset-priser) → upsert. pg_cron hvert 5. min (job 1174). **Må akseptere BÅDE `x-api-key` OG `Authorization: Bearer`** — `klarpakke_trigger_cron()` sender Bearer (se klarpakke-supabase-ops).
- `/api/kraken/live-state` (GET, bruker-auth): UI-leser. `KrakenLiveCard` rendres kun når `connected=true` → paper-brukere ser uendret UI.
- Admin-lagring av nøkler: `scripts/store-tom-kraken-keys.mjs` (samme AES-GCM-encrypt som produksjon, `upsert onConflict: user_id`) — raskeste vei når connect-route har bugs.
- **Sikkerhet (2026-08-05, audit):** RLS på `user_kraken_keys` tillater KUN SELECT (egen rad) + DELETE (koble fra) — INSERT/UPDATE stengt for klienter (connect-route skriver kryptert via service_role; klient-direkte-insert ville lagre ukryptert). `backup_capital_*`-tabeller: RLS service_role-only. `exec-sql` edge function slettet.

## Første live-aktivering (referanseflyt)

1. Kill-switch-drill (POST /api/admin/kill-switch, forvent 200 med 0 affected) — beviser nødstopp FØR det trengs.
2. Rå Balance-kall verifiserer nøkler uavhengig av app-kode (connect-ruta hadde egen upsert-bug og ga falsk «Invalid API keys» — stol på råt Kraken-kall ved diagnose).
3. 60% BTC-salg (XBTUSDC market) → USDC til grid.
4. 12 limit-buys plassert (BTC 5, ETH 5, SOL 2 — resten blokkert av quote-lock, se over).
5. **Verifiser deploy er LIVE før du tester nye ruter** — «Invalid API keys» fra connect-route var forårsaket av at gammel Node-crypto-client fortsatt kjørte (deployen var ikke ferdig). Sjekk `git log origin/main` + deploy-status FØR feilsøking.
