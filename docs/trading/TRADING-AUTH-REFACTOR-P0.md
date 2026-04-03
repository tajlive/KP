# Trading/Auth Refactor P0

## Bakgrunn
User-bound trading-ruter brukte `createClient()` (service-role) internt eller via `executePaperTrade`/`executeLiveTrade`. Dette bypasset RLS og gjorde det umulig å garantere at bruker A aldri muterer data for bruker B.

## Hva ble endret

### 1. Unified Trading Core (`src/lib/trading/core/`)
Ny mappestruktur:
- `types.ts` — delte typer for `ExecuteTradeRequest`, `ExecuteTradeResult`, `TradeSignalContext`
- `execute-trade.ts` — én funksjon `executeTrade(supabase, request)` for både paper og live

### 2. Dependency Injection av SupabaseClient
Alle core-funksjoner tar nå `supabase: SupabaseClient` som første parameter:
- `validateTradeAgainstRiskProfile(supabase, trade)`
- `recordTradeRejection(supabase, trade, result)`
- `recordTradeDecision(supabase, trade, result, ...)`
- `ExecutorFactory.create(supabase, userId, mode, sessionId)`
- `ExecutorFactory.canTradeLive(supabase, userId)`
- `PaperExecutor` — constructor tar `supabase` som første argument

### 3. Wrapper-strategi for bakoverkompatibilitet
Gamle `executePaperTrade` og `executeLiveTrade` er nå tynne wrappers som:
1. Kaller `createClient()` (service-role)
2. Kaller `executeTrade(supabase, request)`

Dette sikrer at eksisterende imports og tester fortsatt fungerer mens nye ruter kan bruke `executeTrade` direkte med `createServerClient`.

### 4. User-bound ruter oppdatert
Følgende ruter bruker nå `createServerClient(request, response)` + `executeTrade`:
- `POST /api/paper-trading/execute`
- `POST /api/trading/execute`
- `POST /api/trading/conditional-order`
- `POST /api/trading/trigger`
- `POST /api/trading-sessions/create`
- `POST /api/auto-trading/paper`
- `POST/GET /api/v1/trading/[action]`

### 5. JSON-feil i alle trading-ruter
Alle user-bound trading-ruter returnerer nå JSON i formatet:
```ts
{ error: string; code?: string; details?: Record<string, unknown> }
```

## Arkitektur etter P0

```
┌─────────────────────────────────────────────────────────────┐
│  User-bound API Routes                                      │
│  (createServerClient → RLS)                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Unified Core: executeTrade(supabase, request)              │
│  ┌──────────────┐ ┌──────────────┐ ┌─────────────────────┐  │
│  │ Session Mgmt │ │ Risk Validate│ │ Executor (adapter)  │  │
│  └──────────────┘ └──────────────┘ └─────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Adapters (mode-spesifikk)                                  │
│  PaperExecutor (simulering)    BinanceExecutor (ekte)       │
└─────────────────────────────────────────────────────────────┘
```

## Hva er fortsatt service-role (med vilje)
- Cron-ruter (`/api/cron/*`) — system-jobs
- Admin-ruter (`/api/admin/*`) — eksplisitt admin-tilgang
- Gamle wrappers (`executePaperTrade`, `executeLiveTrade`) — bakoverkompatibilitet

## Neste steg (P1/P2)
1. Migrere resterende imports/tester til ny core
2. Bygge `trade_explanations` som first-class modell
3. Unified metrics API
4. P2: Slette/deprekere gamle wrappers når alle konsumenter er migrert

## Testplan
```bash
npm run type-check
npm run lint
npm run test:unit
npm run test:e2e:critical
```

Verifiser at paper trading fortsatt fungerer via UI, og at live trading route kompilerer (krever Binance-setup for full test).
