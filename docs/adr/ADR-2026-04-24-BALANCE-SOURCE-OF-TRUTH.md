# ADR: Balance Source of Truth & Cross-Page Synchronization

**Status:** Accepted  
**Date:** 2026-04-24  
**Author:** KIMI  
**Context:** Bug reported by user (tomarnejensen@gmail.com) — dashboard, portfolio, and trading pages showed different balances.

---

## Problem

Multiple tables stored the user's balance independently, and trades only updated `trading_sessions.current_capital_nok`:

| Table | Field | Before Fix | Updated By Trades? |
|-------|-------|-----------|-------------------|
| `trading_sessions` | `current_capital_nok` | ✅ 94 995 | ✅ Yes (trigger) |
| `user_profiles` | `paper_balance` | ❌ 100 000 000 | ❌ No |
| `wallets` | `balance` | ❌ 100 000 | ❌ No |
| `portfolios` | `current_balance` | ❌ 100 000 000 | ❌ No |

**Result:** Dashboard showed session capital, portfolio showed wallet/profile balance, and the numbers drifted apart after every trade.

---

## Decision

1. **Source of Truth:** `trading_sessions.current_capital_nok` is the canonical balance for a user's active session.
2. **Auto-Sync:** The existing trigger `trigger_update_session_state` (fired `AFTER INSERT ON trades`) is extended to also update:
   - `user_profiles.paper_balance`
   - `wallets.balance`
   - `portfolios.current_balance`
3. **Currency Rule:** All user-facing balances are **NOK**. Binance prices (USDT) are converted using `usdt_nok_rate` from `global_settings` before display.
4. **Conversion Hook:** `useRealtimePrices` consumers must multiply Binance prices by `usdtNokRate` before formatting as NOK.

---

## Consequences

### Positive
- All pages show identical balances immediately after every trade.
- No manual reconciliation needed.
- Single source of truth (`trading_sessions`) with mirrored copies.

### Negative
- If a user has **multiple active sessions**, the synced fields will reflect the *last traded session* only. (Currently limited to 1 active session per user via `getOrCreatePaperTradingSession` dedup.)
- The trigger adds ~3 extra `UPDATE` statements per trade (acceptable for write volume).

---

## Migration

```sql
-- See: supabase/migrations/20260424_sync_balances_on_trade_trigger.sql
CREATE OR REPLACE FUNCTION public.trigger_update_session_state()
RETURNS TRIGGER ...
```

---

## Related Files

- `supabase/migrations/20260424_sync_balances_on_trade_trigger.sql`
- `src/lib/trading/currency.ts` — `usdtToNok()`, `getUsdtToNokRateAsync()`
- `src/features/dashboard/PortfolioDashboard.tsx` — fetches `/api/fx/usdt-nok` for display conversion
- `src/app/api/cron/update-usdt-nok/route.ts` — daily rate updater

---

## Verification Command

```bash
node -e "
const { Client } = require('pg');
const c = new Client({ /* ... */ });
c.connect().then(async () => {
  const uid = 'USER_UUID';
  const r = await c.query(\`
    SELECT
      (SELECT current_capital_nok FROM trading_sessions WHERE user_id = \$1 AND status = 'active') as session,
      (SELECT paper_balance FROM user_profiles WHERE id = \$1) as profile,
      (SELECT balance FROM wallets WHERE user_id = \$1) as wallet,
      (SELECT current_balance FROM portfolios WHERE user_id = \$1) as portfolio
  \`, [uid]);
  const s = r.rows[0];
  const ok = Math.abs(s.session - s.profile) < 1 && Math.abs(s.profile - s.wallet) < 1 && Math.abs(s.wallet - s.portfolio) < 1;
  console.log(ok ? '✅ All balances match' : '❌ Mismatch detected', s);
  await c.end();
});
"
```
