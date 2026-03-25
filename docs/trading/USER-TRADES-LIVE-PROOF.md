# Dine handler + live resultater — full gjennomgang og bevis

Denne guiden beskriver **hvor** du ser egne trades i appen, **hvordan** live oppdateres, og **hvordan** du dokumenterer bevis (uten at AI trenger din påloggingsinformasjon).

## 1. Hvor i appen (full oversikt)

| Hva du vil se                                   | Hvor                                                                                                                                                       | Live oppdatering                                                      |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **Alle dine handler** (paper + live, siste 200) | `/{locale}/handelshistorikk` — filter **Alle** / **Kun live** / **Kun papir**; data hentes via **`GET /api/user/trades`** (samme RLS som innlogget bruker) | **Ja** — polling + `onAuthStateChange` (se `ClientHandelshistorikk`). |
| **Siste handler** (paper + live sammen)         | Handel-siden med **UnifiedTradingDashboard** (f.eks. `/no/paper-trading` med dashboard-widget)                                                             | **Ja** — `subscribeToTrades(null, userId, …)` (Realtime på `trades`). |
| **Kun én paper-sesjon**                         | `/no/paper-trading/{session_id}`                                                                                                                           | Realtime på `trades` filtrert `session_id`.                           |
| **Hoveddashboard**                              | `/no/dashboard` — portefølje-kort                                                                                                                          | Siste handler (begrenset antall, serverhentet).                       |

**Live handler** lagres i `public.trades` med `mode = 'live'` etter vellykket kjøring — se `execute-live-trade.ts` (status `filled`, `executed_at`, `binance_order_id` når satt).

## 2. Krav for å **se** live-handler

- Du må være **innlogget** (samme bruker som eier radene).
- **RLS** på `trades` skal begrense til `auth.uid()` = din `user_id` (standard i prosjektet).
- **Realtime** for dashboard: tabellen **`trades`** er med i `supabase_realtime`-publikasjonen (migrasjon `20260317180000_enable_realtime_core_tables.sql`).

## 3. Bevis du kan kjøre selv

### A1) Kanonisk API (innlogget nettleser eller session-cookie)

- `GET /api/user/trades?limit=200` — JSON med `ok`, `trades`, `diagnostic_id` (bruk i support-saker).
- `GET /api/user/trading-diagnostics` — aggregert diagnostikk uten PII (også tilgjengelig som «Kopier diagnostikk» på handelshistorikk-siden).

### A) Produksjonssjekk (alle kan kjøre)

```bash
cd /path/to/klarpakke && npm run verify
```

Forvent: **ALL TESTS PASSED** (sider + `/api/health` + headers).

```bash
curl -sS "https://www.klarpakke.no/api/health" | head -c 400
```

Forvent: `"status":"healthy"`.

### B) Dine rader i databasen (Supabase SQL Editor)

Bytt ut `DIN_USER_UUID` med din `auth.users.id` / `user_profiles.id`:

```sql
-- Alle dine trades (nyeste først), med modus
SELECT id, trading_pair, side, mode, status, price, quantity, total_value,
       realized_pnl, executed_at, created_at, binance_order_id
FROM public.trades
WHERE user_id = 'DIN_USER_UUID'::uuid
ORDER BY created_at DESC
LIMIT 100;
```

```sql
-- Kun live
SELECT count(*) AS live_count
FROM public.trades
WHERE user_id = 'DIN_USER_UUID'::uuid AND mode = 'live';
```

**Bevis:** Eksporter CSV fra SQL-resultat eller ta skjermbilde med antall rader + tidsstempel.

### C) UI-bevis (manuelt)

1. Logg inn → **Handelshistorikk** → filter **Kun live**.
2. Vent inntil **~30 s** etter en ny live trade (eller bytt fane frem/tilbake) — listen skal oppdatere uten full refresh.
3. Sammenlign **siste rad** med SQL-spørringen over (`id` eller `created_at`).

## 4. Vanlige avvik

| Symptom                      | Mulig årsak                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Ingen live-rader             | Ikke Bachelor+ / ikke Binance tilkoblet / ingen live-sesjon aktiv / ingen faktisk `executeLiveTrade`.                           |
| Live i DB men ikke i UI      | Feil bruker innlogget; RLS; cache — prøv utlogg/innlogg.                                                                        |
| P&L kolonne «—» for live     | `realized_pnl` settes ikke alltid ved insert i `execute-live-trade`; tap/vinn-telling i UI bruker kun rader med `realized_pnl`. |
| Realtime stille på dashboard | JWT ikke synket til Realtime — `trading-api` bruker `setAuth`; handelshistorikk bruker **polling** som fallback.                |

## 5. Agent / SoT

- **Live Trading & Trades Agent:** `.agent/agents/klarpakke-live-trading-trades-agent.md`
- **Integritet + siste verifisering:** `docs/trading/LIVE-TRADING-TRADES-INTEGRITY.md`
