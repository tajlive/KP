# Design-audit — Klarpakke (28.07.2026, kl. 02:15)

**Utført av:** Hovedarkitekt (Kimi) · **Grunnlag:** Playwright-skjermbilder (mobil 375×812 + desktop 1440×900) mot https://www.klarpakke.no, kodegjennomgang, og verifisering mot produksjonsdatabasen.
**Testbruker:** tomarnejensen@gmail.com

---

## 🔴 P0 — FAKTA-FEIL: Siden viser feil pengebeløp (DB-verifisert)

Dette er ikke design — det er regnskapsfeil på kjernesider. Alt under er verifisert mot prod-DB i natt.

### Samlet bilde: To penge-modeller i konflikt

| Modell | Verdi | Status |
|---|---|---|
| **Konto** (`paper_accounts` — source of truth) | **95 586,37 kr (−4,41 %)** | ✅ Riktig |
| **Sesjons-sum** (Σ realized_pnl over 89 ikke-arkiverte sesjoner) | **1 334 986 kr** | ❌ Meningsløs som «portefølje» |

De 89 sesjonene har tilsammen fått **8 205 000 kr i fersk startkapital** (printet per sesjon, frakoblet kontoen). Å summere PnL på tvers av dem er som å summere scoren fra 89 separate demokontoer og kalle det bankbalansen.

### Funn 1 — Landing: «Skaffet opptil +900 % for våre beste brukere»

- **Kode:** `src/app/[locale]/page.tsx:30-44` (`getTopReturn`)
- **Bug:** `(max current_balance − 100 000) / 100 000` — hardkodet 100k-initial, ignorerer `initial_balance`. **Nøyaktig samme FACT-bug som ble fikset i leaderboard i natt** (`api/leaderboard/route.ts:150`), men landingssiden ble ikke med i fiksen.
- **DB-bevis:** Topp-kontoen (`db00be5b…`) har current = initial = 1 000 000 kr → **reell avkastning 0,0 %**. Heroen reklamerer med +900 % fra en konto som ikke har tjent en krone. Nest beste konto er +316,7 % (derav fallback-tallet 316 i koden).
- **Ekstra:** Høyrekolonnens «live»-priskort i `HeroSection.tsx:69-90` er **hardkodede falske tall** (BTC 65 446, ETH 1 970, SOL 77.01) merket «live» og «live updates». Brudd på fakta-regelen.
- **Juridisk:** Uverifisert avkastningspåstand i markedsføring = risiko etter markedsføringsloven § 6/§ 7. Må enten verifiseres korrekt eller fjernes.

### Funn 2 — Portefølje: «Din portefølje 1 434 986 kr (+1335,0 %)»

- **Kode:** `src/features/portfolio/PortfolioChart.tsx:184` — `currentCapital = startCapital + totalPnl`, der `totalPnl` = Σ realized_pnl over ALLE 89 ikke-arkiverte sesjoner.
- **Matte:** 100 000 (initial) + 1 334 986 (sesjons-sum) = 1 434 986 kr. Treffer piksel-perfect med skjermbilde.
- **Rett over på samme side** vises «Balanse 95 586,37 kr (−4,41 %)» fra summary-APIet. Samme bruker, samme skjerm, 15× avvik.

### Funn 3 — Resultater: «TOTAL P/L 1 334 986 kr»

- **Kode:** `src/features/portfolio/TradingResultsDashboard.tsx:166` (`aggregates.totalRealizedPnl`).
- Samme sesjons-sum, presentert som brukerens totale resultat siste 30 dager. 105 handler / 73 % vinnere er ekte tall, men P/L-beløpet er frakoblet kontoen.

### Funn 4 — Analyse: «Egenkapitalkurve 1 334 986 kr» (parabolsk)

- Samme kumulative sesjons-sum tegnet som ÉN kontokurve. Kurvens eksponentielle form er penge-printingen visualisert — ikke brukerens faktiske egenkapital (som gikk 100 000 → 95 586).

### Funn 5 — Dashboard: «100 000 kr — Ingen data» motsier «95 586 kr»

- Toppkort: «95 586 kr LEKEPENGER» ✅. Nederst: kort med «100 000 kr / Ingen data / Siste endring». 100 000 er PortfolioCharts fallback-`startingValue` (linje 73) — komponenten får ingen data på dashboardet (annen fetch-path?) og viser default. Inkonsistent datakilde på én skjerm.

### Funn 6 — Hilsen: «Profittabel men ujevn — fokuser på konsistens»

- Kontoen er **−4,4 %**. Hilsenen kaller brukeren profittabel — leser trolig samme oppblåste sesjons-kilde. Feil tone OG feil fakta.

### Anbefalt fiks-retning (konsistent med ADR/migrasjon 20260724120000)

1. **Alle overskrifts-beløp** (portefølje-header, Total P/L, egenkapitalkurve, hilsen) hentes fra `paper_accounts` — aldri Σ på tvers av sesjoner.
2. **Sesjons-PnL vises per sesjon** (SessionList gjør dette allerede) — aldri aggregeres til «porteføljeverdi».
3. **Hero:** samme formel som leaderboard (`initial_balance`-korrigert), eller fjern tallet og bruk verifiserbar påstand («95 586 kr i snitt…» nei — bruk f.eks. antall brukere/handler). Fjern hardkodet «live»-kort — kobl til ekte prisfeed eller slett.
4. Fikses av **Hermes** — rører kjerne-APIer (portfolio/chart, portfolio/summary, analytics, page.tsx). Krever samme type verifisering som leaderboard-fiksen: før/etter-tall mot DB.

---

## 🎨 DESIGN per side — målt mot konkurrent-reglene

**Reglene (fra research: eToro, Revolut, OKX, Coinbase, Binance, Robinhood):**
① Tillit før verdi, bevis ved CTA · ② Vis ekte produkt, aldri stock · ③ Mørk modus default · ④ Mobil-først / thumb-zone / <3s · ⑤ Live-data som bevis · ⑥ Progressive disclosure + forklarbar AI · ⑦ Ingen autoplay-video

### Landing `/no` — Karakter: 4/10
- ✅ Mørk hero m/ serif-display, CTA tydelig, org.nr i footer, TradingModesExplainer
- ❌ **+900 % uverifisert** (P0) · **falskt «live»-kort** (P0) · **ingen produkt-screenshot** (regel ② — konkurrentene viser terminalen sin i hero) · gigantisk tomt svart felt desktop · lys header-bar bryter mørk side på mobil
- **Fiks:** Ekte screenshot av Trade-siden (den er faktisk pen!) i hero, ekte prisfeed, verifisert eller fjernet prosent-tall

### Login `/no/login` — Karakter: 6/10
- ✅ Fungerer, enkelt, tydelig
- ❌ Lys header mot mørk bakgrunn ser ujevn ut på mobil
- **Fiks:** Samme header-behandling som resten av mørk side

### Dashboard `/no/dashboard` — Karakter: 7/10 (beste side)
- ✅ «God natt, Tom Arne» (tidsbasert hilsen) · LEKEPENGER-badge tydelig · live BTC-pris · bunn-nav i thumb-zone (regel ④) · «Start handel» CTA
- ❌ Motstridende saldo-kort nederst (P0) · «Profittabel»-hilsen mens −4,4 % (P0)
- **Fiks:** Én saldo-kilde per skjerm; hilsen fra konto-basis

### Portefølje `/no/dashboard/portfolio` — Karakter: 5/10
- ✅ Ryddige kort, posisjonsliste med vektet snittpris (god logikk i summary-API)
- ❌ Overskrift 1,43M vs balanse 95k på samme side (P0)
- **Fiks:** Header = paper_accounts; sesjons-historikk som egen seksjon under

### Trade `/no/trade` — Karakter: 8/10 (mest ferdig)
- ✅ Manuell/Auto/Joker-tabs · Kjøp/Selg-toggle · beløp → BTC-konvertering · spread 0,02 % synlig (tillit!) · kilde: Binance · stor grønn CTA i thumb-zone · BETA-tag ærlig
- ❌ Grafen tar mye plass over folden — ordrepanel kunne vært høyere
- **Fiks:** Mindre graf, mer handel. Denne siden bør VÆRE landingssidens produkt-bevis.

### Resultater `/no/dashboard/resultater` — Karakter: 5/10
- ✅ CSV-eksport, periode-filter, oppdatert-tidspunkt (tillits-detaljer)
- ❌ Total P/L 1,33M (P0) · «UTEN RESULTAT: 28» uforståelig label
- **Fiks:** P/L fra konto; omdøp «Uten resultat» → «Åpne handler» (eller hva det faktisk betyr)

### Analyse `/no/dashboard/analysis` — Karakter: 4/10
- ✅ Heatmap-konsept, max/min-markører
- ❌ Parabolsk egenkapitalkurve = penge-printing visualisert (P0) · dobbel «Tilbake til dashboard»-nav · tynn innholdsdybde vs. konkurrentenes analyse
- **Fiks:** Kurve fra konto-historikk; vurder om siden skal bestå som egen side eller foldes inn i Resultater

### Auto-trade `/no/dashboard/auto-trade` — Karakter: 6/10
- ✅ **AI-OVERVÅKING-kort med SCANNING/RISIKOANALYSE/SIGNALSTYRKE — dette er regel ⑥ (forklarbar AI) gjort riktig!** · «1 aktiv bot»-status synlig · Ansvarsfraskrivelse-lenke
- ❌ «Neste»-knapp flyter ubekvemt nede til høyre · wizard-flyt uklar · brødsmulesti («Handel / Auto-trading») er klikkbar-dekor på mobil
- **Fiks:** Tydelig steg-indikator (1 av 3), CTA fast i bunn

---

## Prioritert handlingsliste

| # | Hva | Hvem | Type |
|---|---|---|---|
| 1 | Fiks 6 fakta-feil (hero, portefølje, resultater, analyse, dashboard-kort, hilsen) | Hermes | P0 kode |
| 2 | Landing: ekte Trade-screenshot + ekte prisfeed i hero | Hermes (spec fra meg) | P1 design |
| 3 | Trade: komprimer graf, løft ordrepanel | Hermes | P2 design |
| 4 | Auto-trade: steg-indikator + fast bunn-CTA | Hermes | P2 design |
| 5 | Vurder å slå sammen Analyse + Resultater | K3 (arkitektur) | P3 |

**Behold uendret:** Bunn-nav, LEKEPENGER-badges, AI-overvåking-kortet, spread-synlighet, CSV-eksport, tidsbasert hilsen.

---

*Skjermbilder: `design-audit/*.png` (12 stk, untracked). Verifisering: prod-DB via Supabase Management API, 28.07.2026 kl. 02:15.*
