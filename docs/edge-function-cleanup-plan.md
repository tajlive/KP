# Edge Function Konsolideringsplan

## Nåværende status: 50 funksjoner

## Duplikater som skal merges

### 1. binance-connect + binance-connector → binance-connector (behold)
- **binance-connect**: 4.3KB - Kun kryptering og enkel tilkobling
- **binance-connector**: 8.8KB - Full API med test, balance, orders
- **Action**: Slett binance-connect, oppdater frontend til å bruke binance-connector
- **Frontend refs**: ConnectExchangeClient.tsx

### 2. auto-sync-trades + sync-binance-trades → sync-binance-trades (behold)
- **auto-sync-trades**: 9KB - Scheduled, importerer fra sync-binance-trades
- **sync-binance-trades**: 10KB - Core sync logikk
- **Action**: Slett auto-sync-trades, flytt schedule til sync-binance-trades
- **Note**: auto-sync-trades importerer allerede fra sync-binance-trades

### 3. api-gateway + api-gateway-simple → api-gateway (behold)
- **api-gateway**: 4.3KB + debug.ts - Full funksjonalitet
- **api-gateway-simple**: 2.2KB - Minimal versjon
- **Action**: Slett api-gateway-simple
- **Note**: Ingen frontend refs funnet for noen av dem

### 4. connect-exchange → Merge inn i binance-connector
- **connect-exchange**: Kalles fra BinanceConnect.tsx
- **Action**: Legg til 'connect' action i binance-connector

## Funksjoner med 0 referanser (vurder sletting)

| Funksjon | Størrelse | Status |
|----------|-----------|--------|
| apply-migration | ? | Kanskje brukt av CI? |
| beta-approval-email | ? | Sjekk om brukt |
| beta-signup | ? | Sjekk om brukt |
| broadcast-telegram | ? | Sjekk om brukt |
| compute-leaderboard-monthly | ? | Sjekk om brukt |
| create-checkout-session | ? | Stripe? |
| create-portal-session | ? | Stripe? |
| cron-daily-analysis | ? | Cron job? |
| cron-weekly-review | ? | Cron job? |
| follow-strategy | ? | Sjekk om brukt |
| get-billing-status | ? | Sjekk om brukt |
| get-quiz | ? | Sjekk om brukt |
| get-referral-status | ? | Sjekk om brukt |
| get-strategies | ? | Sjekk om brukt |
| migrations-runner | ? | CI? |
| position-monitor | ? | Sjekk om brukt |
| send-push-notification | ? | Sjekk om brukt |
| set-subscription-tier | ? | Sjekk om brukt |
| signal-engine | ? | Sjekk om brukt |
| strategy-runner | ? | Sjekk om brukt |
| stripe-webhook | ? | Må beholdes! |
| submit-quiz | ? | Sjekk om brutt |
| taj-* funksjoner | ? | Sjekk hver enkelt |

## Funksjoner som er i bruk (behold)

| Funksjon | Referanser | Status |
|----------|------------|--------|
| place-binance-order | LiveTradingClient.tsx, binance-executor.ts (3x) | ✅ Behold |
| binance-connect | ConnectExchangeClient.tsx | ⚠️ Merge til binance-connector |
| get-binance-prices | API route | ✅ Behold |
| connect-exchange | BinanceConnect.tsx | ⚠️ Merge til binance-connector |
| get-entitlements | SubscriptionGate.tsx | ✅ Behold |
| binance-get-listen-key | binance-websocket.ts | ✅ Behold |
| binance-keep-alive-listen-key | binance-websocket.ts | ✅ Behold |

## Mål: 50 → ~30 funksjoner (-40%)
