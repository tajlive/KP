# 🏗️ Klarpakke Systemarkitektur

> **Sist oppdatert:** 2026-06-29 av Lead Architect  
> **Status:** Produksjon på Cloudflare Workers (OpenNext.js + Wrangler)

---

## Systemoversikt

Klarpakke er en tre-lags webapplikasjon for kryptovaluta-læring og algoritmisk handel:

1. **Frontend / API**: Next.js 16 (App Router) hostet på **Cloudflare Workers** via OpenNext.js + Wrangler
2. **Backend**: Supabase Edge Functions + Next.js API Routes (kjører i Worker)
3. **Database**: PostgreSQL med Row Level Security (RLS)
4. **Scheduler**: **Supabase** (`pg_cron` / Supabase scheduler) som kilde for tidsplan — se [`docs/CRON-SOURCE-OF-TRUTH.md`](CRON-SOURCE-OF-TRUTH.md). App-ruter under `/api/cron/*` kalles med `CRON_SECRET`.

> **Migreringsstatus:** Plattformen er migrert fra Hetzner + Coolify til Cloudflare Workers (OpenNext.js + Wrangler) med automatisk deploy via Cloudflare Workers Builds. `docs/SELF-HOSTED-SETUP.md` er arkivert/utdatert.

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
│                        CLOUDFLARE EDGE NETWORK                               │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │              CLOUDFLARE WORKERS (OpenNext.js + Wrangler)              │   │
│  │                                                                       │   │
│  │  ┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────┐  │   │
│  │  │   Next.js App       │  │   API Routes        │  │   R2 Cache   │  │   │
│  │  │   ├─ Dashboard      │  │   ├─ /api/binance/* │  │   (ISR)      │  │   │
│  │  │   ├─ Kurs           │  │   ├─ /api/webhooks  │  ├─ D1 Tag Cache│  │   │
│  │  │   ├─ Auto Trade     │  │   ├─ /api/health    │  ├─ DO Queue    │  │   │
│  │  │   └─ Admin          │  │   └─ /api/entitlements│ ├─ KV Store   │  │   │
│  │  └─────────────────────┘  └─────────────────────┘  └──────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Bindinger:                                                                  │
│  - KV_KLARPAKE (KV namespace)                                               │
│  - NEXT_INC_CACHE_R2_BUCKET (valgfri, aktivert via OPENNEXT_ENABLE_R2_CACHE)│
│  - NEXT_TAG_CACHE_D1 (valgfri)                                              │
│  - WORKER_SELF_REFERENCE (valgfri, for DO queue)                            │
└───────────────────────────┬─────────────────────────────────────────────────┘
                            │ Auth (JWT) / SQL via REST
                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SUPABASE PLATFORM                                  │
│                    (pskhryjzkobytnfwucrb.supabase.co)                        │
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
│  │                        │ strategy_performance│                            │  │
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
│  └─────────────────────┴─────────────┼────────────────────────────────────┘  │
└──────────────────────────────────────┴──────────────────────────────────────┘
                                       ▲
                                       │ HTTP (Bearer CRON_SECRET)
┌──────────────────────────────────────┴──────────────────────────────────────┐
│  Tidsplan (SoT): Supabase pg_cron / scheduler → kaller Next `/api/cron/*`    │
│  Detaljer: docs/CRON-SOURCE-OF-TRUTH.md                                      │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Deploy & CI/CD

### Primær kanal: Cloudflare Workers Builds

- **Repo:** https://github.com/tajlive/KP
- **Branch:** `main`
- **Build-kommando:** `npm run cf:build`
- **Deploy-kommando:** `wrangler deploy --minify --var APP_VERSION:${CI_COMMIT_SHA}`
- **Trigger:** Push til `main`

### Backup-kanal: Wrangler CLI

```bash
npm run cf:deploy
# Ekvivalent med:
# npm run cf:build && wrangler deploy --minify --var APP_VERSION:$(git rev-parse HEAD)
```

### Verifikasjon

```bash
# Sjekk deployments
npx wrangler deployment list

# Live logs
npx wrangler tail

# Produksjon health
curl -I https://www.klarpakke.no/no
curl https://www.klarpakke.no/api/health
```

### Viktig: GitHub Actions

GitHub Actions workflows i `.github/workflows/` er **arkivert** (unntatt `purge-cache.yml` og `tool-updater.yml`). Kvalitetskontroller (lint, type-check, unit tests) kjøres via **Husky pre-push hook** (`.husky/pre-push`). Se `.kimi/WORKFLOW_RULES.md` for detaljer.

---

## Komponent-detaljer

### 1. Frontend Layer (Next.js 16)

#### App Router Struktur

```
src/app/
├── [locale]/                    # i18n routing (next-intl: no/en; se docs/i18n/LOCALE-SCOPE-SOURCE-OF-TRUTH.md)
│   ├── (auth)/                  # Auth-gruppert layout
│   │   ├── innlogging/          # Login page
│   │   ├── signup/              # Signup page
│   │   └── glemt-passord/       # Forgot password
│   ├── dashboard/               # Hoveddashboard
│   │   ├── page.tsx             # Dashboard home
│   │   ├── handel/              # Unified trading workspace (paper/live)
│   │   └── settings/            # Brukerinnstillinger
│   ├── admin/                   # Admin-panel (f.eks. /no/admin/analytics, /no/admin/users)
│   └── api/                     # API routes
│       ├── binance/             # Binance API proxy
│       ├── webhooks/            # Stripe webhooks
│       ├── cron/                # Cron endpoints (pg_cron → CRON_SECRET)
│       └── health/              # Health check
```

#### Viktige Konfigurasjoner

- **Output**: OpenNext.js Cloudflare Worker (ikke standalone)
- **Build**: `npm run cf:build` (`opennextjs-cloudflare build`)
- **i18n**: next-intl + middleware; aktiv oversettelses-SoT **no + en** (`docs/i18n/LOCALE-SCOPE-SOURCE-OF-TRUTH.md`)
- **Auth**: Supabase SSR med `getUser()`; session i cookies. Client: `createClient` fra `@/lib/utils`; server: `createServerClient` fra `@/lib/supabase/server`. Detaljer: [docs/auth-and-middleware.md](auth-and-middleware.md)
- **Caching**: R2 incremental cache + D1 tag cache + DO revalidation queue (valgfri, aktiveres med `OPENNEXT_ENABLE_R2_CACHE=true`)

---

### 2. Backend Layer

#### Next.js API Routes (kjører i Cloudflare Worker)

| Route                  | Beskrivelse                 |
| ---------------------- | --------------------------- |
| `/api/binance/*`       | Binance API proxy / nøkkelhåndtering |
| `/api/entitlements`    | Sjekk brukertilganger       |
| `/api/webhooks/stripe` | Stripe webhook håndtering   |
| `/api/cron/*`          | Scheduler-endpoints         |
| `/api/health`          | Health check for monitoring |

#### Supabase Edge Functions

| Funksjon           | Formål                              | Trigger                                                                             |
| ------------------ | ----------------------------------- | ----------------------------------------------------------------------------------- |
| `get-entitlements` | Hent brukertilganger basert på tier | HTTP/Edge                                                                           |
| `strategy-runner`  | Kjør trading-strategier             | Scheduler/pg_cron                                                                   |
| `signal-engine`    | Generer trading-signaler (Binance)  | pg_cron (hver time); skriver til `bot_signals` + `trading_signals` (dashboard-feed) |
| `binance-connect`  | Valider og test Binance API         | HTTP                                                                                |
| `position-monitor` | Overvåker SL/TP/Trailing-Stop        | pg_cron (hvert minutt)                                                              |

---

### 3. Database Layer

Alle tabeller har **Row Level Security (RLS)** aktivert. Edge Functions bruker `SUPABASE_SERVICE_ROLE_KEY` for å omgå RLS der det er nødvendig.

#### Core Tabeller

- `users` / `profiles`
- `subscription_tiers`
- `courses`, `lessons`

#### Auto Trade Tabeller

- `user_binance_keys`
- `user_strategies`
- `grid_bot_state`
- `trade_history`
- `strategy_logs`
- `strategy_performance`
- `bot_health`
- `paper_orders`
- `auto_trading_strategies`
- `binance_connections`

Se `docs/trading/V3-0-ARCHITECTURE.md` for trading-spesifikk arkitektur.

---

## Dataflyt

### Auto Trade Aktivering

```
1. Bruker går til /dashboard/handel
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

- HTTPS kun (håndhevet av Cloudflare + Supabase)
- CORS konfigurert i Edge Functions
- Rate limiting i `middleware.ts`

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
- `strategy_logs` for trading
- `admin_audit_log` for utvalgte admin-mutasjoner

---

## Teknologistack

| Komponent   | Teknologi                                                                 |
| ----------- | ------------------------------------------------------------------------- |
| Frontend    | Next.js 16, React 19, TypeScript 5.9, Tailwind CSS 4                      |
| Runtime     | Cloudflare Workers (OpenNext.js + Wrangler)                               |
| Backend     | Supabase Edge Functions (Deno) + Next.js API Routes                       |
| Database    | PostgreSQL 15 (Supabase)                                                  |
| Auth        | Supabase Auth                                                             |
| Betaling    | Stripe                                                                    |
| Hosting     | Cloudflare Workers + Cloudflare DNS/CDN/Proxy                             |
| Scheduler   | Supabase pg_cron / scheduler → `/api/cron/*`                              |
| Trading API | Binance API                                                               |
| Error Tracking | Selv-hostet GlitchTip (`docker-compose.glitchtip.yml`)                 |
| CI/CD       | Cloudflare Workers Builds (primær) + Wrangler CLI (backup)                |
| Caching     | R2 incremental cache + D1 tag cache + DO revalidation queue (valgfri)     |

---

## Skalerbarhet

### Nåværende (MVP)

- **Hosting**: Cloudflare Workers (global edge)
- **Database**: Supabase PostgreSQL, single instance (tilstrekkelig for <10k brukere)
- **Rate Limiting**: In-memory per Worker-instans (vurder Upstash/redis for distribuert)
- **Scheduler**: Supabase → `/api/cron/*`
- **Error Tracking**: Selv-hostet GlitchTip

### Fremtidig (ved behov)

1. **Database**: Connection pooling, read replicas
2. **Caching**: Full R2/D1-cache aktivering for ISR
3. **Rate Limiting**: Distribuert (Upstash / Cloudflare Rate Limiting)
4. **Monitoring**: Real-time alerts via GlitchTip, P99 latency tracking via Cloudflare Observability

---

## Kilder

- [.kimi/MASTER_PROMPT.md](../.kimi/MASTER_PROMPT.md) — AI-agent instruksjoner
- [.kimi/WORKFLOW_RULES.md](../.kimi/WORKFLOW_RULES.md) — Arbeidsflyt og deploy-regler
- [docs/CRON-SOURCE-OF-TRUTH.md](./CRON-SOURCE-OF-TRUTH.md) — Tidsplanlegging
- [docs/auth-and-middleware.md](./auth-and-middleware.md) — Auth-oppsett
- [docs/trading/V3-0-ARCHITECTURE.md](./trading/V3-0-ARCHITECTURE.md) — Trading-arkitektur
- [docs/admin/ADMIN-AUTH-SOURCE-OF-TRUTH.md](./admin/ADMIN-AUTH-SOURCE-OF-TRUTH.md) — Admin-auth
- [docs/admin/PAPER-BALANCE-SOURCE-OF-TRUTH.md](./admin/PAPER-BALANCE-SOURCE-OF-TRUTH.md) — Papirbalanse
