---
description: Secret handling and auth rules for the Binance proxy Supabase Edge Function.
globs:
  - supabase/functions/binance-proxy/**/*
  - src/lib/trading/binance-proxy-executor.ts
  - src/app/api/admin/test-binance-proxy/route.ts
  - src/lib/trading/executor-factory.ts
alwaysApply: true
---

# Binance Proxy Secrets Handling

Applies to: `supabase/functions/binance-proxy/`, `src/lib/trading/binance-proxy-executor.ts`, `src/app/api/admin/test-binance-proxy/route.ts`, and any code that invokes the `binance-proxy` Supabase Edge Function.

## NEVER

- **Never** put `SUPABASE_SERVICE_ROLE_KEY` or `BINANCE_PROXY_SECRET` in subprocess command arguments, log output, error messages, or client-side code. These secrets must stay in secure environment/secret stores.
- **Never** use `Authorization: Bearer <BINANCE_PROXY_SECRET>` for the Edge Function invocation. Supabase gateway validates the `Authorization` header as a JWT, and `SUPABASE_`-prefixed secrets are blocked by Supabase Secrets anyway.

## ALWAYS

- **Always** use the `X-Binance-Proxy-Secret` header for the Edge Function proxy auth token, comparing it to `BINANCE_PROXY_SECRET` inside the Edge Function.
- **Always** use the `Authorization` header with a valid Supabase JWT, typically `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the Worker or `SUPABASE_SERVICE_ROLE_KEY` if running server-side with a service-role client.
- **Always** set `BINANCE_PROXY_SECRET` in both Supabase Edge Function secrets and the Cloudflare Worker secret store.

## WHY

The Supabase Edge Function gateway requires the `Authorization` header to be a parseable JWT. The original proxy implementation tried to pass `BINANCE_PROXY_SECRET` there, which failed. Separating concerns (JWT auth vs. proxy shared secret) avoids that failure mode and keeps the shared secret out of the JWT payload path.

## Verification

After any change to the proxy auth flow, run:

```bash
# Direct Edge Function test — expect 401 from Binance, not 403 from WAF
source .env.local
curl -s "$NEXT_PUBLIC_SUPABASE_URL/functions/v1/binance-proxy" \
  -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "X-Binance-Proxy-Secret: $BINANCE_PROXY_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"action":"testConnection","apiKey":"dummy","apiSecret":"dummy","testnet":true}'
```
