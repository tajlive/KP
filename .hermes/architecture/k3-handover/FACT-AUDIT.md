# FACT-AUDIT.md — Alle tall og påstander på klarpakke.no

> **Generert:** 2026-07-27 18:11
> **Regel:** Hvert tall på siten må kunne spores til en datakilde. Ingen unntak.
> **Status:** 🔴 RØD = falsk, må fikses | 🟡 GUL = trenger verifisering | 🟢 GRØNN = verifisert

---

## 1. Avkastningstall

| # | Påstand | Side | Datakilde | Verifisert verdi | Status |
|---|---|---|---|---|---|
| 1.1 | "+343% for våre beste brukere" | Hero (landing.hero.subtitle) | `paper_accounts` → topp real bruker (eb292ddd): 421 386 kr / 100 000 kr start = **+321%** | +321% | 🔴 **FEIL** — faktisk topp-avkastning er +321%, ikke +343%. Tallet må oppdateres til +321% eller dynamisk hentes fra DB. |
| 1.2 | "+122%, +78.5%" i arch-spec sketches | pages/homepage.md (kun arkitektur-fil, ikke produksjon) | Ikke deployet — kun i spec | N/A | 🟢 **OK** — ikke i produksjon, kun arkitektur-spec. SOCIALPROOF KOMPONENTEN HENTER IKKE DATA ENDA. |

---

## 2. Leaderboard

| # | Påstand | Side | Datakilde | Verifisert verdi | Status |
|---|---|---|---|---|---|
| 2.1 | "Anne Mo" på leaderboard | leaderboard_bots | `leaderboard_bots` tabell, display_name = "Anne Mo" (user_id: 7734a444) | AI-generert navn | 🔴 **FAKE** — Anne Mo, Kari Aas, Trond Dal m.fl. er AI-genererte navn i seed-data. 11 av 11 rader i `leaderboard_bots` har AI-genererte navn. |
| 2.2 | Leaderboard-avkastningstall | Dashboard/widget | `leaderboard_bots.pnl_30d` | Varierende — Anne Mo: +2 697 493 kr (2.7M) | 🔴 **FAKE** — PnL-tallene i leaderboard_bots er seed-data, ikke ekte handler. Disse brukerne har IKKE disse resultatene i `trades`-tabellen. |
| 2.3 | "Verifisert trader" badge | SocialProof komponent | `trader_verifications` (0 rader) | Ingen verifiserte tradere | 🔴 **TOMT** — Ingen tradere er verifisert. Komponenten viser en badge som ikke er støttet av data. |
| 2.4 | 37 ekte brukere i user_profiles | DB | `user_profiles` (ekskl. bot-prefiks) | 37 | 🟢 **OK** |

---

## 3. Testimonials

| # | Påstand | Side | Datakilde | Verifisert verdi | Status |
|---|---|---|---|---|---|
| 3.1 | "Marius L." | Testimonials.tsx:22 | Hardkodet i komponent | AI-generert navn og sitat | 🔴 **FAKE** — Linje 6: "AI-generert for nå". Må erstattes med ekte brukerhistorikk eller fjernes. |
| 3.2 | "Sigrid H." | Testimonials.tsx:32 | Hardkodet i komponent | AI-generert navn og sitat | 🔴 **FAKE** — Samme problem. |
| 3.3 | Disclaimer | Testimonials.tsx:121 | "AI-generert for demonstrasjonsformål" | Disclaimer finnes | 🟡 **UTILSTREKKELIG** — Disclaimer hjelper ikke når testimonials fremstilles som ekte brukere med norske navn og konkrete sitater. |

---

## 4. Teller-påstander

| # | Påstand | Side | Datakilde | Verifisert verdi | Status |
|---|---|---|---|---|---|
| 4.1 | "100+ fornøyde studenter" | CredibilityHighlights.tsx:126 | `user_profiles`: 37 ekte brukere | 37 | 🔴 **FEIL** — 37 ≠ 100+. Må oppdateres til "37+ brukere" eller fjernes helt til 100 er nådd. |
| 4.2 | "65 000 kroner tapt" | messages/no.json:20 (aboutUs.story.part1) | Personlig historie (Tom) | Personlig — kan ikke DB-verifiseres | 🟡 **PERSONLIG** — Dette er Toms personlige historie, ikke en markedsføringspåstand. OK så lenge den er sann (eier bekrefter). |
| 4.3 | "64 000 kr" i gammel hero | messages/no.json:2187 (hero.titleLine1) | Ikke i bruk lenger — ny hero bruker `landing.hero` namespace | N/A | 🟢 **OK** — Gammel hero-tekst er ikke aktiv på forsiden. Kan ryddes ved anledning. |

---

## 5. AI-agent-data

| # | Påstand | Side | Datakilde | Verifisert verdi | Status |
|---|---|---|---|---|---|
| 5.1 | "8 av 12 agenter stemte BUY på SOL" | AgentVotes komponent (ny) | `market_intelligence` tabell — 47 rader, men agent_votes-feltet? | Må sjekke om data finnes | 🟡 **MÅ VERIFISERES** — AgentVotes-komponenten er ny og må testes med reell data fra `/api/jokertrade`. Hvis `market_intelligence` ikke har agent_votes-data enda: skjul komponenten. |
| 5.2 | CryptoPilot 12-agent ensemble | JokerTrade API | `market_intelligence` har 47 rader med analyse-data | Data finnes | 🟢 **OK** — API-et produserer reelle analyser. |

---

## 6. Priser og P&L

| # | Påstand | Side | Datakilde | Verifisert verdi | Status |
|---|---|---|---|---|---|
| 6.1 | Live priser (BTC, ETH, SOL) | HeroSection, LivePriceTicker | CoinGecko API, 30s intervall | Bekreftet i kode (PriceTicker.tsx:57-70) | 🟢 **OK** |
| 6.2 | P&L i dashboard | Dashboard | `trades.realized_pnl` — aggregert per bruker | Reelle beregninger | 🟢 **OK** |
| 6.3 | P&L i JokerTrade posisjonskort | PositionCard (ny) | `/api/jokertrade` GET returnerer posisjoner fra `paper_positions` (212 rader) | Reelle data | 🟢 **OK** |

---

## 7. Spesifikke tall fra arkitektur-spec (K3 output)

| # | Påstand | Kilde i spec | Status |
|---|---|---|---|
| 7.1 | "+343%" i i18n-tekst | homepage.md:94 → messages/no.json:2233 | 🔴 **FEIL** (se 1.1) |
| 7.2 | "+122%, +78.5%" i sketch | homepage.md:46 (wireframe) | 🟢 **OK** — kun i arkitektur-spec, ikke deployet |
| 7.3 | "100 000 kr" paper-balance | Alle sider | 🟢 **OK** — standard start-beløp, korrekt |
| 7.4 | "12 agenter" | JokerTrade-sider | 🟢 **OK** — reelt antall CryptoPilot-agenter |
| 7.5 | "30 sekunder" oppsett | JokerTrade hero | 🟡 **Vanskelig å måle** — markedsføringsestimat, ikke verifiserbart tall |

---

## OPPSUMMERING — Hva må fikses NÅ

| Pri | Problem | Handling |
|---|---|---|
| 🔴🔴 | **+343% er feil** — faktisk topp er +321% | Oppdater `landing.hero.subtitle` i alle 4 locale-filer til "+321%" ELLER hent dynamisk fra DB |
| 🔴🔴 | **Leaderboard er 100% fake** — 11 AI-genererte navn | Enten: (a) bytt ut `leaderboard_bots` med ekte topp-tradere fra `trades` + `paper_accounts`, eller (b) fjern leaderboard-komponenten |
| 🔴 | **Testimonials er AI-generert** | Fjern `Testimonials.tsx` fra JokerTrade-siden, eller erstatt med ekte brukerhistorikk |
| 🔴 | **"100+ studenter" er feil** — faktisk 37 | Endre til "37+ brukere" i `CredibilityHighlights.tsx:126` ELLER fjern påstanden |
| 🟡 | **AgentVotes-komponenten** må testes med ekte data | Skjul komponenten hvis `market_intelligence` ikke har agent_votes-feltet |
| 🟡 | **SocialProof-komponenten** henter ikke data enda | Enten koble til ekte leaderboard-API, eller fjern komponenten midlertidig |

---

## Hvordan lese denne tabellen

- **🔴 RØD** = Må fikses før eller umiddelbart etter neste deploy. Dette er falske påstander som vises for brukere.
- **🟡 GUL** = Bør verifiseres eller forbedres, men er ikke aktivt misvisende.
- **🟢 GRØNN** = Verifisert mot datakilde — ingen handling nødvendig.
