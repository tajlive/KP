# API Route Consolidation - Mapping Table

**Consolidation Date:** 2026-04-11  
**Status:** Phase 1 Complete (New Routes Created)

---

## Route Mapping Summary

| Category | Old Routes (Count) | New Route | Status |
|----------|-------------------|-----------|--------|
| Trading | 8 | `/api/v1/trading/[action]` | ✅ Created |
| Notifications | 3 | `/api/v1/notifications/[action]` | ✅ Created |
| AI | 7 | `/api/v1/ai/[action]` | ✅ Created |
| Analytics | 6 | `/api/v1/analytics/[action]` | ✅ Created |
| Copy Trading | 6 | `/api/v1/copy-trading/[action]` | ✅ Created |
| Payments | 3 | `/api/v1/payments/[action]` | ✅ Created |
| Signals | 2 | `/api/v1/signals/[action]` | ✅ Created |
| Marketplace | 3 | `/api/v1/marketplace/[action]` | ✅ Created |
| Onboarding | 2 | `/api/v1/onboarding/[action]` | ✅ Created |
| Exchanges | 2 | `/api/v1/exchanges/[action]` | ✅ Created |
| Health | 3 | `/api/v1/health/[check]` | ✅ Created |
| Stats | 2 | `/api/v1/stats/[metric]` | ✅ Created |
| Market | 3 | `/api/v1/market/[action]` | ✅ Created |
| User | 3 | `/api/v1/user/[resource]` | ✅ Created |
| Progress | 2 | `/api/v1/progress/[courseId]` | ✅ Created |
| Trades | 1 | `/api/v1/trades/[tradeId]` | ✅ Created |
| Binance | 3 | `/api/v1/exchanges/binance/[action]` | ✅ Created |
| Admin | 17 | `/api/v1/admin/[resource]/[action]` | ✅ Created |
| Cron | 3* | `/api/v1/cron/[job]` | ✅ Existing |
| Webhooks | 2* | `/api/v1/webhooks/[provider]` | ✅ Existing |

*Already consolidated in previous work

---

## Detailed Route Mapping

### Trading Routes

| Old Endpoint | New Endpoint | Methods |
|--------------|--------------|---------|
| `/api/trading/execute` | `/api/v1/trading/execute` | POST |
| `/api/trading/trigger` | `/api/v1/trading/trigger` | POST, GET |
| `/api/trading/depth` | `/api/v1/trading/depth` | GET |
| `/api/trading/mode` | `/api/v1/trading/mode` | GET, POST |
| `/api/trading/price` | `/api/v1/trading/price` | GET |
| `/api/trading/sessions` | `/api/v1/trading/sessions` | GET, POST |
| `/api/trading/conditional-order` | `/api/v1/trading/order` | POST, GET |

### Notification Routes

| Old Endpoint | New Endpoint | Methods |
|--------------|--------------|---------|
| `/api/notifications/subscribe` | `/api/v1/notifications/subscribe` | POST |
| `/api/notifications/unsubscribe` | `/api/v1/notifications/unsubscribe` | POST |
| `/api/notifications/send` | `/api/v1/notifications/send` | POST, GET |

### AI Routes

| Old Endpoint | New Endpoint | Methods |
|--------------|--------------|---------|
| `/api/ai/chat` | `/api/v1/ai/chat` | POST, GET |
| `/api/ai/ensemble` | `/api/v1/ai/ensemble` | POST |
| `/api/ai/market-brief` | `/api/v1/ai/market-brief` | GET |
| `/api/ai/explain-strategy` | `/api/v1/ai/explain-strategy` | POST |
| `/api/ai/explain-trade` | `/api/v1/ai/explain-trade` | POST |
| `/api/ai/analyze-trade` | `/api/v1/ai/analyze-trade` | POST |
| `/api/ai/sentiment` | `/api/v1/ai/sentiment` | GET |

### Analytics Routes

| Old Endpoint | New Endpoint | Methods |
|--------------|--------------|---------|
| `/api/analytics/track` | `/api/v1/analytics/track` | POST |
| `/api/analytics/event` | `/api/v1/analytics/event` | POST, GET |
| `/api/analytics` | `/api/v1/analytics/event` | POST, GET |
| `/api/track/click` | `/api/v1/analytics/click` | GET |
| `/api/track/funnel` | `/api/v1/analytics/funnel` | POST |
| `/api/track/open` | `/api/v1/analytics/open` | GET |

### Copy Trading Routes

| Old Endpoint | New Endpoint | Methods |
|--------------|--------------|---------|
| `/api/copy-trading/discover` | `/api/v1/copy-trading/discover` | GET |
| `/api/copy-trading/follow` | `/api/v1/copy-trading/follow` | POST |
| `/api/copy-trading/unfollow` | `/api/v1/copy-trading/unfollow` | POST |
| `/api/copy-trading/resolve-trader` | `/api/v1/copy-trading/resolve-trader` | GET |
| `/api/copy-trading/leaders` | `/api/v1/copy-trading/leaders` | GET |
| `/api/copy-trading/following` | `/api/v1/copy-trading/following` | GET |

### Payment Routes

| Old Endpoint | New Endpoint | Methods |
|--------------|--------------|---------|
| `/api/stripe/checkout` | `/api/v1/payments/checkout` | POST |
| `/api/stripe/verify-session` | `/api/v1/payments/verify-session` | POST |
| `/api/stripe/customer-portal` | `/api/v1/payments/customer-portal` | POST |

### Signal Routes

| Old Endpoint | New Endpoint | Methods |
|--------------|--------------|---------|
| `/api/signal/current` | `/api/v1/signals/current` | GET |
| `/api/signal/explanation` | `/api/v1/signals/explanation` | POST |

### Marketplace Routes

| Old Endpoint | New Endpoint | Methods |
|--------------|--------------|---------|
| `/api/marketplace/listings` | `/api/v1/marketplace/listings` | GET |
| `/api/marketplace/subscribe` | `/api/v1/marketplace/subscribe` | POST |
| `/api/marketplace/reviews` | `/api/v1/marketplace/reviews` | GET, POST |

### Onboarding Routes

| Old Endpoint | New Endpoint | Methods |
|--------------|--------------|---------|
| `/api/onboarding/start` | `/api/v1/onboarding/start` | POST |
| `/api/onboarding/complete` | `/api/v1/onboarding/complete` | POST |

### Exchange Routes

| Old Endpoint | New Endpoint | Methods |
|--------------|--------------|---------|
| `/api/exchanges/connections` | `/api/v1/exchanges/connections` | GET, POST |
| `/api/exchanges/sync` | `/api/v1/exchanges/sync` | POST |
| `/api/binance/test` | `/api/v1/exchanges/binance/test` | POST |
| `/api/binance/keys` | `/api/v1/exchanges/binance/keys` | GET, POST |
| `/api/binance/encrypt` | `/api/v1/exchanges/binance/encrypt` | POST |

### Health Routes

| Old Endpoint | New Endpoint | Methods |
|--------------|--------------|---------|
| `/api/health` | `/api/v1/health/general` | GET |
| `/api/health/sonar` | `/api/v1/health/sonar` | GET |
| `/api/health/websocket` | `/api/v1/health/websocket` | GET |

### Stats Routes

| Old Endpoint | New Endpoint | Methods |
|--------------|--------------|---------|
| `/api/stats` | `/api/v1/stats/general` | GET |
| `/api/stats/users` | `/api/v1/stats/users` | GET |

### Market Data Routes

| Old Endpoint | New Endpoint | Methods |
|--------------|--------------|---------|
| `/api/market/binance-prices` | `/api/v1/market/prices` | GET |
| `/api/market/binance-24hr` | `/api/v1/market/24hr` | GET |
| `/api/market-intelligence` | `/api/v1/market/intelligence` | GET |

### User Routes

| Old Endpoint | New Endpoint | Methods |
|--------------|--------------|---------|
| `/api/user/trades` | `/api/v1/user/trades` | GET |
| `/api/user/trading-diagnostics` | `/api/v1/user/trading-diagnostics` | GET |
| `/api/user/trading-analytics` | `/api/v1/user/trading-analytics` | GET |

### Progress Routes

| Old Endpoint | New Endpoint | Methods |
|--------------|--------------|---------|
| `/api/progress` | `/api/v1/progress/all` | GET, POST |
| `/api/progress/[courseId]` | `/api/v1/progress/[courseId]` | GET |

### Trade Routes

| Old Endpoint | New Endpoint | Methods |
|--------------|--------------|---------|
| `/api/trades/[tradeId]` | `/api/v1/trades/[tradeId]` | GET |

### Admin Routes

| Old Endpoint | New Endpoint | Methods |
|--------------|--------------|---------|
| `/api/admin/github-health` | `/api/v1/admin/health/github` | GET |
| `/api/admin/resend-health` | `/api/v1/admin/health/resend` | GET |
| `/api/admin/stripe-health` | `/api/v1/admin/health/stripe` | GET |
| `/api/admin/users` | `/api/v1/admin/users/list` | GET |
| `/api/admin/users/sync` | `/api/v1/admin/users/sync` | POST |
| `/api/admin/user-tier` | `/api/v1/admin/users/tier` | POST |
| `/api/admin/user-paper-balance` | `/api/v1/admin/users/paper-balance` | POST |
| `/api/admin/campaign/stats` | `/api/v1/admin/campaigns/stats` | GET |
| `/api/admin/campaign/recent` | `/api/v1/admin/campaigns/recent` | GET |
| `/api/admin/errors` | `/api/v1/admin/errors/list` | GET |
| `/api/admin/errors/[id]/resolve` | `/api/v1/admin/errors/resolve/[id]` | POST |
| `/api/admin/verify` | `/api/v1/admin/system/verify` | GET |
| `/api/admin/cron-trigger` | `/api/v1/admin/system/cron-trigger` | POST |
| `/api/admin/kla130` | `/api/v1/admin/system/kla130` | POST |
| `/api/admin/dashboard/data` | `/api/v1/admin/dashboard/data` | GET |
| `/api/admin/sessions` | `/api/v1/admin/dashboard/sessions` | GET |
| `/api/admin/stats` | `/api/v1/admin/dashboard/stats` | GET |
| `/api/admin/funnel/stats` | `/api/v1/admin/dashboard/funnel-stats` | GET |

---

## File Structure

```
src/app/api/v1/
├── admin/[resource]/[action]/route.ts    # Admin operations (18 routes → 1)
├── ai/[action]/route.ts                  # AI operations (7 routes → 1)
├── analytics/[action]/route.ts           # Analytics (6 routes → 1)
├── copy-trading/[action]/route.ts        # Copy trading (6 routes → 1)
├── cron/[job]/route.ts                   # Cron jobs (3+ routes → 1)
├── exchanges/
│   ├── [action]/route.ts                 # Exchange ops (2 routes → 1)
│   └── binance/[action]/route.ts         # Binance ops (3 routes → 1)
├── health/[check]/route.ts               # Health checks (3 routes → 1)
├── market/[action]/route.ts              # Market data (3 routes → 1)
├── marketplace/[action]/route.ts         # Marketplace (3 routes → 1)
├── notifications/[action]/route.ts       # Notifications (4 routes → 1)
├── onboarding/[action]/route.ts          # Onboarding (2 routes → 1)
├── payments/[action]/route.ts            # Payments (3 routes → 1)
├── progress/[courseId]/route.ts          # Progress (2 routes → 1)
├── signals/[action]/route.ts             # Signals (2 routes → 1)
├── stats/[metric]/route.ts               # Stats (2 routes → 1)
├── trades/[tradeId]/route.ts             # Trade details (1 route)
├── trading/[action]/route.ts             # Trading ops (8 routes → 1)
├── user/[resource]/route.ts              # User data (3 routes → 1)
└── webhooks/[provider]/route.ts          # Webhooks (2 routes → 1)
```

---

## Migration Priority

### High Priority (Update First)
1. `/api/trading/*` → `/api/v1/trading/*` (Core functionality)
2. `/api/user/*` → `/api/v1/user/*` (User data)
3. `/api/notifications/*` → `/api/v1/notifications/*` (Push notifications)

### Medium Priority
4. `/api/payments/*` → `/api/v1/payments/*` (Billing)
5. `/api/analytics/*` → `/api/v1/analytics/*` (Tracking)
6. `/api/market/*` → `/api/v1/market/*` (Market data)

### Low Priority
7. `/api/admin/*` → `/api/v1/admin/*` (Admin panel)
8. `/api/health/*` → `/api/v1/health/*` (Monitoring)
9. Other utility routes

---

## Notes

- All v1 routes are **additive** - legacy routes still work
- Type-safe delegation to existing route handlers
- Consistent error handling and response format
- Ready for gradual client migration
