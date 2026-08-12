# P0 READ-ONLY INCIDENT — Systemisk pengeintegritet

**Dato:** 2026-08-12  
**Status:** Read-only kartlegging ferdig — venter på Tom-godkjenning  
**Forfatter:** Hermes Agent  
**Scope:** Alle pengerelaterte flater, ruter, datakilder  
**Live trading:** Intern dogfood — kun `tomarnejensen@gmail.com` (`0dd08529`). Alle andre: kun paper.
**Siste beslutning:** Tom 2026-08-12 — live trading sperres for alle unntatt testkonto.

---

## 1. BLAST RADIUS

| Layer | Antall berørte | Detaljer |
|---|---|---|
| Pengerelaterte API-ruter | ~35 | dashboard, portfolio, cockpit, leaderboard, trades, pilot, kraken, admin |
| Pengerelaterte UI-sider | 8 | Dashboard, Portefølje, Handel, Historikk, Resultater, Leaderboard, Pilot, Admin |
| Pengerelaterte DB-tabeller | 7 | paper_accounts, trading_sessions, trades, kraken_live_state, user_kraken_keys, user_okx_keys, user_profiles |
| pg_cron-jobber (penger) | 5 | kraken-balance-sync, hourly_balance_sync, balance-drift-check, tick, autopilot-orchestrator |
| Divergerende saldo-definisjoner | 4 | paper_accounts, sessions-sum, OKX live API, enkeltsesjons-kapital |
| Valutatyper i omløp | 4 | NOK, USDC, USDT, crypto (BTC/SOL/etc.) |
| Døde/misvisende datakilder | 3 | kraken_live_state (Kraken-nøkkel død), KrakenMarketDataProvider (brukes for priser), autopilot-orchestrator (Kraken-only) |

---

## 2. MONEY SURFACE MAP

### 2.1 Dashboard (`/dashboard`)

| Vist tall | API-kilde | Datakilde | Valuta | Cache | Statusfilter | Merknad |
|---|---|---|---|---|---|---|
| **Saldo (hero)** | `/api/dashboard/metrics?mode=paper` | `paper_accounts.current_balance` | NOK | 5s | N/A (SSoT) | OK når synk fungerer |
| **Saldo (hero, live)** | `/api/dashboard/metrics?mode=live` | `getOkxLiveBalance()` → eea.okx.com LIVE | NOK (USDC×rate) | Ingen (live) | N/A | ⚠️ Ingen DB-synk — kun live API |
| **Total P&L** | `/api/dashboard/metrics` | `get_dashboard_metrics` RPC | NOK | 5s/15s | `sessionStatusesForScope(scope)` | Med CONTAMINATION_CUTOFF |
| **Total avkastning** | Beregnet i UI | `totalPnl / startingCapital` | % | — | — | DashboardPro linje 186 |
| **Total kapital** | `/api/dashboard/metrics` | RPC `total_capital` | NOK | 5s/15s | CAPITAL_STATUSES = `["active"]` | ⚠️ Kun aktive sesjoner |
| **Investert kapital** | `/api/dashboard/metrics` | `getAccountBalance()` → `open_position` på aktive+pausede | NOK | 5s | active+paused | — |
| **Bot-status** | `/api/dashboard/bot-status` | `trading_sessions` direkte | NOK | — | active | — |
| **Kraken Live Card** | `/api/kraken/live-state` | `kraken_live_state` tabell | USDC | — | N/A | 🔴 DØD — Tom har ingen aktiv Kraken-nøkkel |

### 2.2 Portefølje (`/portfolio`)

| Vist tall | API-kilde | Datakilde | Valuta | Statusfilter | Merknad |
|---|---|---|---|---|---|
| **Saldo** | `/api/portfolio/summary` | `paper_accounts.current_balance` (primær) | NOK | — | Fallback: sessions-sum m/ 1.5× cap |
| **Posisjoner** | `/api/portfolio/summary` | `trades` i `liveSessionIds` (active+paused) | NOK | archived=false, active+paused | ⚠️ Stoppede ekskludert — korrekt |
| **Total P&L** | `/api/portfolio/summary` | `cleanTradeStats()` via `getCleanTrades()` | NOK | Alle ikke-arkiverte | Med cutoff 2026-07-30 + oversell-clamp |
| **Win rate** | `/api/portfolio/summary` | `cleanTradeStats()` | % | Alle ikke-arkiverte | Samme cutoff |
| **Investert** | `/api/portfolio/summary` | Posisjoners qty × avgBuyPrice | NOK | active+paused | Beregnet i route |
| **Graf** | `/api/portfolio/chart` | — | NOK | — | Separat rute |

### 2.3 Trading Cockpit (`/handel`)

| Vist tall | API-kilde | Datakilde | Valuta | Statusfilter | Merknad |
|---|---|---|---|---|---|
| **Oversikt KPI** | `/api/trading-cockpit/metrics` | RPC-basert | NOK | Param-drevet | totalCapital, totalPnl, winRate |
| **Trades** | `/api/trading-cockpit/trades` | `get_trades_paginated` RPC | NOK | Param-drevet (sessionStatus) | Støtter paper+live |
| **Sesjoner** | `/api/trading-cockpit/sessions` | `trading_sessions` | NOK | Param-drevet | — |
| **Analytics** | `/api/trading-cockpit/analytics` | `get_trading_analytics` RPC | NOK | Param-drevet | — |

### 2.4 Leaderboard (`/leaderboard`)

| Vist tall | API-kilde | Datakilde | Valuta | Statusfilter | Merknad |
|---|---|---|---|---|---|
| **Avkastning %** | `/api/leaderboard` | Sessions-sum (3× cap) → paper_accounts fallback | NOK | active+paused | ⚠️ Primærkilde er sessions, IKKE paper_accounts (SSoT) |
| **Win rate** | `/api/leaderboard` | `trading_stats` | % | — | — |
| **Antall handler** | `/api/leaderboard` | `trading_stats.total_trades` | — | — | — |
| **Startkapital** | `/api/leaderboard` | `paper_accounts.initial_balance` | NOK | — | Fallback 100 000 |

### 2.5 Historikk (`/resultater`)

| Vist tall | API-kilde | Datakilde | Valuta | Statusfilter | Merknad |
|---|---|---|---|---|---|
| **Trades (ledger)** | `/api/user/trades` | `trades` i ALLE sesjoner | Blandet | INGEN (ledger) | Korrekt — ledger mister aldri rader |
| **Posisjoner** | `/api/user/trades` | `computePositionsFromTrades()` kun fra active+paused | NOK | active+paused | ⚠️ Priser hentes fra **Kraken**MarketDataProvider |
| **Urealisert P&L** | `/api/user/trades` | `marketValue - costBasis` | NOK | active+paused | Pris via Kraken → null hvis Kraken nede |

### 2.6 Resultater (trading analytics)

| Vist tall | API-kilde | Datakilde | Valuta | Statusfilter | Merknad |
|---|---|---|---|---|---|
| **Analytics** | `/api/user/trading-analytics` | `getCleanTrades()` + `buildTradingAnalytics()` | NOK | Med cutoff | Samme cutoff som portfolio |

### 2.7 Paper Trading

| Vist tall | API-kilde | Datakilde | Valuta | Statusfilter | Merknad |
|---|---|---|---|---|---|
| **Saldo** | `/api/paper-trading/balance` | `session.current_capital_nok` (ÉN sesjon) | NOK | én aktiv paper-sesjon | ⚠️ Annen kilde enn dashboard |
| **Posisjon** | `/api/paper-trading/balance` | `session.open_position` + `coin_prices` | NOK | — | — |

### 2.8 Admin

| Vist tall | API-kilde | Datakilde | Valuta | Merknad |
|---|---|---|---|---|
| **Paper-saldo (set)** | `/api/admin/user-paper-balance` | `user_profiles.paper_balance` + `trading_sessions` + `syncPaperAccountBalance` | NOK | Skriver til 3 tabeller |
| **Kill switch status** | `/api/admin/kill-switch` GET | `user_kraken_keys` (kun!) | — | 🔴 Teller IKKE OKX-brukere |
| **Kill switch aktiver** | `/api/admin/kill-switch` POST | Kraken + OKX (begge) | — | Korrekt — dekker begge exchanges |

---

## 3. AUTORITATIV KONTRAKT PER MODUS

### 3.1 Paper-modus

```
SSoT: paper_accounts.current_balance
  ↑ synkroniseres av syncPaperAccountBalance() hver tick (5. min)
  ↑ summerer current_capital_nok fra active+paused paper-sessions
  ↑ blokkert hvis sum > 1.5× totalInitial (sanity cap)

P&L: get_dashboard_metrics RPC (med CONTAMINATION_CUTOFF 2026-07-30)
  ELLER cleanTradeStats() via getCleanTrades() (portfolio/trading-analytics)

Startkapital: paper_accounts.initial_balance (100 000 default)

Posisjoner: trades i liveSessionIds (active+paused) — IKKE stoppede
```

### 3.2 Live-modus (OKX)

```
Saldo: getOkxLiveBalance() → eea.okx.com LIVE API
  ⚠️ INGEN DB-lagring — hver dashboard-innlasting = nytt API-kall
  ⚠️ INGEN historisk tracking av OKX-saldo
  ⚠️ INGEN OKX trade-synk til DB

P&L: get_dashboard_metrics RPC (fra trading_sessions, ikke OKX)
  ⚠️ Sessions-basert P&L ≠ OKX-basert P&L

Kapital: RPC total_capital (kun aktive sessions)
  ⚠️ Kan avvike fra OKX-saldo

Startkapital: Første live-sesjons starting_capital_nok (kan være 0)
```

### 3.3 Valutakontrakt

| Kontekst | Valuta | Kilde |
|---|---|---|
| Paper trading (alt) | NOK | Alle paper-priser er NOK (USDT × 9.6 rate) |
| OKX live balanse | USDC | OKX kontoens quote-currency |
| OKX live visning | NOK | USDC × USDT/NOK rate (~9.6) |
| Kraken live state | USDC | Kraken-konto |
| Trades (paper) | NOK | Priser i NOK (konvertert) |
| Trades (live) | Blandet | Avhenger av session |
| Leaderboard | NOK | Alt i NOK |

---

## 4. KRITISKE FUNN — markert med ukjent/stale/feil datakilde

### 🔴 FUNN 1: OKX mangler DB-synk (P0)
- `getOkxLiveBalance()` kaller OKX API LIVE hver dashboard-innlasting
- **Finnes IKKE** `okx_live_state` tabell
- **Finnes IKKE** OKX balance-sync cron
- Dashboard live-mode: hver visning = nytt API-kall til OKX
- **Konsekvens:** Ingen historisk OKX-data, rate-limited av OKX, tregere dashboard

### 🔴 FUNN 2: Kraken-infrastruktur er ZOMBIE (P0)
- `kraken_live_state` synkroniseres av cron men Tom har ingen aktiv Kraken-nøkkel
- `kraken-balance-sync` cron leser `user_kraken_keys` — returnerer feil for Tom
- `/api/kraken/live-state` returnerer `{connected: false}`
- `autopilot-orchestrator` leser KUN `user_kraken_keys` — virker ikke for OKX
- `/api/user/trades` bruker `KrakenMarketDataProvider` for priser — feiler når Kraken er nede
- Kill switch GET teller KUN `user_kraken_keys`

### 🔴 FUNN 3: Fire ulike "saldo"-definisjoner (P0)
| # | Definisjon | Brukt av | Verdi for Tom |
|---|---|---|---|
| 1 | `paper_accounts.current_balance` | Dashboard paper, Portfolio | Synkronisert fra sessions-sum |
| 2 | `trading_sessions.current_capital_nok` (sum active+paused) | syncPaperAccountBalance → paper_accounts | Per bot |
| 3 | `getOkxLiveBalance().balanceNok` | Dashboard live | ~1 458 NOK (101.66 USDC × rate) |
| 4 | `session.current_capital_nok` (én sesjon) | /api/paper-trading/balance | Én sessions kapital |

### 🟡 FUNN 4: Leaderboard ignorerer paper_accounts SSoT (P1)
- Leaderboard bruker sessions-sum som PRIMÆR kilde
- `paper_accounts.current_balance` er kun FALLBACK
- Dette er INVERS av arkitekturvedtaket (R1: paper_accounts er SSoT)

### 🟡 FUNN 5: paper_accounts kan være fryst av sanity cap (P1)
- `syncPaperAccountBalance` har 1.5× sanity cap
- Hvis sessions-sum > 1.5× initial → synk HOPPES OVER → paper_accounts står fast på gammel verdi
- Ingen alternativ skrivevei for å oppdatere paper_accounts

### 🟡 FUNN 6: Live dashboard viser to inkompatible tall (P1)
- `accountBalance` = OKX live API (~1 458 NOK)
- `totalCapital` = RPC fra sessions (kan være 0 eller annen verdi)
- Disse er fra HELT ulike kilder og kan ikke sammenlignes

### 🟡 FUNN 7: Kill switch GET mangler OKX-telling (P1)
- `GET /api/admin/kill-switch` returnerer `activeKrakenUsers` men IKKE `activeOkxUsers`
- Gir falsk trygghet — ser ut som 0 aktive brukere

### 🟡 FUNN 8: OKX P&L spores ikke (P1)
- `getOkxLiveBalance()` returnerer dagens P&L fra OKX API
- Men dette lagres IKKE i DB
- `get_dashboard_metrics` RPC gir sessions-basert P&L (ikke OKX-basert)

---

## 5. DATAFLYT-DIAGRAM

### Paper dataflyt
```
tick-cron (5 min)
  → syncPaperAccountBalance()
    → SUM(trading_sessions.current_capital_nok WHERE mode=paper AND status IN (active,paused))
    → IF sum ≤ 1.5× totalInitial → UPDATE paper_accounts.current_balance
    → DB-trigger → user_profiles.paper_balance

hourly_balance_sync (pg_cron, hver time)
  → kopierer paper_accounts → user_profiles (én vei)
```

### Live dataflyt (OKX)
```
Dashboard live-mode:
  → getOkxLiveBalance()
    → user_okx_keys (dekrypter nøkler)
    → eea.okx.com/api/v5/account/balance (LIVE API)
    → eea.okx.com/api/v5/account/positions (LIVE API)
    → USDC × rate → NOK
    → ⚠️ INGEN DB-lagring

Kill switch:
  → user_okx_keys → OkxClient → cancelAllOrders → sessions=stopped
```

### Kraken dataflyt (ZOMBIE)
```
kraken-balance-sync (cron, 5 min):
  → user_kraken_keys (dekrypter)
  → Kraken API → balance + orders
  → kraken_live_state (UPSERT)
  → ⚠️ Tom har ingen aktiv Kraken-nøkkel

KrakenLiveCard:
  → /api/kraken/live-state
  → kraken_live_state
  → ⚠️ Returnerer {connected: false}

User trades priser:
  → KrakenMarketDataProvider.getKlines()
  → ⚠️ KRAKEN — burde vært OKX eller CoinGecko
```

---

## 6. MINIMAL REPARASJONSREKKEFØLGE

### Fase 1: Data-/API-kontrakt (READ-ONLY ferdig → KAN STARTE)

1. **Definer én autoritativ kontrakt per modus:**
   - Paper: `paper_accounts.current_balance` = SSoT. `getDashboardMetrics` for P&L.
   - Live: `okx_live_state` (NY tabell) = SSoT. Synkronisert hvert 5. min.

2. **Etabler OKX DB-infrastruktur:**
   - Opprett `okx_live_state` tabell (samme skjema som `kraken_live_state`)
   - Opprett `okx-balance-sync` cron (samme mønster som `kraken-balance-sync`)
   - Oppdater `getOkxLiveBalance()` til å lese fra DB først, live API som fallback

### Fase 2: Live/OKX-avstemming

3. **Fiks dashboard live-mode:**
   - `accountBalance` og `totalCapital` må komme fra SAMME kilde
   - Live: `okx_live_state.total_usdc × rate` for saldo
   - P&L må spores i DB — OKX har `upl` (unrealized P&L) fra positions-endepunktet

4. **Fiks Kraken-zombier:**
   - Bytt `KrakenMarketDataProvider` i `/api/user/trades` til nøytral provider
   - Oppdater `autopilot-orchestrator` til å støtte OKX
   - Oppdater kill switch GET til å telle OKX-brukere

### Fase 3: Paper-avstemming

5. **Fjern sessions-sum som primærkilde i leaderboard:**
   - Leaderboard: `paper_accounts.current_balance` PRIMÆR, sessions-sum KUN som fallback

6. **Fjern sanity-cap-blokkering:**
   - 1.5× cap bør logge og varsle, ikke blokkere synk stille
   - Alternativ: flagg for manuell gjennomgang

### Fase 4: UI-konsolidering

7. **Konsolider saldo-visning:**
   - Alle sider som viser "saldo" skal bruke `paper_accounts.current_balance` (paper) eller `okx_live_state` (live)
   - `/api/paper-trading/balance` må oppdateres til å bruke SSoT

8. **Fjern KrakenLiveCard fra dashboard:**
   - Kraken er død — kortet viser "{connected: false}" og bør erstattes av OKX-live-kort

### Fase 5: AI-/risk-panel guardrails

9. **P&L-validering:**
   - Alle P&L-visninger må ha samme cutoff (2026-07-30)
   - Alle P&L-visninger må bruke `cleanTradeStats()` for konsistens

10. **Valuta-guard:**
    - Alle priser i paper = NOK (med eksplisitt rate)
    - Alle priser i live = USDC (med NOK-konvertering kun for visning)

---

## 7. TESTMATRISE

| # | Scenario | Paper/Live | Forventet |
|---|---|---|---|
| T1 | Paper-saldo = paper_accounts.current_balance | Paper | Dashboard, Portfolio, Leaderboard viser SAMME tall |
| T2 | Paper-P&L med cutoff | Paper | Dashboard totalPnl ≈ Portfolio totalPnl |
| T3 | OKX-saldo synkronisert til DB | Live | Dashboard live viser DB-verdi (ikke live API) |
| T4 | OKX-live-state finnes og oppdateres | Live | `okx_live_state.updated_at` < 6 min gammel |
| T5 | Kill switch GET teller OKX | Admin | `activeOkxUsers` > 0 |
| T6 | Stoppede sesjoner ≠ levende penger | Paper | Posisjoner kun fra active+paused |
| T7 | Leaderboard = paper_accounts primær | Paper | `return_pct` basert på paper_accounts, ikke sessions-sum |
| T8 | Paper-trading/balance = SSoT | Paper | Samme saldo som dashboard |
| T9 | User trades priser ikke fra Kraken | Paper | `KrakenMarketDataProvider` erstattet |
| T10 | Sanity cap blokkerer ikke stille | Paper | Varsling ved blokkert synk |

---

## 8. ROLLBACK-PLAN

Alle reparasjoner er additive (nye tabeller, nye cron-jobber, nye API-ruter). Ingen destruktive endringer.

### Rollback per fase:

| Fase | Rollback |
|---|---|
| 1 (okx_live_state) | `DROP TABLE IF EXISTS okx_live_state` + unschedule cron |
| 2 (dashboard live fix) | Reverter `getUserDashboardMetrics.ts` — leser fortsatt live API |
| 3 (leaderboard fix) | Reverter til sessions-sum primær (gammel kode) |
| 4 (UI-konsolidering) | Reverter API-rute-endringer |
| 5 (guardrails) | Fjern nye valideringer |

### Sikkerhetsmekanismer:
- OKX-nøkler i `user_okx_keys` røres IKKE — kun leses
- `paper_accounts` røres IKKE direkte — kun konsumenter endres
- `trading_sessions` røres IKKE — kun lesemønster endres
- Ingen live-ordre påvirkes

---

## 9. LINEAR-SAKER

### Ny: Live-trading dogfood-gate (P0 — FØRSTE sak)

| Sak | Tittel | Fase | Estimat |
|---|---|---|---|
| **KLA-299** | **Live-trading gate: kun Tom (0dd08529). Alle andre = paper-only.** | 0 | M |

Implementer en hard sperre i:
- `verifyLiveEntitlement()` / `live-trading.ts` — whitelist `0dd08529`
- `/api/trading/mode` — blokker live for andre
- `/api/trading-sessions/create` — blokker live-sesjoner for andre
- `/api/pilot` — blokker live-pilot for andre
- `/api/trading/max-aggressive` — blokker for andre
- UI: skjul live-mode-knapper, KrakenLiveCard, OKX-live-elementer for andre
- Middleware: redirect `/handel?mode=live` → paper for andre

Første sak fordi den reduserer blast radius fra «alle brukere» til «én bruker».

### Saker som kan startes umiddelbart (etter Tom-godkjenning):

| Sak | Tittel | Fase | Estimat | Pri |
|---|---|---|---|---|
| **KLA-299** | **Live-trading gate: kun Tom** | 0 | M | 🔴 |
| KLA-300 | Opprett `okx_live_state` tabell + OKX balance-sync cron | 1 | M | 🔴 |
| KLA-301 | Dashboard live: konsolider accountBalance + totalCapital til én kilde | 2 | S | 🔴 |
| KLA-304 | Kill switch GET: legg til OKX-brukere | 2 | S | 🔴 |
| KLA-302 | Bytt KrakenMarketDataProvider i /api/user/trades | 2 | S | 🟡 |
| KLA-303 | Oppdater autopilot-orchestrator til OKX (kun Tom) | 2 | M | 🟡 |
| KLA-305 | Leaderboard: paper_accounts som primærkilde | 3 | S | 🟡 |
| KLA-306 | syncPaperAccountBalance: varsling ved sanity cap i stedet for stille blokkering | 3 | S | 🟡 |
| KLA-307 | /api/paper-trading/balance: bruk SSoT | 4 | S | 🟢 |
| KLA-308 | Fjern/erstatt KrakenLiveCard med OKX-live-kort (kun Tom) | 4 | M | 🟢 |
| KLA-309 | P&L-konsistens: alle ruter via cleanTradeStats | 5 | M | 🟢 |
| KLA-310 | Valuta-guard: eksplisitt NOK/USDC-kontrakt i alle money-ruter | 5 | M | 🟢 |

**Endret prioritering pga dogfood:**
- 🔴 = Toms testkonto direkte berørt — først
- 🟡 = Alle brukere (paper) — deretter
- 🟢 = Kosmetisk/konsolidering — sist

---

*Rapport ferdig. Venter på Tom-godkjenning før noen kodeendringer.*
