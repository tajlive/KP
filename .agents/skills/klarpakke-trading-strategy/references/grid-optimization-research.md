# Grid-optimalisering — research-kunnskapsbank (2026-08-02)

Kondensert fra Pionex, Bitsgap, 3Commas, Altrady, goodcryptoX og uavhengige tester (Coinmonks m.fl.). Hentet for å svare: «Hvordan tjene mer penger for brukerne våre?»

## Konkurrent-landskap (2026)

| Plattform | Styrke | Relevant for Klarpakke |
|---|---|---|
| Pionex | 8 grid-typer, AI-oppsett (30d backtest), 0.05% fee, gratis | AI Grid 2.0 = dynamisk re-ankring |
| Bitsgap | Rikeste grid-features, COMBO-bot, strategi-maler | Grid+DCA samtidig på samme par |
| 3Commas | AI Assistant (plain-English → config), 15+ børser | Trailing entry/exit, multi-TP |
| goodcryptoX | Trailing entry eksklusivt | Kjøp ikke før momentum snur |

## Pionex' 8 grid-typer (inspirasjon)

1. **Spot Grid** — originalen; aritmetisk ELLER geometrisk spacing; AI-guided setup, trigger price, SL/TP nativt.
2. **Reverse Grid** — profitt i base-valuta (akkumuler coin, ikke USDT). For langtids-tro i bjørnemarked.
3. **Infinity Grid** — INGEN øvre grense; profit-per-grid % i stedet for faste nivåer; følger opptrender uten å selge alt tidlig. AI auto-setter params fra 30d backtest.
4. **Leveraged Grid** — 1–5x lånt kapital; grid-profitt legges til margin automatisk.
5. **Margin Grid** — collateral røres ikke; grid kjører på lånte midler.
6. **Futures Grid** — perp, long/short/neutral, funding-rate-risiko.
7. **Coin-M Inverse Futures Grid** — profitt i base-coin; hedging-variant (1x short, ingen likvidasjonsrisiko).
8. **Cross Margin Futures Grid** — long+short grid samtidig, delt margin.

## Kritiske designvalg (verifisert av flere kilder)

### Geometrisk > aritmetisk spacing for krypto
Aritmetisk: lik $-avstand. Geometrisk: lik %-avstand. Krypto-volatilitet er proporsjonal med prisnivå → geometrisk gir jevn trade-frekvens uansett pris. **Klarpakke bruker aritmetisk i dag** (`step = (upper-lower)/levels`) — P1-kandidat.

### Grid tjener KUN i range; DCA i nedtrend — de er komplementære
Bitsgap: kjør grid på sideways-par og DCA på akkumulerings-par samtidig. Hybrid-anbefaling fra uavhengig analyse: 70% DCA-kjerne / 30% grid aktiv. Klarpakkes DCA er i dag en sikkerhetsventil under grid-bunn, ikke en aktiv strategi.

### Trailing entry (mangler i Klarpakke)
Ikke kjøp når prisen treffer nivået — vent på momentum-snurr (f.eks. 3 stigende ticks eller RSI(14) < 30). Forhindrer falling-knife-kjøp hele veien ned.

### Stop-loss UNDER grid-bunn er standard
Bitsgap krever det. Uavhengig tester: uten SL blir du bag-holder. Klarpakke har kun 25% katastrofe-SL — kandidat: «grid exit» ved `lowerPrice × 0.90` (selg alt, stopp sesjon, frigjør kapital).

### Uavhengig kritikk (Coinmonks) — viktig motvekt
- Grid-bots tjener lite i REN sideways: snitt kjøp = midten av range, snitt salg = midten → kun ytterste nivåer gir reell profitt.
- Rapportert «gevinst» er ofte bare prisoppgang (unrealized skjult). Beste bruk: **scaling inn** (akkumulering i fall, vide nivåer) og **scaling ut** (exit-nivåer over snitt-entry i opptrend).
- Testperiode ga 0.5–2%/dag i gunstig marked — men leveraged grid utslettet konto ved grid-brudd (posisjon ble ikke lukket over range).
- Lærdom for oss: vis ALLTID unrealized P&L per sesjon, ikke bare realized. Og aldri leverage.

## Prioritert veikart (vurdert mot Klarpakke-kodebase)

| Pri | Tiltak | Kompleksitet | P&L-effekt |
|---|---|---|---|
| P0 | Fiks evaluateGridSignal buy-logikk (se SKILL.md — grid kjøper ALDRI i dag) | Lav | 🔴 Kritisk |
| P0 | Re-kalibrer stale grids på dagens pris | Lav | 🔴 Høy |
| P1 | Geometrisk grid-spacing | Middels | 🟡 Middels-høy |
| P2 | Trailing entry (RSI/momentum-filter på kjøp) | Middels | 🟡 Middels |
| P3 | Grid+DCA hybrid (aktiv 70/30-allokering, ikke bare sikkerhetsventil) | Høy | 🟡 Middels |
| P4 | Infinity Grid (trailing grid-topp, følg opptrend) | Høy | 🟢 Høy i bull — backtest først |
| P5 | Grid exit ved lowerPrice × 0.90 (selg alt, stopp, frigjør) | Lav | 🟢 Defensiv |

## Kilder
- pionex.com/blog/best-grid-trading-bot (8 grid-typer, AI 2.0, fee-struktur)
- bitsgap.com/blog/grid-trading-strategy-explained-how-to-profit-in-any-market-in-2026 (settings-tabell, SL-krav, grid-vs-DCA)
- medium.com/coinmonks/grid-bots-how-they-really-work-how-to-make-money-with-them-948b4439fa5f (uavhengig kritikk, scaling inn/ut)
- goodcrypto.app/dca-vs-grid-bot-comparison (trailing entry)
- altrady.com/blog/crypto-bots/best-grid-trading-bots (plattform-sammenligning)
- wundertrading.com/journal/en/multi-pair-grid-bot-manual (multi-par risiko)
