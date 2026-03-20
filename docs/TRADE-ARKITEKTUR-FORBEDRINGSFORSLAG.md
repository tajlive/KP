# Trade-arkitektur: Forbedringsforslag

**Rolle:** Hovedarkitekt  
**Dato:** 2026-03-19  
**Bakgrunn:** Analyse av alle trade-relaterte sider, komponenter og datakilder

---

## 1. Nåværende tilstand: Trade-sider og routing

### 1.1 Oversikt over trade-relaterte ruter

| Route                                  | Komponent                 | Datakilde                       | Formål                                                          |
| -------------------------------------- | ------------------------- | ------------------------------- | --------------------------------------------------------------- |
| `/[locale]/dashboard`                  | PortfolioDashboard        | trades, trading_sessions        | Oversikt, siste handler, posisjoner, lenke til handelshistorikk |
| `/[locale]/paper-trading`              | PaperTradingPageClient    | trading_sessions                | Liste over sessions; lenke til opprett session                  |
| `/[locale]/paper-trading/[session_id]` | PaperTradingSessionDetail | trades, trading_sessions        | Enkelt session med handler                                      |
| `/[locale]/trade`                      | TradingInterface          | trades (via API)                | Manuelt kjøp/salg                                               |
| `/[locale]/handelshistorikk`           | ClientHandelshistorikk    | trades                          | Full handelshistorikk, filter paper/live                        |
| `/[locale]/dashboard/activity`         | OrderHistory              | trades                          | Siste 10 handler                                                |
| `/[locale]/dashboard/auto-trade`       | BotWizard                 | user_profiles, trading_sessions | Auto-trade oppsett og start                                     |
| `/[locale]/dashboard/bot/[session_id]` | BotDetailView             | trades, trading_sessions        | Bot-session med handler                                         |
| `/[locale]/dashboard/trading`          | **(redirect)**            | —                               | → paper-trading                                                 |
| `/[locale]/dashboard/portfolio`        | Server page               | wallets                         | Kun lommebøker, ingen handler                                   |
| `/[locale]/dashboard/tax-report`       | TaxReportClient           | **auto_trades** (API)           | Skatterapport – bruker kun auto_trades                          |
| `/[locale]/live-trading`               | **(redirect)**            | —                               | → paper-trading?mode=live                                       |
| `/[locale]/auto-trading`               | **(redirect)**            | —                               | → dashboard/auto-trade                                          |
| `/[locale]/beta/auto-trade`            | ClientBetaAutoTrade       | user_profiles                   | Beta auto-trade                                                 |
| `/[locale]/beta/dashboard`             | BetaDashboardClient       | **auto_trades**                 | Beta-dashboard                                                  |
| `/[locale]/beta/live-trading`          | LiveTradingClient         | —                               | Beta live-trading                                               |
| `/[locale]/copy-trading`               | CopyTradingDashboard      | —                               | Kopier trading                                                  |

### 1.2 Navigasjon – hva brukeren ser

**Sidebar (desktop):**

- Hjem → `/dashboard`
- Lær → `/kurs`
- Auto-trade → `/dashboard/auto-trade`
- Profil → `/profile`
- Innstillinger → `/dashboard/settings`

**Mangler i sidebar:** Paper-trading, Handelshistorikk, Activity

**Mobil (DashboardTabs):**

- Hjem → `/dashboard`
- Lær → `/kurs`
- Øv → `/paper-trading`
- Profil → `/profile`

**Konsekvens:** Handelshistorikk nås kun via "Se alle" på dashboard. Dashboard/activity har ingen direkte lenke.

---

## 2. Identifiserte problemer

### 2.1 Fragmentert handelshistorikk (3 steder, samme data)

| Sted                | Komponent              | Datakilde | Antall           |
| ------------------- | ---------------------- | --------- | ---------------- |
| /handelshistorikk   | ClientHandelshistorikk | trades    | Alle (limit 200) |
| /dashboard/activity | OrderHistory           | trades    | Siste 10         |
| /dashboard          | PortfolioDashboard     | trades    | Siste 6          |

**Problem:** Tre ulike UIs for samme `trades`-tabell; ingen felles komponent.

### 2.2 TradeHistory bruker Zustand (ikke DB)

`components/trading/TradeHistory.tsx` leser fra `useTradingStore().trades` – lokalt state fra openPosition/closePosition. Den brukes ikke på hoveddashboard (PortfolioDashboard har egen blokk). **Forslag:** Fjern eller koble til `trades` i DB.

### 2.3 Dupliserte paper-trade API-er

| API                             | Input                                 | Brukt av                         |
| ------------------------------- | ------------------------------------- | -------------------------------- |
| POST /api/paper-trading/execute | pair, side, amount_nok                | TradingInterface, FirstTradeCard |
| POST /api/paper-trading/trade   | symbol, side, quantity, price, botId? | PaperTradeButton                 |

Begge kaller executePaperTrade med ulik request-struktur. **Forslag:** Konsolider til én endpoint med validering.

### 2.4 Skatterapport bruker kun auto_trades

`/dashboard/tax-report` henter fra `auto_trades`. Brukere med kun manuelle handler (trades) får tom rapport. **Forslag:** Inkluder `trades` i skatterapport, eller samle i én "unified" trade-visning.

### 2.5 Ubrukte/foreldede komponenter

| Komponent                | Fil                                               | Status                                               |
| ------------------------ | ------------------------------------------------- | ---------------------------------------------------- |
| ClientAutoTradeDashboard | dashboard/auto-trade/ClientAutoTradeDashboard.tsx | **Ikke brukt** – side bruker BotWizard               |
| ClientDashboard          | dashboard/ClientDashboard.tsx                     | **Ikke brukt** – dashboard bruker PortfolioDashboard |
| TradeHistory             | trading/TradeHistory.tsx                          | Bruker Zustand; usikker bruk                         |

### 2.6 Naming-inconsistens

| Konsept          | Varianter                                    |
| ---------------- | -------------------------------------------- |
| Handelshistorikk | handelshistorikk, OrderHistory, TradeHistory |
| Paper trading    | paper-trading, paper_trading, paperTrading   |
| Auto-trade       | auto-trade, auto-trading, auto_trade         |

---

## 3. Anbefalte forbedringer

### Prioritet 1: Konsolider handelshistorikk

**Mål:** Én kilde til sannhet for å vise handler.

1. **Opprett felles komponent** `TradeHistoryTable` som:
   - Henter fra `trades` (RLS sikrer user)
   - Tar props: `limit?`, `sessionId?`, `modeFilter?`
   - Gjenbrukes av handelshistorikk, dashboard, activity, bot-detalj

2. **Unifiser ruter:**
   - `/handelshistorikk` = full historikk (eksisterende, men bruk TradeHistoryTable)
   - `/dashboard` = kun snippet (siste 6) – behold, men bruk samme komponent
   - **Vurdér:** Slå sammen `/dashboard/activity` med `/handelshistorikk` eller legg activity som "faner" på handelshistorikk

3. **Legg handelshistorikk i sidebar** som egen lenke (f.eks. "Historikk" eller "Handler")

### Prioritet 2: Forbedre navigasjon

1. **Sidebar:** Legg til:
   - "Handle" / "Øv" → `/paper-trading` (kan erstatte eller supplere "Øv" i mobil-tabs)
   - "Handelshistorikk" → `/handelshistorikk`

2. **Fjern eller dokumenter** `/dashboard/activity` – hvis den beholdes, legg tydelig lenke i sidebar eller under "Handelshistorikk".

3. **Én trading-entry:** Behold policy "én trading-side = /paper-trading" (trading, live-trading redirecter dit). Oppdater alle lenker.

### Prioritet 3: Data og API

1. **Konsolider paper-trade API:** Én `POST /api/paper-trading/execute` som godtar både `amount_nok` og `quantity` (med validering).

2. **Skatterapport:** Utvid til å inkludere `trades` (manuelle paper/live) i tillegg til `auto_trades`, eller dokumenter at kun auto-trade handler rapporteres.

3. **Rydde opp:** Fjern eller arkiver `ClientAutoTradeDashboard` og `ClientDashboard` hvis de ikke brukes. Vurder å fjerne `TradeHistory` (Zustand) eller koble den til DB.

### Prioritet 4: Beta og copy-trading

1. **Beta-ruter** (`/beta/*`) – vurdér om de skal væresync med hovedarkitekturen eller fase ut når beta er ferdig.

2. **Copy-trading** – sikre at copy-trades skrives til `trades` (med is_copy) så de vises i handelshistorikk.

### Prioritet 5: Navngivning og dokumentasjon

1. Fastsett konvensjon: `paper-trading` (URL), `paperTrading` (camelCase i kode), `paper_trading` (DB-kolonner).
2. Oppdater `ARCHITECTURE.md` (eller opprett) med trade-flow diagram.
3. Dokumenter: "Én trading-side = /paper-trading" i `.cursorrules` eller docs.

---

## 4. Forslag til endelig rute-struktur

```
/dashboard              → PortfolioDashboard (oversikt, siste 6 handler)
/dashboard/auto-trade   → BotWizard (auto-trade oppsett)
/dashboard/bot/[id]     → BotDetailView (bot-session)
/dashboard/handelshistorikk  → Redirect til /handelshistorikk ELLER embed
/handelshistorikk       → Full historikk (TradeHistoryTable)
/paper-trading          → Session-liste + opprett
/paper-trading/[id]     → Session-detalj + TradingInterface
/trade                  → TradingInterface (kan redirect til paper-trading med session?)
```

**Alternativ:** Flytt `/handelshistorikk` inn under dashboard: `/dashboard/handelshistorikk` – da blir alt trading under `/dashboard` og `/paper-trading`.

---

## 5. Implementeringsrekkefølge

| Fase | Handling                                                         | Estimert |
| ---- | ---------------------------------------------------------------- | -------- |
| 1    | Opprett `TradeHistoryTable`, bruk i handelshistorikk + dashboard | Liten    |
| 2    | Legg handelshistorikk i sidebar                                  | Triviell |
| 3    | Slå sammen /dashboard/activity med handelshistorikk ELLER fjern  | Liten    |
| 4    | Konsolider paper-trade API                                       | Medium   |
| 5    | Utvid skatterapport med trades                                   | Medium   |
| 6    | Rydde ubrukte komponenter                                        | Liten    |
| 7    | Dokumentasjon og navngivning                                     | Liten    |

---

## 6. Agent-oppgaver (fordeling)

| Agent/Verktøy      | Oppgave                                                           |
| ------------------ | ----------------------------------------------------------------- |
| **Explore**        | Verifiser at alle lenker til trade-sider er oppdatert             |
| **Debug**          | Test at handelshistorikk viser alle brukerens trades (paper+live) |
| **GeneralPurpose** | Implementer TradeHistoryTable og refaktor bruk                    |
| **ComputerUse**    | Manuell UX-test av navigasjon og første-handelsflyt               |

---

_Sist oppdatert: 2026-03-19_
