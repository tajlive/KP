# Klarpakke Environment Variables

Complete list of environment variables required for production on Vercel.

## Required (Production)

| Variable | Where | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + `.env.local` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel + `.env.local` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel (Production) | Supabase service role key (server-only) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Vercel (Production) | Stripe publishable key |
| `STRIPE_SECRET_KEY` | Vercel (Production) | Stripe secret key (server-only) |
| `STRIPE_WEBHOOK_SECRET` | Vercel (Production) | Stripe webhook signing secret |
| `RESEND_API_KEY` | Vercel (Production) | Resend email API key |
| `RESEND_WEBHOOK_SECRET` | Vercel (Production) | Resend webhook signing secret |
| `CRON_SECRET` | Vercel (Production) | Shared secret for cron endpoints |
| `ENCRYPTION_KEY` | Vercel (Production) | Used for encrypting sensitive data at rest |
| `DATABASE_URL` | Vercel (Production) | Direct Postgres connection string |
| `NEXT_PUBLIC_BASE_URL` | Vercel (Production) | `https://www.klarpakke.no` |
| `NEXT_PUBLIC_APP_URL` | Vercel (Production) | `https://www.klarpakke.no` |

## Sentry (Error Tracking)

| Variable | Where | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | Vercel (Production) | Sentry Data Source Name |
| `SENTRY_DSN` | Vercel (Production) | Same DSN for server-side |
| `SENTRY_AUTH_TOKEN` | Vercel (Production) | Sentry auth token for source map uploads |
| `SENTRY_ORG` | Vercel (Production) | Sentry org slug: `elbatt-chatbot` |
| `SENTRY_PROJECT` | Vercel (Production) | Sentry project slug: `klarpakke-production` |

## Vercel KV / Upstash Redis

| Variable | Where | Description |
|----------|-------|-------------|
| `KV_REST_API_URL` | Vercel (All envs) | Upstash Redis REST URL |
| `KV_REST_API_TOKEN` | Vercel (All envs) | Upstash Redis REST token |
| `KV_REST_API_READ_ONLY_TOKEN` | Vercel (All envs) | Read-only token |
| `KV_URL` | Vercel (All envs) | Redis connection URL |
| `REDIS_URL` | Vercel (All envs) | Redis connection URL (alias) |

## AI Providers

| Variable | Where | Description |
|----------|-------|-------------|
| `PERPLEXITY_API_KEY` | Vercel (Production) | Perplexity AI API key |
| `OPENAI_API_KEY` | Vercel (Production) | OpenAI API key (optional) |

## Trading

| Variable | Where | Description |
|----------|-------|-------------|
| `BINANCE_ENCRYPTION_SECRET` | Vercel (Production) | Encryption for Binance API keys stored in DB |

## Integrations

| Variable | Where | Description |
|----------|-------|-------------|
| `LINEAR_API_KEY` | Vercel (Production) | Linear project management API key |
| `API_GATEWAY_TOKEN` | Vercel (Production) | Internal API gateway token |

## Stripe Price IDs

| Variable | Where | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_STRIPE_PRICE_BACHELOR` | Vercel (Production) | Stripe price ID for Bachelor tier |
| `NEXT_PUBLIC_STRIPE_PRICE_MASTER` | Vercel (Production) | Stripe price ID for Master tier |
| `NEXT_PUBLIC_STRIPE_PRICE_PHD` | Vercel (Production) | Stripe price ID for PhD tier |
| `NEXT_PUBLIC_STRIPE_PRICE_PROFESSOR` | Vercel (Production) | Stripe price ID for Professor tier |

## PWA / Push Notifications

| Variable | Where | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Vercel (Production) | VAPID public key for web push |
| `VAPID_PRIVATE_KEY` | Vercel (Production) | VAPID private key (server-only) |
| `VAPID_SUBJECT` | Vercel (Production) | VAPID subject (mailto: or URL) |

## Vipps (Norwegian Payments)

| Variable | Where | Description |
|----------|-------|-------------|
| `VIPPS_CLIENT_ID` | Vercel (Production) | Vipps client ID |
| `VIPPS_CLIENT_SECRET` | Vercel (Production) | Vipps client secret |
| `VIPPS_SUBSCRIPTION_KEY` | Vercel (Production) | Vipps subscription key |
| `VIPPS_API_URL` | Vercel (Production) | Vipps API base URL |
| `VIPPS_MERCHANT_SERIAL_NUMBER` | Vercel (Production) | Vipps merchant serial |

## Auto-populated by Vercel

These are set automatically and should not be manually configured:

| Variable | Description |
|----------|-------------|
| `VERCEL_GIT_COMMIT_SHA` | Current deployed commit SHA |
| `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA` | Same, exposed to client |
| `NODE_ENV` | `production` in prod builds |

## Verification

After configuring all variables, verify with:

```bash
curl -s https://www.klarpakke.no/api/health | jq '.'
```

Expected response:
```json
{
  "status": "healthy",
  "checks": {
    "database": { "status": "ok" },
    "kv": { "status": "ok" },
    "environment": { "status": "ok" }
  }
}
```

The health endpoint validates `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are present, tests DB connectivity, and verifies KV (Upstash Redis) read/write.
