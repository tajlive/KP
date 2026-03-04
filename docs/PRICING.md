# Klarpakke Pricing Structure

**Version:** 2.0.0  
**Last Updated:** 2026-02-20  
**Source of Truth:** Dette dokumentet er autoritativ kilde for alle prisnivåer og feature-gates.

> ⚠️ Klarpakke er en utdanningsplattform for krypto. Vi gir ikke finansråd. Alle verktøy brukes av brukerne under eget ansvar. Klarpakke har ikke tilknytning til Finanstilsynet.

---

## Oversikt

Klarpakke bruker en freemium-modell med akademisk temaet nivåsystem (Student → Bachelor → Master → Professor). Alle priser inkluderer norsk MVA.

---

## Prisnivåer

### 🎓 Student
**Pris:** 0 kr (gratis for alltid)  
**Status:** Automatisk ved registrering

| Feature | Tilgang |
|---------|--------|
| Læringsmoduler | ✅ Alle moduler |
| Quizzer | ✅ Alle unntatt Futures |
| Paper Trading (manuell) | ✅ Ubegrenset |
| **Auto Trade (paper)** | ✅ **1 strategi** |
| **Auto Trade (live)** | ❌ Ikke tilgjengelig |
| Live Trading | ❌ Ikke tilgjengelig |
| Copy Trading | ❌ Ikke tilgjengelig |
| SMS-varsler | ❌ Ikke tilgjengelig |

**Hensikt:**
- Smakebit på auto trade via paper trading
- Tydelig motivasjon til å oppgradere for live trading

---

### 📘 Bachelor
**Pris:** 249 kr/mnd (inkl. MVA)  
**Passer for:** Nybegynnere som vil prøve live trading

| Feature | Tilgang |
|---------|--------|
| Alt i Student | ✅ |
| Live Trading (Spot) | ✅ Full tilgang |
| **Auto Trade (paper)** | ✅ **1 strategi** |
| **Auto Trade (live)** | ✅ **1 strategi** |
| AI-anbefalinger | ✅ Basis |
| Stop Loss / Take Profit | ✅ Basis ordrer |
| E-postvarsler | ✅ Alle signaler |
| Push-varsler | ✅ Alle signaler |
| Copy Trading | ✅ Kan følge andre |
| SMS-varsler | ❌ Ikke inkludert |
| Limit Orders | ❌ Ikke inkludert |
| Futures | ❌ Ikke inkludert |

**Auto Trade-grenser:**
- Maks 1 aktiv strategi (paper eller live)
- Maks 3 samtidige posisjoner per strategi
- Handelsspar: Topp 20 coins (BTC, ETH + store altcoins)

---

### 🎓 Master
**Pris:** 499 kr/mnd (inkl. MVA)  
**Passer for:** Aktive tradere som vil mer fleksibilitet

| Feature | Tilgang |
|---------|--------|
| Alt i Bachelor | ✅ |
| **Auto Trade (paper)** | ✅ **3 strategier** |
| **Auto Trade (live)** | ✅ **3 strategier** |
| Utvidede markeder | ✅ Topp 100 coins |
| SMS-varsler | ✅ Inkludert |
| Limit Orders | ✅ Avanserte ordretyper |
| Prioritert support | ✅ E-post + Chat |
| Copy Trading | ✅ Kan følge + bli fulgt |

**Auto Trade-grenser:**
- Maks 3 aktive strategier totalt (paper + live kombinert)
- Maks 7 samtidige posisjoner per strategi
- Handelsspar: Topp 100 coins

**Tilleggsfordeler:**
- Tidlig tilgang til nye features
- Avanserte risikostyringsverktøy
- Egendefinerte varselgrenser

---

### 🔥 Professor
**Pris:** 1 249 kr/mnd (inkl. MVA)  
**Passer for:** Erfarne tradere

| Feature | Tilgang |
|---------|--------|
| Alt i Master | ✅ |
| **Auto Trade (paper)** | ✅ **Ubegrenset** |
| **Auto Trade (live)** | ✅ **Ubegrenset** |
| Futures Trading | ✅ Etter bestått Futures-quiz |
| Margin Trading | ✅ Aktivert |
| Auto Trade Futures | ✅ Med avanserte strategier |
| Ubegrensede posisjoner | ✅ Ingen grenser |
| Alle handelspar | ✅ Full Binance-katalog |
| API-tilgang | ✅ Full API + WebSocket |
| Hvit-hansket support | ✅ Dedikert support |
| Egendefinerte strategier | ✅ Bygg egne bots |

**Futures-tilgang krever:**
- ✅ Professor-abonnement
- ✅ Bestå Futures-quiz (85% score kreves)
- ✅ Bekreft risikoansvarsfraskrivelse

---

## Auto Trade — Komplett oversikt

| Tier | Pris | Paper Auto Trade | Live Auto Trade | Antall strategier | Maks posisjoner | Markeder |
|------|------|:---:|:---:|:---:|:---:|:---:|
| 🎓 **Student** | 0 kr | ✅ | ❌ | **1** | 1 | Topp 10 |
| 📘 **Bachelor** | 249 kr/mnd | ✅ | ✅ | **1** | 3 | Topp 20 |
| 🎓 **Master** | 499 kr/mnd | ✅ | ✅ | **3** | 7 | Topp 100 |
| 🔥 **Professor** | 1 249 kr/mnd | ✅ | ✅ | **Ubegrenset** | Ubegrenset | Alle |

> Se [AUTO-TRADE-PLAN.md](./AUTO-TRADE-PLAN.md) for full implementasjonsdetaljer.

---

## Feature-sammenligningsmatrise

| Feature | Student | Bachelor | Master | Professor |
|---------|---------|---------|--------|----------|
| **Pris** | 0 kr | 249 kr | 499 kr | 1 249 kr |
| **Spot Trading (live)** | ❌ | ✅ | ✅ | ✅ |
| **Futures Trading** | ❌ | ❌ | ❌ | ✅* |
| **Margin Trading** | ❌ | ❌ | ❌ | ✅ |
| **Auto Trade (paper)** | 1 | 1 | 3 | Ubegrenset |
| **Auto Trade (live)** | ❌ | 1 | 3 | Ubegrenset |
| **Limit Orders** | ❌ | ❌ | ✅ | ✅ |
| **Copy Trading** | ❌ | Følge | Følge + bli fulgt | Følge + bli fulgt |
| **SMS-varsler** | ❌ | ❌ | ✅ | ✅ |
| **Maks posisjoner** | 1 | 3 | 7 | Ubegrenset |
| **Coin-utvalg** | Topp 10 | Topp 20 | Topp 100 | Alle |
| **Læringsmoduler** | ✅ | ✅ | ✅ | ✅ |
| **Quizzer** | Basis | Alle | Alle | Alle |

*Krever bestått Futures-quiz

---

## Quiz-gating

### Futures-quiz
- **Kreves for:** Futures trading (Professor-tier)
- **Bestått score:** 85%
- **Forsøk:** Ubegrenset
- **Innhold:** Futures-mekanikk, likvidasjonsrisiko, marginkrav, finansieringsrater, risikostyring

### Risikostyring-quiz
- **Kreves for:** Ingenting (anbefalt)
- **Bestått score:** 80%
- **Fordel:** Lås opp avanserte risikoverktøy

---

## Årlig fakturering

Alle tiers tilbyr 2 måneder gratis ved årlig fakturering:

| Tier | Månedlig | Årlig (10 måneder) | Spart |
|------|---------|-------------------|---------|
| Bachelor | 249 kr | 2 490 kr | 498 kr |
| Master | 499 kr | 4 990 kr | 998 kr |
| Professor | 1 249 kr | 12 490 kr | 2 498 kr |

---

## Referralprogram

- **Referrer-belønning:** 100 poeng (leaderboard) + 1 måned gratis (etter at henvist bruker fullfører trial)
- **Henvist bruker:** Utvidet 7-dagers trial (21 dager totalt)

---

## Implementasjonsnotater

### Database-verdier (subscription_tier)
```
student      → Gratis tier
bachelor     → 249 kr/mnd
master       → 499 kr/mnd
professor    → 1249 kr/mnd
```

### Edge Functions
- `get-entitlements` — Sjekk brukertillatelser inkl. auto_trade_limit og live_trading_enabled
- `set-subscription-tier` — Admin tier-administrasjon
- `track-event` — Prisside-analyse

### Webflow-integrasjon
Paywall-side: `/app/paywall` (se PAYWALL.md)

---

## Endringer i prising

Endringer i prising:
1. Må oppdatere dette dokumentet
2. Krever 30 dagers varsel til eksisterende abonnenter
3. Eksisterende brukere grandfatheres i minimum 6 måneder

---

**Merk:** Alle priser i norske kroner (NOK) inkludert 25% MVA.
