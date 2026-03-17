# Trading-flyt: hvor man trader, strategier, beløp

## Kort oppsummering

- **Paper (manuell/øving):** Tydelig – sidebar «Handle» → `/paper-trading`.
- **Auto-trade / bots:** To ulike innganger som ikke henger godt sammen; beløp er ikke valgbar i den enkle wizard.
- **Beløp:** Valgbar kun i Trading Dashboard (strategikonfig), ikke i BotWizard.

---

## Ruter og bruk

| Bruker ser / klikker | Rute | Hva skjer |
|----------------------|------|-----------|
| Toppnav «Bots» | `/auto-trading` | Redirect → `/[locale]/dashboard/auto-trade` |
| Dashboard sidebar «Handle» | `/paper-trading` | Paper trading (liste over sesjoner, manuell handel) |
| Direkte URL | `/dashboard/auto-trade` | BotWizard: strategi → risiko/coins → start (ingen beløpsvalg) |
| Direkte URL | `/dashboard/trading` | UnifiedTradingDashboard: portfolio, strategier, beløp per strategi |

**Mangler i sidebar:** Det finnes ingen lenke til «Auto-trade» eller «Bots» i dashboard-sidebaren. Bare: Hjem, Lær, Handle (paper-trading), Profil.

---

## 1. Hvor man «trader» (paper vs auto)

- **Paper trading (lekepenger, manuell):**
  - Sidebar: **Handle** → `/[locale]/paper-trading`
  - Der: liste over paper-sesjoner, opprett ny, åpne sesjon for handel.

- **Auto-trade (bots/strategier):**
  - Toppnav **Bots** → redirect til `/[locale]/dashboard/auto-trade` (BotWizard).
  - Sidebar **Auto-trade** → samme side.

---

## 2. Hvor man velger strategier

- **BotWizard** (`/dashboard/auto-trade`):
  - Steg 1: Velg strategi (DCA, Trend, Grid, Multi-Signal, AI Copy).
  - Steg 2: Risikonivå + valg av coins.
  - Steg 3: Oppsummering + Start (ingen beløpsvalg).
  - Kall til `POST /api/auto-trading/paper` med `strategy`, `risk_level`, `pairs`.

- **UnifiedTradingDashboard** (`/dashboard/trading`):
  - Hvis ingen aktive strategier og ikke «setup completed» → **InteractiveOnboardingWizard**.
  - Hvis aktive strategier → **BotStatusDashboard**.
  - Ellers: **StrategySelectorSection** med utvidbare strategier og **StrategyConfig** (ukentlig beløp for DCA, kapital for grid, osv.). Her velges både strategi og beløp.

---

## 3. Hvor man velger beløp

- **BotWizard:** Ingen. Viser bare «Lekepenger brukt: kr 100 000» (hardkodet). API `/api/auto-trading/paper` får ikke med beløp/kapital.
- **UnifiedTradingDashboard:** I **StrategyConfig**:
  - `dca_trygg`: slider «Ukentlig beløp» (100–5000 NOK), BTC-fordeling %.
  - `grid_bot`: upper/lower price, levels, **capital** (beløp).
  - `ai_copy`: maxPerTrade, maxLoss.
  - Osv.
- **trading-api** `startStrategy()`: Lager `trading_sessions` med `current_capital: 100000`, `initial_capital: 100000` – strategikonfig (f.eks. weeklyAmount) sendes i `strategy_config`.

---

## 4. Logikk som er satt opp (kort)

- **Onboarding:** SpeedOnboarding/InteractiveOnboarding kan starte paper auto-trade (DCA, risk_level, pairs), uten brukerstyrt beløp.
- **trading_sessions:** Brukes av UnifiedTradingDashboard; `strategy_config` inneholder beløpsrelaterte felter.
- **auto_trades / paper:** BotWizard og onboarding bruker `POST /api/auto-trading/paper` som ikke tar imot kapital/beløp – backend kan bruke default (f.eks. 100k).
- **Tier-gate:** `middleware/tier-gate.ts`: `/dashboard/auto-trade` krever minLevel 2 (Bachelor+).

---

## 5. Anbefalte forbedringer (implementert / å implementere)

1. **Sidebar:** Legg til tydelig lenke «Auto-trade» / «Bots» som peker til `/[locale]/dashboard/auto-trade` eller `/[locale]/dashboard/trading` (slik at brukeren ser hvor auto-trade ligger).
2. **Redirect /auto-trading og /auto-trading-ai:** Begge redirecter til `/[locale]/dashboard/auto-trade`.
3. **BotWizard:** Enten legge til steg for «beløp / kapital» (og sende det til API), eller tydelig lenke til «Avansert oppsett» på Trading Dashboard der beløp kan velges.
4. **Dokumentasjon:** Denne filen – oppdater ved endringer i ruter eller flyt.
