# Handelsruter og oppdatering av handler (5 min / oftere)

**Formål:** Dobbeltsjekk av **routing**, **hvor handler utføres**, og **hvor ofte lister/graf oppdateres** — med kodehenvisninger du kan verifisere i repo.

## 1. Routing (Next.js + middleware)

| Bruksområde         | Kanonisk sti                                                      | Merknad                                                                                                                                      |
| ------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Handel / øktliste   | `/{locale}/paper-trading`, `/{locale}/paper-trading/{session_id}` | `paper-trading` er **ikke** i `PROTECTED_PATHS` (gjester kan se tilbud); **innlogget** `?mode=live` går via **tier-gate** (`middleware.ts`). |
| Handelshistorikk    | `/{locale}/handelshistorikk`                                      | I `PROTECTED_PATHS` — krever innlogging.                                                                                                     |
| Resultater (grafer) | `/{locale}/dashboard/resultater`                                  | Beskyttet via prefiks `/dashboard` i `PROTECTED_PATHS`.                                                                                      |
| Hoveddashboard      | `/{locale}/dashboard`                                             | Viser siste handler; **Realtime** på nye rader (se under).                                                                                   |

**Alias → kanonisk** (i `src/middleware.ts`, `CANONICAL_REDIRECTS`):

- `/trade` → `/paper-trading`
- `/dashboard/trading` → `/paper-trading`
- `/dashboard/activity` → `/handelshistorikk`
- `beta/.../live-trading` → `/paper-trading?mode=live`

## 2. Utføre handler (API)

| Modus         | Rute                              | Merknad                                                          |
| ------------- | --------------------------------- | ---------------------------------------------------------------- |
| Paper         | `POST /api/paper-trading/execute` | Hovedvei (`executePaperTrade`).                                  |
| Paper (eldre) | `POST /api/paper-trading/trade`   | Bakoverkompatibel.                                               |
| Live          | `POST /api/trading/execute`       | `executeLiveTrade` (krever Binance/API-setup).                   |
| Bot / økter   | `GET /api/cron/tick` m.m.         | Kjøres fra **Supabase cron** mot app (ikke brukerens nettleser). |

Ingen av disse blokkert av pathname-matcher for `api` (middleware matcher ekskluderer `/api`).

## 3. Vise handler — tidsintervall

| Flate                                    | Mekanisme                                   | Intervall                                           | Bevis i kode                                                                                           |
| ---------------------------------------- | ------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Resultater** (`/dashboard/resultater`) | `fetch` → `GET /api/user/trading-analytics` | **5 minutter** + ved synlig fane                    | `REFRESH_MS = 5 * 60 * 1000` + `visibilitychange` i `TradingResultsDashboard.tsx`                      |
| **Handelshistorikk**                     | Supabase `.from('trades').select(...)`      | **~28 s** når fanen er synlig (strengere enn 5 min) | `TRADING_INTEGRITY_SYNC.tradesPollIntervalMs` + `document.hidden`-sjekk i `ClientHandelshistorikk.tsx` |
| **Dashboard** (siste handler)            | Supabase Realtime `INSERT` på `trades`      | **Umiddelbart** ved ny rad                          | `PortfolioDashboard.tsx` — channel `dashboard-trades-${userId}`                                        |

**Konklusjon for kravet «vises hvert 5 minutt»:** Resultatsiden oppfyller det **eksakt**. Handelshistorikk og dashboard oppdaterer **ofte** (20 s / realtime), så brukeren ser endringer **innen** 5 minutter og vanligvis langt raskere.

## 4. Manuell verifikasjon etter deploy

1. Logg inn → utfør paper-handler → innen ~20 s skal raden vises på **Handelshistorikk** (evt. umiddelbart på **Dashboard**).
2. Åpne **Resultater** — «Sist oppdatert» skal endre seg innen **5 min** (eller ved «Oppdater nå» / når du bytter tilbake til fanen).

## 5. Priser / serverpuls (bakgrunn)

`pg_cron`-jobb `klarpakke-sync-prices-5min` (migrasjon `20260320140000_pg_cron_sync_prices_5min_analytics.sql`) kaller `GET /api/cron/sync-prices` hvert 5. min — støtter markedspriser som underlag for porteføljevisning, ikke selve `trades`-insert.
