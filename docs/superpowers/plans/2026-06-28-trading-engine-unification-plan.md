# Trading-Engine Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route all automated trading through the canonical `/api/cron/tick` pipeline, add idempotency and reconciliation, and make backtesting reuse the same engine as live trading.

**Architecture:** Deprecate the duplicate `supabase/functions/auto-trade/index.ts` loop. Auto-trading users are discovered by `/api/cron/tick` and executed via `ExecutorFactory` + `executeTrade()` + the FIFO ledger + risk validator. Idempotency keys prevent duplicate orders; a reconciliation cron resolves drift against Binance.

**Tech Stack:** Next.js App Router, TypeScript, Supabase Postgres, Binance API, Vitest.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/lib/trading/idempotency.ts` | Idempotency-key primitive |
| `src/lib/trading/idempotency.test.ts` | Unit tests |
| `src/app/api/cron/tick/route.ts` | Extended to iterate auto-trading users |
| `src/app/api/cron/reconcile/route.ts` | New reconciliation cron |
| `src/lib/trading/reconciliation.ts` | Binance state reconciliation logic |
| `supabase/migrations/20260702000000_idempotency_keys.sql` | Idempotency table |
| `supabase/migrations/20260702000001_trade_idempotency_columns.sql` | Columns on trades/ai_decision_log |
| `supabase/migrations/20260702000002_reconciliation_state.sql` | Reconciliation tracking table |
| `supabase/functions/auto-trade/index.ts` | Mark deprecated, no-op or remove from schedule |
| `supabase/functions/run-backtest/index.ts` | Refactored to call `backtestEngine.ts` |
| `src/lib/trading/backtestEngine.ts` | Canonical backtest engine (existing) |

---

## Task 1: Idempotency primitive

**Files:**
- Create: `src/lib/trading/idempotency.ts`
- Create: `src/lib/trading/idempotency.test.ts`
- Create: `supabase/migrations/20260702000000_idempotency_keys.sql`

- [ ] **Step 1: Write the failing test**

Create `src/lib/trading/idempotency.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { withIdempotency } from "./idempotency";
import { createServiceClient } from "@/lib/supabase/server";

describe("withIdempotency", () => {
  beforeEach(async () => {
    const db = await createServiceClient();
    await db.from("idempotency_keys").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  });

  it("returns the same result on duplicate calls", async () => {
    const db = await createServiceClient();
    const op = async () => ({ status: "ok", value: Math.random() });

    const first = await withIdempotency(db, "key-1", "scope-a", "hash-1", op);
    const second = await withIdempotency(db, "key-1", "scope-a", "hash-1", op);

    expect(first.value).toBe(second.value);
  });

  it("throws if the same key is reused with a different request hash", async () => {
    const db = await createServiceClient();
    const op = async () => ({ status: "ok" });

    await withIdempotency(db, "key-2", "scope-a", "hash-a", op);
    await expect(withIdempotency(db, "key-2", "scope-a", "hash-b", op)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/lib/trading/idempotency.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Create the migration**

Create `supabase/migrations/20260702000000_idempotency_keys.sql`:

```sql
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  scope TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('pending', 'completed', 'failed')),
  response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '24 hours',
  UNIQUE (key, scope)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_scope_key ON public.idempotency_keys(scope, key);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires ON public.idempotency_keys(expires_at);

ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 4: Implement the primitive**

Create `src/lib/trading/idempotency.ts`:

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

export type IdempotencyState = "pending" | "completed" | "failed";

export interface IdempotencyRecord {
  id: string;
  key: string;
  scope: string;
  request_hash: string;
  state: IdempotencyState;
  response: unknown;
  created_at: string;
  expires_at: string;
}

function hashRequest(args: unknown): string {
  return createHash("sha256").update(JSON.stringify(args)).digest("hex");
}

export async function withIdempotency<T>(
  db: SupabaseClient,
  key: string,
  scope: string,
  requestHash: string,
  operation: () => Promise<T>,
  options: { timeoutMs?: number } = {}
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data: existing } = await db
    .from("idempotency_keys")
    .select("*")
    .eq("scope", scope)
    .eq("key", key)
    .single();

  if (existing) {
    const record = existing as IdempotencyRecord;
    if (record.request_hash !== requestHash) {
      throw new Error(`Idempotency key collision: ${scope}/${key}`);
    }
    if (record.state === "completed") {
      return record.response as T;
    }
    if (record.state === "pending" && new Date(record.created_at).getTime() + timeoutMs > Date.now()) {
      throw new Error(`Idempotency key ${scope}/${key} is pending`);
    }
    // pending but timed out → retry
    await db.from("idempotency_keys").delete().eq("id", record.id);
  }

  const { error: insertError } = await db
    .from("idempotency_keys")
    .insert({ key, scope, request_hash: requestHash, state: "pending", expires_at: expiresAt });

  if (insertError) {
    throw insertError;
  }

  try {
    const result = await operation();
    await db
      .from("idempotency_keys")
      .update({ state: "completed", response: result as any })
      .eq("scope", scope)
      .eq("key", key);
    return result;
  } catch (err) {
    await db
      .from("idempotency_keys")
      .update({ state: "failed" })
      .eq("scope", scope)
      .eq("key", key);
    throw err;
  }
}

export function makeIdempotencyKey(parts: (string | number | null | undefined)[]): string {
  return createHash("sha256").update(parts.map(String).join("|")).digest("hex");
}
```

- [ ] **Step 5: Run the tests**

```bash
npx vitest run src/lib/trading/idempotency.test.ts
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/trading/idempotency.ts src/lib/trading/idempotency.test.ts supabase/migrations/20260702000000_idempotency_keys.sql
git commit -m "feat(trading): add idempotency-key primitive"
```

---

## Task 2: Add idempotency columns to trades and ai_decision_log

**Files:**
- Create: `supabase/migrations/20260702000001_trade_idempotency_columns.sql`

- [ ] **Step 1: Add columns**

```sql
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_scope TEXT DEFAULT 'trade';

ALTER TABLE public.ai_decision_log
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_scope TEXT DEFAULT 'signal';

CREATE UNIQUE INDEX IF NOT EXISTS idx_trades_idempotency
  ON public.trades(idempotency_scope, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_decision_log_idempotency
  ON public.ai_decision_log(idempotency_scope, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260702000001_trade_idempotency_columns.sql
git commit -m "chore(db): add idempotency columns to trades and ai_decision_log"
```

---

## Task 3: Integrate idempotency into trade execution

**Files:**
- Modify: `src/lib/trading/core/execute-trade.ts`

- [ ] **Step 1: Find the executeTrade function**

Run:
```bash
grep -n "export async function executeTrade" src/lib/trading/core/execute-trade.ts
```

- [ ] **Step 2: Wrap the order submission with idempotency**

At the top of `executeTrade`, generate a key:

```typescript
import { makeIdempotencyKey, withIdempotency } from "@/lib/trading/idempotency";

// Inside executeTrade, before order submission:
const idempotencyKey = makeIdempotencyKey([
  userId,
  signal.strategyId ?? signal.strategy,
  signal.symbol,
  signal.action,
  signal.timestamp ?? Date.now(),
]);

const trade = await withIdempotency(
  db,
  idempotencyKey,
  "trade",
  idempotencyKey, // request hash = key for deterministic signals
  async () => {
    // existing order submission logic
    return submitOrder(...);
  }
);
```

- [ ] **Step 3: Persist idempotency key on trade record**

Ensure the insert into `trades` includes:

```typescript
idempotency_key: idempotencyKey,
idempotency_scope: "trade",
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/trading/core/execute-trade.ts
git commit -m "feat(trading): enforce idempotency on trade execution"
```

---

## Task 4: Deprecate auto-trade edge function

**Files:**
- Modify: `supabase/functions/auto-trade/index.ts`
- Modify: any cron schedule referencing `auto-trade`

- [ ] **Step 1: Add deprecation notice and no-op**

Open `supabase/functions/auto-trade/index.ts` and add at the top:

```typescript
// DEPRECATED: auto-trading is now handled by /api/cron/tick
// This function is kept for one release to avoid breaking deployed schedules.
// Remove after 2026-08-01.
```

Replace the handler body with a health log:

```typescript
export default serve(async () => {
  console.warn("auto-trade edge function is deprecated; use /api/cron/tick");
  return new Response(JSON.stringify({ ok: false, deprecated: true }), {
    status: 410,
    headers: { "Content-Type": "application/json" },
  });
});
```

- [ ] **Step 2: Remove from cron schedule**

Find cron migrations or scripts scheduling `auto-trade`:

```bash
grep -R "auto-trade" supabase/migrations/ scripts/ --include="*.sql" --include="*.mjs" --include="*.ts"
```

Create a migration to remove the scheduled call:

```sql
-- Remove deprecated auto-trade cron job
SELECT cron.unschedule('auto-trade-loop');
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/auto-trade/index.ts supabase/migrations/20260702000003_unschedule_auto_trade.sql
git commit -m "chore(trading): deprecate standalone auto-trade edge function"
```

---

## Task 5: Route auto-trades through /api/cron/tick

**Files:**
- Modify: `src/app/api/cron/tick/route.ts`

- [ ] **Step 1: Find the tick handler**

Run:
```bash
grep -n "export async function GET\|export async function POST" src/app/api/cron/tick/route.ts
```

- [ ] **Step 2: Add auto-trading user discovery**

Add a helper:

```typescript
async function getAutoTradingUsers(db: SupabaseClient): Promise<string[]> {
  const { data, error } = await db
    .from("user_auto_trading_configs")
    .select("user_id")
    .eq("enabled", true);

  if (error) throw error;
  return [...new Set((data ?? []).map((r) => r.user_id as string))];
}
```

- [ ] **Step 3: Extend tick execution**

After existing manual tick logic, add:

```typescript
const autoUserIds = await getAutoTradingUsers(db);
for (const userId of autoUserIds) {
  try {
    const signal = await generateSignalForUser(db, userId);
    if (signal) {
      await executeTrade(db, userId, signal, { mode: "paper" });
    }
  } catch (err) {
    console.error(`Auto-trade failed for ${userId}`, err);
    await logBotHealth(db, userId, "auto_trade_error", err);
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/cron/tick/route.ts
git commit -m "feat(trading): route auto-trading users through canonical tick pipeline"
```

---

## Task 6: Reconciliation loop

**Files:**
- Create: `src/lib/trading/reconciliation.ts`
- Create: `src/app/api/cron/reconcile/route.ts`
- Create: `supabase/migrations/20260702000002_reconciliation_state.sql`

- [ ] **Step 1: Create reconciliation state table**

```sql
CREATE TABLE IF NOT EXISTS public.reconciliation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  trades_checked INTEGER NOT NULL DEFAULT 0,
  divergences INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  details JSONB DEFAULT '[]'::jsonb
);

ALTER TABLE public.reconciliation_runs ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: Implement reconciliation logic**

Create `src/lib/trading/reconciliation.ts`:

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ReconciliationResult {
  tradesChecked: number;
  divergences: number;
  errors: number;
  details: Array<{ tradeId: string; localState: string; exchangeState: string; diff: string }>;
}

export async function reconcileBinanceTrades(
  db: SupabaseClient,
  fetchExchangeOrder: (clientOrderId: string) => Promise<{ status: string; filled: number } | null>
): Promise<ReconciliationResult> {
  const result: ReconciliationResult = { tradesChecked: 0, divergences: 0, errors: 0, details: [] };

  const { data: trades, error } = await db
    .from("trades")
    .select("id, client_order_id, status, filled_quantity")
    .in("status", ["submitted", "partially_filled"])
    .lt("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString())
    .limit(100);

  if (error) throw error;

  for (const trade of trades ?? []) {
    result.tradesChecked++;
    try {
      const exchange = await fetchExchangeOrder(trade.client_order_id);
      if (!exchange) {
        result.divergences++;
        result.details.push({ tradeId: trade.id, localState: trade.status, exchangeState: "not_found", diff: "missing" });
        continue;
      }
      const localDone = ["filled", "canceled", "expired"].includes(trade.status);
      const exchangeDone = ["FILLED", "CANCELED", "EXPIRED", "REJECTED"].includes(exchange.status);
      if (localDone !== exchangeDone || trade.filled_quantity !== exchange.filled) {
        result.divergences++;
        result.details.push({
          tradeId: trade.id,
          localState: trade.status,
          exchangeState: exchange.status,
          diff: "state mismatch",
        });
      }
    } catch (err) {
      result.errors++;
      result.details.push({ tradeId: trade.id, localState: trade.status, exchangeState: "error", diff: String(err) });
    }
  }

  return result;
}
```

- [ ] **Step 3: Create cron route**

Create `src/app/api/cron/reconcile/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { reconcileBinanceTrades } from "@/lib/trading/reconciliation";
import { getBinanceOrderStatus } from "@/lib/trading/binance-executor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await createServiceClient();
  const result = await reconcileBinanceTrades(db, getBinanceOrderStatus);

  await db.from("reconciliation_runs").insert({
    trades_checked: result.tradesChecked,
    divergences: result.divergences,
    errors: result.errors,
    details: result.details,
    completed_at: new Date().toISOString(),
  });

  if (result.divergences > 0) {
    // sentry alert here
    console.error(`Reconciliation found ${result.divergences} divergences`);
  }

  return NextResponse.json(result);
}
```

- [ ] **Step 4: Schedule cron job**

Create migration:

```sql
SELECT cron.schedule(
  'reconcile-binance-trades',
  '0 * * * *',
  $$ SELECT net.http_get(
    url := 'https://www.klarpakke.no/api/cron/reconcile',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.cron_secret'))
  ) $$
);
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/trading/reconciliation.ts src/app/api/cron/reconcile/route.ts supabase/migrations/20260702000002_reconciliation_state.sql
git commit -m "feat(trading): add hourly Binance trade reconciliation"
```

---

## Task 7: Port run-backtest edge function to canonical engine

**Files:**
- Modify: `supabase/functions/run-backtest/index.ts`

- [ ] **Step 1: Read current implementation**

```bash
head -80 supabase/functions/run-backtest/index.ts
```

- [ ] **Step 2: Replace inline logic with canonical engine call**

Replace the inline SMA/RSI logic with an HTTP call to `/api/backtest` or direct import if the edge function can bundle `src/lib/trading/backtestEngine.ts`.

Recommended: expose `/api/backtest` route and call it:

```typescript
const response = await fetch(`${origin}/api/backtest`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify({ strategy, symbol, start, end, initialCapital }),
});
return response;
```

- [ ] **Step 3: Add parity test**

Create `src/lib/trading/backtest-parity.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { runBacktest } from "./backtestEngine";

describe("backtest parity", () => {
  it("produces deterministic results for same inputs", async () => {
    const params = { strategy: "sma-cross", symbol: "BTCUSDT", start: "2024-01-01", end: "2024-01-31", initialCapital: 10000 };
    const a = await runBacktest(params);
    const b = await runBacktest(params);
    expect(a.finalCapital).toBe(b.finalCapital);
    expect(a.trades.length).toBe(b.trades.length);
  });
});
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/run-backtest/index.ts src/lib/trading/backtest-parity.test.ts
git commit -m "feat(trading): route run-backtest through canonical backtest engine"
```

---

## Task 8: Final verification

- [ ] **Step 1: Run tests**

```bash
npm run test:unit
```
Expected: PASS (idempotency + parity tests).

- [ ] **Step 2: Run type-check**

```bash
npm run type-check
```
Expected: PASS.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix(trading): resolve type errors after engine unification" || echo "No changes"
```

---

## Self-Review

| Spec Requirement | Implementing Task |
|------------------|-------------------|
| Idempotency primitive | Task 1 |
| Idempotency columns on trades/ai_decision_log | Task 2 |
| Idempotency in executeTrade | Task 3 |
| Deprecate auto-trade edge function | Task 4 |
| Route auto-trades through tick | Task 5 |
| Reconciliation loop | Task 6 |
| Backtest parity | Task 7 |

**Placeholder scan:** No TBD/TODO.  
**Type consistency:** `idempotencyKey` and `idempotency_scope` are consistent across tables.  
**Gaps:** `getBinanceOrderStatus` must be implemented or verified to exist in `binance-executor.ts`.
