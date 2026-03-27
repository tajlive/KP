# Klarpakke API v1 Migration Guide

**Status:** ✅ Implemented (Script 04 - Phase 1)  
**Date:** March 2026  
**Target:** Production ready before Klarpakke 9.0 launch

---

## Overview

API v1 consolidates scattered endpoints under a unified `/api/v1/` namespace with consistent patterns, better error handling, and backwards compatibility through redirects.

### Why v1?

- **Consistency:** All endpoints follow the same pattern
- **Maintainability:** Single source of truth for each resource
- **Extensibility:** Clear path for v2 without breaking changes
- **Documentation:** Easier to document and consume

---

## New Endpoints (v1)

### Trading API

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/trading/execute` | Execute live or paper trade | Required |
| POST | `/api/v1/trading/trigger` | Trigger conditional order | Required |
| POST | `/api/v1/trading/order` | Create/update order | Required |
| GET | `/api/v1/trading/depth?symbol=BTC` | Order book depth | Optional |
| GET | `/api/v1/trading/price?symbol=BTC` | Current price | Optional |
| GET | `/api/v1/trading/mode` | Get trading mode | Required |
| POST | `/api/v1/trading/mode` | Set trading mode | Required |
| GET | `/api/v1/trading/sessions` | List trading sessions | Required |
| POST | `/api/v1/trading/sessions` | Create trading session | Required |

**Query Parameters:**
- `mode`: `"live"` | `"paper"` (default: `"live"`)

**Example:**
```bash
# Paper trade
curl -X POST "https://klarpakke.no/api/v1/trading/execute?mode=paper" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"symbol": "BTCUSDT", "side": "BUY", "quantity": 0.1}'
```

### Webhooks API

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/webhooks/stripe` | Stripe events | Signature |
| POST | `/api/v1/webhooks/resend` | Email delivery events | Signature |
| POST | `/api/v1/webhooks/github` | GitHub webhook events | Signature |
| GET | `/api/v1/webhooks/:provider` | Provider info | None |

**Note:** Stripe webhook keeps original path `/api/webhooks/stripe` for signature verification. Use v1 for new integrations.

### Cron Jobs API

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/cron/auto-trade` | Run auto trading engine | CRON_SECRET |
| POST | `/api/v1/cron/sync-prices` | Sync Binance prices | CRON_SECRET |
| POST | `/api/v1/cron/daily-summary` | Send user summaries | CRON_SECRET |
| POST | `/api/v1/cron/signal-health` | AI signal health check | CRON_SECRET |
| POST | `/api/v1/cron/update-usdt-nok` | Update FX rates | CRON_SECRET |
| POST | `/api/v1/cron/keepalive` | WebSocket heartbeat | CRON_SECRET |
| POST | `/api/v1/cron/cleanup-sessions` | Cleanup old sessions | CRON_SECRET |
| POST | `/api/v1/cron/sync-leaderboard` | Sync leaderboard | CRON_SECRET |
| GET | `/api/v1/cron/:job` | Job info | None |

**Headers:**
```
Authorization: Bearer <CRON_SECRET>
```

### Notifications API

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/notifications/send` | Send notification | Admin/CRON |
| POST | `/api/v1/notifications/subscribe` | Subscribe to push | Required |
| POST | `/api/v1/notifications/unsubscribe` | Unsubscribe from push | Required |
| GET | `/api/v1/notifications/status` | Get subscription status | Required |

---

## Backwards Compatibility

All legacy endpoints redirect to v1 with HTTP 308 (Permanent Redirect):

| Legacy | Redirects to |
|--------|--------------|
| `/api/trading/*` | `/api/v1/trading/*` |
| `/api/paper-trading/*` | `/api/v1/trading/*?mode=paper` |
| `/api/webhooks/resend/*` | `/api/v1/webhooks/resend/*` |
| `/api/webhooks/github/*` | `/api/v1/webhooks/github/*` |
| `/api/cron/*` | `/api/v1/cron/*` |
| `/api/notifications/*` | `/api/v1/notifications/*` |

**Stripe Exception:** `/api/webhooks/stripe` keeps original path for webhook signature verification.

### Redirect Behavior

- **308 Permanent Redirect:** Safe for caching
- **Query params preserved:** `?symbol=BTC` → `?symbol=BTC`
- **Paper mode auto-added:** `/api/paper-trading/execute` → `/api/v1/trading/execute?mode=paper`

---

## Frontend Client

Use the consolidated API client:

```typescript
import { executeTrade, getTradingEndpoint, subscribeToNotifications } from "@/lib/api-client";

// Trading
const result = await executeTrade({
  symbol: "BTCUSDT",
  side: "BUY",
  quantity: 0.1
}, "paper"); // mode: "live" | "paper"

// Notifications
await subscribeToNotifications(subscription, "default");

// Or use endpoint builder directly
const url = getTradingEndpoint("execute", "paper");
// → "/api/v1/trading/execute?mode=paper"
```

---

## Environment Variables

Add to `.env.local`:

```bash
# API Configuration
NEXT_PUBLIC_API_VERSION=v1
NEXT_PUBLIC_API_BASE_URL=https://klarpakke.no

# Cron Security
CRON_SECRET=your-secure-random-string-min-32-chars

# Webhook Secrets
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_WEBHOOK_SECRET=re_...
GITHUB_WEBHOOK_SECRET=ghp_...
```

---

## Testing

### Manual Testing

```bash
# Test redirect
curl -I https://klarpakke.no/api/trading/execute
# HTTP/2 308
# location: /api/v1/trading/execute

# Test v1 endpoint (with auth)
curl -X POST https://klarpakke.no/api/v1/trading/price?symbol=BTCUSDT

# Test cron (with secret)
curl -X POST https://klarpakke.no/api/v1/cron/keepalive \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Automated Testing

```bash
# Type checking
npm run type-check

# Build verification
npm run build

# Unit tests
npm run test:unit

# E2E tests
npm run test:e2e:critical
```

---

## Migration Timeline

| Phase | Date | Action |
|-------|------|--------|
| 1 | Now | Deploy v1 endpoints + redirects |
| 2 | Week 1 | Update frontend to use v1 |
| 3 | Week 4 | Monitor, fix issues |
| 4 | Q2 2026 | Deprecate legacy (remove redirects) |

---

## Future: v2 (Q3 2026)

Reserve `/api/v2/` for backward-incompatible changes:

- GraphQL endpoint
- WebSocket subscriptions
- Breaking response format changes
- Authentication changes

v1 will remain supported with security updates through 2027.

---

## Troubleshooting

### "Unknown action" error
Check that the action is in the allowed list:
- Trading: `execute`, `trigger`, `order`, `depth`, `price`, `mode`, `sessions`
- Cron: `auto-trade`, `sync-prices`, `daily-summary`, `signal-health`, `update-usdt-nok`, `keepalive`

### Stripe webhook failing
Ensure you're using the original path `/api/webhooks/stripe`, not v1.

### Redirect loops
Check that redirects in `next.config.mjs` don't create cycles.

---

## References

- Implementation: `src/app/api/v1/`
- Client: `src/lib/api-client.ts`
- Redirects: `next.config.mjs`
- Original Script: `.kimi-scripts/04-route-consolidation.kimi`

---

**Questions?** Contact the platform team or check `#api-v1-migration` in Slack.
