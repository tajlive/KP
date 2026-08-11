# Gjenværende P1-kartlegging — handel/cockpit/dashboard/Resultater/Historikk

> **Status: IMPLEMENTERT OG DEPLOYET 2026-08-11 (commit da1867eb1).** Alle 5 funn
> håndtert. CI HELT GRØNN: test-gate ✅ deploy ✅ e2e-smoke-auth-prod ✅ e2e-smoke-prod ✅.
> Migrasjon 20260811150000 applied i DB, RPC verifisert (Toms konto: current_capital=100000, 3 trades).
> Planen beholdes som utført-dokumentasjon.

**Goal:** Eliminere gjenværende tall- og modus-inkonsistenser mellom flater, prioritert etter reell bruker-/kapitalrisiko.

**Architecture:** Én kilde for rene trades (`getCleanTrades`+`clampedRealizedPnl`), én kilde for balanse (`paper_accounts.current_balance`), modus-gating i alle live-paneler.

---

## Funn (kartlegging 2026-08-11, verifisert i kode)

| #    | Funn                                                                                                                                                                                 | Fil                                                                                                 | Risiko                                                                                                                                                                  | Årsak                                                                                                                                |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| P1-A | **RPC `get_dashboard_metrics` summerer RÅ `realized_pnl`** (uten cutoff 2026-07-30 + uten oversell-clamp)                                                                            | SQL-funksjon + `src/server/dashboard/getUserDashboardMetrics.ts:253-260`                            | MEDIUM — dashboardets totalPnl kan avvike fra Resultater-siden for brukere med trades FØR 30.07 (oversell-forurensning)                                                 | RPC-en ble skrevet før clean-trades-laget (PROMPT #16); trading-analytics og portfolio/summary bruker clamp, dashboard gjør ikke det |
| P1-B | **`getAccountBalance`-fallback inkluderer STOPPED sesjoner i kapital** (`in("status", ["active","paused","stopped"])`)                                                               | `src/server/dashboard/getUserDashboardMetrics.ts:155`                                               | LAV-MEDIUM — samme feilklasse som P0-inflasjonen hvis fallbacken trigges (paper_accounts mangler); bryter `CAPITAL_STATUSES=["active"]`-regelen definert 15 linjer over | Fallback skrevet før P0-fiksen; inkonsistent med kapital-regelen                                                                     |
| P1-C | **Live-kapital bruker hardkodet kurs 9.6** i stedet for `getUsdtToNokRateAsync`                                                                                                      | `src/server/dashboard/getUserDashboardMetrics.ts:226`                                               | MEDIUM — live-tall i NOK vises feil hvis USD-kurs ≠ 9.6; /handel/execute bruker ekte rate → flater avviker                                                              | Gammel fallback-konstant; rate-helper finnes og brukes andre steder                                                                  |
| P1-D | **Historikk (`/api/user/trades`) har INGEN forurensings-cutoff**, Resultater (`trading-analytics`) har cutoff+clamp                                                                  | `src/app/api/user/trades/route.ts:77-80` vs `trading-analytics/route.ts:113`                        | LAV — tallene kan avvike mellom sidene for gamle trades; delvis bevisst (ledger må aldri miste rader) men uverifisert/dokumentert                                       | To ruter, to filtreringsregimer; ingen felles kontrakt-doc                                                                           |
| P1-E | **Andre live-paneler enn AutopilotDashboard ikke modus-gatet** (UnifiedTradeTerminal, LiveTradeFeed, WalletBalance leser `/api/paper-trading/balance` og live-feed uten modus-sjekk) | `src/features/trading/UnifiedTradeTerminal.tsx:691`, `LiveTradeFeed.tsx:51`, `WalletBalance.tsx:19` | MEDIUM — P1.2 fikset ETT panel; samme klasse kan lekke andre steder (verifiser først, fiks ved behov)                                                                   | Modus-gate lagt inn kun på AutopilotDashboard                                                                                        |

## Prioritering (etter reell risiko)

1. **P1-A** — pengetall på dashboard kan være feil (forurensede trades) → høyest brukerrisiko, men kun for brukere med pre-30.07-trades.
2. **P1-C** — live-NOK-tall feil ved kursavvik; Tom er live-testperson → direkte kapitalrisiko for Tom.
3. **P1-E** — verifisering først; hvis et panel lekker live i Lekepenger = P1.2-klassen på nytt.
4. **P1-B** — fallback-feilklasse; lav sannsynlighet (paper_accounts finnes nesten alltid) men P0-klassen.
5. **P1-D** — dokumentasjon/verifikasjon, ikke nødvendigvis kode.

---

## Task 1: RPC `get_dashboard_metrics` — bruk clamped P&L (P1-A)

**Objective:** Dashboardets totalPnl/winRate skal matche Resultater-siden (samme clean-trades-regime).

**Files:**

- Modify: `supabase/migrations/NNNNN_fix_dashboard_metrics_clamped_pnl.sql` (ny migrasjon)
- Modify: `src/server/dashboard/getUserDashboardMetrics.ts:253-260` (RPC-kall + fallback)

**Årsak:** RPC-en summerer rå `realized_pnl` inkl. oversell-forurensning før 2026-07-30; trading-analytics clamps. Uten fiks viser dashboard andre tall enn Resultater.

**Akseptansekriterier:**

- RPC `get_dashboard_metrics` beregner total_pnl med samme clamp-semantikk som `clampedRealizedPnl` (sell ≤ akkumulert buy per session_id+pair) ELLER ekskluderer trades før `CONTAMINATION_CUTOFF`.
- For Toms konto: dashboard totalPnl == Resultater-siden totalPnl (verifiser med curl + DB).
- TDD: `src/server/dashboard/__tests__/getUserDashboardMetrics.test.ts` får case med oversell-trade → clamped tall, ikke rå.
- tsc 0 · vitest grønn · deploy grønn.

**Notat:** Enkleste robuste løsning kan være å la RPC ta `p_cutoff`-param og la TS-siden filtrere som i dag — velg under implementasjon, kravet er likt tall.

---

## Task 2: Live-kapital — ekte USD→NOK-rate (P1-C)

**Objective:** Live-balansen på dashboard bruker samme rate som /handel (ingen hardkodet 9.6).

**Files:**

- Modify: `src/server/dashboard/getUserDashboardMetrics.ts:214-229` (fjern `usdtNok = 9.6`)
- Bruk: `getUsdtToNokRateAsync` fra `src/lib/trading/currency` (samme som execute-route)

**Årsak:** 9.6 er en fallback-konstant; hvis faktisk kurs avviker vises feil NOK for live-kapital — Tom er live-testperson.

**Akseptansekriterier:**

- Live-modus: dashboard `accountBalance` = kraken_live_state.total_usdc × ekte rate (fra rate-helper).
- Fallback til 9.6 kun ved rate-feil (logget), ikke default.
- TDD: mock rate-helper → 200 med rate 10.2, ikke 9.6.
- tsc 0 · vitest grønn.

---

## Task 3: Modus-lekkasje-sweep — alle live-paneler (P1-E)

**Objective:** Bekrefte at INGEN live-data vises i Lekepenger-modus utenfor AutopilotModeGate.

**Files (verifiser, fiks kun ved funn):**

- Inspect: `src/features/trading/UnifiedTradeTerminal.tsx`, `src/features/trading/LiveTradeFeed.tsx`, `src/features/trading/WalletBalance.tsx`
- Inspect: `src/app/[locale]/(user)/handel/page.tsx` (CockpitProvider + AutopilotModeGate fra P1.2)

**Årsak:** P1.2 fikset AutopilotDashboard; samme klasse (live-data i paper-modus) må verifiseres på resterende paneler før vi erklærer klassen lukket.

**Akseptansekriterier:**

- Sweep-rapport: hvert panel listet med modus-kilde og konklusjon (gater/ikke gater/ikke relevant).
- Hvis funn: fix med samme mønster som AutopilotModeGate + TDD.
- Hvis ingen funn: dokumenter i plan-kommentar, ingen kodeendring.

---

## Task 4: `getAccountBalance`-fallback — fjern stopped fra kapital (P1-B)

**Objective:** Fallbacken følger samme kapital-regel som primær-stien (`active` kun).

**Files:**

- Modify: `src/server/dashboard/getUserDashboardMetrics.ts:155` → `.in("status", ["active", "paused"])`

**Årsak:** Stoppede sesjoner er fryst historikk (P0-regel, `CAPITAL_STATUSES`); fallbacken bryter den.

**Akseptansekriterier:**

- TDD: test hvor stopped-sesjon finnes og paper_accounts mangler → kapital ekskluderer stopped.
- tsc 0 · vitest grønn.

---

## Task 5: Historikk vs Resultater — dokumenter cutoff-kontrakt (P1-D)

**Objective:** Forskjellen mellom rutene er dokumentert i kode-kommentar + test som låser kontrakten.

**Files:**

- Modify: `src/app/api/user/trades/route.ts` (kommentar: ledger uten cutoff, bevisst)
- Test: `src/app/api/user/__tests__/trades.route.test.ts` (eller ny) — pre-cutoff-trade inkluderes i Historikk, ekskluderes i Resultater

**Årsak:** To ruter, to regime — ingen test låser at forskjellen er bevisst.

**Akseptansekriterier:**

- Kontrakt-doc i begge ruter (peker på hverandre).
- Test grønn: samme pre-cutoff-trade → trades-ruten returnerer den, analytics-ruten ikke.

---

## Verifikasjon (etter alle tasks)

```bash
npm run check        # tsc
npm run lint
npx vitest run src/server/dashboard src/app/api/user 2>&1 | tail -5
# DB: sammenlign Toms dashboard-tall vs Resultater via curl + /api/user/trading-analytics
```

**Risiko/tradeoffs:**

- P1-A endrer SQL-funksjon — migrasjon krever Tom-godkjenning (DB-endring).
- P1-C avhenger av rate-helperens stabilitet (fallback finnes).
- Ingen av taskene rører K3-sonen (src/features/pilot, lib/llm, lib/backtest) unntatt Task 3-verifisering av trading-paneler (Hermes-sone: api/trading).

**Åpne spørsmål:**

1. Skal P1-A clampes i SQL (kompleks) eller ekskludere pre-cutoff i RPC-kallet (enklere, samme resultat for nye brukere)? Anbefaling: cutoff-param — alle reelle brukere er post-30.07.
2. Tom-godkjenning på migrasjonen i Task 1 (DB-endring) — kreves før deploy.
