# Klarpakke Environment Variables

Complete list of environment variables required for production on Cloudflare Workers.

## Required (Production)

| Variable                             | Where                            | Description                                |
| ------------------------------------ | -------------------------------- | ------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`           | Wrangler secrets + `.env.local`  | Supabase project URL                       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`      | Wrangler secrets + `.env.local`  | Supabase anon/public key                   |
| `SUPABASE_SERVICE_ROLE_KEY`          | Wrangler secrets (Production)    | Supabase service role key (server-only)    |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Wrangler secrets (Production)    | Stripe publishable key                     |
| `STRIPE_SECRET_KEY`                  | Wrangler secrets (Production)    | Stripe secret key (server-only)            |
| `STRIPE_WEBHOOK_SECRET`              | Wrangler secrets (Production)    | Stripe webhook signing secret              |
| `RESEND_API_KEY`                     | Wrangler secrets (Production)    | Resend email API key                       |
| `RESEND_WEBHOOK_SECRET`              | Wrangler secrets (Production)    | Resend webhook signing secret              |
| `CRON_SECRET`                        | Wrangler secrets (Production)    | Shared secret for cron endpoints           |
| `ENCRYPTION_KEY`                     | Wrangler secrets (Production)    | Used for encrypting sensitive data at rest |
| `DATABASE_URL`                       | Wrangler secrets (Production)    | Direct Postgres connection string          |
| `NEXT_PUBLIC_BASE_URL`               | Wrangler secrets (Production)    | `https://www.klarpakke.no`                 |
| `NEXT_PUBLIC_APP_URL`                | Wrangler secrets (Production)    | `https://www.klarpakke.no`                 |

## Sentry (Error Tracking)

| Variable                 | Where                         | Description                                 |
| ------------------------ | ----------------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_SENTRY_DSN` | Wrangler secrets (Production) | Sentry Data Source Name                     |
| `SENTRY_DSN`             | Wrangler secrets (Production) | Same DSN for server-side                    |
| `SENTRY_AUTH_TOKEN`      | Wrangler secrets (Production) | Sentry auth token for source map uploads    |
| `SENTRY_ORG`             | Wrangler secrets (Production) | Sentry org slug: `elbatt-chatbot`           |
| `SENTRY_PROJECT`         | Wrangler secrets (Production) | Sentry project slug: `klarpakke-production` |

## Redis (Upstash REST) / legacy KV-navn

Appen leser **`UPSTASH_REDIS_REST_URL`** + **`UPSTASH_REDIS_REST_TOKEN`** først; deretter fallback til **`KV_REST_API_*`** (samme REST-mønster).

| Variable                      | Where                  | Description                         |
| ----------------------------- | ---------------------- | ----------------------------------- |
| `UPSTASH_REDIS_REST_URL`      | Wrangler secrets       | Upstash Redis REST URL (anbefalt)   |
| `UPSTASH_REDIS_REST_TOKEN`    | Wrangler secrets       | Upstash Redis REST token (anbefalt) |
| `KV_REST_API_URL`             | Wrangler secrets       | Legacy / alias REST URL             |
| `KV_REST_API_TOKEN`           | Wrangler secrets       | Legacy / alias REST token           |
| `KV_REST_API_READ_ONLY_TOKEN` | Wrangler secrets       | Read-only token                     |
| `KV_URL`                      | Wrangler secrets       | Redis connection URL                |
| `REDIS_URL`                   | Wrangler secrets       | Redis connection URL (alias)        |

## AI Providers

| Variable             | Where                         | Description               |
| -------------------- | ----------------------------- | ------------------------- |
| `PERPLEXITY_API_KEY` | Wrangler secrets (Production) | Perplexity AI API key     |
| `OPENAI_API_KEY`     | Wrangler secrets (Production) | OpenAI API key (optional) |

## Trading

| Variable                    | Where                         | Description                                  |
| --------------------------- | ----------------------------- | -------------------------------------------- |
| `BINANCE_ENCRYPTION_SECRET` | Wrangler secrets (Production) | Encryption for Binance API keys stored in DB |

## Integrations

| Variable            | Where                         | Description                       |
| ------------------- | ----------------------------- | --------------------------------- |
| `LINEAR_API_KEY`    | Wrangler secrets (Production) | Linear project management API key |
| `API_GATEWAY_TOKEN` | Wrangler secrets (Production) | Internal API gateway token        |

## Stripe Price IDs

| Variable                             | Where                    | Description                        |
| ------------------------------------ | ------------------------ | ---------------------------------- |
| `NEXT_PUBLIC_STRIPE_PRICE_BACHELOR`  | Wrangler secrets         | Stripe price ID for Bachelor tier  |
| `NEXT_PUBLIC_STRIPE_PRICE_MASTER`    | Wrangler secrets         | Stripe price ID for Master tier    |
| `NEXT_PUBLIC_STRIPE_PRICE_PHD`       | Wrangler secrets         | Stripe price ID for PhD tier       |
| `NEXT_PUBLIC_STRIPE_PRICE_PROFESSOR` | Wrangler secrets         | Stripe price ID for Professor tier |

## PWA / Push Notifications

| Variable                       | Where                  | Description                     |
| ------------------------------ | ---------------------- | ------------------------------- |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Wrangler secrets       | VAPID public key for web push   |
| `VAPID_PRIVATE_KEY`            | Wrangler secrets       | VAPID private key (server-only) |
| `VAPID_SUBJECT`                | Wrangler secrets       | VAPID subject (mailto: or URL)  |

## Vipps (Norwegian Payments)

| Variable                       | Where                  | Description            |
| ------------------------------ | ---------------------- | ---------------------- |
| `VIPPS_CLIENT_ID`              | Wrangler secrets       | Vipps client ID        |
| `VIPPS_CLIENT_SECRET`          | Wrangler secrets       | Vipps client secret    |
| `VIPPS_SUBSCRIPTION_KEY`       | Wrangler secrets       | Vipps subscription key |
| `VIPPS_API_URL`                | Wrangler secrets       | Vipps API base URL     |
| `VIPPS_MERCHANT_SERIAL_NUMBER` | Wrangler secrets       | Vipps merchant serial  |

## Auto-populated by Cloudflare / build

These are set automatically and should not be manually configured:

| Variable                            | Description                 |
| ----------------------------------- | --------------------------- |
| `APP_VERSION`                       | Current deployed commit SHA |
| `NODE_ENV`                          | `production` in prod builds |

## Managing secrets with Wrangler

```bash
# Set a secret in production
npx wrangler secret put ENCRYPTION_KEY

# Set a secret via stdin
echo -n "your-secret" | npx wrangler secret put CRON_SECRET

# List secrets
npx wrangler secret list

# Delete a secret
npx wrangler secret delete OLD_SECRET
```

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
