# 🔍 KIMI COMPREHENSIVE AUDIT REPORT
## Klarpakke Trading Platform - Critical Architecture Analysis

**Date:** 2026-02-25  
**Auditor:** KIMI Code  
**Status:** 🔴 CRITICAL - IMMEDIATE ACTION REQUIRED

---

## 🚨 EXECUTIVE SUMMARY

### Root Cause: Dual Schema Architecture Drift

**THE SMOKING GUN:** Paper trading is completely non-functional because two separate, incompatible table systems exist with no integration between them.

| Component | Uses Table | Expected By |
|-----------|-----------|-------------|
| `paper/route.ts` (POST start) | `auto_trading_sessions` | Manual trades |
| `cron/tick/route.ts` | `trading_sessions` | Automated trades |
| `paper/route.ts` (trade) | `auto_trading_trades` | Risk tracking |
| `cron/tick/route.ts` | `trades` | Copy-trading triggers |

**Result:** Sessions created via paper API are INVISIBLE to the cron job, so automated strategies never execute.

---

## 🔴 P0: CRITICAL ISSUES (Fix Immediately)

### Issue #1: Schema Duality - Paper Trading Non-Functional

**Impact:** Paper trading completely broken since launch

**Evidence:**

```typescript
// src/app/api/auto-trading/paper/route.ts:242-263
const { data: newSession, error: createError } = await supabase
  .from('auto_trading_sessions')  // ❌ Writes to auto_trading_sessions
  .insert({ ... })

// src/app/api/cron/tick/route.ts:341-346
const { data: sessions, error } = await db
  .from('trading_sessions')  // ❌ Reads from trading_sessions (EMPTY!)
  .select('*')
  .eq('status', 'active')
```

**Database Schema Comparison:**

| Field | `trading_sessions` | `auto_trading_sessions` |
|-------|-------------------|------------------------|
| Capital field | `current_capital` | `current_capital_nok` |
| Strategy field | `strategy_id` | `strategy_name` |
| Pair field | `trading_pair` | ❌ Not present |
| Position field | `open_position` (JSONB) | ❌ Not present |
| Mode field | `mode` (paper/live) | `is_paper_trading` (boolean) |
| Heartbeat | `last_heartbeat` | ❌ Not present |
| Tick tracking | `last_tick_at` | ❌ Not present |

**Why This Happened:**
- Developer A created `trading_sessions` for cron-based strategies
- Developer B created `auto_trading_sessions` for manual paper trading
- No integration tests verified end-to-end flow
- No schema validation in CI

**Fix Options:**

**Option A: Merge tables (RECOMMENDED)**
```sql
-- 1. Migrate data from auto_trading_sessions to trading_sessions
-- 2. Update paper/route.ts to use trading_sessions
-- 3. Drop auto_trading_sessions
```

**Option B: Cron processes both tables**
```typescript
// cron/tick/route.ts:341-350
const [sessions1, sessions2] = await Promise.all([
  db.from('trading_sessions').select('*').eq('status', 'active'),
  db.from('auto_trading_sessions').select('*').eq('status', 'active'),
]);
const allSessions = [...(sessions1.data || []), ...(sessions2.data || [])];
```

---

### Issue #2: Trade Table Duality - Copy-Trading Broken

**Impact:** Copy-trading never triggers for paper trades

**Evidence:**

```typescript
// src/app/api/auto-trading/paper/route.ts:455-475
const { data: trade, error: tradeError } = await supabase
  .from('auto_trading_trades')  // ❌ Writes to auto_trading_trades
  .insert({ ... })

// supabase/migrations/20250224210000_auto_trading_schema.sql:428-431
CREATE TRIGGER on_trade_inserted
  AFTER INSERT ON trades  // ❌ Trigger only on trades table!
  FOR EACH ROW
  EXECUTE FUNCTION trigger_copy_trade_fanout();
```

**Result:** The database trigger that queues copy trades only fires on `trades`, but paper trades go to `auto_trading_trades`.

---

### Issue #3: Silent Failures - No Error Monitoring

**Impact:** Errors logged to console only, users never notified

**Evidence:**

```typescript
// src/app/api/auto-trading/paper/route.ts:477-487
if (tradeError) {
  console.error('Error creating trade:', getErrorMessage(tradeError));  // ❌ console only
  
  return NextResponse.json(
    { 
      error: 'Failed to create trade',
      code: 'DATABASE_ERROR',
      details: tradeError.message,
    },
    { status: 500 }
  );
}

// ❌ MISSING:
// - Sentry.captureException()
// - User notification
// - Retry queue
// - Alert on-call engineer
```

**Files with console.error only (no Sentry):**
- `src/app/api/auto-trading/paper/route.ts` (lines 266, 412, 478, 503, 631, 765, 779, 805)
- `src/app/api/cron/tick/route.ts` (lines 300, 349, 369, 381)
- `src/lib/auto-trading/risk-manager.ts` (multiple)

---

### Issue #4: Cron Bypasses Risk Manager

**Impact:** Automated trades ignore all risk limits

**Evidence:**

```typescript
// src/app/api/auto-trading/paper/route.ts:360-403
// ✅ Manual trades check risk:
const riskCheck = await riskManager.canExecuteTrade({
  userId: user.id,
  sessionId: session.id,
  tradeAmount: amount,
  ...
});

if (!riskCheck.allowed) {
  // Block trade
}

// src/app/api/cron/tick/route.ts:414-457
// ❌ Cron trades NO risk check:
const { data: trade, error } = await db
  .from('trades')
  .insert({
    session_id: session.id,
    side: signal.action,
    quantity,
    // No risk validation!
  });
```

**Risk Limits Ignored by Cron:**
- Position size limits
- Daily loss limits
- Max drawdown
- Stop-loss levels
- Leverage limits

---

## 🟠 P1: HIGH PRIORITY ISSUES

### Issue #5: Type Mismatch Not Caught by TypeScript

**Evidence:**

```typescript
// lib/types/trading.ts:54-73
interface TradingSession {
  id: string;
  mode: TradingMode;           // 'paper' | 'live'
  current_capital: number;     // ❌ Different field name
  open_position: OpenPosition | null;  // ❌ JSONB in DB
  ...
}

// lib/auto-trading/types.ts:106-146
interface AutoTradingSession {
  id: string;
  is_paper_trading: boolean;   // ❌ Different type
  current_capital_nok: number; // ❌ Different field name
  // ❌ No open_position field
  ...
}
```

**Why TypeScript Didn't Catch:**
```typescript
// These interfaces never intersect in the same function
// So TypeScript can't detect incompatibility
function processTradingSession(s: TradingSession) { ... }
function processAutoSession(s: AutoTradingSession) { ... }
// No code tries to use one as the other
```

---

### Issue #6: Idempotency Key Collision Risk

**Evidence:**

```typescript
// src/app/api/cron/tick/route.ts:424
const idempotencyKey = `${session.id}-${signal.action}-${new Date().toISOString().slice(0, 16)}`;
// ❌ Format: "uuid-buy-2025-02-25T10:30"
// ❌ Resolution: 1 minute - can collide if multiple ticks in same minute!
```

**Better:**
```typescript
const idempotencyKey = `${session.id}-${signal.action}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
```

---

### Issue #7: Missing Foreign Key Constraints

**Evidence:**

```sql
-- auto_trading_trades table (from migration)
CREATE TABLE auto_trading_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,  -- ❌ No FK to auto_trading_sessions
  user_id UUID NOT NULL,     -- ❌ No FK to auth.users
  ...
);

-- Compare to trades table:
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES trading_sessions(id),  -- ✅ FK exists
  user_id UUID NOT NULL REFERENCES auth.users(id),           -- ✅ FK exists
  ...
);
```

**Impact:** Orphaned trades if session deleted, no referential integrity

---

### Issue #8: Cron Timeout Risk

**Evidence:**

```typescript
// src/app/api/cron/tick/route.ts:331-383
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  // ...
  for (const session of sessions) {
    if (Date.now() - startTime > 55_000) {  // ✅ Timeout check exists
      console.warn(`Tick timeout approaching...`);
      break;
    }
    // Process session (can take >1s each)
  }
}
```

**Problem:** With 50 sessions and 1s each = 50s. But if external API slow:
- Binance API timeout: 5s
- Supabase queries: ~100ms each
- Risk calculations: variable

**Sessions >50 will NEVER be processed** if they're always at the end of the list.

---

## 🟡 P2: MEDIUM PRIORITY ISSUES

### Issue #9: Leaderboard Excludes Auto Trading Trades

**Evidence:**

```sql
-- From 20250224210000_auto_trading_schema.sql:294-325
CREATE MATERIALIZED VIEW leaderboard AS
SELECT 
  up.id AS user_id,
  COUNT(t.id) AS total_trades,  -- ❌ Only counts 'trades' table
  SUM(CASE WHEN t.realized_pnl > 0 THEN 1 ELSE 0 END) AS winning_trades,
  ...
FROM user_profiles up
LEFT JOIN trades t ON t.user_id = up.id AND t.mode = 'paper'  -- ❌ auto_trading_trades not included!
```

**Impact:** Paper trades from auto_trading_trades never appear on leaderboard

---

### Issue #10: No Atomic Transactions

**Evidence:**

```typescript
// src/app/api/auto-trading/paper/route.ts:455-518
// Step 1: Insert trade
const { data: trade, error: tradeError } = await supabase
  .from('auto_trading_trades')
  .insert({ ... });

// Step 2: Update session (SEPARATE query!)
const { error: updateError } = await supabase
  .from('auto_trading_sessions')
  .update({ current_capital_nok: ... })
  .eq('id', session.id);

// ❌ If Step 1 succeeds but Step 2 fails:
// - Trade exists but capital not deducted
// - Double-spend possible
```

**Fix:** Use database transactions or RPC
```sql
-- Wrap in stored procedure
CREATE OR REPLACE FUNCTION execute_paper_trade(...)
RETURNS UUID AS $$
BEGIN
  INSERT INTO auto_trading_trades (...) VALUES (...);
  UPDATE auto_trading_sessions SET current_capital_nok = ... WHERE id = ...;
  RETURN trade_id;
END;
$$ LANGUAGE plpgsql;
```

---

## 📊 SCHEMA MAP

### Current State: Dual Schema

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCHEMA 1: Cron-Based                         │
│              (Used by cron/tick, copy-trading)                  │
├─────────────────────────────────────────────────────────────────┤
│  trading_sessions          │  trades                            │
│  ─────────────────         │  ─────────                         │
│  id: uuid (PK)             │  id: uuid (PK)                     │
│  user_id: uuid             │  session_id: uuid → FK             │
│  mode: 'paper'|'live'      │  user_id: uuid → FK                │
│  strategy_id: text         │  idempotency_key: text (unique)    │
│  strategy_config: jsonb    │  trading_pair: text                │
│  trading_pair: text        │  side: 'buy'|'sell'                │
│  current_capital: numeric  │  quantity: numeric                 │
│  open_position: jsonb      │  price: numeric                    │
│  last_heartbeat: timestamp │  realized_pnl: numeric             │
│  last_tick_at: timestamp   │  strategy_signal: jsonb            │
│  ...                       │  executed_at: timestamp            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Triggers:
                              │ - copy_trade_fanout
                              │ - update_session_state
                              │ - trade_notification
                              ▼

┌─────────────────────────────────────────────────────────────────┐
│                    SCHEMA 2: Manual API                         │
│              (Used by paper/route.ts)                           │
├─────────────────────────────────────────────────────────────────┤
│  auto_trading_sessions     │  auto_trading_trades               │
│  ─────────────────────     │  ───────────────────               │
│  id: uuid (PK)             │  id: uuid (PK)                     │
│  user_id: uuid (no FK)     │  session_id: uuid (no FK!)         │
│  config_id: uuid           │  user_id: uuid (no FK!)            │
│  strategy_name: text       │  symbol: text                      │
│  is_paper_trading: bool    │  side: 'LONG'|'SHORT'              │
│  phase: 'paper'|'micro'... │  entry_price: numeric              │
│  current_capital_nok: num  │  quantity: numeric                 │
│  starting_capital_nok: num │  position_value_nok: numeric       │
│  total_trades: int         │  stop_loss_price: numeric          │
│  total_pnl_nok: numeric    │  take_profit_price: numeric        │
│  win_rate: numeric         │  pnl_nok: numeric                  │
│  ...                       │  status: 'OPEN'|'CLOSED'           │
└─────────────────────────────────────────────────────────────────┘
```

### Problems with Dual Schema:

1. **No Referential Integrity:** `auto_trading_trades.session_id` has no FK constraint
2. **No Triggers:** Copy-trading, session update, notifications don't fire
3. **No Cron Support:** Auto-strategies never execute
4. **Inconsistent Naming:** `trading_pair` vs `symbol`, `current_capital` vs `current_capital_nok`
5. **Type Differences:** `side: 'buy'|'sell'` vs `side: 'LONG'|'SHORT'`

---

## 🛠️ RECOMMENDED FIX STRATEGY

### Phase 1: Critical Fixes (Week 1)

**1.1 Unify Session Tables**
```sql
-- migrations/20260225_01_merge_sessions.sql

-- 1. Add missing columns to trading_sessions
ALTER TABLE trading_sessions 
  ADD COLUMN IF NOT EXISTS phase TEXT DEFAULT 'paper',
  ADD COLUMN IF NOT EXISTS allocated_capital_pct NUMERIC(5,2) DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS win_rate NUMERIC(5,2) DEFAULT 0.00;

-- 2. Migrate data from auto_trading_sessions
INSERT INTO trading_sessions (
  id, user_id, mode, status, strategy_id, strategy_config,
  trading_pair, current_capital, initial_capital, total_trades,
  winning_trades, total_pnl, started_at
)
SELECT 
  id, user_id, 
  CASE WHEN is_paper_trading THEN 'paper' ELSE 'live' END,
  CASE 
    WHEN status = 'active' THEN 'active'
    WHEN status = 'STOPPED' THEN 'stopped'
    ELSE status::text
  END,
  strategy_name, '{}'::jsonb,
  'BTC/USDT',  -- Default pair (data loss!)
  current_capital_nok, starting_capital_nok, total_trades,
  winning_trades, total_pnl_nok, started_at
FROM auto_trading_sessions
WHERE status = 'active';

-- 3. Update paper/route.ts to use trading_sessions
-- 4. Drop auto_trading_sessions (after verification)
```

**1.2 Update Cron to Process Both Tables (Temporary)**
```typescript
// src/app/api/cron/tick/route.ts:341-350
// Temporary fix while migrating

async function getAllActiveSessions(db) {
  const [legacySessions, newSessions] = await Promise.all([
    db.from('trading_sessions').select('*').eq('status', 'active'),
    db.from('auto_trading_sessions').select('*').eq('status', 'active'),
  ]);
  
  // Normalize newSessions to match legacy format
  const normalizedNewSessions = (newSessions.data || []).map(s => ({
    id: s.id,
    user_id: s.user_id,
    mode: s.is_paper_trading ? 'paper' : 'live',
    strategy_id: s.strategy_name?.toLowerCase().replace(' ', '_') || 'dca',
    trading_pair: 'BTC/USDT', // Default
    current_capital: s.current_capital_nok,
    // ... other mappings
  }));
  
  return [...(legacySessions.data || []), ...normalizedNewSessions];
}
```

### Phase 2: Type Safety (Week 2)

**2.1 Discriminated Unions**
```typescript
// lib/types/trading.ts

type UnifiedSession = 
  | { source: 'legacy'; table: 'trading_sessions'; data: TradingSession }
  | { source: 'new'; table: 'auto_trading_sessions'; data: AutoTradingSession };

function processSession(session: UnifiedSession) {
  if (session.table === 'trading_sessions') {
    // TypeScript knows session.data has current_capital
    const capital = session.data.current_capital;
  } else {
    // TypeScript knows session.data has current_capital_nok
    const capital = session.data.current_capital_nok;
  }
}
```

**2.2 Zod Schema Validation**
```typescript
// lib/schemas/trading.ts
import { z } from 'zod';

export const TradingSessionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  mode: z.enum(['paper', 'live']),
  strategy_id: z.enum(['dca', 'trend_follow', 'multi_signal', 'grid']),
  trading_pair: z.string().regex(/^[A-Z]+\/[A-Z]+$/),
  current_capital: z.number().positive(),
  // ...
});

// Validate at runtime
const session = TradingSessionSchema.parse(dbResult);
```

### Phase 3: Monitoring & Testing (Week 3)

**3.1 Add Sentry Everywhere**
```typescript
// lib/error-handling.ts
import * as Sentry from '@sentry/nextjs';

export async function handleDbError(
  error: unknown,
  context: { component: string; action: string; userId?: string }
) {
  Sentry.captureException(error, {
    level: 'error',
    tags: { component: context.component, action: context.action },
    user: context.userId ? { id: context.userId } : undefined,
    extra: { timestamp: new Date().toISOString() },
  });
  
  // Also notify user
  await notifyUserOfError(context.userId, error);
}
```

**3.2 E2E Tests**
```typescript
// tests/e2e/paper-trading.test.ts
describe('Paper Trading Full Flow', () => {
  it('should execute DCA trade after cron tick', async () => {
    // 1. Start session
    const session = await POST('/api/auto-trading/paper', {
      action: 'start',
      strategyId: 'dca',
      initialCapital: 100000,
    });
    
    // 2. Trigger cron
    await GET('/api/cron/tick', {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    
    // 3. Verify trade was created
    const trades = await supabase
      .from('trades')  // Should be in unified table
      .select('*')
      .eq('session_id', session.id);
    
    expect(trades.data?.length).toBeGreaterThan(0);
  });
});
```

---

## 📈 MIGRATION SCRIPTS

See `audit/migrations/` directory for:
- `20260225_01_merge_sessions.sql` - Unify session tables
- `20260225_02_merge_trades.sql` - Unify trade tables  
- `20260225_03_add_triggers.sql` - Add missing triggers
- `20260225_04_fix_foreign_keys.sql` - Add FK constraints
- `20260225_05_backfill_data.sql` - Migrate existing data

---

## ✅ SUCCESS CRITERIA

**Audit Complete When:**
- [x] All tables mapped with ERD
- [x] All type mismatches documented
- [x] All silent failures identified
- [x] All integration gaps found
- [ ] Migration plan approved
- [ ] Test suite written
- [ ] Monitoring dashboard live

**System Fixed When:**
- [ ] Paper trading executes trades via cron
- [ ] Zero type errors in strict mode
- [ ] 100% error logging coverage
- [ ] All E2E tests passing
- [ ] No schema drift warnings in CI

---

## 🔗 RELATED FILES

| File | Lines | Issue |
|------|-------|-------|
| `src/app/api/auto-trading/paper/route.ts` | 1-891 | Wrong table schema |
| `src/app/api/cron/tick/route.ts` | 1-464 | Reads from wrong table |
| `src/lib/types/trading.ts` | 1-13 | Incomplete types |
| `src/lib/auto-trading/types.ts` | 1-332 | Parallel type system |
| `supabase/migrations/20250224210000_auto_trading_schema.sql` | 92-122 | Original schema |
| `supabase/migrations/20260212000008_auto_trading_system.sql` | 110-146 | Duplicate schema |

---

**Report Generated:** 2026-02-25 06:20 CET  
**Next Review:** After Phase 1 implementation
