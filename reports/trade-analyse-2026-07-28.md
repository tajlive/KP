# Trade-analyse: tomarnejensen@gmail.com + plattformsvid gjennomgang

**Dato:** 2026-07-28 · **Analysert av:** Kimi (kryptoanalyse) · **Data:** Supabase `trades`, `trading_sessions`, `paper_accounts` (service role, kun aggregater)

> **OPPDATERING 2026-07-28 (kl. 10:30): Fikser gjennomført — se §6.**

---

## 6. Gjennomførte fikser (2026-07-28, godkjent av Tom — "fiks automatisk")

| Fiks | Omfang | Status |
|---|---|---|
| **Kode:** `src/lib/supabase/paper-trading.ts` — `executePaperTrade` lagret `price` i USDT mens `total_value`/`fee` var NOK | 1 fil endret (`price: usdtToNok(trade.price, rate)`) | ✅ Lint + tsc rent |
| **Backfill:** 917 rader konvertert til NOK (904 hele-USDT-rader: price+total+fee+pnl × kurs; 13 blandede rader: kun price × kurs) | `scratch/fix-currency-backfill.mjs --apply` — 917/917 OK, 0 feil | ✅ Verifisert: USDT-flaggede rader gikk fra 1 424 → 38 plattformsvidt |
| **Slettet falske trades:** 985 `is_mock=true`-rader (tilfeldige priser/PnL fra test-cron) fordelt på 33 brukere (Tom hadde 10) | `scratch/delete-mock-trades.mjs --apply` — 0 gjenstående | ✅ Verifisert: count = 0 |

**Backups (gjenoppretting mulig):**
- `scratch/backfill-backup-2026-07-28T08-27-13-568Z.json` (917 rader, før/etter-verdier)
- `scratch/mock-backup-2026-07-28T08-29-28-121Z.json` (985 rader, full rådata)

**Gjenstår (ikke gjort — krever egen vurdering):**
- 78 tvetydige rader (pris utenfor både USDT- og NOK-bånd, f.eks. ETHNOK/SOLNOK-par og 5 BTC-rader) — uberørt, listet i dry-run-output.
- Outlier-konto `814b8c67`: −120 MNOK PnL skyldes IKKE valutabug, men absurd store posisjoner (samme "pengeprinter"-bug som er beskrevet i `execute-trade.ts`-kommentarer). Bør isoleres/tilbakestilles manuelt.
- `paper_accounts`-saldoer for ANDRE brukere enn Tom er ikke reberegnet etter mock-sletting — vurder resync via `sync_paper_balance()`.

---

## 7. Runde 2: Rotårsak + full reset av Toms konto (2026-07-28, kl. 11:15)

**Diagnose:** Sesjonsproliferasjonen (178 sesjoner/24 dager) skyldes to ting:
1. Eksterne mock-cron-scripts (`scripts/auto-trade-cron*.mjs`) kjører hver 2. time mot prod — de roterer sesjoner og skrev falske `is_mock`-trades helt fram til kl. 10:00 samme dag.
2. `ensureAutoTradingSessions` i tick-cron opprettet NY sesjon hver gang forrige var stoppet, i stedet for å gjenbruke.

| Fiks | Detalj | Status |
|---|---|---|
| **Kode:** `src/app/api/cron/tick/route.ts` — `ensureAutoTradingSessions` reaktiverer nå nyeste stoppede/crashed paper-sesjon (BTCUSDT) i stedet for å opprette ny. 'paused' røres ikke (bevisst brukervalg). Race-guard via status-sjekk i UPDATE. | 1 fil endret | ✅ Lint + tsc rent — **krever deploy før det virker i prod** |
| **DB:** `supabase/migrations/20260728100000_block_mock_trades.sql` — CHECK-constraint `trades_no_mock_rows` (`is_mock IS NOT TRUE`) | Kjørt mot prod via psql | ✅ Verifisert: mock-insert feiler nå med constraint-violation, 0 rader lekket |
| **Reset av Toms konto** (godkjent) | 172 trades + 178 sesjoner slettet; `paper_accounts` nullstilt til 100 000 NOK; `user_profiles.paper_balance` synket automatisk via trigger; `auto_trade_settings` beholdt (auto-trading fortsetter med rent ark) | ✅ Verifisert: trades=0, sesjoner=0, saldo=100 000 |

**Backup før reset:** `scratch/tom-reset-backup-2026-07-28T09-15-43-895Z.json` (alle trades, sesjoner, konto, profil).

**Viktig å vite:**
- Mock-scriptene vil nå **feile høyt** ved neste kjøring (constraint) i stedet for å forurense. De bør skrus av hos den eksterne scheduleren (ikke lokal crontab — sannsynligvis Hermes-runner `klarpakke-wsl` eller tilsvarende).
- Kodefiksene (`tick/route.ts`, `paper-trading.ts`) er kun lokale inntil `bash scripts/deploy.sh` kjøres.

---

## TL;DR

1. **Datagrunnlaget er delvis korrupt** — trades er blandet i USDT og NOK, én bruker har −120 MNOK i falske tap, og Tom har 178 trading-sesjoner som hver tror de har 100 000 kr. Fiks dette før strategioptimalisering.
2. **Toms reelle tall (valuta-normalisert):** 180 trades på 3,5 uker, win-rate **24,6 %**, lukket PnL **−48 016 kr**, saldo 95 586 kr (−4,4 % fra 100k).
3. **Hovedproblemet: for mye scalping av BTC.** 11 trades holdt under 1 time ga −41 530 kr (0 % win). 79 trades på én dag (27. juli). Gebyr+slippage spiser kontoen.
4. **Mønsteret gjelder ALLE brukere:** BTCUSDT er en systematisk taper plattformsvidt (−303k kr, 25 % win, 1 447 lukkede handler), mens ETHUSDT (+260k, 68 % win) og SOLUSDT (+226k, 51 % win) er profitable. Handler >7 dager: +388k kr, 65 % win. Handler <1 time: −208k kr.
5. **Markedet (juli 2026) er bearish/choppy** — BTC ~63 500 USD etter fall fra 70k+, 7 mrd USD ETF-utstrømning mai–juni. Momentum-long blør i dette markedet; DCA-klump + selektiv swing er riktig oppsett.

---

## 1. Kritiske datafeil (må fikses FØR optimalisering)

| # | Feil | Omfang | Konsekvens |
|---|------|--------|------------|
| 1 | **Valutablanding USDT/NOK i `trades`** | Tom: 28 av 180 trades priset i USDT (f.eks. BTC-salg til 61 828 mens kjøp er ~619 000 NOK). Plattform: 1 424 av 4 608 trades | All PnL vises feil i dashboard/API. Migrasjon `20260514194910_fix_paper_trade_currency_usdt_to_nok` fikset ikke alt — nye USDT-prisede trades opprettes fortsatt (juli 2026) |
| 2 | **Outlier-bruker 814b8c67** | 980 trades, −120 MNOK "PnL" også etter normalisering, snitttap 404 571 kr/trade | Skjemer alle aggregerte statistikker, leaderboard og evt. copy-trading-ranking |
| 3 | **Sesjonsproliferasjon** | Tom: 178 sesjoner på 24 dager (~7/dag), alle m/ `current_capital=100 000`, sum `total_pnl` = 2 283 696 kr | Auto-trade-cron oppretter ny sesjon per kjøring i stedet for å gjenbruke. Sesjonsstatistikk er meningsløs |
| 4 | **Umatchede salg** | Tom: 39 SELL uten tilhørende BUY i historikken | Posisjoner åpnes utenfor `trades`-flyten eller historikk mangler |
| 5 | **Strategi-metadata fraværende** | Alle 178 sesjoner: `strategy=NULL`. 1 368 av 1 380 lukkede handler: `strategy_signal="ukjent"` | Umulig å evaluere hvilken strategi som fungerer — logging må på plass |

**Anbefaling 1–3 bør prioriteres som bug-fikser denne uken.** Ingen strategianalyse er gyldig på korrupt data.

---

## 2. Toms trading — faktiske tall (NOK-normalisert, FIFO)

**Konto:** Saldo 95 586,37 kr (start 100 000 kr, −4,4 % på 24 dager) · Tier: professor · Risikonivå: balanced

| Nøkkeltall | Verdi |
|---|---|
| Trades totalt | 180 (81 kjøp / 99 salg) |
| Lukkede handler (FIFO) | 118 |
| **Win-rate** | **24,6 %** |
| **Lukket PnL** | **−48 016 kr** |
| Profit factor | 0,05 |
| Snitt gevinst / snitt tap | +90 kr / −569 kr |
| Gebyrer betalt | 4 355 kr (4,4 % av startkapital!) |
| Fordeling | 114 av 118 lukkede handler = BTCUSDT (97 %) |

### Hvor pengene forsvinner

| Holdetid | Handler | PnL | Win% |
|---|---|---|---|
| **< 1 time** | 11 | **−41 530 kr** | **0 %** |
| 1–24 t | 11 | −3 001 kr | 36 % |
| 1–7 d | 14 | −677 kr | 36 % |
| > 7 d | 82 | −2 808 kr | 24 % |

- **87 % av det lukkede tapet kommer fra 11 ultra-korte BTC-handler.** Dette er churn: kjøp→salg innen samme time, med 0,2 % slippage + gebyr hver vei. Hver round-trip koster ~0,5–0,8 % før kursbevegelse.
- **79 trades på én enkelt dag (27. juli)** — auto-traderen gikk i loop.
- Snittgevinst (90 kr) er 6,3× mindre enn snitttap (569 kr) — klassisk "kutt gevinstene, la tapene løpe" i revers: boten tar små gevinster og spiser store tap via stop-out i volatil BTC.

### Åpne posisjoner (kostbasis, per 28. juli)

BTC (14 338 kr), DOGE (23 161 kr), BNB (18 364 kr), ETH (stor posisjon, se datafeil #1 — mengde/pris inkonsistent), SOL, XRP, AVAX. Flere altcoin-kjøp 25.–26. juli er ned 2–4 % allerede i dagens fall (BTC −2,6 %, ETH −4,1 %, SOL −4,1 % siste 24t).

---

## 3. Gjelder det alle brukere? — JA, mønsteret er plattformsvidt

42 brukere har trades; 28 har nok lukkede handler til å evalueres (ekskl. outlier 814b8c67):

| Mønster | Tall | Konklusjon |
|---|---|---|
| **BTCUSDT plattformsvidt** | 1 447 lukkede, 25 % win, **−303 361 kr** | BTC-scalping taper systematisk for ALLE — ikke bare Tom |
| **ETHUSDT plattformsvidt** | 1 137 lukkede, 68 % win, **+259 700 kr** | Plattformens signaler fungerer på ETH |
| **SOLUSDT plattformsvidt** | 422 lukkede, 51 % win, **+225 712 kr** | …og på SOL |
| **Handler < 1 time** | 793 stk, 29 % win, **−208 295 kr** | Kort holdetid = tap |
| **Handler > 7 dager** | 959 stk, 65 % win, **+388 141 kr** | Lang holdetid = gevinst |
| **Ukedag** | Mandag: −410 MNOK (outlier-drevet), tirsdag–torsdag positive | Outlier forvrenger; ellers svakt mønster |
| **Brukerfordeling** | ~75 % av aktive brukere i minus | Typisk for retail; topp 3 brukere (d4480fda, 68c65032, e8db32e0) har 56/57/31 % win og pluss |

**Konklusjon:** Toms problemer er ikke unike — de er plattformens problemer. Auto-traderen scalper BTC i et marked der det ikke fungerer, mens den samme motoren tjener penger på ETH/SOL med lengre holdetider.

---

## 4. Markedskontekst juli 2026 (verifisert i dag)

- **BTC ~63 459 USD / 615 404 NOK** (−2,6 % 24t) — falt fra 70k+-sonen, testet 58–60k støtte. Citi kuttet 12mnd-mål 112k→82k (bear case 53k). Galaxy: mulig 40–46k. Standard Chartered: 59k kan være bunnen.
- **ETF-utstrømning ~7 mrd USD mai–juni** — den største etterspørselsmotoren er i revers.
- **ETH svakere enn BTC** (~1 882 USD, −4,1 %) — L2-verdi-fangst-problem; 1 500–1 600 er kritisk støtte.
- **SOL ~73 USD** — low-70s er siste støtte før dypere fall.
- **Makro:** kapital roterer til AI-aksjer; Binance trakk seg fra deler av EU (MiCA); US "Crypto Week" (CLARITY/GENIUS Acts) er positiv katalysator.
- **Regime:** choppy/bearish med oversold-rips. **Dette er det verste regimet for momentum-scalping og det beste for DCA-akkumulering + swing på støttenivåer.**

---

## 5. Anbefalt oppsett (kryptoekspertens beste praksis, mappet til Klarpakkes strategier)

### A. Fiks data først (plattform)
1. Tving alle nye trades til NOK-prising i `paper-executor` (aldrig skriv USDT-pris uten konvertering); kjør backfill-sjekk på juli-trades.
2. Isoler/reparer outlier-konto 814b8c67; ekskluder fra aggregater til verifisert.
3. Gjenbruk aktiv sesjon i auto-trade-cron (én sesjon per bruker per strategi, ikke én per kjøring).
4. Logg `strategy` + `strategy_signal` på hver trade — ellers kan ingenting evalueres.

### B. Strategibytte (gjelder Tom OG plattformen)
| Endring | Fra | Til | Hvorfor |
|---|---|---|---|
| Aktivum for aktive handler | BTC (97 % av handler) | ETH + SOL | 68/51 % win plattformsvidt vs 25 % på BTC |
| Tidshorisont | Scalping <1t | Swing 2–14 dager | <1t: −208k plattformsvidt; >7d: +388k, 65 % win |
| Strategitype | Momentum-long (churn) | **DCA-kjerne 60–70 %** (BTC+ETH, ukentlig beløp) + **swing 20–30 %** (RSI-divergens 4h/dag + EMA50/200-filter) + 10 % cash | Riktig regime-tilpasning for bearish/choppy marked |
| Exit-logikk | Hard stop-loss som trigges av støy | **Trailing stop ATR-basert** (finnes i `strategy-configs`: `trailing_stop_atr_mult`) + take-profit delskala (f.eks. ⅓ på +5 %, ⅓ på +10 %, resten trailing) | Slipper å bli stoppet ut av 1-times-støy |
| Risiko per trade | Udefinert | Maks 1–2 % av konto; daglig taps-grense 3 % → boten stopper | Overlevelse først |
| Frekvens | Opptil 79 trades/dag | Maks 3–5 nye posisjoner/dag + cooldown 4t mellom handler i samme par | Dreper churn; gebyrene alene kostet Tom 4 355 kr |
| Filter | — | Ikke åpne longs når BTC < EMA200 på dagsgraf (regime-filter); ikke trade de første timene etter store ETF/makro-nyheter | Unngår å kjøpe fallende kniv |

### C. For Tom spesifikt
1. **Stopp BTC-scalpingen nå** — den har tapt 41,5k på 11 handler.
2. Behold de åpne altcoin-posisjonene (DOGE/BNB/SOL/XRP/AVAX er små), men sett trailing stops fremfor panikk-salg i dagens −2–4 %-fall.
3. ETH-posisjonen må verifiseres manuelt (datafeil #1 — 247 ETH til ~1 765 er inkonsistent).
4. Sett kontoen på DCA+swing-oppsettet over i minst 4 uker før ny evaluering.

### D. Forventet effekt
Å flytte Toms aktivitet fra <1t BTC-churn til ETH/SOL-swing med plattformens faktiske win-rater (51–68 %) og PF ~1,2–2,0 ville snudd −48k lukket PnL til positivt territorium — *uten* å endre én linje i signal-motoren, kun aktiva- og horisontvalg.

---

## Vedlegg

- Rådata: `scratch/tom-trades-raw.json`, `scratch/all-trades-raw.json`
- Analysescript: `scratch/analyze-trades.mjs`, `scratch/trade-analysis.py`, `scratch/deep-analysis.py`, `scratch/normalized-analysis.py`
- Metode: FIFO-matching per par på tvers av sesjoner; valuta detektert per trade (pris vs USD-referanse × `usdt_nok_rate`, snitt 9,75) og normalisert til NOK.
- Kilder marked: CoinGecko (priser, 28.07.2026), Mosu Crypto juli-2026-rapport, AlphaNode ETF-rapport 02.07.2026, Bitcoin Foundation juli-2026-analyse, TokenMetrics/BingX/Bravos strategiguider 2026.
