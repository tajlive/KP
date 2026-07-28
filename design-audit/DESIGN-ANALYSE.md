# Design-analyse — Klarpakke (senior-gjennomgang, 28.07.2026)

**Grunnlag:** 15 ferske skjermbilder (mobil 375×812 + desktop 1440×900) av alle flater, innlogget og uinnlogget. Toms tilbakemelding: *«rotete, uoversiktlig, vanskelig å forstå»*. Denne analysen bekrefter og presiserer hvorfor.

---

## ⚠️ Først: analysen avdekket en LEVENDE P0-faktafeil

**`/no/dashboard/historikk` viser «Realisert P&L (sum): +1 645 424 kr»** — grønt, som overskrifts-KPI.
Dette er samme bug-klasse vi nettopp fjernet fra 6 flater (Σ realized_pnl på tvers av sesjoner), men verre: fanen «Alle» inkluderer **arkivert test-æra** — derav 1,65M mot porteføljens 1,33M. Sveipet og jeg bommet begge på denne siden (den var ikke i den opprinnelige 6-flaten). Kontoen er −4 414 kr. **Må inn i neste kode-runde (R2-brudd).**

---

## Hoveddiagnose: Appen er bygget av kort, ikke av hierarki

Rotet Tom reagerer på er ikke styling — det er **fravær av prioritering**. Hver feature har fått sitt eget fullbredde-kort, og alle kortene roper like høyt. Ingen side svarer på spørsmålet: *«Hva er den ene tingen denne siden handler om?»*

Fem mekanismer skaper følelsen av rot:

### 1. Alt har lik visuell vekt — ingenting leder øyet
Dashboard (mobil) har **7 blokker** med tilnærmet samme størrelse, mørkeblå bakgrunn og padding: modus-bar, info-kort, hilsen-kort, ticker, hero-tall, CTA, chat-boble. Når alt er likt stort, er ingenting viktig. Konkurrentene (Revolut, Robinhood) har én hero + tydelig sekundær/tertiær skala.

### 2. Samme informasjon gjentas — og motsier hverandre
- **Saldo ×3** på dashboard: top-bar (95 586 kr), hilsen-kort (P&L −4 413,63 NOK), hero (95 586 kr).
- **To ulike prosenter på samme skjerm (desktop):** top-bar «−1.00%» vs hero «−4,41 % Siste endring» — ingen av dem labelt med hva de måler.
- **«Start handel» ×2** (top-bar + hero) pluss «Handel» i bunn-nav = tre veier til samme sted.
- **Modus duplisert:** LEKEPENGER-badge + Lekepenger/Live-toggle sier det samme to ganger.

### 3. Uferdige elementer står i prime position
Dette er det mest tillitsdrepende funnet — ting som aldri skulle nådd prod:
- **«TITTEL»** — rå placeholder-tekst på desktop-dashboardet (nederst, over tre fargede kort).
- **«VINNRATE 0.71%»** — desktop hilsen-kort: brøk vist som prosent (skal være 71 %).
- **«Kopier diagnostikk»** — utvikler-knapp i Handelshistorikk-header.
- **«Last graf på nytt»** — stor, tom, sentral boks på porteføljen som ikke viser noe.
- **Konto-siden:** «Totale enheter (råsum): 0.000000», «Assets synkronisert» — konsoll-jargon; «Oppdater saldo»-knappen **overlapper teksten** «Estimert totalverdi».
- **Register:** skjema-kortet er forskjøvet til venstre; «Har du allerede konto? Logg inn» flyter utenfor kortet, klippet.

### 4. Språket skifter under brukeren
- **Valuta:** Hele appen er NOK — unntatt JokerTrade-siden som viser **BTC $63,240 / ETH $1,878 / SOL $73.14 i USD** («LIVE PRISER»), og Trade-siden som viser «USDT-kurs 64 586,58» til nybegynnere.
- **Begreper:** «Trade» (sidetittel) vs «Handel» (nav) vs «Kjøp» (knapp). «Profil» (tittel) vs «Konto» (nav) vs `?tab=wallet` (URL). «Balanse» vs «Portefølje» vs «Lommebok» — tre navn på pengene dine.
- **Språk mikset:** «Assets synkronisert: 0», «Null risiko», «Live 24/7», «Start handel» ved siden av «Estimert totalverdi».
- **Designspråk:** JokerTrade er et helt annet produkt visuelt — gull-gradient, annen typografi, ingen app-navigasjon — midt i en mørk blå app.

### 5. Flytende elementer dekker innhold
- Chat-boblen (blå sirkel) svever **over** «Start handel»-CTA på dashboard.
- Bunn-nav **skjuler statistikkraden** (108 / 71 % / −4 413 kr) på porteføljen — kortene er kuttet midt over.
- «Neste»-knappen på Auto-trade flyter løst nede til høyre, frakoblet skjemaet den hører til.

---

## Per-side vurdering

| Side | Karakter | Hovedproblem |
|---|---|---|
| Landing | 6/10 | Ren hero, men lys grå header-bar mot mørk side (mobil), ingen produkt-bevis |
| Register | 4/10 | **Layout-bug:** kort forskjøvet, logg inn-lenke klippet utenfor |
| Login | 6/10 | Fungerer; lys header bryter mørk side |
| Dashboard | 5/10 | 7 likeverdige blokker, saldo ×3, to ulike %, chat over CTA, «TITTEL» + 0,71 % (desktop) |
| Portefølje | 5/10 | Død graf-boks i sentrum, stat-rad skjult bak bunn-nav, «Lommebok» tynn |
| Trade | 7/10 | Beste side — men rød graf + grønn «+2,3 % (24h)» motsier hverandre (to tidsperspektiver), USDT-kurs støy for nybegynner |
| Resultater | 6/10 | Mye chrome (3 chips + 3 knapper) før innholdet; «UTEN RESULTAT: 28» uforståelig |
| Analyse | 5/10 | «Tilbake til dashboard» + dropdown = dobbel nav; tynn dybde |
| Auto-trade | 6/10 | AI-overvåking bra; «Neste» flyter løst; ingen steg-indikator |
| Historikk | 3/10 | **P0: +1 645 424 kr falsk P&L-sum** + utvikler-knapp i header |
| Konto/Profil | 3/10 | Konsoll-jargon, knapp over tekst, ikon-faner uten labels, live-trading-innhold for paper-bruker |
| JokerTrade | 3/10 | Annet designspråk, USD-priser, ingen app-nav — føles som å forlate appen |

---

## Handlingsplan — fire bølger (ikke 40 løse fikser)

### Bølge 1 — Fakta & tillit (P0, kode)
1. Historikk «Realisert P&L (sum)»: rutes til konto-P/L eller label «Σ alle sesjoner inkl. arkivert» — helst det første.
2. «VINNRATE 0.71%» → 71 % (brøk→prosent-format, desktop hilsen-kort).
3. Fjern «TITTEL»-placeholder på desktop-dashboard.
4. JokerTrade-priser → NOK (eller label «USD» tydelig — men NOK er regelen i appen).
5. Avklar top-bar «−1.00%» vs hero «−4,41 %» — label begge (f.eks. «24t» / «Totalt») eller fjern den ene.
6. Fjern «Kopier diagnostikk» fra brukerflate (eller bak innstillinger).

### Bølge 2 — Hierarki (P1, design)
Gi hver side en **mission statement** og bygg hierarki rundt den:
- **Dashboard = «Hva har jeg, og hva gjør jeg nå?»** → ① saldo+endring+ÉN CTA (hero), ② én modus-indikator (badge ELLER toggle, ikke begge), ③ én handlings-linje (hilsen/AI-tips kollapset), ④ ticker. Alt annet under fold eller fjernet. Chat-boble: ikke over CTA.
- **Portefølje = «Hva eier jeg, og hvordan går det?»** → død graf-boks kollapses til empty-state-linje; stat-rad over bunn-nav-nivå; «Lommebok» slås sammen med Balanse-kortet.
- **Resultater/Analyse/Historikk = samme innholdsfamilie** → vurder å slå sammen til én «Innsikt»-side med faner (løser både tynne sider og P0-en på historikk).
- Kollaps/fjern empty-states fra prime position generelt.

### Bølge 3 — Konsistens (P2, design-system)
- **Tokens:** én kort-radius (nå: minst 3), én CTA-farge (nå: blå på dashboard, grønn på trade, gull på joker), én chip-semantikk.
- **Terminologi-lås (norsk):** Handel (ikke Trade), Konto (ikke Profil/wallet), Saldo (ikke Balanse+Lommebok). Skriv inn i en `TERMINOLOGY.md` og håndhev i review.
- **JokerTrade inn i systemet:** samme header, nav, farger, NOK. Den kan ha egen aksent, men ikke eget univers.
- Ikon-faner på Konto får labels (eller tekst-faner).

### Bølge 4 — Forståelse (P3, UX-copy)
- Førstegangs-forklaring: «Lekepenger», «Sesjon», «Bot» — ett-linjes tooltips/inline-tekst ved første visning.
- «UTEN RESULTAT: 28» → «Åpne handler: 28» (eller hva det faktisk er).
- «BETA»-tag: forklar hva som er beta, eller fjern.

---

## Bevis på retning: slik bør dashboard føles

```
┌─────────────────────────────┐
│ 95 586 kr        [LEKEPENGER]│  ← én hero, én modus-badge
│ ↓ −4,41 % totalt             │
│ [ Start handel ]             │  ← én CTA
├─────────────────────────────┤
│ BTC 620 677 ↑ · ETH · SOL →  │  ← ticker (uendret)
├─────────────────────────────┤
│ 🤖 Botten din: DCA · BTC · aktiv → │  ← én status-linje
│ 💡 Tøff periode — se forslag →     │  ← én handlings-linje
└─────────────────────────────┘
```
Fire blokker, tydelig rekkefølge, alt annet er borte eller bak lenker. Det er halvparten av dagens elementer — og dobbelt så forståelig.

---

*Bilder: `design-audit/full/` (15 stk, mobil + desktop). Relatert: `RAPPORT.md` (fakta-audit), `verify*/` (fakta-fiks før/etter).*
