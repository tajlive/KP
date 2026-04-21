# Dashboard Redesign Plan — Klarpakke
**URL:** https://www.klarpakke.no/no/dashboard  
**Dato:** 2026-04-21  
**Agent:** super-editor  
**Status:** ⏳ PLANLAGT — VENTER PÅ GODKJENNING

---

## 1. Nåværende Tilstand (Analyse)

### Hva som fungerer ✅
- Mørk, moderne UI med Coinbase-inspirert design (#0052FF brand)
- Glass-morphism og gradienter gir premium-følelse
- God mobil-responsivitet (BottomTabs + TopNav)
- Rike datavisualiseringer (Recharts portfolio-graf, stats-grid)
- Gamification (DailyChallenge, FirstTradeReward)
- Copy-trading integrasjon (TopTradersPreview)
- UpgradeGate for monetisering

### Kritiske problemer 🔴

| # | Problem | Konsekvens |
|---|---------|------------|
| P1 | **Ingen visuell hierarki** — 12+ komponenter stables vertikalt uten tydelig prioritering | Brukeren vet ikke hva de skal fokusere på først |
| P2 | **BeatTheMarket er uferdig** — viser "Kommer snart" | Virker uprofesjonelt, svekker troverdighet |
| P3 | **DashboardSidebar (291 linjer) er bygget men aldri brukt** | Død kode, vedlikeholdsbyrde |
| P4 | **3 konkurrerende CTA-er for nye brukere** (EmptyBotState, Idle Funds Nudge, FirstTradePrompt) | Overveldende, analysis-paralysis |
| P5 | **UpgradeGate wrapper HELE dashboardet** — trigger etter 5 trades | Aggressiv paywall kan føre til churn |
| P6 | **CoinbaseHome (legacy dashboard) er uopprettelig** — hardcoded `useProDashboard = true` | Død kode, forvirrende for utviklere |
| P7 | **Ingen Sanity-CMS integrasjon** — alt innhold er hardkodet | Markedsteam kan ikke endre tekst/CTA uten utvikler |
| P8 | **SimplifiedHero viser alltid "denne uken"** — ikke dynamisk per tidsperiode | Potensielt misvisende |

### Middels problemer 🟡

| # | Problem | Konsekvens |
|---|---------|------------|
| M1 | StatsGrid viser 4 kort med forskjellig info-densitet | Ubalansert visuell vekt |
| M2 | PortfolioChart laster data client-side med egen useEffect | Unødvendig kompleksitet, data kunne prefetches server-side |
| M3 | "Klar for neste nivå?" banner er generisk — ingen personalisering | Lav konvertering til betalte planer |
| M4 | LiveTradeFeed og TopTradersPreview deler samme høyre-kolonne | Høy kolonne på desktop, mye scrolling |
| M5 | Dark-theme er hardkodet — ingen light-mode støtte på dashboard | Tilgjengelighetsproblem |

---

## 2. Visjon: "Dashboard 2.0"

### Designprinsipper
1. **Hierarchy First** — Én primær CTA, støttende elementer under
2. **Progressive Disclosure** — Vis kun det som er relevant for brukerens nivå
3. **Action-Oriented** — Hver seksjon skal lede til en handling
4. **CMS-Driven** — Markedsteam kan endre innhold uten kode

### Skisse av ny layout (Desktop)

```
┌─────────────────────────────────────────────────────────────┐
│  TOP NAV (Home | Trade | Auto-Trade | AI | Portfolio | Earn)│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  HERO: Saldo + Avkastning + Primær CTA             │   │
│  │  (personaliseres basert på: ny / paper / live)     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────┐  ┌─────────────────────────┐ │
│  │  PORTFOLIO CHART         │  │  QUICK STATS (3 kort)   │ │
│  │  (1D/1W/1M/3M/1Y/ALL)   │  │  - Total avkastning     │ │
│  │                          │  │  - Win rate             │ │
│  │                          │  │  - Aktive strategier    │ │
│  └──────────────────────────┘  └─────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  SMART ACTIONS (context-aware cards)                │   │
│  │  - Ny bruker: "Start din første paper-trade"        │   │
│  │  - Paper mode: "Gå live når du er klar"             │   │
│  │  - Live mode: "Utforsk nye strategier"              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────┐  ┌─────────────────────────┐ │
│  │  LIVE TRADE FEED         │  │  TOP TRADERS            │ │
│  │  (siste 5 handler)      │  │  (copy-trading preview) │ │
│  └──────────────────────────┘  └─────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  UPGRADE BANNER (personaliseret, IKKE full blocker) │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Implementeringsplan

### Fase A: Ryddejobb (Død kode) — 1 time
**Risiko: Lav | Impact: Medium**

- [ ] **A1** Slett/fjern `CoinbaseHome` import og branch fra `DashboardContent.tsx`
- [ ] **A2** Slett `DashboardSidebar.tsx` (eller flytt til `archive/`)
- [ ] **A3** Slett `BeatTheMarket.tsx` — erstatt med noe nyttig eller fjern helt
- [ ] **A4** Fjern `useProDashboard` state — alltid rendre DashboardPro

**Filer:**
- `src/features/dashboard/DashboardContent.tsx`
- `src/features/dashboard/DashboardSidebar.tsx` → `archive/dashboard-components/`
- `src/features/dashboard/BeatTheMarket.tsx` → slett

---

### Fase B: Sanity-CMS Integrasjon — 2 timer
**Risiko: Medium | Impact: Høy**

- [ ] **B1** Opprett nytt Sanity schema `dashboardContent` (singleton)
  - Felter: heroTitle, heroCta, upgradeBannerText, upgradeBannerCta, smartActions[]
- [ ] **B2** Opprett Sanity-dokument i draft
- [ ] **B3** Hent dashboard-innhold server-side i `page.tsx`
- [ ] **B4** Erstatt hardkodet tekst i DashboardPro med Sanity-data

**Filer:**
- `src/sanity/schemaTypes/dashboardContent.ts` (ny)
- `src/sanity/schemaTypes/index.ts` (oppdater)
- `src/lib/sanity/queries.ts` (legg til GROQ)
- `src/app/[locale]/(user)/dashboard/page.tsx` (oppdater data fetch)
- `src/features/dashboard/DashboardPro.tsx` (erstatt hardkodet tekst)

---

### Fase C: Ny Hero + Smart Actions — 2 timer
**Risiko: Medium | Impact: Høy**

- [ ] **C1** Refaktorer `SimplifiedHero`:
  - Fjern "denne uken" (ikke dynamisk)
  - Vis session-mode badge (Paper / Live)
  - Større saldo, mindre subtext
- [ ] **C2** Lag ny komponent `SmartActions`:
  - Én kort rad (1-3 kort) basert på brukerens tilstand
  - Ny bruker: "Start Paper Trading" → `/dashboard/trade?mode=paper`
  - Paper aktiv: "Gå Live" → `/dashboard/trade?mode=live`
  - Live aktiv: "Utforsk Strategier" → `/dashboard/auto-trade`
- [ ] **C3** Fjern konkurrerende CTA-er:
  - `FirstTradePrompt` → integrer i SmartActions
  - `Idle Funds Nudge` → integrer i SmartActions
  - `EmptyBotState` → behold som fallback, men mindre prominent

**Filer:**
- `src/features/dashboard/SimplifiedHero.tsx` (refaktorer)
- `src/features/dashboard/SmartActions.tsx` (ny)
- `src/features/dashboard/DashboardPro.tsx` (oppdater rekkefølge)

---

### Fase D: Stats + Chart Forbedringer — 1.5 timer
**Risiko: Lav | Impact: Medium**

- [ ] **D1** Reduser StatsGrid fra 4 til 3 kort:
  - Total avkastning (highlight)
  - Win rate
  - Kontobalanse
- [ ] **D2** Fjern Trade Count fra StatsGrid (vises i hero-subtext isteden)
- [ ] **D3** Prefetch portfolio-data server-side i `page.tsx`
- [ ] **D4** Forbedre PortfolioChart loading state (skeleton, ikke spinner)

**Filer:**
- `src/features/dashboard/StatsGrid.tsx` (reduser til 3 kort)
- `src/features/dashboard/PortfolioChart.tsx` (skeleton loading)
- `src/app/[locale]/(user)/dashboard/page.tsx` (server-side data prefetch)

---

### Fase E: Upgrade Banner (ikke blocker) — 1 time
**Risiko: Medium | Impact: Medium**

- [ ] **E1** Fjern `UpgradeGate` fra å wrappe HELE dashboardet
- [ ] **E2** Lag ny `UpgradeBanner` komponent:
  - Horisontal banner (ikke full-screen blocker)
  - Viser etter 5 trades men lar brukeren fortsette
  - Personalisert: "Du har gjort 5 trades på paper — klar for live?"
- [ ] **E3** Plasser banner øverst eller nederst i layout

**Filer:**
- `src/features/dashboard/DashboardPro.tsx` (fjern UpgradeGate wrapper)
- `src/features/payments/UpgradeBanner.tsx` (ny — lettere variant)
- `src/features/payments/UpgradeGate.tsx` ( behold for andre sider)

---

### Fase F: Polish + Responsive — 1.5 timer
**Risiko: Lav | Impact: Medium**

- [ ] **F1** Forbedre mobil-layout:
  - SmartActions: horizontal scroll på mobil
  - Stats: 2×2 grid på mobil (ikke 4 i bredden)
- [ ] **F2** Ensarte border-radius (bruk `RADIUS.card` overalt)
- [ ] **F3** Ensarte padding/margins (følg spacing tokens)
- [ ] **F4** Ta screenshots (desktop + mobil) og sammenlign

**Filer:**
- `src/features/dashboard/DashboardPro.tsx` (responsive tweaks)
- Diverse komponenter (border-radius, spacing)

---

## 4. Endringslogg (Hva brukeren vil merke)

| Før | Etter |
|-----|-------|
| 12+ komponenter i ustrukturert stakk | 5 tydelige seksjoner med hierarki |
| "Kommer snart" kort | Fjernet eller erstattet med funksjonell widget |
| 3 konkurrerende CTA-er for nye brukere | 1 Smart Actions-rad med context-aware forslag |
| Full-screen paywall etter 5 trades | Diskret banner som ikke blokkerer |
| Hardkodet all tekst | CMS-drevet innhold (marked kan endre) |
| "denne uken" (alltid) | Dynamisk tidsperiode eller fjernet |
| Sidebar bygget men usynlig | Fjernet (ryddigere kodebase) |

---

## 5. Teknisk Risiko & Mitigasjon

| Risiko | Sannsynlighet | Mitigasjon |
|--------|---------------|------------|
| Sanity-schema endring påvirker eksisterende Studio | Lav | Singleton — påvirker ikke andre dokumenter |
| Server-side data prefetch øker TTFB | Lav | Bruker `Promise.all`, cache med `unstable_cache` |
| Mobil-layout brekker | Medium | Test på flere viewports, screenshots før push |
| Brukere savner "Kommer snart"-funksjonalitet | Null | Ingen brukte den — den var uferdig |
| UpgradeGate-fjerning reduserer konvertering | Medium | A/B-test: banner vs gate etter lansering |

---

## 6. Filer som endres

### Nye filer
```
src/sanity/schemaTypes/dashboardContent.ts      # Nytt Sanity schema
src/features/dashboard/SmartActions.tsx         # Context-aware CTA-rad
src/features/payments/UpgradeBanner.tsx         # Ikke-blokkerende banner
```

### Endrede filer
```
src/sanity/schemaTypes/index.ts                 # Registrer nytt schema
src/lib/sanity/queries.ts                       # GROQ for dashboardContent
src/app/[locale]/(user)/dashboard/page.tsx      # Server-side data fetch
src/features/dashboard/DashboardContent.tsx     # Fjern CoinbaseHome
src/features/dashboard/DashboardPro.tsx         # Ny layout + Sanity-data
src/features/dashboard/SimplifiedHero.tsx       # Refaktorer hero
src/features/dashboard/StatsGrid.tsx            # Reduser til 3 kort
src/features/dashboard/PortfolioChart.tsx       # Skeleton loading
```

### Slettede/flyttede filer
```
src/features/dashboard/BeatTheMarket.tsx        → slett
src/features/dashboard/DashboardSidebar.tsx     → archive/
src/features/dashboard/FirstTradePrompt.tsx     → slett (integrert i SmartActions)
src/features/dashboard/IdleFundsNudge.tsx       → slett (integrert i SmartActions)
```

---

## 7. Godkjennings Sjekkliste

Før jeg starter implementering, bekreft:

- [ ] **Skal jeg gå videre med ALLE faser (A-F)?** Eller kun spesifikke?
- [ ] **Skal BeatTheMarket fjernes helt, eller erstattes?** (f.eks. med en "Markedsindeks"-widget)
- [ ] **Skal UpgradeGate fjernes som full-blocker?** (anbefalt: ja)
- [ ] **Skal Sanity-CMS integrasjon prioriteres?** (anbefalt: ja — gir marked fleksibilitet)
- [ ] **Er det noe spesifikt du vil beholde fra nåværende design?**

---

## Status: ⏳ VENTER PÅ GODKJENNING

**Estimert tid:** 8-9 timer (alle faser)  
**Kan deles opp:** Ja — hver fase kan gjennomføres uavhengig  
**Anbefalt start:** Fase A (ryddejobb) + Fase C (Smart Actions) — gir mest visuell impact per time

**Si "ja, alle faser" eller spesifiser hvilke du vil ha!**
