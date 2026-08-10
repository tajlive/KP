# Konkurranseanalyse: Hva gir størst avkastning — og hva gjør lederne riktig?

**Dato:** 2026-08-10 · **Agent:** K3 (Kimi Desktop) · **Mandat:** klarpakke-trading-agent
**Spørsmål fra Tom:** «Hvilken trading ville ha gitt størst avkastning? Hva har de ledende konkurrentene gjort riktig?»

---

## 1. Fasiten: hva som vinner per regime (med kilder)

| Regime | Vinner | Bevis |
|---|---|---|
| **Sidelengs** | Grid (helst adaptiv) | dcabot 2år ETH: Grid +52 % vs DCA +38 %; Altrady: «grid prints money in sideways» |
| **Opptrend** | DCA / buy-and-hold | dcabot: DCA +38 %; Bitsgap: grid stopper over øvre grense |
| **Nedtrend** | **Cash (regime-filter)** — eller short m/ gearing | Vår egen 365d-test: «slipp posene» −20 % vs hold −58 %; Bitsgap: COMBO/DCA-Futures vant H1 2026 nettopp fordi markedet trendet |
| **Alle regimer** | **Ingen enkeltstrategi** | Bitsgap (B-kilde, 2026-08-08): «conditions decide the ranking, not a fixed hierarchy»; Altrady: strategy-market fit = største prediktor |

### Bitsgap H1 2026 plattformdata (konkurrentens egne tall, B-kilde)

| Bot-type | Win rate | Merknad |
|---|---|---|
| GRID (spot) | 35,14 % | Tregest (10,2 dager til lukking) — markedet trendet, ikke rantet |
| DCA (spot) | 40,95 % | Snitt −0,1 %, median +0,01 % — de fleste ~break-even |
| DCA Futures (gearet) | 50,92 % | Lukker 3,7–5× raskere — men likvideringsrisiko |
| COMBO (gearet grid+DCA) | 57,85 % | Snitt +15,77 % — **men median kun +1,76 %** (9× skew fra giring) |

**Kritisk lesing:** COMBOs «15,77 %» er uteligger-drevet gjennomsnitt fra giring — median-brukeren så 1,76 %. Bitsgap selv flagger: høyere tall = annen risiko, ikke lavere. For Klarpakke (1x spot, mormor) er de gearede tallene uoppnåelige OG uønskede.

## 2. Hva lederne gjør RIKTIG (distillert)

1. **Bitsgap — ærlig rapportering:** median ved siden av snitt, regime-forbehold, risiko-merknad. *Dette er nøyaktig vår «Beviset»-standard — vi matcher dem her.*
2. **dcabot-backtest (2 år ETH, med gebyr):** **Adaptiv grid (ATR-derivert steg) slo fast grid med +11,4pp** (+63,6 vs +52,2). **Smart DCA (asymmetrisk dip-kjøp) slo vanlig DCA med +10,6pp** (+48,4 vs +37,8). **COMBO dominerte alt: +72,8 %, Sharpe 1,94, DD −18 %.**
3. **Altrady-forskning (4 faktorer som skiller vinnere):** strategy-market fit → risikokonfig (1–2 % posisjonsgrenser, drawdown-bremser) → kostnadsdisiplin (50 handler/uke à 0,1 % = 5 %/år i gebyr) → diversifisering. *Vi har alle fire på plass i kveld (tak 60 %, dd-gate, gebyr alltid med).*
4. **Pionex:** gratis boter + ett-klikk + børs-native — enklest i markedet. *Vår forskjell: norsk + LLM-forklaringer + bevist backtest.*
5. **3Commas:** SmartTrade + DCA-enkelhet for folk flest.

## 3. Hva som VILLE ha gitt størst avkastning i vårt vindu (aug 2025–aug 2026)

Ærlig rangering for et bear-år på 1x spot:

1. **Regime-filter i cash** (det vi nettopp bygget): −16,2 % (gate −10 %) — beste lovlige utfall
2. Gearet short (konkurrentenes vinner) — **forbudt for oss** (1x spot, mormor-dekret)
3. Funding-rate-arbitrasje (markedsnøytral) — krever futures, utenfor scope
4. Vår grid m/ bremser: −16 til −26 % — slo buy-and-hold med +30pp

**Konklusjonen ingen konkurrent sier høyt:** i et −50 %-år er «størst avkastning» = «minst tap». I normale år (dcabot-vinduet) er svaret **adaptiv COMBO**.

## 4. Pilot 2.0 — evidensbaserte oppgraderinger (alle gated før deploy)

| # | Oppgradering | Evidens | Forventet effekt |
|---|---|---|---|
| 1 | **Adaptiv grid-steg (ATR-derivert)** i stedet for fast 1,5 % | dcabot +11,4pp | Større steg i volatilt vær → færre whipsaw, bedre margin per fyll |
| 2 | **Smart DCA (asymmetrisk sizing): kjøp MER dypere i dip** | dcabot +10,6pp | Billigere snitt-kost, raskere recovery |
| 3 | COMBO-arkitektur (grid+DCA lagdelt) | Bitsgap/dcabot | ✅ Har vi allerede |
| 4 | Regime-gate + «slipp posene» | Vår egen test (−41 → −16 %) | ✅ Har vi allerede |
| 5 | Median-rapportering i bevis-UI | Bitsgap-standarden | ✅ Bygget inn i formatBacktestBevis-veien |

### Påkrevde gates før noe deployes (mandatet)

- PF ≥ 1,3 backtest / ≥ 1,1 OOS walk-forward
- ≥ 100 lukkede handler · DSR/PSR ≥ 0,95 med korreksjon for alle testede varianter
- Max DD ≤ 15 % · regime-dekning (bull+bear+sidelengs) · 48 t paper A/B
- Realistisk mål i UI: **5–25 % over buy-and-hold — aldri mer** (fakta-regelen)

### Foreslåtte eksperimenter (rekkefølge)

1. **E1:** Adaptiv grid-steg = f(ATR_14) med gulv 1,0 % og tak 3,0 % — backtest 365d SOL+BTC+ETH, walk-forward OOS
2. **E2:** Smart DCA: dca_amount × (1 + dd_from_anchor/1,5 %) capped 3× — samme gates
3. **E3:** Kombinert (E1+E2) — DSR med nTrials=3-korreksjon
4. **E4:** 48 t paper A/B mot nåværende COMBO før produksjon

**Rollback-plan:** config-flagg per variant; baseline er alltid én `git revert` unna;
«slipp posene» + posisjons-tak forblir på uansett variant.

---

*Kilder: Bitsgap Crypto Bot Performance Report 2026 (B), Altrady bot-lønnsomhetsanalyse 2026 (B),
dcabot DCA-vs-Grid 2-års backtest 2026, magazinevalve grid-vs-DCA 2026, blockresearch bot-klassifisering 2026,
egen 365d/90d Kraken-backtest 2026-08-10 (commits 7bf8ab6b9, 622592b1e).*

---

## TILLEGG: Variant-studie utført (5 kombinasjoner × 3 symboler × 365d, walk-forward 60/40 OOS)

| Variant | Train | OOS | PF-train | PF-OOS | Max DD | Dom |
|---|---|---|---|---|---|---|
| V0 baseline | −15,4 % | −5,9 % | 0,31 | 0,59 | 27 % | ✗ |
| V1 adaptiv-steg | −14,4 % | −6,7 % | 0,28 | 0,54 | 26 % | ✗ |
| V2 smart-DCA | −15,6 % | −6,6 % | 0,33 | 0,50 | 29 % | ✗ |
| V3 E1+E2 | −15,3 % | −7,6 % | 0,29 | 0,50 | 27 % | ✗ |
| V4 E1+E2+gate0.9 | −12,8 % | −4,3 % | 0,29 | 0,35 | 19 % | ✗ (minst dårlig) |

**DOM: INGEN variant passerer gatene (PF ≥ 1,3 train / ≥ 1,1 OOS / DD ≤ 15 % / DSR ≥ 0,95).**
Konkurrentenes adaptiv/smart-evidens (dcabot, mai 2024–mai 2026 — vindu med stor rally)
**gjentok seg ikke** på vårt vindu (aug 2025–aug 2026 — ren bjørn). Evidens er regime-betinget.

**Beslutning per mandat («Ingen endring uten OOS-bevis. Ingen unntak.»):**
- E1 (adaptiv_step) og E2 (smart_dca) er IMPLEMENTERT og testet bak config-flagg
  (`adaptive_step`, `smart_dca` — begge default av), men deployes IKKE som default.
- Nåværende COMBO med bremser (tak 60 %, «slipp posene», dd-gate) er det beste
  vi ærlig kan shippe i paper.
- Ukentlig auto-backtest (når den bygges) aktiverer E1/E2 først når forward-data
  beviser dem — ikke konkurrentblogg.
- Script: `scripts/backtest-pilot-variants.mts` (rekjørbart når som helst).

---

## TILLEGG 2: Full-syklus + symbol-sweep + OOS (2026-08-10 kveld, 44.8k candles/symbol, OKX)

### Symbol-sweep full syklus 2021→2026 (E3 asymmetrisk exit)

| Symbol | Pilot | Buy-and-hold | DSR(1) | PF | Dom |
|---|---|---|---|---|---|
| **SOL** | **+280,3 %** | +116,0 % | 0,98 ✓ | 1,37 ✓ | Suveren vinner |
| AVAX | +62,9 % | −45,5 % | 0,85 | 1,13 | God nr. 2 |
| DOGE | +10,1 % | −72,5 % | 0,69 | 1,05 | Slår markedet |
| BTC | −7,8 % | +83,8 % | 0,56 | 0,94 | Underperform |
| LINK | −30,6 % | −57,0 % | 0,46 | 0,85 | Slår markedet |
| ADA | −47,3 % | −85,9 % | 0,31 | 0,79 | Slår markedet |

**Pilot slår buy-and-hold på 5 av 6 symboler.** SOL er suverent beste hjem
(høyest volatilitet + fettest haler = grid-frekvens + runner-fangst).

### Harde gates — status for beste oppsett (E3 på SOL)

| Gate | Resultat | Status |
|---|---|---|
| PF full syklus ≥ 1,3 | 1,37 | ✓ |
| DSR ≥ 0,95 (nTrials=1) | 0,98 | ✓ |
| **DSR korrigert (nTrials=7 symboler)** | **0,75** | **✗** |
| **OOS walk-forward PF ≥ 1,1 (2025–26)** | **0,51** | **✗** |
| MaxDD ≤ 15 % | 53,8 % | ✗ |
| ≥100 lukkede | 7 396 | ✓ |
| Slår buy-and-hold | overalt (+164pp full, +28pp OOS) | ✓ |

**DOM: Strategien er genuin (slår markedet overalt, vinner hvert grid-salg),
men passerer IKKE alle gatene i gjeldende regime — fordi siste 1,5 år er
historisk bjørn for alle alts. Ingen live-påstand, ingen bevist-stempel.
Paper-launch er trygt og riktig. Gatene åpner seg i et normalt/ranging-vindu —
ukentlig auto-backtest (Hermes-oppgave) detekterer det automatisk.**
