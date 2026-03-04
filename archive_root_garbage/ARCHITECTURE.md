# 🏗️ Klarpakke Systemarkitektur

> **Sist oppdatert:** 20. Februar 2026  
> **Status:** Auto Trade i produksjon

---

## Systemoversikt

Klarpakke er en tre-lags webapplikasjon for kryptovaluta-læring og algoritmisk handel:

1. **Frontend**: Next.js 15 (App Router) hostet på **Vercel**
2. **Backend**: Supabase Edge Functions + Next.js API Routes
3. **Database**: PostgreSQL med Row Level Security (RLS)
4. **Scheduler**: Cloud Scheduler + pg_cron for trading-jobs

---

## Arkitekturdiagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BRUKERE / KLIENTER                              │
│                         (Browser, Mobil, API)                                │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ HTTPS
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             VERCEL PLATFORM                                  │
│                    (klarpakke-universitet / us-central1)                     │
│                                                                              │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐  │
│  │   Next.js App       │  │   API Routes        │  │   Statiske filer    │  │
│  │   ├─ Dashboard      │  │   ├─ /api/binance/* │  │   ├─ _next/static   │  │
│  │   ├─ Kurs           │  │   ├─ /api/webhooks  │  │   ├─ images         │  │
│  │   ├─ Auto Trade     │  │   ├─ /api/health    │  │   └─ favicon        │  │
│  │   └─ Admin          │  │   └─ /api/entitlements│ └─────────────────────┘  │
│  └──────────┬──────────┘  └──────────┬──────────┘                          │
└─────────────┼────────────────────────┼───────────────────────────────────────┘
              │                        │
              │ Auth (JWT)             │ SQL via REST
              ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SUPABASE PLATFORM                                  │
│                    (vuxbjlykgmzskxbclquf.supabase.co)                        │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                          SUPABASE AUTH                                  │  │
│  │  - JWT Token Generation (access + refresh)                              │  │
│  │  - Session Management                                                   │  │
│  │  - Google OAuth                                                         │  │
│  │  - Email/Password auth                                                  │  │
│  └─────────────────────────────┬──────────────────────────────────────────┘  │
│                                │                                             │
│  ┌─────────────────────────────┴──────────────────────────────────────────┐  │
│  │                    EDGE FUNCTIONS (Deno Runtime)                        │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐   │  │
│  │  │ get-entitlements │  │ strategy-runner  │  │   signal-engine      │   │  │
│  │  │ - Tier-sjekk     │  │ - Kjører strategier│  │ - Generer signaler   │   │  │
│  │  │ - Auth validering│  │ - Grid bot       │  │ - Teknisk analyse    │   │  │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────────┘   │  │
│  │  ┌──────────────────┐  ┌──────────────────┐                              │  │
│  │  │ binance-connect  │  │    webhook       │                              │  │
│  │  │ - API key mgmt   │  │ - Stripe webhooks│                              │  │
│  │  └──────────────────┘  └──────────────────┘                              │  │
│  └─────────────────────────────┬──────────────────────────────────────────┘  │
│                                │                                             │
│  ┌─────────────────────────────┴──────────────────────────────────────────┐  │
│  │                      POSTGRESQL DATABASE                                │  │
│  │                                                                          │  │
│  │  Core Tables:           Auto Trade Tables:        Auth/Config:          │  │
│  │  ┌──────────────┐      ┌──────────────────┐      ┌────────────────┐     │  │
│  │  │ users        │      │ user_binance_keys│      │ auth.users     │     │  │
│  │  │ profiles     │      │ user_strategies  │      │ subscriptions  │     │  │
│  │  │ courses      │      │ grid_bot_state   │      │ tiers          │     │  │
│  │  │ lessons      │      │ trade_history    │      └────────────────┘     │  │
│  │  └──────────────┘      │ strategy_logs    │                             │  │
│  │                        └──────────────────┘                             │  │
│  │                                                                          │  │
│  │  RLS: Alle tabeller har Row Level Security aktivert                     │  │
│  │  Indexes: Optimalisert for trading-queries                              │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       │ pg_cron extension
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PG_CRON SCHEDULER                                    │
│                                                                              │
│  ┌─────────────────────┬──────────────────────────────────────────────────┐  │
│  │ Jobb                │ Schedule    │ Beskrivelse                        │  │
│  ├─────────────────────┼─────────────┼────────────────────────────────────┤  │
│  │ klarpakke-dca-weekly│ 0 9 * * 1   │ DCA-strategi (ukentlig)            │  │
│  │ klarpakke-trend-daily│ 0 21 * * * │ Trend-strategi (daglig)            │  │
│  │ klarpakke-multisignal│ 5 */4 * * *│ Multisignal (hver 4. time)         │  │
│  │ klarpakke-grid-check│ * * * * *   │ Grid check (hvert minutt)          │  │
│  │ klarpakke-aicopy-poll│ */5 * * * *│ AI Copy polling (hvert 5. min)     │  │
│  └─────────────────────┴─────────────┴────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                       ▲
                                       │ HTTP (hvert 30. sekund)
┌──────────────────────────────────────┴──────────────────────────────────────┐
│                            VERCEL CRON                                       │
│                                                                              │
│  Job: klarpakke-grid-bot-realtime                                            │
│  - Schedule: */30 * * * * * (hvert 30. sekund)                               │
│  - Target: Supabase Edge Function (strategy-runner)                          │
│  - Payload: {"strategy": "grid_bot"}                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Komponent-detaljer

### 1. Frontend Layer (Next.js 15)

#### App Router Struktur

```
src/app/
├── [locale]/                    # i18n routing (no/en/th/zh)
│   ├── (auth)/                  # Auth-gruppert layout
│   │   ├── innlogging/          # Login page
│   │   ├── signup/              # Signup page
│   │   └── glemt-passord/       # Forgot password
│   ├── dashboard/               # Hoveddashboard
│   │   ├── page.tsx             # Dashboard home
│   │   ├── auto-trade/          # Auto Trade dashboard
│   │   ├── paper-trading/       # Paper trading
│   │   └── settings/            # Brukerinnstillinger
│   ├── admin-dashboard/         # Admin-panel
│   └── api/                     # API routes
│       ├── binance/             # Binance API proxy
│       ├── webhooks/            # Stripe webhooks
│       └── health/              # Health check
```

#### Viktige Konfigurasjoner

- **Output**: `standalone` (påkrevd for Cloud Run)
- **i18n**: Egen implementasjon med middleware
- **Auth**: Supabase SSR med `getUser()`

---

### 2. Backend Layer

#### Next.js API Routes

| Route                  | Beskrivelse                 |
| ---------------------- | --------------------------- |
| `/api/binance/keys`    | CRUD for Binance API-nøkler |
| `/api/entitlements`    | Sjekk brukertilganger       |
| `/api/webhooks/stripe` | Stripe webhook håndtering   |
| `/api/health`          | Health check for monitoring |

#### Supabase Edge Functions

| Funksjon           | Formål                              | Trigger           |
| ------------------ | ----------------------------------- | ----------------- |
| `get-entitlements` | Hent brukertilganger basert på tier | HTTP/Edge         |
| `strategy-runner`  | Kjør trading-strategier             | Scheduler/pg_cron |
| `signal-engine`    | Generer trading-signaler            | pg_cron           |
| `binance-connect`  | Valider og test Binance API         | HTTP              |

---

### 3. Database Layer

#### Core Tabeller

**users / profiles**

```sql
- id (UUID, PK)
- email (TEXT)
- subscription_tier (TEXT: student/bachelor/master/professor)
- created_at (TIMESTAMPTZ)
```

**subscription_tiers**

```sql
- tier_name (TEXT, PK)
- auto_trade_limit (INTEGER)
- live_trading_enabled (BOOLEAN)
- max_positions (INTEGER)
```

#### Auto Trade Tabeller

**user_binance_keys**

```sql
- id (UUID, PK)
- user_id (UUID, FK → auth.users)
- api_key_encrypted (TEXT)
- api_secret_encrypted (TEXT)
- is_testnet (BOOLEAN)
- created_at (TIMESTAMPTZ)
-- RLS: Bruker ser kun egne nøkler
```

**user_strategies**

```sql
- id (UUID, PK)
- user_id (UUID, FK)
- name (TEXT)
- strategy_type (TEXT: dca/trend/multisignal/grid/aicopy)
- mode (TEXT: paper/live)
- status (TEXT: active/paused/stopped)
- config (JSONB)
- created_at (TIMESTAMPTZ)
```

**grid_bot_state**

```sql
- strategy_id (UUID, FK)
- grid_levels (JSONB)
- open_orders (JSONB)
- last_check_at (TIMESTAMPTZ)
```

**trade_history**

```sql
- id (UUID, PK)
- user_id (UUID, FK)
- strategy_id (UUID, FK)
- symbol (TEXT)
- side (TEXT: buy/sell)
- quantity (DECIMAL)
- price (DECIMAL)
- executed_at (TIMESTAMPTZ)
```

**strategy_logs**

```sql
- id (UUID, PK)
- strategy_id (UUID, FK)
- strategy_type (TEXT)
- action (TEXT)
- details (JSONB)
- executed_at (TIMESTAMPTZ)
```

---

## Dataflyt

### Auto Trade Aktivering

```
1. Bruker går til /dashboard/auto-trade
2. Middleware sjekker auth (getUser())
3. Frontend henter entitlements fra get-entitlements
4. Viser tillatte strategier basert på tier
5. Bruker aktiverer strategi:
   a. Validerer mot tier-grenser
   b. Lagrer i user_strategies
   c. Trigger initialisering
6. Scheduler/pg_cron trigger strategy-runner
7. Strategy-runner:
   a. Henter strategi-config
   b. Kaller Binance API (brukerens nøkler)
   c. Logger til trade_history
   d. Oppdaterer grid_bot_state (hvis grid)
```

### Autentiseringsflyt

```
1. Bruker logger inn via /innlogging
2. Supabase Auth returnerer JWT (access + refresh)
3. Cookies settes med SSR
4. Middleware validerer JWT ved hver request
5. Bruker redirectes til dashboard
6. Token refreshes automatisk
```

---

## Sikkerhetsarkitektur

### Forsvar i dybden

#### Lag 1: Nettverk

- HTTPS kun (håndhevet av Cloud Run + Supabase)
- CORS konfigurert i Edge Functions
- Rate limiting i middleware.ts

#### Lag 2: Autentisering

- JWT tokens (signert av Supabase Auth)
- Token expiry: 1 time
- Auto-refresh hvert 5. minutt
- Secure session storage

#### Lag 3: Autorisasjon

- Rollebasert tilgang (RBAC)
- Tier-baserte begrensninger
- Permissions sjekket i API routes

#### Lag 4: Database (RLS)

- Row Level Security på ALLE tabeller
- Policies håndhever bruker-isolasjon
- Ingen direkte database-tilgang fra klient

#### Lag 5: Input-validering

- Zod schemas for API input
- UUID validering
- SQL injection beskyttelse (parameteriserte queries)

#### Lag 6: Audit Logging

- Alle handlinger logges
- strategy_logs for trading
- audit_logs for admin-handlinger

---

## Teknologistack

| Komponent   | Teknologi                                   |
| ----------- | ------------------------------------------- |
| Frontend    | Next.js 15, React, TypeScript, Tailwind CSS |
| Runtime     | Node.js 20                                  |
| Backend     | Supabase Edge Functions (Deno)              |
| Database    | PostgreSQL 15 (Supabase)                    |
| Auth        | Supabase Auth                               |
| Betaling    | Stripe                                      |
| Hosting     | Vercel                                      |
| Scheduler   | Vercel Cron + pg_cron                       |
| Trading API | Binance API                                 |
| CI/CD       | GitHub Actions (sekundær)                   |

---

## Skalerbarhet

### Nåværende (MVP)

- **Cloud Run**: Auto-scale 1-100 instanser
- **Database**: Single instance (tilstrekkelig for <10k brukere)
- **Rate Limiting**: In-memory per instans
- **Scheduler**: Vercel Cron + pg_cron

### Fremtidig (ved behov)

1. **Database**: Connection pooling, read replicas
2. **Caching**: Redis for hyppige queries
3. **Rate Limiting**: Distribuert (Redis/Upstash)
4. **Monitoring**: Real-time alerts, P99 latency tracking

---

## Kilder

- [.kimi/MASTER_PROMPT.md](../.kimi/MASTER_PROMPT.md) — AI-agent instruksjoner
- [auto-trade.md](./auto-trade.md) — Auto Trade-detaljer
- [infra-gcp.md](./infra-gcp.md) — GCP-infrastruktur
- [auth-and-middleware.md](./auth-and-middleware.md) — Auth-oppsett
