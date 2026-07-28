# HERMES-OPPDRAG: Bølge 1 — Fakta & tillit (6 fikser fra design-analysen)

**Modell:** DeepSeek V4 Pro · **Type:** Kodefiks · **DB-endringer:** INGEN
**Kilde:** DESIGN-ANALYSE.md (28.07.2026) — alle funn er skjermbilde-dokumentert i `design-audit/full/`
**VIKTIG DENNE GANG:** Verifiser visuelt på BÅDE mobil (375px) OG desktop (1440px) — flere av feilene er desktop-only.

---

## 1. 🔴 P0 FAKTA: Historikk-siden viser +1 645 424 kr falsk P&L-sum
- **Side:** `/no/dashboard/historikk` — «Realisert P&L (sum): +1 645 424 kr» (grønn KPI).
- **Bug:** Σ realized_pnl over ALLE sesjoner, inkludert arkivert test-æra. Samme R2-brudd-klasse som ble fjernet fra 6 andre flater — men verre (større scope). Kontoen er −4 414 kr. Tallet 1 645 424 > porteføljens gamle 1 334 986 fordi «Alle»-fanen tar med arkivert.
- **Fiks:** KPI «Realisert P&L» = konto-P/L (`paper_accounts.current_balance − initial_balance`), konsistent med Resultater-siden. Behold Antall handler / Vinn / Tap (R3 — statistikk, ikke penger). Spor datakilden: sannsynligvis egen route eller trading-analytics-variant UTEN `archived = false`-filter — finn den og rett scope, ikke bare UI-et.
- **Sjekk også:** fanene «Kun lekepenger»/«Kun live» — samme regel per fane.

## 2. Vinnrate «0.71%» → 71 % (desktop hilsen-kort)
- Desktop-dashboard, hilsen-kortet: «VINNRATE 0.71%» — brøk (0.71) formatert som prosent.
- **Fiks:** finn formateringen (mangler `* 100`) — og sjekk ALLE winRate-formatteringer i samme runde (`rg "winRate" src/features/dashboard/`), mobil inkludert.

## 3. «TITTEL» — rå placeholder på desktop-dashboard
- Nederst på desktop `/no/dashboard`: ordet «TITTEL» rendres som overskrift over tre fargede kort.
- **Fiks:** finn komponenten (sannsynligvis hardkodet streng eller i18n-nøkkel som heter TITTEL) og gi den ekte tekst — eller fjern seksjonen hvis den er uferdig. Rå placeholders skal aldri nå prod; vurder lint-regel i pre-commit (`rg -i "tittel" src/ --type ts`).

## 4. JokerTrade-priser: USD → NOK
- `/no/jokertrade` viser «LIVE PRISER» BTC $63,240 / ETH $1,878 / SOL $73.14 — USD midt i en NOK-app.
- **Fiks:** samme NOK-priskilde som resten av appen (coin_prices / binance-proxy + NOK-format). Verifiser at «oppdateres hvert 30. sekund» faktisk stemmer med oppdateringshyppigheten — ellers endre teksten (fakta-regelen).

## 5. To ulike prosenter på dashboard uten label (desktop)
- Top-bar: «95 586 kr −1.00%» vs hero: «↓ −4,41 % Siste endring» — samme skjerm, to prosenter, ingen sier hva de måler.
- **Fiks:** label begge («24t» / «Totalt») — eller fjern top-bar-prosenten. Prosent uten periode er støy.

## 6. «Kopier diagnostikk» — utviklerverktøy på brukerflate
- Handelshistorikk-header har knappen «Kopier diagnostikk» ved siden av «Eksporter CSV».
- **Fiks:** flytt bak admin-flagg eller innstillinger-side. Ikke synlig for vanlige brukere.

---

## Verifisering (påkrevd før «ferdig» meldes)
- Innlogget testbruker (tomarnejensen@gmail.com), BÅDE mobil 375×812 OG desktop 1440×900:
  - `/no/dashboard/historikk` → P&L = −4 414 kr (konto), ikke 1,65M
  - `/no/dashboard` desktop → «71 %», ingen «TITTEL», prosenter labelt
  - `/no/jokertrade` → NOK-priser
- `npm run lint` + `npx vitest run` grønne.
- Deploy KUN via `bash scripts/deploy.sh` etter Toms eksplisitte go.

**Ferdig-kriterium:** Ingen flate i appen viser pengebeløp eller prosenter som motsier `paper_accounts`. Ingen rå placeholders. Én valuta (NOK).
