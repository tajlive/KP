# Inntektsmodell: Affiliate vs. Egen Handel + Exchange-Valg

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Velg riktig inntektsmodell (affiliate vs. egen handel) og optimal exchange-mix for Klarpakke.

**Architecture:** Tredelt inntekt — affiliate (OKX/Kraken), Pro-abonnement, og «Pilot Premium». Ingen egen handel (vi er verktøy, ikke broker).

**Tech Stack:** OKX Affiliate API, Kraken Impact, Stripe, Supabase.

---

## Inntektsmodell-analyse

### Alternativ 1: Affiliate (anbefalt)

| Exchange | Provisjon | Krav | Vurdering |
|----------|-----------|------|-----------|
| **OKX** | 30-50% av trading fees | Månedlig evaluering | ✅ **BEST** — høyest provisjon, EU-lisens |
| **Kraken** | 20-50% (opp til $1000/referral) | 5000+ følgere eller finans-side | ⚠️ Krever stort publikum |
| **Binance** | 20-50% | Geo-blokkert i EU | ❌ **IKKE** — ikke tilgjengelig for norske brukere |
| **Coinbase** | Opptil 50% | US-fokus | ⚠️ Begrenset EU-dekning |

### Alternativ 2: Egen handel (IKKE anbefalt)

| Problem | Konsekvens |
|---------|-----------|
| Vi blir broker | Regulatorisk mareritt (MiFID II, Finanstilsynet) |
| Konflikt med brukere | Vi tjener når de taper |
| Kapitalbehov | Må dekke tap |
| **Konklusjon** | **ALDRI** — vi er verktøy, ikke broker |

### Alternativ 3: Pro-abonnement (primær)

| Tier | Pris | Inntekt/år (1000 brukere, 5% konv.) |
|------|------|-------------------------------------|
| Pro | 299 kr/mnd | 179 400 kr |
| Pro+ | 499 kr/mnd | 299 400 kr |

---

## Anbefalt modell: «Tredelt inntekt»

| Kilde | Andel | Forutsigbarhet | Skalerbarhet |
|-------|-------|---------------|--------------|
| **Pro-abonnement** | 60% | Høy | Høy |
| **OKX Affiliate** | 30% | Middels | Høy |
| **Kraken Affiliate** | 10% | Lav | Middels |

### Hvorfor OKX > Kraken for affiliate

| Faktor | OKX | Kraken |
|--------|-----|--------|
| Provisjon | 30-50% | 20-50% (cap $1000) |
| EU-lisens | ✅ CASP | ✅ |
| Fee for bruker | 0.08-0.10% | 0.16-0.26% |
| **Brukervennlighet** | **Billigst** | Dyrere |
| Krav | Ingen minimum | 5000+ følgere |
| Utbetaling | Hver time | Månedlig |

**Konklusjon:** OKX er bedre for både Klarpakke (høyere provisjon) OG brukere (lavere fees).

---

## Exchange-strategi: «OKX først, Kraken backup»

| Brukertier | Exchange | Begrunnelse |
|-----------|----------|-------------|
| **Student (gratis)** | OKX | Lavest fee, enklest |
| **Pro (299 kr)** | OKX | Lavest fee = mer profitt til bruker |
| **Pro+ (499 kr)** | OKX + Kraken | Valgfrihet, arbitrage-muligheter |

### Hvorfor ikke Binance?

| Problem | Konsekvens |
|---------|-----------|
| Geo-blokkert i EU | Norske brukere kan ikke bruke |
| MiCA-regulering | Ikke compliant |
| **Konklusjon** | **Fjernet 2026-08-08** — riktig beslutning |

### Hvorfor ikke Coinbase?

| Problem | Konsekvens |
|---------|-----------|
| 1%+ fees | For dyrt for aktive tradere |
| US-fokus | Begrenset EU-støtte |
| **Konklusjon** | **Ikke konkurransedyktig** |

---

## Implementasjonsplan

### Fase 1: OKX Affiliate (uke 1)

**Task 1.1: Registrer OKX Affiliate**

**Step 1:** Gå til https://www.okx.com/affiliate
**Step 2:** Fyll ut søknad — «Klarpakke: norsk trading-plattform for nybegynnere»
**Step 3:** Vent på godkjenning (1-3 dager)
**Step 4:** Få referral-lenke + API-nøkkel

**Task 1.2: Integrer referral-sporing**

**Files:**
- Create: `src/lib/affiliate/okx-referral.ts`

**Step 1:** Når bruker klikker «Koble til OKX» → spor referral
**Step 2:** Lagre `okx_referral_id` i `user_profiles`
**Step 3:** Rapporter til OKX API ved hver trade

**Task 1.3: Provisjons-dashboard**

**Files:**
- Create: `src/app/admin/affiliate/page.tsx`

**Step 1:** Vis antall referrals, provisjon hittil, utbetalinger
**Step 2:** Månedlig eksport for regnskap

---

### Fase 2: Kraken Affiliate (uke 2-3, hvis godkjent)

**Task 2.1: Søk Kraken Affiliate**

**Krav:** 5000+ følgere eller finans-nettside
**Alternativ:** Vent til Klarpakke har nok trafikk

**Task 2.2: Integrer Kraken (hvis godkjent)**

**Samme mønster som OKX** — referral-sporing, dashboard

---

### Fase 3: Pro-abonnement (allerede på plass)

**Eksisterende:** Stripe-integrasjon, 299 kr/mnd
**Forbedring:** Legg til «Pilot Premium» — 499 kr/mnd med 5x gearing

---

## Inntekts-projeksjon (konservativ)

| Scenario | Brukere | Pro | Affiliate | Total/år |
|----------|---------|-----|-----------|----------|
| **Lav** | 1 000 | 50 × 299 kr | 500 × 50 kr | 299 400 kr |
| **Middels** | 5 000 | 400 × 299 kr | 2 500 × 50 kr | 1 496 400 kr |
| **Høy** | 20 000 | 2 000 × 299 kr | 10 000 × 50 kr | 5 986 400 kr |

**Antagelser:**
- Affiliate: 50 kr/år per aktiv bruker (0.1% fee × 50 000 kr volum × 30% provisjon)
- Pro-konvertering: 5-10%
- Affiliate-konvertering: 50% av brukere kobler til exchange

---

## Risikoer

| Risiko | Sannsynlighet | Tiltak |
|--------|-------------|--------|
| OKX kutter provisjon | Middels | Diversifiser — Kraken backup |
| Få brukere kobler til exchange | Middels | Incentiver — «Koble til, få 100 kr bonus» |
| Regulatorisk endring | Lav | Følg MiCA — OKX er compliant |
| Affiliate ikke godkjent | Middels | Fokuser på Pro-abonnement først |

---

## Anbefaling

| Prioritet | Handling | Hvorfor |
|-----------|----------|---------|
| **P0** | Søk OKX Affiliate | Høyest provisjon, lavest bruker-fee |
| **P1** | Launch Pro-abonnement | Forutsigbar inntekt |
| **P2** | Søk Kraken Affiliate | Backup + valgfrihet for Pro+ |
| **P3** | «Pilot Premium» 499 kr | 5x gearing for avanserte |

**Ikke gjør:** Egen handel, Binance, Coinbase

---

## Neste handling

**A:** Søk OKX Affiliate nå (jeg lager søknadstekst)
**B:** Vent — fokuser på Pro-abonnement først
**C:** Kombinasjon — søk OKX + launch Pro samtidig