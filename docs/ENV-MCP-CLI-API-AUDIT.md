# ENV, MCP, CLI, API og SQL/PSQL – audit og optimalisering

> Sikrer at prosjektet har full dekning: alle env-variabler dokumentert, MCP/CLI/API per domene, og tydelig SQL/PSQL-flyt.  
> Oppdatert: 2026-03

**Operasjonell «full auto»-matrise (secrets, CI, preflight):** [FULL-AUTOMATION-PLAYBOOK.md](./FULL-AUTOMATION-PLAYBOOK.md)

---

## 1. ENV – full liste (brukt i kode)

Variabler som **src/** og **scripts/** faktisk bruker, og hvor de settes.

### Påkrevd for app (prod)

| Variabel                             | Bruk                                                                           | Hvor                |
| ------------------------------------ | ------------------------------------------------------------------------------ | ------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`           | Supabase client                                                                | .env.local / Vercel |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`      | Supabase client                                                                | .env.local / Vercel |
| `SUPABASE_SERVICE_ROLE_KEY`          | Admin API, webhooks, Edge                                                      | .env.local / Vercel |
| `STRIPE_SECRET_KEY`                  | Stripe SDK, checkout, webhooks                                                 | .env.local / Vercel |
| `STRIPE_WEBHOOK_SECRET`              | Webhook-signatur                                                               | .env.local / Vercel |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe client                                                                  | .env.local / Vercel |
| `ENCRYPTION_KEY`                     | encrypt-api-keys (32-byte hex)                                                 | .env.local / Vercel |
| `CRON_SECRET`                        | Cron-ruter (tick, keepalive, update-usdt-nok, sync-prices, admin cron-trigger) | .env.local / Vercel |

### Stripe-priser (planer)

| Variabel                                                 | Bruk                 |
| -------------------------------------------------------- | -------------------- |
| `NEXT_PUBLIC_STRIPE_PRICE_BACHELOR`                      | Checkout bachelor    |
| `NEXT_PUBLIC_STRIPE_PRICE_MASTER`                        | Checkout master      |
| `NEXT_PUBLIC_STRIPE_PRICE_PHD`                           | Checkout phd         |
| `NEXT_PUBLIC_STRIPE_PRICE_PROFESSOR`                     | Checkout professor   |
| `NEXT_PUBLIC_STRIPE_STUDENT_PRICE_MONTHLY` / `_ANNUAL`   | lib/stripe.ts        |
| `NEXT_PUBLIC_STRIPE_MASTER_PRICE_MONTHLY` / `_ANNUAL`    | lib/stripe.ts        |
| `NEXT_PUBLIC_STRIPE_PROFESSOR_PRICE_MONTHLY` / `_ANNUAL` | lib/stripe.ts        |
| `NEXT_PUBLIC_PRICE_*` (CRYPTO_COURSE, TRADING_COURSE, …) | lib/stripe-prices.ts |

### Vercel / KV / Cache

| Variabel                               | Bruk                                      |
| -------------------------------------- | ----------------------------------------- |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | @vercel/kv (cache.ts, rate-limit, health) |
| `VERCEL`, `NEXT_PUBLIC_VERCEL_URL`     | Layout Analytics, getAppUrl fallback      |
| `VERCEL_GIT_COMMIT_SHA`                | /api/health version                       |

### App-URL og Sentry

| Variabel                 | Bruk                                            |
| ------------------------ | ----------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`    | Canonical URL (auth/config, middleware)         |
| `NEXT_PUBLIC_SITE_URL`   | admin cron-trigger, stripe checkout success URL |
| `NEXT_PUBLIC_BASE_URL`   | stripe checkout                                 |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry client                                   |
| `SENTRY_AUTH_TOKEN`      | Build / deploy (ikke i src)                     |

### E-post og notifikasjoner

| Variabel                       | Bruk                                               |
| ------------------------------ | -------------------------------------------------- |
| `RESEND_API_KEY`               | Resend (webhooks, send-email, admin resend-health) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Push (notifications)                               |

### Auth og betaling

| Variabel                                                                                                             | Bruk                                 |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `VIPPS_CLIENT_ID`, `VIPPS_CLIENT_SECRET`, `VIPPS_SUBSCRIPTION_KEY`, `VIPPS_MERCHANT_SERIAL_NUMBER`, `VIPPS_BASE_URL` | Vipps callback                       |
| `BINANCE_ENCRYPTION_SECRET`                                                                                          | /api/binance/encrypt                 |
| `NEXT_PUBLIC_ENCRYPTION_KEY`                                                                                         | lib/crypto/encrypt (legacy fallback) |

### AI / LLM

| Variabel                                                  | Bruk                                         |
| --------------------------------------------------------- | -------------------------------------------- |
| `OPENAI_API_KEY`                                          | (i .env.example)                             |
| `PERPLEXITY_API_KEY`                                      | /api/chat, /api/ai/chat                      |
| `MOONSHOT_API_KEY` / `KIMI_API_KEY`                       | lib/ai/providers, /api/ai/chat               |
| `NVIDIA_API_KEY` / `NVIDIA_NIM_API_KEY`                   | lib/ai/providers                             |
| `HUGGINGFACE_API_KEY` / `NEXT_PUBLIC_HUGGINGFACE_API_KEY` | sentiment-analyzer                           |
| `NEXT_PUBLIC_CF_AI_WORKER_URL`                            | Cloudflare Workers AI (cloudflare-inference) |

### Database og migrasjoner (lokalt/CI)

| Variabel                 | Bruk                                                  |
| ------------------------ | ----------------------------------------------------- |
| `DATABASE_URL`           | psql, run-supabase-mcp.mjs (supabase-db MCP), scripts |
| `DATABASE_URL_MIGRATION` | Session pooler (port 5432)                            |
| `SUPABASE_ACCESS_TOKEN`  | Supabase MCP (Management API)                         |

### MCP / CLI / API (lokalt eller CI)

| Variabel                                        | Bruk                                                          |
| ----------------------------------------------- | ------------------------------------------------------------- |
| `GITHUB_TOKEN`                                  | GitHub MCP                                                    |
| `LINEAR_API_KEY`                                | Linear MCP + run-linear-mcp.mjs + /api/linear/\*              |
| `VERCEL_TOKEN`                                  | vercel-api.mjs, test-mcp, deploy                              |
| `VERCEL_PROJECT_ID`, `VERCEL_ORG_ID`            | vercel-api.mjs (valgfritt)                                    |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | cloudflare-api.mjs, test-mcp, DNS-scripts                     |
| `CURSOR_API_KEY`                                | cursor-api.mjs (Cloud Agents API)                             |
| `STRIPE_SECRET_KEY`                             | stripe-api.mjs, check-stripe-prices.mjs, test-mcp, mcp-health |
| `RESEND_API_KEY`                                | test-mcp, mcp-health                                          |
| `CLOUDFLARE_API_TOKEN`                          | cloudflare-api.mjs, test-mcp, mcp-health (valgfri)            |

### Dev / test

| Variabel                                                       | Bruk                                       |
| -------------------------------------------------------------- | ------------------------------------------ |
| `TEST_SECRET`, `ALLOW_TEST_API`                                | /api/test/auth/login (prod-guard)          |
| `CRON_API_KEY`                                                 | /api/cron/auto-trade (valgfri ekstra auth) |
| `BINANCE_API_KEY`, `BINANCE_API_SECRET`, `BINANCE_USE_TESTNET` | lib/binance/client (server-side)           |

---

## 2. MCP – dekning per domene

| Domene                | MCP-server  | Konfigurasjon                           | Nødvendig env               |
| --------------------- | ----------- | --------------------------------------- | --------------------------- |
| GitHub                | github      | npx @modelcontextprotocol/server-github | GITHUB_TOKEN                |
| Linear                | linear      | node scripts/run-linear-mcp.mjs         | LINEAR_API_KEY (.env.local) |
| Supabase (Management) | supabase    | npx @supabase/mcp-server-supabase       | SUPABASE_ACCESS_TOKEN       |
| Supabase (DB/SQL)     | supabase-db | node scripts/run-supabase-mcp.mjs       | DATABASE_URL (.env.local)   |
| Playwright            | playwright  | npx @playwright/mcp@latest              | —                           |
| Resend                | resend      | npx resend-mcp@latest                   | RESEND_API_KEY              |
| Vipps                 | vipps       | node scripts/run-vipps-mcp.mjs          | (i wrapper)                 |
| Vercel                | vercel      | url: https://mcp.vercel.com             | OAuth (ingen token i repo)  |
| Cloudflare            | cloudflare  | url: https://mcp.cloudflare.com/mcp     | OAuth                       |

**Verifisere:** `npm run test:mcp` (Supabase REST, Stripe, Vercel, Resend, Cloudflare API, CF connectivity). Linear: `npm run linear:test`. Cursor: `npm run cursor:config` (uten token), `npm run cursor:test` (med CURSOR_API_KEY).

---

## 3. CLI – dekning per domene

| Domene     | Kommandoer                                                                           | Script                              |
| ---------- | ------------------------------------------------------------------------------------ | ----------------------------------- |
| Linear     | teams, issues, create, update                                                        | scripts/linear-api.mjs              |
| Supabase   | db:push, db:status, db:diff                                                          | supabase CLI                        |
| Vercel     | vercel:test, projects, deployments, project, vercel:env, deploy:prod                 | scripts/vercel-api.mjs + npx vercel |
| Cloudflare | cloudflare:test, zones, dns, account, pages                                          | scripts/cloudflare-api.mjs          |
| Stripe     | stripe:test, stripe test, stripe prices                                              | scripts/stripe-api.mjs              |
| Vipps      | vipps:test, vipps test                                                               | scripts/vipps-api.mjs               |
| Cursor     | cursor:test, me, agents, agent, models, config; cursor:agent, agent-ls, agent-resume | scripts/cursor-api.mjs + Cursor CLI |

---

## 4. API (app-ruter) – referanse

- **Admin:** `/api/admin/*` — LINEAR_API_KEY, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET, osv.
- **Health:** `GET /api/health` — sjekker DB, KV, env-liste.
- **Full tabell:** **docs/api-routes.md**.

---

## 4b. Cron (source of truth)

**Cron skal alltid kjøres fra Supabase** (pg_cron eller Supabase scheduler). Vercel Cron er ikke source of truth. Nye tidsplanlegginger legges i Supabase; `/api/cron/*` kalles med CRON_SECRET. Se **docs/CRON-SOURCE-OF-TRUTH.md**.

---

## 5. SQL / PSQL – kanonisk flyt

| Behov                     | Anbefalt                                                                      | Alternativ                      |
| ------------------------- | ----------------------------------------------------------------------------- | ------------------------------- |
| Migrasjoner kjøre         | `npm run db:push` (supabase db push --linked)                                 | Manuelt i Dashboard SQL Editor  |
| Migrasjonsstatus          | `npm run db:status` (supabase migration list --linked)                        | —                               |
| Diff mot remote           | `npm run db:diff` (supabase db diff --linked)                                 | —                               |
| Ad-hoc SQL (fra Cursor)   | MCP **supabase-db** → execute_sql / list_tables / apply_migration             | —                               |
| Ad-hoc SQL (fra terminal) | `scripts/run-sql-rest.mjs` eller `scripts/exec-sql-remote.mjs` (DATABASE_URL) | `psql $DATABASE_URL -f fil.sql` |
| RLS / én migrasjon        | Supabase MCP apply_migration eller lim inn i Dashboard                        | supabase db push                |

**PSQL:** Krever `DATABASE_URL` (eller `DATABASE_URL_MIGRATION` for session pool). Scripts som bruker psql: scripts/supabase/apply-migrations.sh, scripts/mcp.sh, scripts/supabase-sql-executor.sh.

---

## 6. Optimalisering – sjekkliste

- [x] **ENV:** Alle variabler som koden bruker er listet i §1; .env.local.example dekker de viktigste med kommentarer for resten.
- [x] **MCP:** Alle domener (GitHub, Linear, Supabase, Supabase-DB, Playwright, Resend, Vipps, Vercel, Cloudflare) har enten MCP eller CLI.
- [x] **CLI:** Linear, Vercel, Cloudflare, Cursor har dedikerte CLI-skript; Supabase bruker offisiell CLI.
- [x] **API:** App-ruter dokumentert i api-routes.md; health brukes av verify og overvåking.
- [x] **SQL/PSQL:** Kanonisk flyt er db:push / db:status / db:diff + supabase-db MCP for SQL; psql ved behov med DATABASE_URL.
- [x] **test:mcp:** Tester Supabase REST, Stripe, Vercel, Cloudflare API, Cloudflare connectivity, Sentry, Resend; Linear og Cursor har egne tester.

**Konklusjon:** Oppsettet er superoptimalisert for prosjektet: ENV er kartlagt, MCP/CLI/API dekker alle domener, og SQL/PSQL har én tydelig anbefalt flyt.
