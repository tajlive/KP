# Secrets Inventory

This document inventories every environment variable / secret used by the Klarpakke project. It is the authoritative reference for the local secrets vault (`scripts/vault/`) which encrypts `.env.local` values and stores them in MemPalace KG under `secret:<NAME>`.

For usage instructions (sync, restore, encrypt, decrypt, disaster recovery), see [`scripts/vault/README.md`](../scripts/vault/README.md).

**Scope:**
- Sources: `.env-templates/.env.local.example`, `.env-templates/.env.example`, `.env.production.template`, `.env.deploy.template`, `package.json` scripts, runtime code (`src/`, `scripts/`, `e2e/`), Woodpecker CI workflows, and the `env-checker.ts` specification.
- Classification: `public` = `NEXT_PUBLIC_*` (exposed to the browser at build time); `server` = server-only secrets.
- Legacy variables are marked **deprecated** and should not be added to new setups.

> **Security note:** Real values must never be committed. Only placeholders are added to `.env.local` by this inventory.

---

## Required for local development

| Name | Type | Purpose | Source |
|------|------|---------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL | `.env.local.example`, runtime |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase anonymous/public API key | `.env.local.example`, runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Supabase service role key (server-side only) | `.env.local.example`, runtime |
| `POSTGRES_URL` | server | Supabase Postgres connection string (Supavisor pooler, IPv4) | `.env.local.example`, `src/app/api/health/route.ts` |
| `DATABASE_URL` | server | Fallback Postgres connection string when `POSTGRES_URL` is unset | `.env.local.example`, runtime |
| `NEXT_PUBLIC_APP_URL` | public | Canonical application URL (used for OAuth redirects) | `.env.local.example`, `src/lib/auth/config.ts` |
| `NEXT_PUBLIC_SITE_URL` | public | Public site URL fallback | `.env.local.example`, runtime |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | public | Sanity project ID | `src/sanity/env.ts`, `.env.local` |
| `NEXT_PUBLIC_SANITY_DATASET` | public | Sanity dataset (defaults to `production`) | `src/sanity/env.ts`, `.env.local` |
| `NEXT_PUBLIC_SANITY_API_VERSION` | public | Sanity API version (defaults to `2024-04-07`) | `src/sanity/env.ts`, `.env.local` |
| `SANITY_API_READ_TOKEN` | server | Sanity read token for preview/edge cases | `src/lib/sanity/client.ts` |
| `SANITY_API_WRITE_TOKEN` | server | Sanity write token for migrations and seed scripts | `scripts/seed-sanity.mjs`, `scripts/migrate-to-sanity.ts` |
| `KLARPAKKE_VAULT_KEY` | server | 256-bit master key for the local secrets vault. **Never sync to MemPalace.** | `scripts/vault/vault-key.mjs` |

---

## Required for production (Coolify)

These variables are injected at build/deploy time in Coolify and Woodpecker CI.

| Name | Type | Purpose | Source |
|------|------|---------|--------|
| `NEXT_PUBLIC_APP_URL` | public | Production application URL (e.g. `https://www.klarpakke.no`) | `.env.production.template`, `.woodpecker/deploy.yml` |
| `NEXT_PUBLIC_APP_VERSION` | public | Application version exposed to the browser | `.woodpecker/deploy.yml` |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Production Supabase project URL | `.env.production.template`, runtime |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Production Supabase anon key | `.env.production.template`, runtime |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public | Supabase publishable key (used by newer client builds) | `.env.local`, `.woodpecker/deploy.yml` |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Production Supabase service role key | `.env.production.template`, runtime |
| `POSTGRES_URL` | server | Production Postgres pooler URL | `.env.production.template`, `src/app/api/health/route.ts` |
| `DATABASE_URL` | server | Production Postgres fallback URL | `.env.production.template`, runtime |
| `CRON_SECRET` | server | Secret for cron/API authentication (`>= 32` chars) | `.env.production.template`, `.env.deploy.template`, runtime |
| `CRON_API_KEY` | server | Additional cron/API authentication key | `.env.local`, runtime |
| `EXCHANGE_ENCRYPTION_SECRET` | server | Long random secret for encrypting exchange API keys | `.env.production.template`, `src/lib/exchanges/secret-crypto.ts` |
| `STRIPE_SECRET_KEY` | server | Stripe secret key (`sk_live_...`) | `.env.production.template`, runtime |
| `STRIPE_WEBHOOK_SECRET` | server | Stripe webhook endpoint secret (`whsec_...`) | `.env.production.template`, `src/app/api/webhooks/stripe/route.ts` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | public | Stripe publishable key (`pk_live_...`) | `.env.local.example`, `src/lib/stripe/config.ts` |
| `NEXT_PUBLIC_STRIPE_PRICE_BACHELOR` | public | Stripe price ID for Bachelor tier | `src/app/api/pricing/route.ts`, `src/app/api/webhooks/stripe/route.ts` |
| `NEXT_PUBLIC_STRIPE_PRICE_MASTER` | public | Stripe price ID for Master tier | `src/app/api/pricing/route.ts`, `src/app/api/webhooks/stripe/route.ts` |
| `NEXT_PUBLIC_STRIPE_PRICE_PHD` | public | Stripe price ID for PhD tier | `src/app/api/pricing/route.ts`, `src/app/api/webhooks/stripe/route.ts` |
| `NEXT_PUBLIC_STRIPE_PRICE_PROFESSOR` | public | Stripe price ID for Professor tier | `src/app/api/pricing/route.ts`, `src/app/api/webhooks/stripe/route.ts` |
| `RESEND_API_KEY` | server | Resend API key (`full_access`) for transactional email. Rotated 2026-06-27 to dedicated `KIMI-automation` key. | `.env.local`, GitHub Actions secret, runtime |
| `NEXT_PUBLIC_GLITCHTIP_DSN` | public | GlitchTip/Sentry-compatible DSN (preferred error tracking) | `.woodpecker/deploy.yml`, `src/lib/sentry.ts` |
| `COOLIFY_DEPLOY_WEBHOOK` | server | Coolify deployment webhook URL | `.woodpecker/deploy.yml`, `scripts/coolify-deploy.mjs` |
| `COOLIFY_TOKEN` | server | Coolify API token | `.woodpecker/deploy.yml`, `scripts/coolify-deploy.mjs` |
| `NEXT_TELEMETRY_DISABLED` | public | Disable Next.js telemetry (`1`) | `.woodpecker/deploy.yml`, `.woodpecker/pr-check.yml` |

---

## Required for CI/CD (Woodpecker)

These secrets are configured as Woodpecker secrets and referenced in `.woodpecker/`.

| Name | Type | Purpose | Source |
|------|------|---------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | public | Injected into PR-check and deploy build steps | `.woodpecker/pr-check.yml`, `.woodpecker/deploy.yml` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Injected into PR-check and deploy build steps | `.woodpecker/pr-check.yml`, `.woodpecker/deploy.yml` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public | Injected into PR-check and deploy build steps | `.woodpecker/pr-check.yml`, `.woodpecker/deploy.yml` |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | public | Injected into PR-check and deploy build steps | `.woodpecker/pr-check.yml`, `.woodpecker/deploy.yml` |
| `NEXT_PUBLIC_SANITY_DATASET` | public | Injected into PR-check and deploy build steps | `.woodpecker/pr-check.yml`, `.woodpecker/deploy.yml` |
| `NEXT_PUBLIC_SANITY_API_VERSION` | public | Injected into PR-check and deploy build steps | `.woodpecker/pr-check.yml`, `.woodpecker/deploy.yml` |
| `NEXT_PUBLIC_APP_URL` | public | Used by deploy health-check step | `.woodpecker/deploy.yml` |
| `NEXT_PUBLIC_APP_VERSION` | public | Used by deploy build step | `.woodpecker/deploy.yml` |
| `NEXT_PUBLIC_GLITCHTIP_DSN` | public | Used by deploy build step | `.woodpecker/deploy.yml` |
| `coolify_deploy_webhook` | secret | Woodpecker secret for `COOLIFY_DEPLOY_WEBHOOK` | `.woodpecker/deploy.yml` |
| `coolify_token` | secret | Woodpecker secret for `COOLIFY_TOKEN` | `.woodpecker/deploy.yml` |
| `next_public_app_url` | secret | Woodpecker secret for `NEXT_PUBLIC_APP_URL` | `.woodpecker/deploy.yml` |

---

## Optional / integration-specific

### Payments

| Name | Type | Purpose | Source |
|------|------|---------|--------|
| `STRIPE_STUDENT_PRICE_ID` | server | Stripe price ID for Student (legacy naming) | `.env.local.example` |
| `STRIPE_MASTER_PRICE_ID` | server | Stripe price ID for Master (legacy naming) | `.env.local.example` |
| `STRIPE_PROFESSOR_PRICE_ID` | server | Stripe price ID for Professor (legacy naming) | `.env.local.example` |
| `NEXT_PUBLIC_STRIPE_STUDENT_PRICE_MONTHLY` | public | Monthly student price ID | `src/lib/stripe.ts` |
| `NEXT_PUBLIC_STRIPE_STUDENT_PRICE_ANNUAL` | public | Annual student price ID | `src/lib/stripe.ts` |
| `NEXT_PUBLIC_STRIPE_MASTER_PRICE_MONTHLY` | public | Monthly master price ID | `src/lib/stripe.ts` |
| `NEXT_PUBLIC_STRIPE_MASTER_PRICE_ANNUAL` | public | Annual master price ID | `src/lib/stripe.ts` |
| `NEXT_PUBLIC_STRIPE_PROFESSOR_PRICE_MONTHLY` | public | Monthly professor price ID | `src/lib/stripe.ts` |
| `NEXT_PUBLIC_STRIPE_PROFESSOR_PRICE_ANNUAL` | public | Annual professor price ID | `src/lib/stripe.ts` |
| `NEXT_PUBLIC_STRIPE_BETA_PRICE_ID` | public | Stripe beta price ID | `.env.production.template` |
| `NEXT_PUBLIC_STRIPE_FULL_PRICE_ID` | public | Stripe full price ID | `.env.production.template` |
| `NEXT_PUBLIC_PRICE_CRYPTO_COURSE_TEST` | public | Test price ID for crypto course | `src/lib/stripe-prices.ts` |
| `NEXT_PUBLIC_PRICE_TRADING_COURSE_TEST` | public | Test price ID for trading course | `src/lib/stripe-prices.ts` |
| `NEXT_PUBLIC_PRICE_CRYPTO_SUB_TEST` | public | Test price ID for crypto subscription | `src/lib/stripe-prices.ts` |
| `NEXT_PUBLIC_PRICE_TRADING_SUB_TEST` | public | Test price ID for trading subscription | `src/lib/stripe-prices.ts` |
| `NEXT_PUBLIC_PRICE_VIP_BASIC_TEST` | public | Test price ID for VIP Basic | `src/lib/stripe-prices.ts` |
| `NEXT_PUBLIC_PRICE_VIP_PRO_TEST` | public | Test price ID for VIP Pro | `src/lib/stripe-prices.ts` |
| `NEXT_PUBLIC_PRICE_VIP_EXTREME_TEST` | public | Test price ID for VIP Extreme | `src/lib/stripe-prices.ts` |
| `NEXT_PUBLIC_PRICE_CRYPTO_COURSE` | public | Live price ID for crypto course | `src/lib/stripe-prices.ts` |
| `NEXT_PUBLIC_PRICE_TRADING_COURSE` | public | Live price ID for trading course | `src/lib/stripe-prices.ts` |
| `NEXT_PUBLIC_PRICE_CRYPTO_SUB` | public | Live price ID for crypto subscription | `src/lib/stripe-prices.ts` |
| `NEXT_PUBLIC_PRICE_TRADING_SUB` | public | Live price ID for trading subscription | `src/lib/stripe-prices.ts` |
| `NEXT_PUBLIC_PRICE_VIP_BASIC` | public | Live price ID for VIP Basic | `src/lib/stripe-prices.ts` |
| `NEXT_PUBLIC_PRICE_VIP_PRO` | public | Live price ID for VIP Pro | `src/lib/stripe-prices.ts` |
| `NEXT_PUBLIC_PRICE_VIP_EXTREME` | public | Live price ID for VIP Extreme | `src/lib/stripe-prices.ts` |

### Caching / Rate limiting

| Name | Type | Purpose | Source |
|------|------|---------|--------|
| `UPSTASH_REDIS_REST_URL` | server | Upstash Redis REST URL (preferred) | `.env.local.example`, `src/lib/redis-client.ts` |
| `UPSTASH_REDIS_REST_TOKEN` | server | Upstash Redis REST token (preferred) | `.env.local.example`, `src/lib/redis-client.ts` |
| `KV_REST_API_URL` | server | Legacy alias for Upstash Redis REST URL | `.env.local.example`, `src/lib/redis-client.ts` |
| `KV_REST_API_TOKEN` | server | Legacy alias for Upstash Redis REST token | `.env.local.example`, `src/lib/redis-client.ts` |
| `KV_REST_API_READ_ONLY_TOKEN` | server | Read-only Redis token (legacy) | `.env.local` |
| `KV_URL` | server | Redis connection string (legacy) | `.env.local` |
| `REDIS_URL` | server | Redis connection string (legacy) | `.env.local` |

### Push notifications / VAPID

| Name | Type | Purpose | Source |
|------|------|---------|--------|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | public | VAPID public key for web push notifications | `.env.local.example`, runtime |
| `VAPID_PRIVATE_KEY` | server | VAPID private key for web push notifications | `.env.local.example`, runtime |
| `VAPID_SUBJECT` | server | VAPID subject/contact email (defaults to `mailto:admin@klarpakke.no`) | `src/app/api/notifications/send/route.ts` |

### Trading / Binance

| Name | Type | Purpose | Source |
|------|------|---------|--------|
| `BINANCE_API_KEY` | server | Binance API key | `.env.production.template`, `src/lib/binance/client.ts` |
| `BINANCE_API_SECRET` | server | Binance API secret | `.env.production.template`, `src/lib/binance/client.ts` |
| `BINANCE_USE_TESTNET` | server | Set `true` to use Binance testnet | `src/lib/binance/client.ts` |
| `NEXT_PUBLIC_BINANCE_WS_URL` | public | Binance WebSocket URL | `.env.local.example` |
| `BINANCE_ENCRYPTION_SECRET` | server | Legacy alias for `EXCHANGE_ENCRYPTION_SECRET` | `src/lib/exchanges/secret-crypto.ts` |
| `ENCRYPTION_KEY` | server | Generic 64-char hex encryption key (legacy fallback) | `src/lib/crypto/encrypt-api-keys.ts` |
| `USDT_NOK_RATE` | server | Manual USDT→NOK rate override (fallback 10.8) | `src/lib/trading/currency.ts` |

### Trading / Dark Fleet & signals

| Name | Type | Purpose | Source |
|------|------|---------|--------|
| `ENABLE_DARK_FLEET` | server | Master switch for Dark Fleet AI trading | `.env.local.example`, `src/lib/flags.ts` |
| `DARK_FLEET_CHALLENGER_PERCENT` | server | Percentage of users enrolled in Dark Fleet (0-100) | `.env.local.example`, `src/lib/trading/rollout/tick-rollout.ts` |
| `DARK_FLEET_ROLLOUT_SALT` | server | Salt for deterministic Dark Fleet enrollment | `.env.local.example`, `src/lib/trading/rollout/tick-rollout.ts` |
| `DARK_FLEET_THRESHOLD` | server | Dark Fleet ensemble threshold (0.0-1.0) | `.env.local.example`, `src/app/api/cron/tick/route.ts` |
| `DARK_FLEET_MAX_POSITION` | server | Dark Fleet max position size (0.0-1.0) | `.env.local.example`, `src/app/api/cron/tick/route.ts` |
| `DARK_FLEET_TECH_WEIGHT` | server | Technical signal weight in Dark Fleet | `src/app/api/cron/tick/route.ts` |
| `DARK_FLEET_NARRATIVE_WEIGHT` | server | Narrative signal weight in Dark Fleet | `src/app/api/cron/tick/route.ts` |
| `DARK_FLEET_REGIME_WEIGHT` | server | Regime signal weight in Dark Fleet | `src/app/api/cron/tick/route.ts` |
| `BETA_USER_IDS` | server | Comma-separated user IDs with beta guardrails | `.env.local.example`, `src/app/api/cron/tick/route.ts` |
| `SIGNAL_WEIGHT_TECHNICAL` | server | Technical signal weight | `src/lib/trading/confluent-signal-engine.ts` |
| `SIGNAL_WEIGHT_NARRATIVE` | server | Narrative signal weight | `src/lib/trading/confluent-signal-engine.ts` |
| `SIGNAL_WEIGHT_REGIME` | server | Regime signal weight | `src/lib/trading/confluent-signal-engine.ts` |
| `SIGNAL_HEALTH_MAX_AGE_MINUTES` | server | Max age in minutes for signal health checks | `src/app/api/health/route.ts`, scripts |

### Trading / Outbox & audit

| Name | Type | Purpose | Source |
|------|------|---------|--------|
| `OUTBOX_MAX_FAILED` | server | Outbox monitor: max failed deliveries before alert | `src/lib/trading/core/outbox-monitor.ts` |
| `OUTBOX_PENDING_WARNING` | server | Outbox monitor: pending warning threshold | `src/lib/trading/core/outbox-monitor.ts` |
| `OUTBOX_PENDING_CRITICAL` | server | Outbox monitor: pending critical threshold | `src/lib/trading/core/outbox-monitor.ts` |
| `OUTBOX_PENDING_DURATION_MS` | server | Outbox monitor: pending duration threshold | `src/lib/trading/core/outbox-monitor.ts` |
| `AUDIT_FAIL_BLOCK` | server | Set `true` to block trades on audit failure | `src/lib/trading/core/execute-trade-safe.ts` |
| `AUDIT_S3_BUCKET` | server | S3 bucket for audit logs | `src/lib/trading/execution/audit-store.ts` |
| `AUDIT_S3_REGION` | server | S3 region for audit logs | `src/lib/trading/execution/audit-store.ts` |

### AI / LLM providers

| Name | Type | Purpose | Source |
|------|------|---------|--------|
| `PERPLEXITY_API_KEY` | server | Perplexity API key (`pplx-...`) | `.env.local`, `src/lib/ai/sonar/config.ts` |
| `SONAR_API_KEY` | server | Alias for Perplexity/Sonar API key | `src/lib/ai/sonar/config.ts` |
| `SONAR_API_BASE_URL` | server | Sonar API base URL (defaults to `https://api.perplexity.ai`) | `src/lib/ai/sonar/config.ts` |
| `ENABLE_SONAR_INTEGRATION` | server | Feature flag for Sonar integration | `src/lib/ai/sonar/feature-flags.ts` |
| `SONAR_USE_PRO_TIER` | server | Use Sonar Pro tier | `src/lib/ai/sonar/feature-flags.ts` |
| `MOONSHOT_API_KEY` | server | Moonshot AI API key | `.env.local.example`, `src/lib/ai/providers.ts` |
| `KIMI_API_KEY` | server | Alias for Moonshot AI API key | `src/lib/ai/providers.ts` |
| `NVIDIA_API_KEY` | server | NVIDIA API key | `src/lib/ai/providers.ts` |
| `NVIDIA_NIM_API_KEY` | server | NVIDIA NIM API key alias | `src/lib/ai/providers.ts` |
| `OPENAI_API_KEY` | server | OpenAI API key | `scripts/run-openai-mcp.mjs` |
| `OPENAI_ORG_ID` | server | OpenAI organization ID | `scripts/run-openai-mcp.mjs` |
| `ANTHROPIC_API_KEY` | server | Anthropic API key | `scripts/generate-content.js` |
| `HUGGINGFACE_API_KEY` | server | Hugging Face API key | `src/lib/ai/sentiment-analyzer.ts` |
| `NEXT_PUBLIC_HUGGINGFACE_API_KEY` | public | Hugging Face public API key (deprecated pattern) | `src/lib/ai/sentiment-analyzer.ts` |
| `OPIK_API_KEY` | server | Opik tracing API key | `.env.local`, `src/lib/ai/opik-client.ts` |
| `NEXT_PUBLIC_CF_AI_WORKER_URL` | public | Cloudflare AI worker URL | `src/lib/ai/cloudflare-inference.ts` |

### OAuth / Identity providers

| Name | Type | Purpose | Source |
|------|------|---------|--------|
| `GOOGLE_CLIENT_ID` | server | Google OAuth client ID | `.env.local.example` |
| `GOOGLE_CLIENT_SECRET` | server | Google OAuth client secret | `.env.local.example` |
| `APPLE_CLIENT_ID` | server | Apple OAuth client ID | `.env.local.example` |
| `APPLE_KEY_ID` | server | Apple OAuth key ID | `.env.local.example` |
| `APPLE_PRIVATE_KEY` | server | Apple OAuth private key | `.env.local.example` |
| `VIPPS_CLIENT_ID` | server | Vipps client ID | `.env.local`, `src/lib/auth/vipps-callback.ts` |
| `VIPPS_CLIENT_SECRET` | server | Vipps client secret | `.env.local`, `src/lib/auth/vipps-callback.ts` |
| `VIPPS_SUBSCRIPTION_KEY` | server | Vipps subscription key | `src/lib/auth/vipps-callback.ts` |
| `VIPPS_MERCHANT_SERIAL_NUMBER` | server | Vipps merchant serial number | `src/lib/auth/vipps-callback.ts` |
| `VIPPS_BASE_URL` | server | Vipps API base URL (defaults to `https://api.vipps.no`) | `src/lib/auth/vipps-callback.ts`, scripts |

### Webhooks / Cache invalidation

| Name | Type | Purpose | Source |
|------|------|---------|--------|
| `REVALIDATE_SECRET` | server | Secret token for `/api/revalidate` cache invalidation | `src/app/api/revalidate/route.ts` |
| `SANITY_WEBHOOK_SECRET` | server | Sanity webhook secret for cache revalidation | `.env.local`, `src/app/api/webhooks/sanity/route.ts` |
| `RESEND_WEBHOOK_SECRET` | server | Resend webhook secret for inbound email events | `src/app/api/webhooks/resend/route.ts` |
| `GITHUB_WEBHOOK_SECRET` | server | GitHub webhook secret for provider webhooks | `src/app/api/v1/webhooks/[provider]/route.ts` |

### MCP / Automation

| Name | Type | Purpose | Source |
|------|------|---------|--------|
| `MCP_API_KEY` | server | API key for the local Kimi MCP HTTP bridge | `.env.local`, `scripts/kimi-mcp-server.ts` |
| `KLARPAKKE_MCP_SECRET` | server | Supabase edge-function secret for Klarpakke MCP | `.env.local` |
| `KLARPAKKE_MCP_TOKEN` | server | Legacy/automation token placeholder | `.env.local` |
| `TRANSPORT` | server | MCP transport mode (`stdio` or `http`) | `scripts/kimi-mcp-server.ts` |
| `PORT` | server | MCP HTTP bridge port (defaults to `3100`) | `scripts/kimi-mcp-server.ts` |
| `MEMPALACE_PORT` | server | MemPalace bridge port (defaults to `3456`) | `scripts/kimi-mempalace-bridge.mjs` |
| `MEMPALACE_VERBOSE` | server | Enable verbose MemPalace logging | `scripts/run-mempalace-mcp-v3.mjs` |
| `MEMPALACE_AGENT` | server | Agent name for MemPalace auto-capture | `scripts/mempalace-auto-capture.mjs` |

### Ops / Notifications / Incident management

| Name | Type | Purpose | Source |
|------|------|---------|--------|
| `SLACK_WEBHOOK` | server | Slack webhook URL for cron alerts | `src/lib/cron/cron-helpers.ts`, cron routes |
| `SLACK_WEBHOOK_URL` | server | Slack webhook URL for ops/recovery scripts | `.env.deploy.template`, scripts |
| `SLACK_DEPLOY_WEBHOOK` | server | Slack webhook for deployment notifications | `scripts/kimi-cli-wrapper.ts`, `scripts/notify-deploy-status.ts` |
| `SLACK_BOT_TOKEN` | server | Slack bot token for thread replies | `scripts/slack-recovery-thread.mjs` |
| `SLACK_WATCHDOG_CHANNEL` | server | Slack channel for watchdog reports | `scripts/slack-recovery-thread.mjs` |
| `LINEAR_API_KEY` | server | Linear API key for auto-issue creation | `.env.local`, `.env.deploy.template`, scripts |
| `LINEAR_TEAM_ID` | server | Linear team ID for incident creation | scripts |
| `LINEAR_ONCALL_USER_ID` | server | Linear on-call user ID | `scripts/linear-watchdog-sync.mjs` |
| `LINEAR_WATCHDOG_LABEL_ID` | server | Linear label ID for watchdog issues | `scripts/linear-watchdog-sync.mjs` |

### GitHub / Cloudflare / Deploy tools

| Name | Type | Purpose | Source |
|------|------|---------|--------|
| `GITHUB_TOKEN` | server | GitHub personal access token for scripts | `.env.deploy.template`, scripts |
| `GH_PAT` | server | GitHub OAuth token for `tajlive` with `repo`, `workflow`, `read:org`, `gist`. Rotated 2026-06-27 from active `gh` CLI session. | `.env.local`, GitHub Actions secret |
| `GITHUB_OWNER` | server | GitHub owner/org (defaults to `taj`) | `scripts/run-klarpakke-monitor-mcp.mjs` |
| `GITHUB_REPO` | server | GitHub repo name (defaults to `klarpakke`) | `scripts/run-klarpakke-monitor-mcp.mjs`, `scripts/sync-github-actions-secrets.mjs` |
| `CLOUDFLARE_API_TOKEN` | server | Cloudflare API token. **Current token is under-scoped** (missing Zone:Workers Routes:Edit and Zone:Cache Purge:Edit). Use `scripts/rotate-cloudflare-token.mjs` after creating a new token. | `.env.local`, GitHub Actions secret |
| `CLOUDFLARE_ZONE_ID` | server | Cloudflare zone ID | `.env.local.example` |
| `CLOUDFLARE_ACCOUNT_ID` | server | Cloudflare account ID | `.env.local.example`, scripts |
| `VERCEL_TOKEN` | server | Vercel CLI token (legacy/migration) | `.env.local`, `.env.deploy.template`, scripts |
| `VERCEL_ORG_ID` | server | Vercel organization ID (legacy/migration) | `.env.local`, `.env.deploy.template`, scripts |
| `VERCEL_PROJECT_ID` | server | Vercel project ID (legacy/migration) | `.env.local`, `.env.deploy.template`, scripts |
| `VERCEL_TEAM_ID` | server | Vercel team ID alias | scripts |
| `VERCEL_OIDC_TOKEN` | server | Vercel OIDC token (legacy) | `.env.local` |
| `COOLIFY_COMMIT_SHA` | server | Commit SHA injected by Coolify at build time | `next.config.mjs` |
| `CF_PAGES_COMMIT_SHA` | server | Commit SHA injected by Cloudflare Pages | `next.config.mjs` |
| `GITHUB_SHA` | server | Commit SHA injected by GitHub Actions / Woodpecker | `next.config.mjs`, `src/app/api/health/route.ts` |
| `SOURCE_COMMIT` | server | Generic source commit SHA fallback | `src/app/api/health/route.ts` |
| `PROD_REF` | server | Supabase project ref for deploy scripts | `.env.deploy.template` |
| `SUPABASE_ACCESS_TOKEN` | server | Supabase personal access token for CLI/management | `.env.deploy.template`, scripts |
| `SUPABASE_PROJECT_REF` | server | Supabase project reference (auto-derived from URL if unset) | scripts |

### Cloudflare API token

`CLOUDFLARE_API_TOKEN` is used by `npm run cf:deploy`, `scripts/purge-cloudflare-cache.mjs`,
`scripts/setup-cloudflare-resources.mjs`, and other deploy/ops scripts.

The current token is **missing permissions**, which causes `wrangler deploy` to report
`Some triggers failed to deploy` and cache-purge operations to fail with HTTP 403.

Required token permissions:

| Permission | Scope | Why |
|------------|-------|-----|
| `Cloudflare Workers Scripts` → **Edit** | Account | Deploy worker scripts via Wrangler |
| `Zone:Workers Routes` → **Edit** | Zone | Attach/detach worker routes on `klarpakke.no` |
| `Cloudflare Workers KV` → **Edit** | Account | Read/write KV namespaces used by the worker |
| `Zone:Cache Purge` → **Edit** | Zone | Purge Cloudflare cache after deploy |
| `Zone:Zone` → **Read** | Zone | Resolve and verify the zone |

Pre-filled token creation URL (logs in to Cloudflare Dashboard):

```text
https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=%5B%7B%22key%22%3A%22workers_scripts%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22workers_routes%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22workers_kv_storage%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22cache%22%2C%22type%22%3A%22purge%22%7D%2C%7B%22key%22%3A%22zone%22%2C%22type%22%3A%22read%22%7D%5D&accountId=80d5b1d56a3e907150ba7348b6182894&zoneId=328d7de7e8e48308fd4f9d760da5b18f&name=Klarpakke%20deploy%20%2B%20cache%20purge
```

After creating the token, rotate it automatically:

```bash
# Token in env:
export CLOUDFLARE_API_TOKEN=<new-token>
node scripts/rotate-cloudflare-token.mjs

# Or pipe it in:
echo "<new-token>" | node scripts/rotate-cloudflare-token.mjs
```

The script verifies the token, updates `.env.local`, optionally re-encrypts secrets to
MemPalace KG, runs `npm run cf:deploy`, and purges the cache.

### Email

| Name | Type | Purpose | Source |
|------|------|---------|--------|
| `EMAIL_SERVER` | server | SMTP server for magic-link auth | `.env.local.example` |
| `FROM_EMAIL` | server | Sender email address | `.env.local.example` |

### Feature flags (public)

| Name | Type | Purpose | Source |
|------|------|---------|--------|
| `NEXT_PUBLIC_TRADING_V3_ENABLED` | public | Feature flag: trading v3 | `src/lib/flags.ts` |
| `NEXT_PUBLIC_RL_SIGNALS_ENABLED` | public | Feature flag: RL signals | `src/lib/flags.ts` |
| `NEXT_PUBLIC_EU_TAX_ENABLED` | public | Feature flag: EU tax report | `src/lib/flags.ts` |
| `NEXT_PUBLIC_BETA_TRADING_ENABLED` | public | Feature flag: beta trading | `src/lib/flags.ts` |
| `NEXT_PUBLIC_WHITELABEL_FEES_ENABLED` | public | Feature flag: whitelabel fees | `src/lib/flags.ts` |
| `NEXT_PUBLIC_SONAR_UI_ENABLED` | public | Feature flag: Sonar UI | `src/lib/flags.ts` |
| `NEXT_PUBLIC_AI_INSIGHT_ENABLED` | public | Feature flag: AI insights (default ON) | `src/lib/flags.ts` |

### SEO / Verification

| Name | Type | Purpose | Source |
|------|------|---------|--------|
| `NEXT_PUBLIC_GSC_VERIFICATION` | public | Google Search Console verification meta tag content | `src/app/[locale]/layout.tsx` |
| `GOOGLE_SITE_VERIFICATION` | public | Google site verification (commented legacy) | `src/app/layout.tsx` |

### E2E / Test users

| Name | Type | Purpose | Source |
|------|------|---------|--------|
| `E2E_USER_EMAIL` | server | Primary E2E test user email | `.env.local`, `e2e/fixtures/test-users.ts` |
| `E2E_USER_PASSWORD` | server | Primary E2E test user password | `.env.local`, `e2e/fixtures/test-users.ts` |
| `E2E_USER_DISPLAY_NAME` | server | Primary E2E test user display name | `scripts/create-test-users.js` |
| `E2E_LEADER_EMAIL` | server | E2E paper leader email | `scripts/create-test-users.js` |
| `E2E_LEADER_PASSWORD` | server | E2E paper leader password | `scripts/create-test-users.js` |
| `E2E_LEADER_DISPLAY_NAME` | server | E2E paper leader display name | `scripts/create-test-users.js` |
| `E2E_AUTO_COPY_LEADER` | server | Set `0`/`false` to skip auto copy leader | `scripts/create-test-users.js` |
| `E2E_DELETE_AUTH_STORAGE` | server | Set `1` to delete auth storage after E2E | `e2e/auth.teardown.ts` |
| `E2E_REQUIRE_INTEGRITY_SYNC` | server | Set `1` to require integrity sync in tests | `e2e/critical/trading-integrity-sync.spec.ts` |
| `TEST_USER_EMAIL` | server | Legacy alias for E2E user email | scripts, e2e |
| `TEST_USER_PASSWORD` | server | Legacy alias for E2E user password | scripts, e2e |
| `TEST_BASE_URL` | server | Base URL for script tests | scripts |
| `BASE_URL` | server | Base URL for E2E/tests | `playwright.config.ts`, e2e |
| `PLAYWRIGHT_TEST_BASE_URL` | server | Playwright base URL override | `playwright.config.ts`, e2e |
| `PLAYWRIGHT_SKIP_WEBSERVER` | server | Set `1` to skip Playwright webserver | `playwright.config.ts` |
| `PLAYWRIGHT_REUSE_EXISTING_SERVER` | server | Set `1` to reuse existing dev server | `playwright.config.ts` |
| `PLAYWRIGHT_WEBPACK_QUIET` | server | Quiet Webpack output in dev | `next.config.mjs` |
| `PW_WORKERS` | server | Playwright worker count override | `playwright.config.ts` |
| `TEST_AGAINST_PROD` | server | Run tests against production | `package.json`, `playwright.config.ts` |
| `REPRO_PAPER_EXECUTE` | server | Set `1` to run paper execute repro test | `e2e/repro/paper-execute-remote.repro.test.ts` |
| `ALLOW_TEST_API` | server | Set `true` to enable test APIs in production | `src/app/api/test/auth/login/route.ts` |
| `TEST_SECRET` | server | Secret for test auth login endpoint | `src/app/api/test/auth/login/route.ts` |

### Build / Dev / Misc

| Name | Type | Purpose | Source |
|------|------|---------|--------|
| `NODE_ENV` | server | Node environment (`development`/`production`/`test`) | Node / Next.js |
| `NEXT_PHASE` | server | Next.js build phase | `src/lib/stripe.ts` |
| `ANALYZE` | public | Enable Next.js bundle analyzer (`true`) | `next.config.mjs` |
| `SKIP_LINT_IN_BUILD` | server | Skip lint during build (`true`) | `package.json` |
| `CI` | server | Generic CI flag (Woodpecker/GitHub) | `playwright.config.ts`, `vitest.config.ts` |
| `SHARD` | server | Vitest shard index for parallel CI | `package.json` |
| `DEBUG` | server | Enable debug logging in scripts | scripts |
| `CLOUD_READINESS_PROFILE` | server | Profile for `cloud-readiness.mjs` | `scripts/automation-preflight.mjs` |
| `WATCHDOG_REPORT_DIR` | server | Directory for watchdog reports | scripts |
| `ALERT_STALE_SIGNALS` | server | Disable stale-signal alert if `0` | `scripts/prod-health-gate.mjs` |
| `FAIL_ON_DEGRADED` | server | Fail health gate if degraded if `1` | `scripts/prod-health-gate.mjs` |
| `HEALTH_URL` | server | Override health check URL | `scripts/prod-health-gate.mjs` |
| `APP_DOMAIN` | server | Domain for cloudbase guard | `scripts/domain-cloudbase-guard.mjs` |
| `PREVIEW_URL` | server | Lighthouse preview URL | `package.json` |
| `RUN_PLAYWRIGHT` | server | Trigger Playwright from auth test script | `scripts/auth-full-test.mjs` |
| `PR_NUMBER` | server | Pull request number | `scripts/post-duplicate-report.ts` |
| `GITHUB_REPOSITORY` | server | GitHub repo (`owner/repo`) | `scripts/post-duplicate-report.ts` |
| `GITHUB_RUN_ID` | server | GitHub Actions run ID | `scripts/post-duplicate-report.ts` |
| `GITHUB_ENV` | server | GitHub Actions env file path | `scripts/cloud-readiness.mjs` |
| `GH_SYNC_ENV_FILE` | server | Env file path for GitHub secret sync | `scripts/sync-github-actions-secrets.mjs` |
| `KLARPAKKE_VAULT_ENV_FILE` | server | Override `.env.local` path for vault | `scripts/vault/vault-key.mjs` |
| `HOME` / `USERPROFILE` | server | Home directory | scripts |
| `PATH` | server | System PATH | `scripts/install-kimi-orchestrator.mjs` |

### Webflow (legacy content migration)

| Name | Type | Purpose | Source |
|------|------|---------|--------|
| `WEBFLOW_API_TOKEN` | server | Webflow API token | `scripts/get-asset-urls.js` |
| `WEBFLOW_SITE_ID` | server | Webflow site ID | `scripts/get-asset-urls.js` |
| `WEBFLOW_EMAIL` | server | Webflow login email | `scripts/playwright/webflow-login.js` |
| `WEBFLOW_PASSWORD` | server | Webflow login password | `scripts/playwright/webflow-login.js` |

---

## Legacy / deprecated (do not add to new setups)

These variables are tied to platforms or services that Klarpakke has migrated away from, or are old aliases kept for backwards compatibility only.

| Name | Type | Reason deprecated | Source |
|------|------|-------------------|--------|
| `NEXT_PUBLIC_FLY_APP_URL` | public | Fly.io hosting removed; use `NEXT_PUBLIC_APP_URL` | `src/lib/auth/config.ts` |
| `NEXT_PUBLIC_VERCEL_URL` | public | Vercel hosting removed; use `NEXT_PUBLIC_APP_URL` | `src/lib/auth/config.ts`, runtime |
| `VERCEL_TOKEN` | server | Vercel deployment no longer used | `.env.local`, `.env.deploy.template`, scripts |
| `VERCEL_ORG_ID` | server | Vercel deployment no longer used | `.env.local`, `.env.deploy.template` |
| `VERCEL_PROJECT_ID` | server | Vercel deployment no longer used | `.env.local`, `.env.deploy.template` |
| `VERCEL_TEAM_ID` | server | Vercel deployment no longer used | scripts |
| `VERCEL_OIDC_TOKEN` | server | Vercel OIDC token, no longer relevant | `.env.local` |
| `CLOUDFLARE_PAGES` / `CLOUDFLARE_PAGES` | public | Cloudflare Pages build flag (legacy) | `next.config.mjs` |
| `NEXT_PUBLIC_SENTRY_DSN` | public | Using self-hosted GlitchTip; prefer `NEXT_PUBLIC_GLITCHTIP_DSN` | `.env.local.example`, `.env.production.template`, `src/lib/sentry.ts` |
| `SENTRY_AUTH_TOKEN` | server | Sentry SaaS no longer used | `.env.local`, `.env.production.template`, `.env.deploy.template` |
| `SENTRY_ORG` | server | Sentry SaaS no longer used | `.env.local`, `.env.production.template` |
| `SENTRY_PROJECT` | server | Sentry SaaS no longer used | `.env.local`, `.env.production.template` |
| `KV_REST_API_URL` | server | Legacy alias for `UPSTASH_REDIS_REST_URL` | `.env.local.example`, `src/lib/redis-client.ts` |
| `KV_REST_API_TOKEN` | server | Legacy alias for `UPSTASH_REDIS_REST_TOKEN` | `.env.local.example`, `src/lib/redis-client.ts` |
| `KV_REST_API_READ_ONLY_TOKEN` | server | Legacy Vercel KV token | `.env.local` |
| `KV_URL` | server | Legacy Vercel KV connection string | `.env.local` |
| `REDIS_URL` | server | Legacy Redis connection string alias | `.env.local` |
| `SUPABASE_URL` | server | Alias for `NEXT_PUBLIC_SUPABASE_URL` / internal use | scripts, e2e |
| `SUPABASE_ANON_KEY` | server | Alias for `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.deploy.template`, scripts, e2e |
| `SUPABASE_SECRET_KEY` | server | Legacy naming, use `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` |
| `SUPABASE_PUBLISHABLE_KEY` | server | Legacy naming, use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env.local` |
| `SUPABASE_JWT_SECRET` | server | Legacy/internal JWT secret, no runtime usage found | `.env.local` |
| `NEXT_PUBLIC_ENCRYPTION_KEY` | public | Legacy encryption key (was accidentally public) | `src/lib/crypto/legacy-decrypt.server.ts` |
| `ENCRYPTION_KEY` | server | Generic legacy fallback for exchange-key encryption | `src/lib/crypto/encrypt-api-keys.ts` |
| `BINANCE_ENCRYPTION_SECRET` | server | Legacy alias for `EXCHANGE_ENCRYPTION_SECRET` | `src/lib/exchanges/secret-crypto.ts` |
| `POSTGRES_HOST` | server | Vercel/Prisma-style Postgres config | `.env.local` |
| `POSTGRES_DATABASE` | server | Vercel/Prisma-style Postgres config | `.env.local` |
| `POSTGRES_USER` | server | Vercel/Prisma-style Postgres config | `.env.local` |
| `POSTGRES_PASSWORD` | server | Vercel/Prisma-style Postgres config | `.env.local` |
| `POSTGRES_PRISMA_URL` | server | Vercel/Prisma-style Postgres config | `.env.local` |
| `POSTGRES_URL_NON_POOLING` | server | Vercel/Prisma-style Postgres config | `.env.local` |
| `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` | server | Replaced by `E2E_USER_*` | scripts, e2e |
| `GH_PAT` | server | Active GitHub token for `tajlive/KP` automation. Replaced the revoked token on 2026-06-27. | `.env.local`, GitHub Actions secret |
| `KLARPAKKE_MCP_TOKEN` | server | Unclear purpose, likely legacy placeholder | `.env.local` |

---

## Validation notes

Run the environment validator with:

```bash
npm run env:validate
```

`scripts/env-checker.ts` validates a core subset of production variables:
- Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, `POSTGRES_URL`
- Optional: `DATABASE_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SLACK_DEPLOY_WEBHOOK`, `CRON_SECRET`, `LINEAR_API_KEY`

Because many integration-specific variables are optional and have sensible fallbacks, the validator is expected to pass with only the core Supabase/URL/Postgres variables set.

### Latest validation run

```text
Status: PASSED
Total variables: 13
Present: 9/13
Valid: 12/13
Required missing: 0

Notes:
- SENTRY_AUTH_TOKEN is set but flagged with invalid format because the
  validator expects the legacy `sntrys_...` prefix. The current value uses
  a `sntryu_...` token and is retained only for reference; Sentry SaaS is
  deprecated in favor of self-hosted GlitchTip (`NEXT_PUBLIC_GLITCHTIP_DSN`).
- UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are optional and fall
  back to the legacy KV_* aliases.
```

The `npm run verify` command was skipped because it performs live health checks
against a running dev/prod server, which is not available in this context.

---

## Source files consulted

- `.env-templates/.env.local.example`
- `.env-templates/.env.example`
- `.env.production.template`
- `.env.deploy.template`
- `package.json` scripts
- `scripts/env-checker.ts`
- `src/` runtime code (`process.env.*` usages)
- `scripts/` utility code (`process.env.*` usages)
- `e2e/` test code (`process.env.*` usages)
- `.woodpecker/pr-check.yml`
- `.woodpecker/deploy.yml`
- `next.config.mjs`
- `playwright.config.ts`
- `src/sanity/env.ts`
- `scripts/vault/vault-key.mjs`
- `scripts/vault/sync-env-to-mempalace.mjs`
