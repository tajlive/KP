# Klarpakke Money Contract v1.0

**Versjon:** 1.0  
**Dato:** 2026-08-12  
**Status:** Autoritativ — alle pengerelaterte flater SKAL følge denne kontrakten  
**Scope:** Paper-modus + Live-modus (OKX, dogfood Tom only)

---

## 1. PAPER-MODUS

### 1.1 Cash-saldo (SSoT)

```
Felt: paper_accounts.current_balance
Type: NUMERIC(15,2)
Valuta: NOK
Oppdateres av: syncPaperAccountBalance() (tick-cron, hver 5. min)
Beregning: SUM(trading_sessions.current_capital_nok WHERE mode='paper' AND status IN ('active','paused'))
Guard: Blokkeres hvis sum > 1.5× SUM(starting_capital_nok)
Fallback: user_profiles.paper_balance (synkronisert av DB-trigger)
Cache: 5 sekunder (dashboard), 60 sekunder (leaderboard)
Alder: paper_accounts.updated_at — maks 6 min gammel
```

**Hvor brukes denne:**
- Dashboard hero (total verdi)
- DashboardPro balanse
- Portfolio summary saldo
- Leaderboard avkastning (SKAL være primær — er i dag sessions-sum)
- /api/paper-trading/balance (BØR bruke denne — bruker i dag session.current_capital_nok)

### 1.2 Startkapital

```
Felt: paper_accounts.initial_balance
Type: NUMERIC(15,2)
Valuta: NOK
Default: 100 000
Settes ved: kontoopprettelse, aldri endret
```

### 1.3 Totalverdi

```
Definisjon: cash_saldo + investert_kapital
Formel: paper_accounts.current_balance + SUM(posisjon.quantity × posisjon.entry_price)
Hvor:
  - cash_saldo = paper_accounts.current_balance
  - investert = trading_sessions.open_position (active+paused)
Valuta: NOK
```

### 1.4 Realisert P&L

```
Definisjon: Sum av lukkede handlers realized_pnl
Kilde: getCleanTrades() via clean-trades.ts
Cutoff: 2026-07-30 (CONTAMINATION_CUTOFF)
Clamp: Oversell-clamp per posisjon (cleanTradeStats)
Valuta: NOK
Konsumenter: Dashboard P&L, Portfolio P&L, Resultater analytics
```

### 1.5 Urealisert P&L

```
Definisjon: markedsverdi − kostnadsgrunnlag for åpne posisjoner
Kilde: trades i liveSessionIds (active+paused) + coin_prices.price
Valuta: NOK
Beregnes av: /api/user/trades (positions-feltet)
```

### 1.6 Avkastning (%)

```
Definisjon: (totalverdi − startkapital) / startkapital × 100
ELLER: realisert_PnL / startkapital × 100
Kilde: paper_accounts + cleanTradeStats
Valuta: Prosentpoeng (%)
Baseline: paper_accounts.initial_balance
```

### 1.7 Posisjoner

```
Definisjon: Aggregerte kjøp − salg per trading_pair i aktive+pausede sesjoner
Kilde: trades WHERE session_id IN (liveSessionIds)
Statusfilter: active + paused (IKKE stopped/archived)
Valuta: NOK
```

### 1.8 Handler (ledger)

```
Definisjon: Alle historiske handler, uavhengig av sesjonsstatus
Kilde: trades WHERE user_id = X (INGEN statusfilter — ledger)
Cutoff: INGEN (ledger mister aldri rader — se /api/user/trades kontrakt)
Valuta: NOK
```

---

## 2. LIVE-MODUS (OKX, kun Tom 0dd08529-b8a8-4fd3-9806-275e2d0135dd)

### 2.1 Cash-saldo

```
STATUS: ⚠️ IKKE PERSISTERT TIL DB — hentes LIVE fra OKX API
Felt: getOkxLiveBalance().balanceUsdc (→ balanceNok via rate)
Kilde: eea.okx.com/api/v5/account/balance
Valuta: USDC (primær) → NOK (via USDT/NOK rate ~9.6)
Cache: INGEN — nytt API-kall hver dashboard-innlasting
Alder: < 2 sekunder (API-respons)
Mangler: historisk tracking, DB-persistens, fallback
```

### 2.2 Beholdninger

```
Kilde: eea.okx.com/api/v5/account/balance → details[].availBal
Valuta: Per asset (USDC, SOL, etc.)
```

### 2.3 Åpne posisjoner

```
Kilde: eea.okx.com/api/v5/account/positions
Returnerer: symbol, size, leverage, liquidation price, unrealized P&L
Valuta: USDC (upl), prosent (uplRatio)
```

### 2.4 Reserverte åpne ordre

```
STATUS: ⚠️ IKKE HENTET i getOkxLiveBalance()
Mangler: GET /api/v5/trade/orders-pending
```

### 2.5 Daglig P&L

```
Definisjon: OKX sin upl (unrealized P&L) fra positions-endepunktet
Kilde: getOkxLiveBalance().dailyPnl (USDC)
Valuta: USDC
```

### 2.6 Totalverdi (live)

```
STATUS: ⚠️ UDEFINERT — dashboard viser to inkompatible tall:
  - accountBalance = OKX live API (USDC × rate → NOK)
  - totalCapital = get_dashboard_metrics RPC (fra trading_sessions, ikke OKX)
Disse er fra HELT ulike kilder og kan ikke sammenlignes.
```

### 2.7 Avkastning (live)

```
STATUS: ⚠️ UDEFINERT
Dashboard bruker: totalPnl / startingCapital (fra sessions, ikke OKX)
Korrekt: BØR bruke OKX sin daglige P&L mot OKX-initial-balance
```

---

## 3. VALUTAKONTRAKT

| Kontekst | Primær valuta | Visningsvaluta | Konvertering |
|---|---|---|---|
| Paper trading | NOK | NOK | Ingen |
| Paper trades | NOK | NOK | Priser allerede i NOK |
| OKX live | USDC | NOK | USDC × USDT/NOK rate |
| Kraken live | USDC | NOK | USDC × USDT/NOK rate |
| coin_prices | USDT | NOK | Ingen (kun pris-data) |
| Leaderboard | NOK | NOK | — |

---

## 4. DATAALDER-KONTRAKT

| Data | Alder | Hentes fra | Stale hvis |
|---|---|---|---|
| paper_accounts.current_balance | ≤ 6 min | syncPaperAccountBalance (5 min cron) | updated_at > 6 min |
| OKX saldo | ≤ 2 sek | Live API | API-feil |
| coin_prices | ≤ 5 min | sync-prices cron | updated_at > 10 min |
| trading_sessions | ≤ 5 min | tick-cron | last_tick_at > 10 min |
| kraken_live_state | ∞ (død) | Kraken balance-sync (død) | Alltid stale |

---

## 5. DEFINISJONER — ordliste

| Term | Definisjon | Scope |
|---|---|---|
| **Saldo** | Disponible midler (cash) | Paper: paper_accounts. Live: OKX USDC |
| **Totalverdi** | Saldo + markedsverdi av posisjoner | Paper + Live |
| **Investert** | Kostnadsgrunnlag for åpne posisjoner | Paper: open_position |
| **Realisert P&L** | Gevinst/tap på lukkede handler | Alltid via cleanTradeStats |
| **Urealisert P&L** | Markedsverdi − kostnad for åpne posisjoner | Kun active+paused |
| **Avkastning** | (Totalverdi − startkapital) / startkapital | Paper + Live |
| **Startkapital** | paper_accounts.initial_balance (paper) / første innskudd (live) | Paper + Live |
| **Posisjon** | Netto beholdning per trading_pair | Kun active+paused |

---

## 6. BRUTTE KONTRAKTER (avvik fra denne spesifikasjonen)

| # | Hvor | Brudd | Alvor |
|---|---|---|---|
| 1 | Leaderboard | Bruker sessions-sum som PRIMÆR, paper_accounts som FALLBACK | 🟡 P1 |
| 2 | /api/paper-trading/balance | Bruker session.current_capital_nok (én sesjon), ikke paper_accounts | 🟡 P1 |
| 3 | Dashboard live | accountBalance (OKX API) ≠ totalCapital (RPC sessions) — to ulike kilder | 🔴 P0 |
| 4 | Ingen OKX DB-synk | getOkxLiveBalance() har ingen persistens — null historikk | 🔴 P0 |
| 5 | KrakenMarketDataProvider | 16+ ruter bruker Kraken for priser — Kraken-nøkkel er død | 🔴 P0 |
| 6 | syncPaperAccountBalance | 1.5× sanity cap kan blokkere synk stille | 🟡 P1 |
| 7 | OKX ordre mangler | getOkxLiveBalance() henter ikke pending orders | 🟡 P1 |
| 8 | Kill switch GET | Teller kun Kraken-brukere, ikke OKX | 🟡 P1 |

---

*Denne kontrakten er autoritativ. Alle nye pengerelaterte features SKAL følge den. Eksisterende avvik skal fikses i prioritert rekkefølge.*
