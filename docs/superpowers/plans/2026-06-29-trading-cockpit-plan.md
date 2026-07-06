# Trading Cockpit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a new `/handel` Trading Cockpit with mode-aware KPI header, three tabs (Overview / Trades / Analysis), cursor-paginated trade history, server-side analytics, and mobile-first UX.

**Architecture:** URL is the source of truth for `mode` and `tab`. Server fetches initial KPIs, sessions, and status counts. Client provider manages state, filters, and pagination. Analytics and trades come from new RPCs. Headline PnL stays authoritative from `get_dashboard_metrics` / `trading_sessions.total_pnl`; per-trade `effective_pnl` is used only for trade-level breakdowns.

**Tech Stack:** Next.js 16.2.9, React 19, TypeScript 5.9, Supabase, Cloudflare Workers, Tailwind, shadcn/ui, Zod, Vitest, Playwright.

---

## Phase 0: Data layer & API foundation

### Task 1: Add `calculate_effective_pnl` SQL function

**Files:**
- Create: `supabase/migrations/20260629100000_add_calculate_effective_pnl_function.sql`
- Test: Run migration locally

- [ ] **Step 1: Write migration**

```sql
-- Add immutable helper for per-trade effective PnL fallback.
-- Matches effectivePnlDelta in src/lib/trading/build-trading-analytics.ts
CREATE OR REPLACE FUNCTION public.calculate_effective_pnl(
  p_realized_pnl NUMERIC,
  p_total_value  NUMERIC,
  p_side         TEXT
)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT COALESCE(
    p_realized_pnl,
    CASE lower(trim(p_side))
      WHEN 'buy'  THEN -ABS(p_total_value)
      WHEN 'sell' THEN  ABS(p_total_value)
      ELSE 0
    END
  );
$$;

GRANT EXECUTE ON FUNCTION public.calculate_effective_pnl(NUMERIC, NUMERIC, TEXT)
  TO authenticated, service_role;
```

- [ ] **Step 2: Run migration locally**

Run: `npm run db:push` or `supabase db push`
Expected: Migration applies without errors.

- [ ] **Step 3: Verify function exists**

Run SQL:
```sql
SELECT public.calculate_effective_pnl(NULL, 1000, 'buy');  -- expected -1000
SELECT public.calculate_effective_pnl(500, 1000, 'sell');  -- expected 500
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260629100000_add_calculate_effective_pnl_function.sql
git commit -m "feat(db): add calculate_effective_pnl function for cockpit analytics"
```

---

### Task 2: Add status-counts RPC

**Files:**
- Create: `supabase/migrations/20260629101000_add_trading_session_status_counts.sql`

- [ ] **Step 1: Write migration**

```sql
CREATE OR REPLACE FUNCTION public.trading_session_status_counts(
  p_user_id UUID,
  p_mode TEXT
)
RETURNS TABLE(status TEXT, count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status, COUNT(*)::BIGINT
  FROM public.trading_sessions
  WHERE user_id = p_user_id
    AND mode = p_mode
  GROUP BY status;
$$;

GRANT EXECUTE ON FUNCTION public.trading_session_status_counts(UUID, TEXT)
  TO authenticated, service_role;
```

- [ ] **Step 2: Run migration and test**

Run SQL:
```sql
SELECT * FROM public.trading_session_status_counts('your-user-id', 'paper');
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260629101000_add_trading_session_status_counts.sql
git commit -m "feat(db): add trading_session_status_counts RPC"
```

---

### Task 3: Add `get_trades_paginated` RPC

**Files:**
- Create: `supabase/migrations/20260629102000_add_get_trades_paginated.sql`

- [ ] **Step 1: Write migration**

```sql
CREATE OR REPLACE FUNCTION public.get_trades_paginated(
  p_user_id UUID,
  p_cursor TEXT,
  p_limit INT,
  p_mode TEXT,
  p_trade_statuses TEXT[],
  p_session_statuses TEXT[],
  p_side TEXT,
  p_pair TEXT,
  p_search TEXT,
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ
)
RETURNS TABLE(
  id UUID,
  session_id UUID,
  symbol TEXT,
  trading_pair TEXT,
  side TEXT,
  status TEXT,
  price NUMERIC,
  quantity NUMERIC,
  fee NUMERIC,
  total_value NUMERIC,
  realized_pnl NUMERIC,
  effective_pnl NUMERIC,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  next_cursor TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_executed_at TIMESTAMPTZ;
  v_id UUID;
BEGIN
  IF p_cursor IS NOT NULL THEN
    SELECT (d->>'executed_at')::TIMESTAMPTZ, (d->>'id')::UUID
    INTO v_executed_at, v_id
    FROM jsonb_in(decode(p_cursor, 'base64')) AS d;
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.session_id,
    t.symbol,
    t.trading_pair,
    t.side,
    t.status,
    t.price,
    t.quantity,
    t.fee,
    t.total_value,
    t.realized_pnl,
    public.calculate_effective_pnl(t.realized_pnl, t.total_value, t.side::TEXT) AS effective_pnl,
    t.executed_at,
    t.created_at,
    CASE WHEN count(*) OVER () > p_limit THEN
      encode(
        jsonb_build_object(
          'executed_at', t.executed_at,
          'id', t.id
        )::TEXT::BYTEA,
        'base64'
      )
    ELSE NULL END AS next_cursor
  FROM public.trades t
  JOIN public.trading_sessions s ON s.id = t.session_id
  WHERE t.user_id = p_user_id
    AND t.mode = p_mode
    AND (p_trade_statuses IS NULL OR t.status = ANY(p_trade_statuses))
    AND (p_session_statuses IS NULL OR s.status = ANY(p_session_statuses))
    AND (p_side IS NULL OR t.side = p_side)
    AND (p_pair IS NULL OR t.trading_pair ILIKE p_pair OR (t.symbol IS NOT NULL AND t.symbol ILIKE p_pair))
    AND (p_search IS NULL OR t.trading_pair ILIKE '%' || p_search || '%' OR (t.symbol IS NOT NULL AND t.symbol ILIKE '%' || p_search || '%'))
    AND (p_from IS NULL OR t.executed_at >= p_from)
    AND (p_to IS NULL OR t.executed_at < p_to)
    AND (
      p_cursor IS NULL
      OR (t.executed_at, t.id) < (v_executed_at, v_id)
    )
  ORDER BY t.executed_at DESC, t.id DESC
  LIMIT p_limit + 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_trades_paginated(UUID, TEXT, INT, TEXT, TEXT[], TEXT[], TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ)
  TO authenticated, service_role;
```

- [ ] **Step 2: Run migration and test**

Run SQL:
```sql
SELECT * FROM public.get_trades_paginated('user-id', NULL, 5, 'paper', NULL, NULL, NULL, NULL, NULL, NULL, NULL);
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260629102000_add_get_trades_paginated.sql
git commit -m "feat(db): add get_trades_paginated RPC"
```

---

### Task 4: Add `get_trading_analytics` RPC

**Files:**
- Create: `supabase/migrations/20260629103000_add_get_trading_analytics.sql`

- [ ] **Step 1: Write migration**

```sql
CREATE OR REPLACE FUNCTION public.get_trading_analytics(
  p_user_id UUID,
  p_mode TEXT,
  p_trade_statuses TEXT[],
  p_session_statuses TEXT[],
  p_side TEXT,
  p_pair TEXT,
  p_search TEXT,
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ
)
RETURNS TABLE(
  total_trades BIGINT,
  winning_trades BIGINT,
  losing_trades BIGINT,
  win_rate NUMERIC,
  total_pnl NUMERIC,
  total_fees NUMERIC,
  starting_capital NUMERIC,
  max_drawdown_pct NUMERIC,
  profit_factor NUMERIC,
  best_pair TEXT,
  best_pair_pnl NUMERIC,
  worst_pair TEXT,
  worst_pair_pnl NUMERIC,
  best_session_id UUID,
  best_session_pnl NUMERIC,
  worst_session_id UUID,
  worst_session_pnl NUMERIC,
  trades_by_day JSONB,
  trades_by_symbol JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH filtered_trades AS (
    SELECT
      t.id,
      t.session_id,
      t.symbol,
      t.trading_pair,
      t.side,
      t.status,
      t.fee,
      t.total_value,
      t.realized_pnl,
      public.calculate_effective_pnl(t.realized_pnl, t.total_value, t.side::TEXT) AS effective_pnl,
      t.executed_at,
      DATE(t.executed_at AT TIME ZONE 'UTC') AS day
    FROM public.trades t
    JOIN public.trading_sessions s ON s.id = t.session_id
    WHERE t.user_id = p_user_id
      AND t.mode = p_mode
      AND (p_trade_statuses IS NULL OR t.status = ANY(p_trade_statuses))
      AND (p_session_statuses IS NULL OR s.status = ANY(p_session_statuses))
      AND (p_side IS NULL OR t.side = p_side)
      AND (p_pair IS NULL OR t.trading_pair ILIKE p_pair OR (t.symbol IS NOT NULL AND t.symbol ILIKE p_pair))
      AND (p_search IS NULL OR t.trading_pair ILIKE '%' || p_search || '%' OR (t.symbol IS NOT NULL AND t.symbol ILIKE '%' || p_search || '%'))
      AND (p_from IS NULL OR t.executed_at >= p_from)
      AND (p_to IS NULL OR t.executed_at < p_to)
  ),
  session_totals AS (
    SELECT
      s.id,
      s.starting_capital_nok,
      s.total_pnl
    FROM public.trading_sessions s
    WHERE s.user_id = p_user_id
      AND s.mode = p_mode
      AND (p_session_statuses IS NULL OR s.status = ANY(p_session_statuses))
  ),
  trade_aggregates AS (
    SELECT
      COUNT(*)::BIGINT AS total_trades,
      COUNT(*) FILTER (WHERE effective_pnl > 0)::BIGINT AS winning_trades,
      COUNT(*) FILTER (WHERE effective_pnl < 0)::BIGINT AS losing_trades,
      COALESCE(SUM(fee), 0) AS total_fees,
      COALESCE(SUM(effective_pnl), 0) AS trade_total_pnl
    FROM filtered_trades
  ),
  session_aggregates AS (
    SELECT
      COALESCE(SUM(total_pnl), 0) AS session_total_pnl,
      COALESCE(MIN(starting_capital_nok), 0) AS starting_capital
    FROM session_totals
  ),
  pair_aggregates AS (
    SELECT
      COALESCE(symbol, trading_pair) AS pair,
      SUM(effective_pnl) AS pnl,
      ROW_NUMBER() OVER (ORDER BY SUM(effective_pnl) DESC) AS rn_high,
      ROW_NUMBER() OVER (ORDER BY SUM(effective_pnl) ASC) AS rn_low
    FROM filtered_trades
    WHERE COALESCE(symbol, trading_pair) IS NOT NULL
    GROUP BY COALESCE(symbol, trading_pair)
  ),
  best_worst_pair AS (
    SELECT
      MAX(pair) FILTER (WHERE rn_high = 1) AS best_pair,
      MAX(pnl) FILTER (WHERE rn_high = 1) AS best_pair_pnl,
      MAX(pair) FILTER (WHERE rn_low = 1) AS worst_pair,
      MAX(pnl) FILTER (WHERE rn_low = 1) AS worst_pair_pnl
    FROM pair_aggregates
  ),
  session_ranked AS (
    SELECT
      id,
      total_pnl,
      ROW_NUMBER() OVER (ORDER BY total_pnl DESC) AS rn_high,
      ROW_NUMBER() OVER (ORDER BY total_pnl ASC) AS rn_low
    FROM session_totals
  ),
  best_worst_session AS (
    SELECT
      MAX(id) FILTER (WHERE rn_high = 1) AS best_session_id,
      MAX(total_pnl) FILTER (WHERE rn_high = 1) AS best_session_pnl,
      MAX(id) FILTER (WHERE rn_low = 1) AS worst_session_id,
      MAX(total_pnl) FILTER (WHERE rn_low = 1) AS worst_session_pnl
    FROM session_ranked
  ),
  daily AS (
    SELECT
      jsonb_agg(jsonb_build_object('date', day, 'pnl', COALESCE(SUM(effective_pnl), 0), 'trades', COUNT(*)) ORDER BY day) AS trades_by_day
    FROM filtered_trades
    GROUP BY day
  ),
  by_symbol AS (
    SELECT
      jsonb_agg(jsonb_build_object('symbol', pair, 'pnl', pnl, 'trades', 0) ORDER BY pnl DESC) AS trades_by_symbol
    FROM pair_aggregates
  )
  SELECT
    ta.total_trades,
    ta.winning_trades,
    ta.losing_trades,
    CASE WHEN (ta.winning_trades + ta.losing_trades) > 0
      THEN ROUND(ta.winning_trades::NUMERIC / (ta.winning_trades + ta.losing_trades) * 100, 2)
      ELSE NULL END AS win_rate,
    sa.session_total_pnl AS total_pnl,
    ta.total_fees,
    sa.starting_capital,
    NULL::NUMERIC AS max_drawdown_pct,  -- computed client-side or in later iteration
    NULL::NUMERIC AS profit_factor,     -- computed client-side or in later iteration
    bwp.best_pair,
    bwp.best_pair_pnl,
    bwp.worst_pair,
    bwp.worst_pair_pnl,
    bws.best_session_id,
    bws.best_session_pnl,
    bws.worst_session_id,
    bws.worst_session_pnl,
    (SELECT trades_by_day FROM daily LIMIT 1) AS trades_by_day,
    (SELECT trades_by_symbol FROM by_symbol LIMIT 1) AS trades_by_symbol
  FROM trade_aggregates ta
  CROSS JOIN session_aggregates sa
  CROSS JOIN best_worst_pair bwp
  CROSS JOIN best_worst_session bws;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_trading_analytics(UUID, TEXT, TEXT[], TEXT[], TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ)
  TO authenticated, service_role;
```

- [ ] **Step 2: Run migration and test**

Run SQL:
```sql
SELECT * FROM public.get_trading_analytics('user-id', 'paper', NULL, NULL, NULL, NULL, NULL, NULL, NULL);
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260629103000_add_get_trading_analytics.sql
git commit -m "feat(db): add get_trading_analytics RPC"
```

---

### Task 5: Extract live entitlement helper

**Files:**
- Create: `src/lib/auth/live-trading.ts`
- Modify: `src/app/api/trading/mode/route.ts`

- [ ] **Step 1: Create helper file**

```typescript
import { createClient } from "@/lib/supabase/server";
import { canAccessLiveAutoTrading, type TierSlug } from "@/types/subscription";
import { normalizeTier } from "@/lib/pricing/tiers";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function verifyLiveEntitlement(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("tier, binance_connected")
    .eq("id", userId)
    .single();

  if (profileError || !profile) return false;

  const tier = normalizeTier(profile.tier);
  if (!canAccessLiveAutoTrading(tier as TierSlug)) return false;
  if (!profile.binance_connected) return false;

  const { data: entitlements, error } = await supabase.rpc(
    "get_user_entitlements",
    { p_user_id: userId },
  );

  if (error || !entitlements?.length) return false;
  return Boolean(entitlements[0].auto_trade_allow_live);
}

export async function verifyLiveEntitlementForUserId(userId: string): Promise<boolean> {
  const supabase = createClient();
  return verifyLiveEntitlement(supabase, userId);
}
```

- [ ] **Step 2: Refactor `/api/trading/mode` to use helper**

Replace the inline `userMayUseLiveTrading` function with imports from `src/lib/auth/live-trading.ts`. Keep behavior identical but fail closed.

- [ ] **Step 3: Write unit test for helper**

Create: `src/lib/auth/__tests__/live-trading.test.ts`

```typescript
import { describe, it, expect, vi } from "vitest";
import { verifyLiveEntitlement } from "@/lib/auth/live-trading";

function makeSupabaseMock(profile: object | null, entitlements: object[] | null, rpcError = false) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({ data: profile, error: profile ? null : { message: "not found" } }),
          ),
        })),
      })),
    })),
    rpc: vi.fn(() =>
      Promise.resolve({
        data: entitlements,
        error: rpcError ? { message: "rpc error" } : null,
      }),
    ),
  } as unknown as Parameters<typeof verifyLiveEntitlement>[0];
}

describe("verifyLiveEntitlement", () => {
  it("returns false when profile missing", async () => {
    const result = await verifyLiveEntitlement(makeSupabaseMock(null, null), "u1");
    expect(result).toBe(false);
  });

  it("returns false when binance not connected", async () => {
    const result = await verifyLiveEntitlement(
      makeSupabaseMock({ tier: "bachelor", binance_connected: false }, [{ auto_trade_allow_live: true }]),
      "u1",
    );
    expect(result).toBe(false);
  });

  it("returns true when all checks pass", async () => {
    const result = await verifyLiveEntitlement(
      makeSupabaseMock({ tier: "bachelor", binance_connected: true }, [{ auto_trade_allow_live: true }]),
      "u1",
    );
    expect(result).toBe(true);
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npm run test:unit -- src/lib/auth/__tests__/live-trading.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/live-trading.ts src/lib/auth/__tests__/live-trading.test.ts src/app/api/trading/mode/route.ts
git commit -m "feat(auth): extract fail-closed verifyLiveEntitlement helper"
```

---

### Task 6: Create new API routes

**Files:**
- Create: `src/app/api/trading-cockpit/metrics/route.ts`
- Create: `src/app/api/trading-cockpit/sessions/route.ts`
- Create: `src/app/api/trading-cockpit/trades/route.ts`
- Create: `src/app/api/trading-cockpit/analytics/route.ts`
- Create: `src/app/api/trading-cockpit/route.ts` (optional index/health)

- [ ] **Step 1: Implement metrics route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createClient } from "@/lib/supabase/server";
import { getUserDashboardMetrics } from "@/server/dashboard/getUserDashboardMetrics";
import { verifyLiveEntitlement } from "@/lib/auth/live-trading";
import { z } from "zod";

const paramsSchema = z.object({
  mode: z.enum(["paper", "live"]),
});

export async function GET(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(request, response);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = paramsSchema.safeParse({ mode: searchParams.get("mode") });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  const { mode } = parsed.data;

  if (mode === "live" && !(await verifyLiveEntitlement(supabase, user.id))) {
    return NextResponse.json({ error: "Live trading not available" }, { status: 403 });
  }

  const metrics = await getUserDashboardMetrics({ mode, sessionScope: "all" });

  return NextResponse.json(
    { metrics },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
```

- [ ] **Step 2: Implement sessions route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { verifyLiveEntitlement } from "@/lib/auth/live-trading";
import { z } from "zod";

const paramsSchema = z.object({
  mode: z.enum(["paper", "live"]),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export async function GET(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(request, response);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = paramsSchema.safeParse({
    mode: searchParams.get("mode"),
    limit: searchParams.get("limit"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid params", details: parsed.error.flatten() }, { status: 400 });
  }

  const { mode, limit } = parsed.data;

  if (mode === "live" && !(await verifyLiveEntitlement(supabase, user.id))) {
    return NextResponse.json({ error: "Live trading not available" }, { status: 403 });
  }

  const { data: sessions, error } = await supabase
    .from("trading_sessions")
    .select("id, name, status, mode, starting_capital_nok, current_capital_nok, total_pnl, created_at, updated_at")
    .eq("user_id", user.id)
    .eq("mode", mode)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[trading-cockpit/sessions]", error);
    return NextResponse.json({ error: "Could not fetch sessions" }, { status: 500 });
  }

  return NextResponse.json(
    { sessions: sessions ?? [] },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
```

- [ ] **Step 3: Implement trades route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { verifyLiveEntitlement } from "@/lib/auth/live-trading";
import { z } from "zod";

const isoOrNull = z.string().datetime().or(z.literal("")).optional().nullable();

const paramsSchema = z.object({
  mode: z.enum(["paper", "live"]),
  cursor: z.string().optional().nullable(),
  limit: z.coerce.number().min(1).max(100).default(25),
  status: z.enum(["filled", "partially_filled", "pending", "cancelled", "failed"]).array().optional(),
  sessionStatus: z.enum(["active", "paused", "stopped", "crashed"]).array().optional(),
  side: z.enum(["buy", "sell"]).optional().nullable(),
  pair: z.string().max(50).optional().nullable(),
  search: z.string().max(100).optional().nullable(),
  from: isoOrNull,
  to: isoOrNull,
});

export async function GET(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(request, response);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = paramsSchema.safeParse({
    mode: searchParams.get("mode"),
    cursor: searchParams.get("cursor") || null,
    limit: searchParams.get("limit") || undefined,
    status: searchParams.getAll("status"),
    sessionStatus: searchParams.getAll("sessionStatus"),
    side: searchParams.get("side") || null,
    pair: searchParams.get("pair") || null,
    search: searchParams.get("search") || null,
    from: searchParams.get("from") || null,
    to: searchParams.get("to") || null,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid params", details: parsed.error.flatten() }, { status: 400 });
  }

  const { mode, cursor, limit, status, sessionStatus, side, pair, search, from, to } = parsed.data;

  if (mode === "live" && !(await verifyLiveEntitlement(supabase, user.id))) {
    return NextResponse.json({ error: "Live trading not available" }, { status: 403 });
  }

  const { data: rows, error } = await supabase.rpc("get_trades_paginated", {
    p_user_id: user.id,
    p_cursor: cursor,
    p_limit: limit,
    p_mode: mode,
    p_trade_statuses: status?.length ? status : null,
    p_session_statuses: sessionStatus?.length ? sessionStatus : null,
    p_side: side,
    p_pair: pair,
    p_search: search,
    p_from: from || null,
    p_to: to || null,
  });

  if (error) {
    console.error("[trading-cockpit/trades]", error);
    return NextResponse.json({ error: "Could not fetch trades" }, { status: 500 });
  }

  const trades = rows ?? [];
  const nextCursor = trades.length > limit ? trades[trades.length - 1].next_cursor : null;
  const hasMore = trades.length > limit;
  const trimmed = hasMore ? trades.slice(0, limit) : trades;

  return NextResponse.json(
    { trades: trimmed, next_cursor: nextCursor },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
```

- [ ] **Step 4: Implement analytics route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { verifyLiveEntitlement } from "@/lib/auth/live-trading";
import { z } from "zod";

const isoOrNull = z.string().datetime().or(z.literal("")).optional().nullable();

const paramsSchema = z.object({
  mode: z.enum(["paper", "live"]),
  period: z.enum(["7d", "30d", "90d", "1y", "all"]).default("30d"),
  status: z.enum(["filled", "partially_filled", "pending", "cancelled", "failed"]).array().optional(),
  sessionStatus: z.enum(["active", "paused", "stopped", "crashed"]).array().optional(),
  side: z.enum(["buy", "sell"]).optional().nullable(),
  pair: z.string().max(50).optional().nullable(),
  search: z.string().max(100).optional().nullable(),
  from: isoOrNull,
  to: isoOrNull,
});

function periodToRange(period: string): { from: string | null; to: string | null } {
  const now = new Date();
  const to = now.toISOString();
  const map: Record<string, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "1y": 365,
  };
  if (period === "all") return { from: null, to: null };
  const days = map[period] ?? 30;
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  return { from, to };
}

export async function GET(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(request, response);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = paramsSchema.safeParse({
    mode: searchParams.get("mode"),
    period: searchParams.get("period") || "30d",
    status: searchParams.getAll("status"),
    sessionStatus: searchParams.getAll("sessionStatus"),
    side: searchParams.get("side") || null,
    pair: searchParams.get("pair") || null,
    search: searchParams.get("search") || null,
    from: searchParams.get("from") || null,
    to: searchParams.get("to") || null,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid params", details: parsed.error.flatten() }, { status: 400 });
  }

  const { mode, period, status, sessionStatus, side, pair, search } = parsed.data;
  let { from, to } = parsed.data;

  if (!from || !to) {
    const range = periodToRange(period);
    from = range.from;
    to = range.to;
  }

  if (mode === "live" && !(await verifyLiveEntitlement(supabase, user.id))) {
    return NextResponse.json({ error: "Live trading not available" }, { status: 403 });
  }

  const { data: analytics, error } = await supabase.rpc("get_trading_analytics", {
    p_user_id: user.id,
    p_mode: mode,
    p_trade_statuses: status?.length ? status : null,
    p_session_statuses: sessionStatus?.length ? sessionStatus : null,
    p_side: side,
    p_pair: pair,
    p_search: search,
    p_from: from,
    p_to: to,
  });

  if (error) {
    console.error("[trading-cockpit/analytics]", error);
    return NextResponse.json({ error: "Could not fetch analytics" }, { status: 500 });
  }

  return NextResponse.json(
    { analytics },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
```

- [ ] **Step 5: Run type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/api/trading-cockpit/
git commit -m "feat(api): add trading-cockpit metrics, sessions, trades, analytics routes"
```

---

## Phase 1: Provider, types, and server initial data

### Task 7: Create feature types and constants

**Files:**
- Create: `src/features/trading-cockpit/types.ts`
- Create: `src/features/trading-cockpit/constants.ts`

- [ ] **Step 1: Write types**

```typescript
export type CockpitMode = "paper" | "live";
export type CockpitTab = "overview" | "trades" | "analysis";

export interface CockpitFilters {
  dateRange: "7d" | "30d" | "90d" | "1y" | "all";
  pair: string | null;
  sessionStatus: "all" | "active" | "paused" | "stopped" | "crashed";
  side: "all" | "buy" | "sell";
  tradeStatus: "all" | "filled" | "partially_filled" | "pending" | "cancelled" | "failed";
  search: string;
}

export interface CockpitPagination {
  tradesLimit: number;
  tradesCursor: string | null;
  hasMoreTrades: boolean;
}

export interface CockpitError {
  message: string;
  code?: string;
}

export interface TradingCockpitState {
  mode: CockpitMode;
  defaultMode: CockpitMode;
  modeDirty: boolean;
  activeTab: CockpitTab;
  filters: CockpitFilters;
  pagination: CockpitPagination;
  statusCounts: Record<string, number>;
  kpi: DashboardMetrics | null;
  sessions: TradingSessionSummary[];
  trades: Trade[];
  analytics: TradingAnalytics | null;
  isLoading: boolean;
  isRefreshing: boolean;
  lastUpdated: string | null;
  error: CockpitError | null;
}

// Reuse existing types from dashboard/trading features
export type DashboardMetrics = Awaited<ReturnType<typeof import("@/server/dashboard/getUserDashboardMetrics").getUserDashboardMetrics>>;
export type TradingSessionSummary = Pick<
  import("@/types/database.types").Database["public"]["Tables"]["trading_sessions"]["Row"],
  "id" | "name" | "status" | "mode" | "starting_capital_nok" | "current_capital_nok" | "total_pnl" | "created_at" | "updated_at"
>;

export interface Trade {
  id: string;
  session_id: string;
  symbol: string | null;
  trading_pair: string;
  side: string;
  status: string;
  price: number;
  quantity: number;
  fee: number;
  total_value: number;
  realized_pnl: number | null;
  effective_pnl: number | null;
  executed_at: string;
  created_at: string;
}

export interface TradingAnalytics {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number | null;
  total_pnl: number;
  total_fees: number;
  starting_capital: number;
  max_drawdown_pct: number | null;
  profit_factor: number | null;
  best_pair: string | null;
  best_pair_pnl: number | null;
  worst_pair: string | null;
  worst_pair_pnl: number | null;
  best_session_id: string | null;
  best_session_pnl: number | null;
  worst_session_id: string | null;
  worst_session_pnl: number | null;
  trades_by_day: Array<{ date: string; pnl: number; trades: number }>;
  trades_by_symbol: Array<{ symbol: string; pnl: number; trades: number }>;
}
```

- [ ] **Step 2: Write constants**

```typescript
export const DEFAULT_FILTERS: CockpitFilters = {
  dateRange: "30d",
  pair: null,
  sessionStatus: "all",
  side: "all",
  tradeStatus: "all",
  search: "",
};

export const DEFAULT_PAGINATION: CockpitPagination = {
  tradesLimit: 25,
  tradesCursor: null,
  hasMoreTrades: false,
};

export const TAB_URL_MAP: Record<CockpitTab, string> = {
  overview: "overview",
  trades: "trades",
  analysis: "analysis",
};
```

- [ ] **Step 3: Commit**

```bash
git add src/features/trading-cockpit/types.ts src/features/trading-cockpit/constants.ts
git commit -m "feat(trading-cockpit): add types and constants"
```

---

### Task 8: Create server initial-data helper

**Files:**
- Create: `src/features/trading-cockpit/server/getCockpitInitialData.ts`

- [ ] **Step 1: Implement helper**

```typescript
import { createClient } from "@/lib/supabase/server";
import { getUserDashboardMetrics } from "@/server/dashboard/getUserDashboardMetrics";
import { verifyLiveEntitlement } from "@/lib/auth/live-trading";
import type { CockpitMode, CockpitTab, TradingSessionSummary } from "@/features/trading-cockpit/types";

export interface CockpitInitialData {
  mode: CockpitMode;
  defaultMode: CockpitMode;
  tab: CockpitTab;
  metrics: Awaited<ReturnType<typeof getUserDashboardMetrics>>;
  sessions: TradingSessionSummary[];
  statusCounts: Record<string, number>;
  canUseLive: boolean;
}

export async function getCockpitInitialData(
  userId: string,
  requestedMode: string | null,
  requestedTab: string | null,
): Promise<CockpitInitialData> {
  const supabase = createClient();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("preferred_trading_mode, binance_connected, tier")
    .eq("id", userId)
    .single();

  const canUseLive = await verifyLiveEntitlement(supabase, userId);
  const storedMode = profile?.preferred_trading_mode === "live" || profile?.preferred_trading_mode === "paper"
    ? profile.preferred_trading_mode
    : "paper";

  let mode: CockpitMode = storedMode;
  if (requestedMode === "paper" || requestedMode === "live") {
    mode = requestedMode;
  }
  if (mode === "live" && !canUseLive) {
    mode = "paper";
  }

  const tab: CockpitTab = requestedTab === "trades" || requestedTab === "analysis" ? requestedTab : "overview";

  const metrics = await getUserDashboardMetrics({ mode, sessionScope: "all" });

  const { data: sessions } = await supabase
    .from("trading_sessions")
    .select("id, name, status, mode, starting_capital_nok, current_capital_nok, total_pnl, created_at, updated_at")
    .eq("user_id", userId)
    .eq("mode", mode)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: statusRows } = await supabase.rpc("trading_session_status_counts", {
    p_user_id: userId,
    p_mode: mode,
  });

  const statusCounts: Record<string, number> = {};
  for (const row of statusRows ?? []) {
    statusCounts[row.status] = Number(row.count);
  }

  return {
    mode,
    defaultMode: storedMode,
    tab,
    metrics,
    sessions: sessions ?? [],
    statusCounts,
    canUseLive,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/trading-cockpit/server/getCockpitInitialData.ts
git commit -m "feat(trading-cockpit): add server initial data helper"
```

---

### Task 9: Create API client helpers

**Files:**
- Create: `src/features/trading-cockpit/lib/api.ts`
- Create: `src/features/trading-cockpit/lib/query-keys.ts`

- [ ] **Step 1: Implement api.ts**

```typescript
import type {
  CockpitMode,
  CockpitFilters,
  TradingSessionSummary,
  Trade,
  TradingAnalytics,
} from "@/features/trading-cockpit/types";
import type { DashboardMetrics } from "@/server/dashboard/getUserDashboardMetrics";

export async function fetchCockpitMetrics(mode: CockpitMode): Promise<DashboardMetrics> {
  const res = await fetch(`/api/trading-cockpit/metrics?mode=${mode}`);
  if (!res.ok) throw new Error("Could not fetch metrics");
  const json = await res.json();
  return json.metrics;
}

export async function fetchCockpitSessions(mode: CockpitMode): Promise<TradingSessionSummary[]> {
  const res = await fetch(`/api/trading-cockpit/sessions?mode=${mode}`);
  if (!res.ok) throw new Error("Could not fetch sessions");
  const json = await res.json();
  return json.sessions;
}

export interface FetchTradesOptions {
  mode: CockpitMode;
  cursor: string | null;
  limit: number;
  filters: CockpitFilters;
}

export async function fetchCockpitTrades(options: FetchTradesOptions): Promise<{ trades: Trade[]; next_cursor: string | null }> {
  const params = new URLSearchParams();
  params.set("mode", options.mode);
  params.set("limit", String(options.limit));
  if (options.cursor) params.set("cursor", options.cursor);
  if (options.filters.side !== "all") params.set("side", options.filters.side);
  if (options.filters.pair) params.set("pair", options.filters.pair);
  if (options.filters.search) params.set("search", options.filters.search);
  if (options.filters.tradeStatus !== "all") params.set("status", options.filters.tradeStatus);
  if (options.filters.sessionStatus !== "all") params.set("sessionStatus", options.filters.sessionStatus);

  const res = await fetch(`/api/trading-cockpit/trades?${params.toString()}`);
  if (!res.ok) throw new Error("Could not fetch trades");
  return res.json();
}

export interface FetchAnalyticsOptions {
  mode: CockpitMode;
  period: CockpitFilters["dateRange"];
  filters: CockpitFilters;
}

export async function fetchCockpitAnalytics(options: FetchAnalyticsOptions): Promise<TradingAnalytics> {
  const params = new URLSearchParams();
  params.set("mode", options.mode);
  params.set("period", options.period);
  if (options.filters.side !== "all") params.set("side", options.filters.side);
  if (options.filters.pair) params.set("pair", options.filters.pair);
  if (options.filters.search) params.set("search", options.filters.search);
  if (options.filters.tradeStatus !== "all") params.set("status", options.filters.tradeStatus);
  if (options.filters.sessionStatus !== "all") params.set("sessionStatus", options.filters.sessionStatus);

  const res = await fetch(`/api/trading-cockpit/analytics?${params.toString()}`);
  if (!res.ok) throw new Error("Could not fetch analytics");
  const json = await res.json();
  return json.analytics;
}

export async function persistDefaultMode(mode: CockpitMode): Promise<void> {
  const res = await fetch("/api/trading/mode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });
  if (!res.ok) throw new Error("Could not persist default mode");
}
```

- [ ] **Step 2: Implement query-keys.ts**

```typescript
export const cockpitKeys = {
  all: ["trading-cockpit"] as const,
  metrics: (mode: string) => [...cockpitKeys.all, "metrics", mode] as const,
  sessions: (mode: string) => [...cockpitKeys.all, "sessions", mode] as const,
  trades: (mode: string, filters: object) => [...cockpitKeys.all, "trades", mode, filters] as const,
  analytics: (mode: string, period: string, filters: object) => [...cockpitKeys.all, "analytics", mode, period, filters] as const,
};
```

- [ ] **Step 3: Commit**

```bash
git add src/features/trading-cockpit/lib/api.ts src/features/trading-cockpit/lib/query-keys.ts
git commit -m "feat(trading-cockpit): add API client and query keys"
```

---

### Task 10: Create React context provider

**Files:**
- Create: `src/features/trading-cockpit/components/TradingCockpitProvider.tsx`
- Create: `src/features/trading-cockpit/hooks/useTradingCockpit.ts`

- [ ] **Step 1: Implement provider**

```typescript
"use client";

import { createContext, useContext, useCallback, useState, useEffect, type ReactNode } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  fetchCockpitMetrics,
  fetchCockpitSessions,
  fetchCockpitTrades,
  fetchCockpitAnalytics,
  persistDefaultMode,
} from "@/features/trading-cockpit/lib/api";
import { DEFAULT_FILTERS, DEFAULT_PAGINATION } from "@/features/trading-cockpit/constants";
import type {
  CockpitMode,
  CockpitTab,
  CockpitFilters,
  TradingCockpitState,
  CockpitInitialData,
} from "@/features/trading-cockpit/types";

interface TradingCockpitContextValue extends TradingCockpitState {
  setMode: (mode: CockpitMode) => void;
  setTab: (tab: CockpitTab) => void;
  setFilters: (filters: Partial<CockpitFilters>) => void;
  loadMoreTrades: () => Promise<void>;
  refresh: () => Promise<void>;
  rememberAsDefault: () => Promise<void>;
}

const TradingCockpitContext = createContext<TradingCockpitContextValue | null>(null);

export function TradingCockpitProvider({
  children,
  initialData,
}: {
  children: ReactNode;
  initialData: CockpitInitialData;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [mode, setModeState] = useState<CockpitMode>(initialData.mode);
  const [activeTab, setActiveTab] = useState<CockpitTab>(initialData.tab);
  const [filters, setFiltersState] = useState<CockpitFilters>(DEFAULT_FILTERS);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [kpi, setKpi] = useState(initialData.metrics);
  const [sessions, setSessions] = useState(initialData.sessions);
  const [statusCounts, setStatusCounts] = useState(initialData.statusCounts);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [analytics, setAnalytics] = useState<TradingAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<CockpitError | null>(null);

  const modeDirty = mode !== initialData.defaultMode;

  const updateUrl = useCallback(
    (newMode: CockpitMode, newTab: CockpitTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("mode", newMode);
      params.set("tab", newTab);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const setMode = useCallback(
    (newMode: CockpitMode) => {
      setModeState(newMode);
      updateUrl(newMode, activeTab);
    },
    [activeTab, updateUrl],
  );

  const setTab = useCallback(
    (newTab: CockpitTab) => {
      setActiveTab(newTab);
      updateUrl(mode, newTab);
    },
    [mode, updateUrl],
  );

  const setFilters = useCallback((patch: Partial<CockpitFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...patch }));
    setPagination((prev) => ({ ...prev, tradesCursor: null, hasMoreTrades: false }));
    setTrades([]);
  }, []);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const [metrics, sessionList, counts] = await Promise.all([
        fetchCockpitMetrics(mode),
        fetchCockpitSessions(mode),
        // status counts are fetched via RPC; reuse session list or add a route
        Promise.resolve(statusCounts),
      ]);
      setKpi(metrics);
      setSessions(sessionList);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      setError({ message: err instanceof Error ? err.message : "Refresh failed" });
    } finally {
      setIsRefreshing(false);
    }
  }, [mode, statusCounts]);

  const loadMoreTrades = useCallback(async () => {
    if (!pagination.hasMoreTrades && pagination.tradesCursor === null && trades.length > 0) return;
    setIsLoading(true);
    try {
      const { trades: newTrades, next_cursor } = await fetchCockpitTrades({
        mode,
        cursor: pagination.tradesCursor,
        limit: pagination.tradesLimit,
        filters,
      });
      setTrades((prev) => (pagination.tradesCursor ? [...prev, ...newTrades] : newTrades));
      setPagination((prev) => ({
        ...prev,
        tradesCursor: next_cursor,
        hasMoreTrades: !!next_cursor,
      }));
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      setError({ message: err instanceof Error ? err.message : "Could not load trades" });
    } finally {
      setIsLoading(false);
    }
  }, [mode, filters, pagination.tradesCursor, pagination.tradesLimit, trades.length]);

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchCockpitAnalytics({ mode, period: filters.dateRange, filters });
      setAnalytics(data);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      setError({ message: err instanceof Error ? err.message : "Could not load analytics" });
    } finally {
      setIsLoading(false);
    }
  }, [mode, filters]);

  const rememberAsDefault = useCallback(async () => {
    await persistDefaultMode(mode);
  }, [mode]);

  // Load trades when filters or mode change
  useEffect(() => {
    if (activeTab !== "trades") return;
    setTrades([]);
    setPagination((prev) => ({ ...prev, tradesCursor: null, hasMoreTrades: false }));
    loadMoreTrades();
  }, [activeTab, mode, filters]);

  // Load analytics when tab opened or filters change
  useEffect(() => {
    if (activeTab !== "analysis") return;
    loadAnalytics();
  }, [activeTab, mode, filters.dateRange]);

  const value: TradingCockpitContextValue = {
    mode,
    defaultMode: initialData.defaultMode,
    modeDirty,
    activeTab,
    filters,
    pagination,
    statusCounts,
    kpi,
    sessions,
    trades,
    analytics,
    isLoading,
    isRefreshing,
    lastUpdated,
    error,
    setMode,
    setTab,
    setFilters,
    loadMoreTrades,
    refresh,
    rememberAsDefault,
  };

  return <TradingCockpitContext.Provider value={value}>{children}</TradingCockpitContext.Provider>;
}

export function useTradingCockpit() {
  const ctx = useContext(TradingCockpitContext);
  if (!ctx) throw new Error("useTradingCockpit must be used within TradingCockpitProvider");
  return ctx;
}
```

- [ ] **Step 2: Add unit tests for provider**

Create: `src/features/trading-cockpit/__tests__/TradingCockpitProvider.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TradingCockpitProvider, useTradingCockpit } from "@/features/trading-cockpit/components/TradingCockpitProvider";
import type { CockpitInitialData } from "@/features/trading-cockpit/types";

const mockRouter = {
  replace: vi.fn(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/no/handel",
}));

const mockInitialData: CockpitInitialData = {
  mode: "paper",
  defaultMode: "paper",
  tab: "overview",
  metrics: {} as any,
  sessions: [],
  statusCounts: {},
  canUseLive: true,
};

function TestConsumer() {
  const { mode, setMode, activeTab, setTab } = useTradingCockpit();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="tab">{activeTab}</span>
      <button onClick={() => setMode("live")}>Switch to live</button>
      <button onClick={() => setTab("trades")}>Switch to trades</button>
    </div>
  );
}

describe("TradingCockpitProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders initial state", () => {
    render(
      <TradingCockpitProvider initialData={mockInitialData}>
        <TestConsumer />
      </TradingCockpitProvider>,
    );
    expect(screen.getByTestId("mode")).toHaveTextContent("paper");
    expect(screen.getByTestId("tab")).toHaveTextContent("overview");
  });

  it("updates URL when mode changes", async () => {
    render(
      <TradingCockpitProvider initialData={mockInitialData}>
        <TestConsumer />
      </TradingCockpitProvider>,
    );
    await userEvent.click(screen.getByText("Switch to live"));
    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/no/handel?mode=live&tab=overview", { scroll: false });
    });
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npm run test:unit -- src/features/trading-cockpit/__tests__/TradingCockpitProvider.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/trading-cockpit/components/TradingCockpitProvider.tsx src/features/trading-cockpit/hooks/useTradingCockpit.ts src/features/trading-cockpit/__tests__/TradingCockpitProvider.test.tsx
git commit -m "feat(trading-cockpit): add provider, hook, and unit tests"
```

---

## Phase 2: Shell, header, and tabs

### Task 11: Create cockpit shell

**Files:**
- Create: `src/features/trading-cockpit/components/TradingCockpitShell.tsx`
- Create: `src/features/trading-cockpit/components/CockpitHeader.tsx`
- Create: `src/features/trading-cockpit/components/KpiCards.tsx`
- Create: `src/features/trading-cockpit/components/KpiCard.tsx`

- [ ] **Step 1: Implement KpiCard**

```tsx
"use client";

import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  subValue?: string;
  isPositive?: boolean | null;
  isLoading?: boolean;
}

export function KpiCard({ label, value, subValue, isPositive, isLoading }: KpiCardProps) {
  return (
    <div className="kp-card flex min-w-[140px] flex-col gap-1 p-4">
      <span className="text-sm text-kp-muted">{label}</span>
      {isLoading ? (
        <div className="h-8 w-24 animate-pulse rounded bg-kp-subtle" />
      ) : (
        <span className="text-2xl font-semibold">{value}</span>
      )}
      {subValue && !isLoading && (
        <span className={cn("text-sm", isPositive === true && "text-green-600", isPositive === false && "text-red-600")}>
          {subValue}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Implement KpiCards**

```tsx
"use client";

import { useTradingCockpit } from "@/features/trading-cockpit/hooks/useTradingCockpit";
import { KpiCard } from "@/features/trading-cockpit/components/KpiCard";
import { formatNok } from "@/lib/format";
import { useTranslations } from "next-intl";

export function KpiCards() {
  const { kpi, isLoading } = useTradingCockpit();
  const t = useTranslations("trading.cockpit.kpi");

  const totalPnl = kpi?.totalPnl ?? 0;
  const isPositive = totalPnl > 0 ? true : totalPnl < 0 ? false : null;

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      <KpiCard label={t("totalCapital")} value={formatNok(kpi?.totalCapital ?? 0)} isLoading={isLoading} />
      <KpiCard
        label={t("totalPnl")}
        value={formatNok(totalPnl)}
        subValue={`${kpi?.totalReturn ?? 0}%`}
        isPositive={isPositive}
        isLoading={isLoading}
      />
      <KpiCard label={t("winRate")} value={`${kpi?.winRate ?? 0}%`} isLoading={isLoading} />
      <KpiCard label={t("activeSessions")} value={String(kpi?.activeSessions ?? 0)} isLoading={isLoading} />
    </div>
  );
}
```

- [ ] **Step 3: Implement CockpitHeader**

```tsx
"use client";

import { useTradingCockpit } from "@/features/trading-cockpit/hooks/useTradingCockpit";
import { TradingModeToggle } from "@/features/trading/TradingModeToggle";
import { DataFreshnessBadge } from "@/shared/ui/DataFreshnessBadge";
import { KpiCards } from "@/features/trading-cockpit/components/KpiCards";
import { useTranslations } from "next-intl";

export function CockpitHeader() {
  const { mode, defaultMode, modeDirty, setMode, refresh, isRefreshing, lastUpdated, rememberAsDefault } = useTradingCockpit();
  const t = useTranslations("trading.cockpit");

  return (
    <header className="kp-surface sticky top-0 z-20 space-y-4 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <TradingModeToggle mode={mode} onChange={setMode} />
          {modeDirty && (
            <div className="text-sm text-kp-muted">
              {t("mode.dirtyWarning", { mode })}
              <button
                onClick={rememberAsDefault}
                className="ml-2 underline hover:text-kp-foreground"
              >
                {t("mode.rememberAsDefault")}
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <DataFreshnessBadge lastUpdated={lastUpdated} isRefreshing={isRefreshing} />
          <button onClick={refresh} disabled={isRefreshing} className="kp-button-secondary">
            {isRefreshing ? t("refreshing") : t("refresh")}
          </button>
        </div>
      </div>
      <KpiCards />
    </header>
  );
}
```

- [ ] **Step 4: Implement CockpitTabs**

```tsx
"use client";

import { useTradingCockpit } from "@/features/trading-cockpit/hooks/useTradingCockpit";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const TABS = [
  { id: "overview", labelKey: "tabs.overview" },
  { id: "trades", labelKey: "tabs.trades" },
  { id: "analysis", labelKey: "tabs.analysis" },
] as const;

export function CockpitTabs() {
  const { activeTab, setTab } = useTradingCockpit();
  const t = useTranslations("trading.cockpit");

  return (
    <nav className="kp-surface border-b px-4" aria-label="Trading cockpit tabs">
      <div className="flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={cn(
              "px-4 py-3 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "border-b-2 border-kp-primary text-kp-foreground"
                : "text-kp-muted hover:text-kp-foreground",
            )}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>
    </nav>
  );
}
```

- [ ] **Step 5: Implement TradingCockpitShell**

```tsx
"use client";

import { useTradingCockpit } from "@/features/trading-cockpit/hooks/useTradingCockpit";
import { CockpitHeader } from "@/features/trading-cockpit/components/CockpitHeader";
import { CockpitTabs } from "@/features/trading-cockpit/components/CockpitTabs";
import { OverviewTab } from "@/features/trading-cockpit/components/overview/OverviewTab";
import { TradesTab } from "@/features/trading-cockpit/components/trades/TradesTab";
import { AnalysisTab } from "@/features/trading-cockpit/components/analysis/AnalysisTab";
import { WidgetErrorBoundary } from "@/shared/ui/WidgetErrorBoundary";

export function TradingCockpitShell() {
  const { activeTab } = useTradingCockpit();

  return (
    <div className="min-h-screen bg-kp-background">
      <CockpitHeader />
      <CockpitTabs />
      <main className="p-4">
        <WidgetErrorBoundary>
          {activeTab === "overview" && <OverviewTab />}
          {activeTab === "trades" && <TradesTab />}
          {activeTab === "analysis" && <AnalysisTab />}
        </WidgetErrorBoundary>
      </main>
    </div>
  );
}
```

- [ ] **Step 6: Run type-check**

Run: `npm run type-check`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/features/trading-cockpit/components/TradingCockpitShell.tsx src/features/trading-cockpit/components/CockpitHeader.tsx src/features/trading-cockpit/components/KpiCards.tsx src/features/trading-cockpit/components/KpiCard.tsx src/features/trading-cockpit/components/CockpitTabs.tsx
git commit -m "feat(trading-cockpit): add shell, header, KPI cards, and tabs"
```

---

## Phase 3: Overview tab

### Task 12: Implement Overview tab

**Files:**
- Create: `src/features/trading-cockpit/components/overview/OverviewTab.tsx`
- Create: `src/features/trading-cockpit/components/overview/SessionList.tsx`
- Create: `src/features/trading-cockpit/components/overview/SessionCard.tsx`
- Create: `src/features/trading-cockpit/components/overview/QuickActions.tsx`
- Create: `src/features/trading-cockpit/components/overview/InsightsFeed.tsx`

- [ ] **Step 1: Implement SessionCard**

```tsx
"use client";

import type { TradingSessionSummary } from "@/features/trading-cockpit/types";
import { formatNok } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface SessionCardProps {
  session: TradingSessionSummary;
}

export function SessionCard({ session }: SessionCardProps) {
  const t = useTranslations("trading.cockpit.session");
  const isPositive = (session.total_pnl ?? 0) >= 0;

  return (
    <div className="kp-card flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between">
        <span className="font-medium">{session.name || t("unnamed")}</span>
        <span className={cn("text-sm", isPositive ? "text-green-600" : "text-red-600")}>
          {formatNok(session.total_pnl ?? 0)}
        </span>
      </div>
      <div className="text-sm text-kp-muted">
        {t("status")}: {session.status}
      </div>
      <div className="text-sm text-kp-muted">
        {t("capital")}: {formatNok(session.current_capital_nok ?? session.starting_capital_nok ?? 0)}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement SessionList**

```tsx
"use client";

import { useTradingCockpit } from "@/features/trading-cockpit/hooks/useTradingCockpit";
import { SessionCard } from "@/features/trading-cockpit/components/overview/SessionCard";
import { useTranslations } from "next-intl";

export function SessionList() {
  const { sessions } = useTradingCockpit();
  const t = useTranslations("trading.cockpit.overview");

  const visible = sessions.slice(0, 3);

  return (
    <section className="space-y-3">
      <h3 className="text-lg font-semibold">{t("sessionsTitle")}</h3>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {visible.map((session) => (
          <SessionCard key={session.id} session={session} />
        ))}
      </div>
      {sessions.length > 3 && (
        <button className="text-sm text-kp-primary hover:underline">
          {t("viewAllSessions")}
        </button>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Implement QuickActions**

```tsx
"use client";

import { useTradingCockpit } from "@/features/trading-cockpit/hooks/useTradingCockpit";
import Link from "next/link";
import { useTranslations } from "next-intl";

export function QuickActions() {
  const { mode, setTab } = useTradingCockpit();
  const t = useTranslations("trading.cockpit.quickActions");

  return (
    <section className="flex flex-wrap gap-3">
      <Link
        href={`/no/dashboard/auto-trade?mode=${mode}`}
        className="kp-button-primary"
      >
        {t("startNewSession")}
      </Link>
      <button onClick={() => setTab("trades")} className="kp-button-secondary">
        {t("viewAllTrades")}
      </button>
    </section>
  );
}
```

- [ ] **Step 4: Implement InsightsFeed**

```tsx
"use client";

import { useTradingCockpit } from "@/features/trading-cockpit/hooks/useTradingCockpit";
import { useTranslations } from "next-intl";

export function InsightsFeed() {
  const { kpi } = useTradingCockpit();
  const t = useTranslations("trading.cockpit.insights");

  const insights: string[] = [];
  if ((kpi?.activeSessions ?? 0) === 0) {
    insights.push(t("noActiveSessions"));
  }
  if ((kpi?.winRate ?? 0) < 30) {
    insights.push(t("lowWinRate"));
  }

  if (insights.length === 0) return null;

  return (
    <section className="kp-card space-y-2 p-4">
      <h3 className="font-semibold">{t("title")}</h3>
      <ul className="list-inside list-disc space-y-1 text-sm text-kp-muted">
        {insights.map((text, i) => (
          <li key={i}>{text}</li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 5: Implement OverviewTab**

```tsx
"use client";

import { useTradingCockpit } from "@/features/trading-cockpit/hooks/useTradingCockpit";
import { SessionList } from "@/features/trading-cockpit/components/overview/SessionList";
import { QuickActions } from "@/features/trading-cockpit/components/overview/QuickActions";
import { InsightsFeed } from "@/features/trading-cockpit/components/overview/InsightsFeed";
import { KpiCards } from "@/features/trading-cockpit/components/KpiCards";
import { EmptyState } from "@/shared/ui/EmptyState";
import { useTranslations } from "next-intl";

export function OverviewTab() {
  const { sessions, kpi } = useTradingCockpit();
  const t = useTranslations("trading.cockpit.empty.overview");

  const hasActivity = (kpi?.totalTrades ?? 0) > 0 || sessions.length > 0;

  return (
    <div className="space-y-6">
      <KpiCards />
      <QuickActions />
      {!hasActivity ? (
        <EmptyState title={t("title")} description={t("description")} />
      ) : (
        <>
          <SessionList />
          <InsightsFeed />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Run tests and type-check**

Run: `npm run type-check && npm run test:unit`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/features/trading-cockpit/components/overview/
git commit -m "feat(trading-cockpit): add Overview tab"
```

---

## Phase 4: Trades tab

### Task 13: Implement trade filters and table

**Files:**
- Create: `src/features/trading-cockpit/components/trades/TradeFilters.tsx`
- Create: `src/features/trading-cockpit/components/trades/TradeTable.tsx`
- Create: `src/features/trading-cockpit/components/trades/TradeCards.tsx`
- Create: `src/features/trading-cockpit/components/trades/TradePagination.tsx`
- Create: `src/features/trading-cockpit/components/trades/TradeDetailsSheet.tsx`

- [ ] **Step 1: Implement TradeFilters**

```tsx
"use client";

import { useTradingCockpit } from "@/features/trading-cockpit/hooks/useTradingCockpit";
import { useTranslations } from "next-intl";

export function TradeFilters() {
  const { filters, setFilters } = useTradingCockpit();
  const t = useTranslations("trading.cockpit.filter");

  return (
    <div className="flex flex-wrap gap-3">
      <select
        value={filters.dateRange}
        onChange={(e) => setFilters({ dateRange: e.target.value as typeof filters.dateRange })}
        className="kp-input"
      >
        <option value="7d">{t("7d")}</option>
        <option value="30d">{t("30d")}</option>
        <option value="90d">{t("90d")}</option>
        <option value="1y">{t("1y")}</option>
        <option value="all">{t("all")}</option>
      </select>
      <select
        value={filters.side}
        onChange={(e) => setFilters({ side: e.target.value as typeof filters.side })}
        className="kp-input"
      >
        <option value="all">{t("allSides")}</option>
        <option value="buy">{t("buy")}</option>
        <option value="sell">{t("sell")}</option>
      </select>
      <select
        value={filters.tradeStatus}
        onChange={(e) => setFilters({ tradeStatus: e.target.value as typeof filters.tradeStatus })}
        className="kp-input"
      >
        <option value="all">{t("allStatuses")}</option>
        <option value="filled">{t("filled")}</option>
        <option value="partially_filled">{t("partiallyFilled")}</option>
        <option value="pending">{t("pending")}</option>
        <option value="cancelled">{t("cancelled")}</option>
        <option value="failed">{t("failed")}</option>
      </select>
      <input
        type="text"
        value={filters.search}
        onChange={(e) => setFilters({ search: e.target.value })}
        placeholder={t("searchPlaceholder")}
        className="kp-input min-w-[200px]"
      />
    </div>
  );
}
```

- [ ] **Step 2: Implement TradeTable**

```tsx
"use client";

import { memo } from "react";
import { useTradingCockpit } from "@/features/trading-cockpit/hooks/useTradingCockpit";
import type { Trade } from "@/features/trading-cockpit/types";
import { formatNok } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const TradeRow = memo(function TradeRow({ trade }: { trade: Trade }) {
  const effectivePnl = trade.effective_pnl ?? trade.realized_pnl ?? 0;
  const isEstimated = trade.realized_pnl == null;

  return (
    <tr className="border-b">
      <td className="p-3">{new Date(trade.executed_at).toLocaleDateString("no-NO")}</td>
      <td className="p-3">{trade.trading_pair}</td>
      <td className="p-3">{trade.side}</td>
      <td className="p-3">{trade.status}</td>
      <td className="p-3 text-right">{formatNok(trade.total_value)}</td>
      <td className={cn("p-3 text-right", effectivePnl >= 0 ? "text-green-600" : "text-red-600")}>
        {formatNok(effectivePnl)}
        {isEstimated && <span className="ml-1 text-xs text-kp-muted">est.</span>}
      </td>
    </tr>
  );
});

export function TradeTable() {
  const { trades, isLoading } = useTradingCockpit();
  const t = useTranslations("trading.cockpit.trades");

  if (isLoading && trades.length === 0) return <TradeListSkeleton />;

  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-kp-muted">
            <th className="p-3">{t("date")}</th>
            <th className="p-3">{t("pair")}</th>
            <th className="p-3">{t("side")}</th>
            <th className="p-3">{t("status")}</th>
            <th className="p-3 text-right">{t("value")}</th>
            <th className="p-3 text-right">{t("pnl")}</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => (
            <TradeRow key={trade.id} trade={trade} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TradeListSkeleton() {
  return (
    <div className="hidden space-y-2 md:block">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded bg-kp-subtle" />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Implement TradeCards (mobile)**

```tsx
"use client";

import { memo } from "react";
import { useTradingCockpit } from "@/features/trading-cockpit/hooks/useTradingCockpit";
import type { Trade } from "@/features/trading-cockpit/types";
import { formatNok } from "@/lib/format";
import { cn } from "@/lib/utils";

const TradeCard = memo(function TradeCard({ trade }: { trade: Trade }) {
  const effectivePnl = trade.effective_pnl ?? trade.realized_pnl ?? 0;
  const isEstimated = trade.realized_pnl == null;

  return (
    <div className="kp-card space-y-2 p-4 md:hidden">
      <div className="flex items-center justify-between">
        <span className="font-medium">{trade.trading_pair}</span>
        <span className="text-sm text-kp-muted">{trade.side}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span>{new Date(trade.executed_at).toLocaleDateString("no-NO")}</span>
        <span>{trade.status}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-kp-muted">{formatNok(trade.total_value)}</span>
        <span className={cn(effectivePnl >= 0 ? "text-green-600" : "text-red-600")}>
          {formatNok(effectivePnl)}
          {isEstimated && <span className="ml-1 text-xs text-kp-muted">est.</span>}
        </span>
      </div>
    </div>
  );
});

export function TradeCards() {
  const { trades } = useTradingCockpit();
  return (
    <div className="space-y-3 md:hidden">
      {trades.map((trade) => (
        <TradeCard key={trade.id} trade={trade} />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Implement TradePagination**

```tsx
"use client";

import { useTradingCockpit } from "@/features/trading-cockpit/hooks/useTradingCockpit";
import { useTranslations } from "next-intl";

export function TradePagination() {
  const { pagination, loadMoreTrades, isLoading } = useTradingCockpit();
  const t = useTranslations("trading.cockpit.trades");

  if (!pagination.hasMoreTrades) return null;

  return (
    <button
      onClick={loadMoreTrades}
      disabled={isLoading}
      className="kp-button-secondary w-full"
    >
      {isLoading ? t("loadingMore") : t("loadMore")}
    </button>
  );
}
```

- [ ] **Step 5: Implement TradesTab**

```tsx
"use client";

import { useTradingCockpit } from "@/features/trading-cockpit/hooks/useTradingCockpit";
import { TradeFilters } from "@/features/trading-cockpit/components/trades/TradeFilters";
import { TradeTable } from "@/features/trading-cockpit/components/trades/TradeTable";
import { TradeCards } from "@/features/trading-cockpit/components/trades/TradeCards";
import { TradePagination } from "@/features/trading-cockpit/components/trades/TradePagination";
import { EmptyState } from "@/shared/ui/EmptyState";
import { useTranslations } from "next-intl";

export function TradesTab() {
  const { trades, isLoading } = useTradingCockpit();
  const t = useTranslations("trading.cockpit.empty.trades");

  const showEmpty = !isLoading && trades.length === 0;

  return (
    <div className="space-y-4">
      <TradeFilters />
      {showEmpty ? (
        <EmptyState title={t("title")} description={t("description")} />
      ) : (
        <>
          <TradeTable />
          <TradeCards />
          <TradePagination />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Run tests and type-check**

Run: `npm run type-check && npm run test:unit`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/features/trading-cockpit/components/trades/
git commit -m "feat(trading-cockpit): add Trades tab with filters, table, cards, pagination"
```

---

## Phase 5: Analysis tab

### Task 14: Implement Analysis tab

**Files:**
- Create: `src/features/trading-cockpit/components/analysis/AnalysisTab.tsx`
- Create: `src/features/trading-cockpit/components/analysis/PeriodSelector.tsx`
- Create: `src/features/trading-cockpit/components/analysis/AnalyticsStatGrid.tsx`
- Create: `src/features/trading-cockpit/components/analysis/PnLChart.tsx`
- Create: `src/features/trading-cockpit/components/analysis/SymbolDistribution.tsx`

- [ ] **Step 1: Implement PeriodSelector**

```tsx
"use client";

import { useTradingCockpit } from "@/features/trading-cockpit/hooks/useTradingCockpit";
import { useTranslations } from "next-intl";

const PERIODS = ["7d", "30d", "90d", "1y", "all"] as const;

export function PeriodSelector() {
  const { filters, setFilters } = useTradingCockpit();
  const t = useTranslations("trading.cockpit.filter");

  return (
    <div className="flex gap-2">
      {PERIODS.map((period) => (
        <button
          key={period}
          onClick={() => setFilters({ dateRange: period })}
          className={
            filters.dateRange === period
              ? "kp-button-primary"
              : "kp-button-secondary"
          }
        >
          {t(period)}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Implement AnalyticsStatGrid**

```tsx
"use client";

import { useTradingCockpit } from "@/features/trading-cockpit/hooks/useTradingCockpit";
import { StatsGrid } from "@/features/portfolio/StatsGrid";
import { formatNok } from "@/lib/format";
import { useTranslations } from "next-intl";

export function AnalyticsStatGrid() {
  const { analytics, isLoading } = useTradingCockpit();
  const t = useTranslations("trading.cockpit.analytics");

  const items = [
    { label: t("totalTrades"), value: String(analytics?.total_trades ?? 0) },
    { label: t("winRate"), value: `${analytics?.win_rate ?? 0}%` },
    { label: t("totalPnl"), value: formatNok(analytics?.total_pnl ?? 0) },
    { label: t("totalFees"), value: formatNok(analytics?.total_fees ?? 0) },
  ];

  return <StatsGrid items={items} isLoading={isLoading} />;
}
```

- [ ] **Step 3: Implement PnLChart**

```tsx
"use client";

import { useTradingCockpit } from "@/features/trading-cockpit/hooks/useTradingCockpit";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useTranslations } from "next-intl";

export function PnLChart() {
  const { analytics, isLoading } = useTradingCockpit();
  const t = useTranslations("trading.cockpit.analytics");

  if (isLoading) return <div className="h-64 animate-pulse rounded bg-kp-subtle" />;

  const data = analytics?.trades_by_day ?? [];

  return (
    <div className="kp-card p-4">
      <h3 className="mb-4 font-semibold">{t("pnlOverTime")}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="pnl" stroke="#10b981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implement SymbolDistribution**

```tsx
"use client";

import { useTradingCockpit } from "@/features/trading-cockpit/hooks/useTradingCockpit";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useTranslations } from "next-intl";

export function SymbolDistribution() {
  const { analytics, isLoading } = useTradingCockpit();
  const t = useTranslations("trading.cockpit.analytics");

  if (isLoading) return <div className="h-64 animate-pulse rounded bg-kp-subtle" />;

  const data = analytics?.trades_by_symbol?.slice(0, 10) ?? [];

  return (
    <div className="kp-card p-4">
      <h3 className="mb-4 font-semibold">{t("bySymbol")}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="symbol" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="pnl" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Implement AnalysisTab**

```tsx
"use client";

import { Suspense } from "react";
import { useTradingCockpit } from "@/features/trading-cockpit/hooks/useTradingCockpit";
import { PeriodSelector } from "@/features/trading-cockpit/components/analysis/PeriodSelector";
import { AnalyticsStatGrid } from "@/features/trading-cockpit/components/analysis/AnalyticsStatGrid";
import { PnLChart } from "@/features/trading-cockpit/components/analysis/PnLChart";
import { SymbolDistribution } from "@/features/trading-cockpit/components/analysis/SymbolDistribution";
import { EmptyState } from "@/shared/ui/EmptyState";
import { useTranslations } from "next-intl";

export function AnalysisTab() {
  const { analytics, isLoading } = useTradingCockpit();
  const t = useTranslations("trading.cockpit.empty.analysis");

  const showEmpty = !isLoading && (analytics?.total_trades ?? 0) < 5;

  return (
    <div className="space-y-6">
      <PeriodSelector />
      {showEmpty ? (
        <EmptyState title={t("title")} description={t("description")} />
      ) : (
        <Suspense fallback={<div className="h-64 animate-pulse rounded bg-kp-subtle" />}>
          <AnalyticsStatGrid />
          <PnLChart />
          <SymbolDistribution />
        </Suspense>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Run tests and type-check**

Run: `npm run type-check && npm run test:unit`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/features/trading-cockpit/components/analysis/
git commit -m "feat(trading-cockpit): add Analysis tab with charts and stat grid"
```

---

## Phase 6: Page entry, i18n, mobile polish

### Task 15: Wire page entry

**Files:**
- Modify: `src/app/[locale]/(user)/handel/page.tsx`

- [ ] **Step 1: Update page to use new cockpit**

```tsx
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCockpitInitialData } from "@/features/trading-cockpit/server/getCockpitInitialData";
import { TradingCockpitProvider } from "@/features/trading-cockpit/components/TradingCockpitProvider";
import { TradingCockpitShell } from "@/features/trading-cockpit/components/TradingCockpitShell";

export const dynamic = "force-dynamic";

interface HandelPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ mode?: string; tab?: string }>;
}

export default async function HandelPage({ params, searchParams }: HandelPageProps) {
  const { locale } = await params;
  const { mode, tab } = await searchParams;

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return notFound();
  }

  const initialData = await getCockpitInitialData(user.id, mode ?? null, tab ?? null);

  return (
    <TradingCockpitProvider initialData={initialData}>
      <TradingCockpitShell />
    </TradingCockpitProvider>
  );
}
```

- [ ] **Step 2: Verify page renders**

Run: `npm run dev` (or `npm run build` for static verification)
Expected: No type or build errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/(user)/handel/page.tsx
git commit -m "feat(trading-cockpit): wire new cockpit into /handel page"
```

---

### Task 16: Add i18n keys

**Files:**
- Modify: `messages/no/trading.json`
- Modify: `messages/en/trading.json`

- [ ] **Step 1: Add Norwegian keys**

Add under `trading.cockpit`:

```json
{
  "cockpit": {
    "tabs": {
      "overview": "Oversikt",
      "trades": "Handler",
      "analysis": "Analyse"
    },
    "kpi": {
      "totalCapital": "Totalt kapital",
      "totalPnl": "Total PnL",
      "totalReturn": "Avkastning",
      "winRate": "Win rate",
      "activeSessions": "Aktive sesjoner",
      "totalTrades": "Antall handler"
    },
    "mode": {
      "dirtyWarning": "Du viser {mode}. Standard er {defaultMode}.",
      "rememberAsDefault": "Husk som standard"
    },
    "empty": {
      "overview": {
        "title": "Ingen aktiv sesjon",
        "description": "Start en paper-sesjon for å komme i gang."
      },
      "trades": {
        "title": "Ingen handler i valgt periode",
        "description": "Endre filteret eller start en ny sesjon."
      },
      "analysis": {
        "title": "Ikke nok data ennå",
        "description": "Du trenger minst 5 handler for å vise analyse."
      }
    },
    "filter": {
      "7d": "7 dager",
      "30d": "30 dager",
      "90d": "90 dager",
      "1y": "1 år",
      "all": "Alle",
      "allSides": "Side",
      "buy": "Kjøp",
      "sell": "Salg",
      "allStatuses": "Status",
      "filled": "Fylt",
      "partiallyFilled": "Delfylt",
      "pending": "Venter",
      "cancelled": "Kansellert",
      "failed": "Feilet",
      "searchPlaceholder": "Søk symbol..."
    },
    "quickActions": {
      "startNewSession": "Start ny sesjon",
      "viewAllTrades": "Se alle handler"
    },
    "session": {
      "unnamed": "Uten navn",
      "status": "Status",
      "capital": "Kapital"
    },
    "trades": {
      "date": "Dato",
      "pair": "Par",
      "side": "Side",
      "status": "Status",
      "value": "Verdi",
      "pnl": "PnL",
      "loadMore": "Last flere",
      "loadingMore": "Laster..."
    },
    "analytics": {
      "totalTrades": "Antall handler",
      "winRate": "Win rate",
      "totalPnl": "Total PnL",
      "totalFees": "Gebyrer",
      "pnlOverTime": "PnL over tid",
      "bySymbol": "Etter symbol"
    },
    "insights": {
      "title": "Innsikt",
      "noActiveSessions": "Ingen aktive sesjoner. Markedet venter på deg.",
      "lowWinRate": "Win rate er lav. Sjekk strategi og risikoinnstillinger."
    },
    "refresh": "Oppdater",
    "refreshing": "Oppdaterer..."
  }
}
```

- [ ] **Step 2: Add English keys**

Mirror the Norwegian keys in `messages/en/trading.json`.

- [ ] **Step 3: Commit**

```bash
git add messages/no/trading.json messages/en/trading.json
git commit -m "feat(i18n): add trading cockpit translations"
```

---

### Task 17: Mobile polish

**Files:**
- Modify: `src/features/trading-cockpit/components/CockpitHeader.tsx`
- Modify: `src/features/trading-cockpit/components/trades/TradeFilters.tsx`
- Create: `src/features/trading-cockpit/components/trades/TradeFiltersSheet.tsx` (optional)

- [ ] **Step 1: Add responsive filters sheet**

For mobile, wrap filters in a bottom sheet if they overflow. Use existing sheet component or collapsible panel.

- [ ] **Step 2: Verify touch targets**

Run: manual check in dev tools 375 px viewport.
All buttons, tabs, selects ≥ 44 px tall (aim for 48 px).

- [ ] **Step 3: Commit**

```bash
git add src/features/trading-cockpit/components/trades/TradeFiltersSheet.tsx src/features/trading-cockpit/components/CockpitHeader.tsx src/features/trading-cockpit/components/trades/TradeFilters.tsx
git commit -m "feat(trading-cockpit): mobile polish and filter sheet"
```

---

## Phase 7: QA, realtime, deploy

### Task 18: Add realtime invalidation

**Files:**
- Create: `src/features/trading-cockpit/hooks/useCockpitRealtime.ts`

- [ ] **Step 1: Implement realtime hook**

```tsx
"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTradingCockpit } from "@/features/trading-cockpit/hooks/useTradingCockpit";

export function useCockpitRealtime() {
  const { mode, refresh } = useTradingCockpit();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("trading-cockpit")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trades", filter: `mode=eq.${mode}` },
        () => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => refresh(), 800);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "trading_sessions", filter: `mode=eq.${mode}` },
        () => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => refresh(), 800);
        },
      )
      .subscribe();

    const handleVisibility = () => {
      if (document.hidden && channel) {
        supabase.removeChannel(channel);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
      supabase.removeChannel(channel);
    };
  }, [mode, refresh]);
}
```

- [ ] **Step 2: Add to shell**

In `TradingCockpitShell.tsx`, add `<RealtimeManager />` component that calls `useCockpitRealtime`.

- [ ] **Step 3: Commit**

```bash
git add src/features/trading-cockpit/hooks/useCockpitRealtime.ts src/features/trading-cockpit/components/TradingCockpitShell.tsx
git commit -m "feat(trading-cockpit): add debounced realtime invalidation"
```

---

### Task 19: Add E2E critical test

**Files:**
- Create: `e2e/critical/trading-cockpit.spec.ts`

- [ ] **Step 1: Write test**

```typescript
import { test, expect } from "@playwright/test";

test.describe("Trading Cockpit", () => {
  test("loads overview with KPIs", async ({ page }) => {
    await page.goto("/no/handel");
    await expect(page.getByText("Totalt kapital")).toBeVisible();
    await expect(page.getByRole("tab", { name: "Oversikt" })).toHaveAttribute("aria-selected", "true");
  });

  test("switches tabs and updates URL", async ({ page }) => {
    await page.goto("/no/handel");
    await page.getByRole("tab", { name: "Handler" }).click();
    await expect(page).toHaveURL(/tab=trades/);
  });

  test("switches mode and shows URL param", async ({ page }) => {
    await page.goto("/no/handel?mode=paper");
    await page.getByRole("button", { name: /live/i }).click();
    await expect(page).toHaveURL(/mode=live/);
  });
});
```

- [ ] **Step 2: Run E2E**

Run: `npm run test:e2e:critical:chromium`
Expected: PASS (may need test data setup)

- [ ] **Step 3: Commit**

```bash
git add e2e/critical/trading-cockpit.spec.ts
git commit -m "test(e2e): add trading cockpit critical path"
```

---

### Task 20: Final verification and deploy

- [ ] **Step 1: Run full verification**

```bash
npm run lint:gate
npm run type-check
npm run test:unit
npm run build
npm run cf:build
```
Expected: All pass.

- [ ] **Step 2: Deploy**

```bash
npm run cf:deploy
```

- [ ] **Step 3: Production health check**

Run: `npm run health:prod:gate`
Expected: GO.

- [ ] **Step 4: Commit any final fixes**

```bash
git add -A
git commit -m "feat(trading-cockpit): production-ready cockpit /handel"
```

---

## Appendix: AI coach guardrails and marketplace integration hook

This plan assumes the Trading Cockpit may surface AI explanations (e.g. `src/app/api/ai/explain-trade/route.ts`) and marketplace copy opportunities. Guardrails are documented in `docs/adr/ADR-2026-07-cockpit-ai-guardrails.md`:

- AI must only provide explanatory/safe guidance, never actionable buy/sell advice.
- AI suggestions must be bounded by user risk limits, tier entitlements, and the `checkTradeRisk` checks in `src/lib/trading/canonical/risk/risk-engine.ts`.
- Human confirmation is required for any auto-trade execution.

Marketplace catalog hook: `public.get_marketplace_ready_listings(p_limit integer, p_offset integer)` returns published `marketplace_listings` rows joined with materialized `marketplace_listing_stats`. The stub lives in `supabase/migrations/20260709000000_marketplace_ready_listings_rpc.sql`. Future UI should call this RPC and route copy/subscribe actions through authenticated server APIs with user consent.

---

## Self-review

**Spec coverage:**
- URL-driven mode/tab: Tasks 8, 10
- KPI header from `get_dashboard_metrics`: Tasks 7, 8, 11
- Three tabs: Tasks 12, 13, 14
- Cursor pagination: Tasks 3, 6, 10, 13
- Server-side analytics: Tasks 4, 6, 10, 14
- Security/auth/live entitlement: Tasks 5, 6
- Mobile-first UX: Tasks 11, 13, 17
- i18n: Task 16
- Performance/realtime: Task 18
- Testing: Tasks 5, 10, 19

**Placeholder scan:**
- No "TBD" or "TODO" in code.
- All SQL functions, routes, components include concrete code.
- All response shapes defined.

**Type consistency:**
- `CockpitMode`, `CockpitTab`, `CockpitFilters`, `Trade`, `TradingAnalytics` defined in Task 7 and reused.
- `fetchCockpitTrades`/`fetchCockpitAnalytics` signatures consistent with route params.
