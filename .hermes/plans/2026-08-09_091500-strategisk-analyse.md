# Klarpakke — Strategisk Analyse 2026-08-09

> **For Hermes:** Dette er korrigert forståelse etter Toms presiseringer.

## Kjerneforståelse (korrigert)

| | Feil antakelse | Riktig |
|---|---|---|
| **Hva er Klarpakke** | Broker/trading-plattform | **Verktøy + opplæringsplattform** |
| **Målgruppe** | Tradere generelt | **Småsparere med liten teknisk innsikt** |
| **Inntjening** | Broker-fee/affiliate | **Abonnement på verktøy + opplæring** |
| **Exchange** | Klarpakkes egen konto | **Studentens egen konto (Kraken/OKX)** |
| **Trading** | Klarpakke trader for bruker | **Verktøy sender til studentens exchange** |
| **Live vs Leke** | Separate systemer | **Samme trade engine, gradvis overgang** |

## Forretningsmodell (analysert)

### Freemium — Student gratis for alltid

| Tier | Pris | Innhold |
|------|------|---------|
| **Student** | **0 kr for alltid** | Lekepenger, full opplæring, Kraken/OKX-kobling |
| **Pro** | 299 kr/mnd | Avanserte strategier, API-tilgang, 1:1 coaching, prioritert support |

**Begrunnelse:** 
- Studenter har lite penger — gratis fjerner barriere
- Verktøyet må bevise verdi før betaling
- Pro-tier for de som vil videre etter opplæring

### Exchange-støtte

| Exchange | Status | Begrunnelse |
|----------|--------|-------------|
| **Kraken** | ✅ Primær | MiCA-lisensiert, NOK-støtte, lav terskel |
| **OKX** | ✅ Sekundær | Lavest fees (0,1%), god API |
| **Binance** | ❌ Droppes | Geo-blokkert i EU, MiCA-uvisshet |

## Målgruppe: Småsparere

**Kjennetegn:**
- 18-35 år
- Student eller ny i jobb
- 5 000-50 000 kr å investere
- Ingen teknisk bakgrunn
- Vil lære, ikke bare tjene

**Behov:**
- Enkel onboarding (5 min)
- Forståelig språk (ikke fagjargong)
- Trygghet (lekepenger først)
- Mestring (se fremgang)

## Opplæring: Anbefalt format

### Analyse: Video vs Tekst vs Interaktivt

| Format | Fordeler | Ulemper | Anbefaling |
|--------|----------|---------|------------|
| **Video** | Visuelt, engasjerende, lett å følge | Tidkrevende å produsere, ikke søkbart | ✅ **Hovedformat** |
| **Tekst** | Søkbart, lett å oppdatere, tilgjengelig | Kjedelig, krever lesevilje | ✅ **Supplerende** |
| **Interaktivt** | Mest engasjerende, læring ved å gjøre | Dyrest å utvikle, teknisk komplekst | ⚠️ **Senere** |
| **Egen plattform** | Full kontroll, branding, tracking | Kostbart, vedlikehold | ❌ **Ikke nå** |

### Anbefaling: YouTube + In-app tekst

**Hvorfor:**
- YouTube: Gratis, stor rekkevidde, SEO
- In-app: Kontekstuell hjelp, alltid tilgjengelig
- Begge: Enkelt å oppdatere

**Struktur:**

```
Modul 1: Kom i gang (5 min video + in-app guide)
├── Hva er Klarpakke
├── Opprett konto
└── Første trade (lekepenger)

Modul 2: Grid-strategi (8 min video)
├── Hva er grid (metafor: støvsugere)
├── Hvorfor det fungerer
└── Sette opp ditt første grid

Modul 3: Gå live (10 min video)
├── Koble din exchange (Kraken/OKX)
├── Forskjellen leke/live
└── Første live trade

Modul 4: Risiko (6 min video)
├── Aldri invester mer enn du har råd til
├── Diversifisering
└── Når ta gevinst
```

## Teknisk arkitektur: Verktøy → Exchange

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Student   │────▶│  Klarpakke  │────▶│   Kraken    │
│  (browser)  │     │   (verktøy) │     │ (studentens │
└─────────────┘     └─────────────┘     │    konto)   │
                        │               └─────────────┘
                        │
                        ▼
                  ┌─────────────┐
                  │   Supabase  │
                  │  (kryptert  │
                  │  API-nøkkel)│
                  └─────────────┘
```

**Kritisk:** API-nøkkel har KUN trade-tilgang, ALDRI withdrawal.

## Samme trade engine: Leke → Live

**Prinsipp:** Alt er likt, kun datakilde endres.

| | Lekepenger | Live |
|---|-----------|------|
| **Datakilde** | Simulert (Kraken-priser) | Ekte (Kraken API) |
| **Engine** | GridBotStrategy | GridBotStrategy (identisk) |
| **UI** | Samme | Samme (bare badge "LIVE") |
| **Risiko** | Null | Studentens egen |

**Overgang:**
1. Student mestrer lekepenger (3 mål: 10 trades, positiv P&L, 1 uke aktiv)
2. Systemet foreslår: "Klar for live?"
3. Student kobler exchange (guide)
4. Samme strategi, nå med ekte penger

## Revidert prioritet (korrigert)

| # | Hva | Hvorfor | Status |
|---|-----|---------|--------|
| 1 | **Exchange-kobling (Kraken/OKX)** | Kritisk — uten dette fungerer ikke verktøyet | 🔴 Ikke startet |
| 2 | **Samme engine verifisert** | Kritisk — leke/live må være identisk | 🟡 Delvis |
| 3 | **Onboarding: 5 min til første trade** | Høy — førsteinntrykk | 🔴 Ikke startet |
| 4 | **Opplæringsmodul 1-4** | Høy — student må forstå | 🔴 Ikke startet |
| 5 | **Juridisk: IKKE broker** | Kritisk — må være på plass | 🔴 Ikke startet |
| 6 | **Task 5 (vektlæring)** | Middels — forbedrer verktøy | 🟡 Gate klar |
| 7 | **Task 2 (Orchestrator-LLM)** | Middels — krever KIMI_API_KEY | 🟡 Venter |

## Ressursfordeling (Tom-beslutning)

| | Andel | Fokus |
|---|-------|-------|
| **Verktøy** | **75%** | Exchange-kobling, trade engine, UI/UX, automatisering |
| **Opplæring** | **25%** | Video, tekst, onboarding, support |

**Begrunnelse:** Verktøyet må fungere perfekt før opplæring gir verdi. En student med et dårlig verktøy lærer ingenting. En student med et perfekt verktøy kan lære selv.

**Denne uken:**
1. Verifiser at leke/live bruker samme engine (test)
2. Start Exchange-kobling (Kraken først)
3. Lag onboarding-wireframe (5 min flow)

**Neste uke:**
4. Opplæringsmodul 1 (video + tekst)
5. Juridisk dokumentasjon

**Senere:**
6. Task 5/2 (når KIMI_API_KEY er klar)

---

**Spørsmål til Tom:**
1. Er freemium-modellen riktig? (gratis leke, betalt live)
2. Skal vi støtte Binance også, eller kun Kraken/OKX?
3. Hvor mye skal jeg prioritere opplæring vs verktøy? (50/50? 70/30?)
