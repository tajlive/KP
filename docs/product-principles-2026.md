# Produktprinsipper 2026 – Klarpakke

Dette dokumentet styrer prioriteringer og beslutninger for Klarpakke i 2026. Bruk det ved roadmap, UX og innholdsvalg.

---

## De 10 prinsippene

| #   | Område             | Prinsipp                                                                                                                                                              |
| --- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Målgruppe          | **Småsparere og nybegynnere** – uten trading-erfaring først; middels IT-kunnskap, lav krypto-kompetanse. Se `docs/TARGET-AUDIENCE.md`.                                |
| 2   | Lekepenger vs live | Bruker velger selv når de vil gå live; live trading er bak betalingsmur.                                                                                              |
| 3   | Markeder           | Norge og utlandet – vi støtter flere locale (no, en, th, zh) og prioriterer etter behov.                                                                              |
| 4   | Priser / tiers     | Nåværende tier-struktur (Student, Bachelor, Master, PhD, Professor) er endelig.                                                                                       |
| 5   | Trust / compliance | Viktig – BankID, Vipps, regulatorisk info og sikkerhet fremheves. Vi bruker originale, offisielle logoer for partnere (Binance, Vipps, BankID, betalingsleverandør).  |
| 6   | Læring             | Valgfritt, men anbefales – akademi/kurs blokkerer ikke; vi anbefaler og tilbyr mikrolæring uten å tvinge.                                                             |
| 7   | AI                 | AI er hovedverdi – Market Brief, strategiforklaring og auto-trading skal være synlige og sentrale, ikke gjemt.                                                        |
| 8   | Mobil vs desktop   | **Ca. 70–75 % mobil** – mobil-først; touch-targets (min 44px), lesbar tekst; **test-/designbaseline: mobil nyere enn 2023-modell** (moderne nett, fortsatt rask LCP). |
| 9   | UX-referanse       | Coinbase / Robinhood – enkel, ren, lav kognitiv belastning; tydelig saldo og én primær handling per skjerm.                                                           |
| 10  | Suksess 12 mnd     | 5 000–10 000 brukere – onboarding, lekepenger, betalingsmur og AI-verdi prioriteres for konvertering og vekst.                                                        |

---

## Implikasjoner

### Målgruppe (småsparere og nybegynnere)

- **Småsparere:** Tydelig oversikt, lav kognitiv belastning, enkelt språk om risiko og gebyr; ingen forutsetning om krypto-jargon.
- **Middels IT:** Forutsigbar navigasjon, tydelige feilmeldinger og «hva gjør jeg nå?»; hjelp/akademi i nærheten av vanske punkter.
- Copy og UI skal være forståelige for folk uten trading-erfaring.
- Onboarding og første handel med lekepenger er kritisk; unngå sjargong.
- Detaljert persona: **`docs/TARGET-AUDIENCE.md`**.

### Betalingsmur

- Live trading bak betaling (tier); lekepenger og læring kan være gratis/trial.
- Tydelig i UI når noe krever oppgradering (CTA, lock-ikon, kort forklaring).

### Norge / utlandet

- Behold i18n (no, en, th, zh); vurder hvilke locale som prioriteres i copy og support.

### Trust og originale logoer

- BankID, Vipps, regulatorisk info og sikkerhet fremheves (landing, footer, konto).
- Bruk offisielle logoer for partnere (Binance, Vipps, BankID, betalingsleverandør) i henhold til deres retningslinjer; ikke egendefinerte eller generiske ikoner der det gjelder tillit.

### Læring valgfritt men anbefalt

- Akademi/kurs er ikke blokkering; anbefalinger (f.eks. «Anbefalt: Start med leksjon X») og små prompts (mikrolæring) uten å tvinge.

### AI som hovedverdi

- AI Market Brief, strategiforklaring, auto-trading skal være synlige og sentrale (dashboard, nav, landing), ikke gjemt under «Verktøy».

### Mobil (ca. 70–75 % av bruk)

- Design og komponenter: touch-targets (min 44px), lesbar tekst, én kolonne der det er naturlig.
- Ny funksjonalitet vurderes mobil-først; desktop optimaliseres der det gir verdi.
- **Enhetsbaseline:** Anta mobilskjermer nyere enn 2023-modell i designreview og smoke-tester — likevel hold LCP og bundle stramme for 4G.

### Coinbase / Robinhood-følelse

- Referanse for UX: enkel, ren, lav kognitiv belastning; tydelig saldo og én primær handling per skjerm; ingen overlesset dashboards.
- Se også `docs/design-konkurranse-analyse-2026.md` for konkurrentmønstre.

### Suksess 5k–10k brukere

- Brukes til prioritering: onboarding, lekepenger, betalingsmur og AI-verdi er viktig for konvertering og vekst.

---

_Sist oppdatert: mars 2026 (målgruppe småsparere + mobilbaseline)._
