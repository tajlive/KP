# Kraken Dependency Map — Fase 0-1 P0 Money Integrity

**Dato:** 2026-08-12
**Scope:** Alle referanser til Kraken-infrastruktur i kodebasen
**Status:** Read-only kartlegging — ingen endringer gjort

---

## 1. KRITISKE Kraken-avhengigheter (P0: må håndteres først)

### 1.1 Ruter som leser `user_kraken_keys` (DB-tabell)

| Rute | Linje | Handling | Konsekvens hvis Kraken-nøkkel er død |
|---|---|---|---|
| `/api/trading-sessions/create` | 111 | `.from("user_kraken_keys")` | Kan ikke opprette live-sesjoner |
| `/api/trading/mode` | 61, 132 | `.from("user_kraken_keys")` | Live-modus utilgjengelig |
| `/api/pilot` | 69 | `.from("user_kraken_keys")` | Live-pilot blokkert |
| `/api/cron/autopilot-orchestrator` | 85 | `.from("user_kraken_keys")` | Autopilot feiler for alle brukere |
| `/api/cron/kraken-balance-sync` | 41 | `.from("user_kraken_keys")` | Synk feiler stille |
| `/api/cron/twap-execute` | 81 | `.from("user_kraken_keys")` | TWAP-ordrer feiler |
| `/api/cron/tick` | 2289 | `.from("user_kraken_keys")` | Live-tick feiler |
| `/api/kraken/connect` | 67, 103 | `.from("user_kraken_keys")` | Kan ikke koble til Kraken |
| `/api/kraken/grid/start` | 39 | `.from("user_kraken_keys")` | Grid-start feiler |
| `/api/kraken/auto-convert` | 62 | `.from("user_kraken_keys")` | Auto-konvertering feiler |
| `/api/webhooks/kraken/deposit` | 31 | `.from("user_kraken_keys")` | Deposit-poll feiler |
| `/api/admin/kill-switch` | 43, 233 | `.from("user_kraken_keys")` | Kill switch leser feil tabell |
| `/lib/auth/live-trading.ts` | 41 | `.from("user_kraken_keys")` | `verifyLiveEntitlement()` feiler |
| `/lib/trading/executor-factory.ts` | 105, 138 | `.from("user_kraken_keys")` | Executor kan ikke hente Kraken-nøkler |

### 1.2 Ruter som bruker `KrakenMarketDataProvider` for priser

| Rute | Linje | Bruk | Konsekvens |
|---|---|---|---|
| `/api/user/trades` | 142-146 | `KrakenMarketDataProvider().getKlines()` | Posisjoner får `null` priser |
| `/api/trading-sessions/[id]/status` | 120-129 | `KrakenMarketDataProvider()` | Sesjonsstatus uten priser |
| `/api/paper-trading/execute` | 169 | `createKrakenMarketDataProvider()` | Paper-handler får feil priser |
| `/api/market/snapshot` | 54 | `createKrakenMarketDataProvider()` | Markedsdata utilgjengelig |
| `/api/market/binance-prices` | 25 | `createKrakenMarketDataProvider()` | Priser utilgjengelig |
| `/api/market/binance-24hr` | 44 | `createKrakenMarketDataProvider()` | 24h-data utilgjengelig |
| `/api/market/klines` | 23 | `createKrakenMarketDataProvider()` | Klines utilgjengelig |
| `/api/signal/current` | 29 | `createKrakenMarketDataProvider()` | Signaler uten priser |
| `/api/pilot-engine` | 82, 349 | `createKrakenMarketDataProvider()` | Pilot-engine uten priser |
| `/api/cron/sync-prices` | 54 | `createKrakenMarketDataProvider()` | Pris-synk feiler |
| `/api/cron/feature-loader` | 24 | `createKrakenMarketDataProvider()` | Feature-loader feiler |
| `/api/cron/ai-engine` | 21 | `createKrakenMarketDataProvider()` | AI-engine feiler |
| `/api/cron/tick` | 129 | `new KrakenMarketDataProvider()` (global) | Hele tick-motoren feiler |
| `/lib/paper-trading/slippage.ts` | 12 | `createKrakenMarketDataProvider()` | Slippage-beregning feiler |
| `/lib/trading/paper-executor.ts` | 29 | `createKrakenMarketDataProvider()` | Paper-executor uten priser |
| `/lib/trading/order-executor.ts` | 105 | `createKrakenMarketDataProvider()` | Ordre-executor feiler |

### 1.3 Ruter som bruker `KrakenClient` (live ordre/API)

| Rute | Linje | Bruk |
|---|---|---|
| `/api/admin/kill-switch` | 8, 84 | `new KrakenClient()` for å kansellere ordre |
| `/api/kraken/connect` | 9, 53 | `new KrakenClient()` for å validere nøkler |
| `/api/kraken/grid/start` | 8, 55 | `new KrakenClient()` + `KrakenGridTrader` |
| `/api/kraken/auto-convert` | 7, 78 | `new KrakenClient()` for konvertering |
| `/api/webhooks/kraken/deposit` | 8, 48 | `new KrakenClient()` for deposit-sjekk |
| `/api/cron/kraken-balance-sync` | 9, 52 | `new KrakenClient()` for balanse |
| `/api/cron/autopilot-orchestrator` | 361 | `new KrakenClient()` for grid-ticks |
| `/lib/trading/kraken-executor.ts` | 25, 85 | `KrakenClient` for live-ordrer |
| `/lib/trading/kraken-grid.ts` | 6, 263, 383 | `KrakenClient` + `KrakenGridTrader` |
| `/lib/trading/kraken-reinvest.ts` | 6, 53, 116 | `KrakenClient` for reinvestering |
| `/lib/trading/autopilot/orchestrator.ts` | 33, 361 | `KrakenClient` for grid-ticks |
| `/lib/exchanges/kraken/client.ts` | 54 | `KrakenClient` klasse-definisjon |

### 1.4 Kraken-spesifikke UI-komponenter

| Komponent | Fil | Beskrivelse |
|---|---|---|
| `KrakenLiveCard` | `src/features/kraken/KrakenLiveCard.tsx` | Viser "Kraken Live $X.XX" |
| `KrakenAPISettings` | `src/features/account/settings/KrakenAPISettings.tsx` | API-nøkkel-innstillinger |
| `KrakenConnect` | `src/features/onboarding/KrakenConnect.tsx` | Onboarding Kraken-tilkobling |

### 1.5 `kraken_live_state` tabell (DB)

| Konsument | Fil:LINJE | Bruk |
|---|---|---|
| `/api/kraken/live-state` GET | route.ts:16 | `.from("kraken_live_state")` |
| Skriver | `/api/cron/kraken-balance-sync` | UPSERT til `kraken_live_state` |

---

## 2. MODERATE Kraken-avhengigheter (P1)

### 2.1 Kraken-spesifikke libs

| Fil | Beskrivelse | Avhengig av |
|---|---|---|
| `src/lib/exchanges/kraken/client.ts` | Kraken REST API-klient | Kraken API-nøkkel |
| `src/lib/exchanges/kraken/symbols.ts` | Kraken symbol-mapping | Kraken |
| `src/lib/trading/kraken-executor.ts` | Live-executor for Kraken | KrakenClient |
| `src/lib/trading/kraken-grid.ts` | Grid-trading for Kraken | KrakenClient |
| `src/lib/trading/kraken-reinvest.ts` | Reinvestering for Kraken | KrakenClient |
| `src/lib/trading/kraken-grid-config.mjs` | Grid-konfigurasjon (PAIR_CFG) | Kraken-spesifikke par |
| `src/lib/trading/canonical/market-data/kraken-provider.ts` | `KrakenMarketDataProvider` | Kraken API |
| `src/lib/trading/autopilot/orchestrator.ts` | Autopilot orchestrator | KUN Kraken |
| `src/lib/trading/autopilot/scanner.ts` | Par-scanner | `kraken-grid-config.mjs` |
| `src/lib/trading/strategy-fallback.ts` | Strategy fallback | `kraken-grid` typer |

### 2.2 `createKrakenMarketDataProvider` (fabrikk-funksjon)

Brukes av 16+ ruter. `MarketDataProvider`-interface har også `OkxMarketDataProvider` — se `src/lib/trading/canonical/market-data/okx-provider.ts`.

---

## 3. LAVRISIKO Kraken-avhengigheter (P2)

### 3.1 Realtime store

| Fil | Linje | Referanse |
|---|---|---|
| `src/store/realtime-store.ts` | 41, 89 | `krakenStatus: "disconnected"` |

### 3.2 Kommentarer og dokumentasjon

| Fil | Referanse |
|---|---|
| `src/lib/hooks/useTradingMode.ts` | Kommentarer om `/api/kraken/connect` |
| `src/app/api/user/onboarding/route.ts` | Kommentar om Kraken-tilkobling |

---

## 4. ANBEFALT HANDLINGSFORLØP (ingen endringer gjort)

### Fase 0: Midlertidig guard (uten å røre Kraken-kode)

1. Feature-flag `NEXT_PUBLIC_KRAKEN_ENABLED=false` — skjuler alle Kraken UI-elementer
2. Kraken-spesifikke ruter returnerer 503 med `"Kraken temporarily unavailable"` når flagget er false
3. `createKrakenMarketDataProvider()` fallback til `OkxMarketDataProvider` eller CoinGecko

### Fase 1: Permanens (etter Tom-godkjenning)

1. Erstatt `KrakenMarketDataProvider` → nøytral `MarketDataProvider` (OKX eller multi-provider)
2. Erstatt `user_kraken_keys` → `user_okx_keys` i live-relaterte ruter
3. Behold `kraken_live_state` som historisk data (ikke slett)
4. Behold Kraken-client libs (kan reaktiveres senere)

---

*Dette er en read-only kartlegging. Ingen kode er endret.*
