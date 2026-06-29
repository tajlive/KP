# Trading Cockpit — Design Specification

> **Status:** Draft — pending review  
> **Date:** 2026-06-29  
> **Scope:** Rebuild `/handel` into a modern, premium Trading Cockpit with three tabs: Oversikt, Handler, Analyse. Risk Guard, Realism Mode, AI Coach and copy-trading cards are explicitly out of scope for this spec; they will be separate follow-up specs.

---

## 1. Background & Goal

Users currently see `/handel` as a confused mix of session lists and dashboard widgets. They cannot click a session to see its trades, analytics are hidden or computed from a limited `LIMIT 200` dataset, and the distinction between paper and live data is invisible.

**Goal:** Make `/handel` the single, authoritative Trading Cockpit where the user immediately understands:
- What is happening (KPIs, status, mode)
- Why it is happening (insights, analytics)
- What to check next (safe guidance, not investment advice)

---

## 2. User Stories

- As a user, I want to see all my trading activity in one place so I do not have to hunt between `/handel`, `/dashboard` and `/dashboard/historikk`.
- As a user, I want to click a session and see every trade inside it.
- As a user, I want to know whether the numbers I see are paper or live, and switch safely without changing my default preference by accident.
- As a user, I want to filter and paginate my trade history without arbitrary 200-row limits.
- As a user, I want analytics that are accurate and computed from all my data, not a small sample.
- As a user on mobile, I want the cockpit to feel native: big touch targets, bottom sheets, sticky headers, card-based lists.

---

## 3. Design Principles

1. **Single source of truth.** KPIs and analytics come from RPCs, not client-side loops over limited datasets.
2. **Mode is always visible.** Paper/Live state is shown in the header, on CTAs, and in URL state.
3. **Progressive disclosure.** KPIs first, then sessions/trades, then deep analytics.
4. **Safe guidance only.** No "buy" / "sell" advice. Use product guidance and risk reminders.
5. **Mobile-first but desktop-optimised.** Same information, adapted layout.
6. **Reuse existing system.** `kp-*` tokens, `TradingModeToggle`, `DataFreshnessBadge`, `WidgetErrorBoundary`, `StatsGrid`, `RecentTradesTable`, `EmptyState`.

---

## 4. Architecture

### 4.1 High-level flow

URL is the source of truth for both **mode** and **tab**:
```
/no/handel?mode=paper&tab=overview
```

If the URL omits `mode`, resolve in this order:
1. `user_profiles.preferred_trading_mode` if valid (`paper` or `live`) and live-entitled when `live`
2. `paper`

If the URL omits `tab`, default to `overview`.

```
/handel/page.tsx (Server Component, force-dynamic)
  └─ getCockpitInitialData({ userId, mode, tab })
       ├─ getUserDashboardMetrics({ mode, sessionScope: "all" }) → KPIs
       ├─ trading_sessions (recent 20)     → session list seed
       ├─ trading_session_status_counts()  → status counts
       └─ user_profiles                    → paper_balance, binance_connected, tier, preferred_trading_mode
         └─ if mode absent: resolveModeFromProfile(profile) → verifies live entitlement before defaulting to live
  └─ TradingCockpitShell (Client)
       ├─ TradingCockpitProvider           → normalised state, mode, tab, filters, pagination
       ├─ CockpitHeader                  → mode toggle + KPI cards + refresh
       ├─ CockpitTabs                    → Oversikt / Handler / Analyse
       │    ├─ OverviewTab
       │    ├─ TradesTab
       │    └─ AnalysisTab
       └─ WidgetErrorBoundary
```

### 4.2 Directory structure

```
src/features/trading-cockpit/
├── index.ts
├── types.ts
├── constants.ts
├── components/
│   ├── TradingCockpitShell.tsx
│   ├── CockpitHeader.tsx
│   ├── KpiCards.tsx
│   ├── KpiCard.tsx
│   ├── CockpitTabs.tsx
│   ├── ModeBadge.tsx
│   ├── FreshnessIndicator.tsx
│   ├── skeletons/
│   │   ├── KpiCardsSkeleton.tsx
│   │   ├── SessionListSkeleton.tsx
│   │   └── TradeListSkeleton.tsx
│   ├── overview/
│   │   ├── OverviewTab.tsx
│   │   ├── SessionList.tsx
│   │   ├── SessionCard.tsx
│   │   ├── QuickActions.tsx
│   │   └── InsightsFeed.tsx
│   ├── trades/
│   │   ├── TradesTab.tsx
│   │   ├── TradeFilters.tsx
│   │   ├── TradeTable.tsx
│   │   ├── TradeCards.tsx
│   │   ├── TradePagination.tsx
│   │   └── TradeDetailsSheet.tsx
│   └── analysis/
│       ├── AnalysisTab.tsx
│       ├── PeriodSelector.tsx
│       ├── AnalyticsStatGrid.tsx
│       ├── PnLChart.tsx
│       └── SymbolDistribution.tsx
├── hooks/
│   ├── useTradingCockpit.ts
│   ├── useCockpitMetrics.ts
│   ├── useCockpitSessions.ts
│   ├── useCockpitTrades.ts
│   ├── useCockpitAnalytics.ts
│   └── useCockpitRealtime.ts
├── lib/
│   ├── api.ts
│   ├── query-keys.ts
│   └── helpers.ts
└── server/
    └── getCockpitInitialData.ts
```

### 4.3 State shape

```ts
interface TradingCockpitState {
  // Mode
  mode: "paper" | "live";
  defaultMode: "paper" | "live";
  modeDirty: boolean;

  // Tabs
  activeTab: "overview" | "trades" | "analysis";

  // Filters (dateRange only affects Trades and Analytics; KPIs are current-state)
  filters: {
    dateRange: "7d" | "30d" | "90d" | "1y" | "all";  // default "30d"
    pair: string | null;
    sessionStatus: "all" | "active" | "paused" | "stopped" | "crashed";  // default "all"
    side: "all" | "buy" | "sell";  // default "all"
    tradeStatus: "all" | "filled" | "partially_filled" | "pending" | "cancelled" | "failed";  // default "all"
    search: string;  // default "" — matches symbol/trading_pair ILIKE
  };

  // Pagination
  pagination: {
    tradesLimit: number;  // default 25
    tradesCursor: string | null;  // base64 JSON of { executed_at, id }
    hasMoreTrades: boolean;
  };

  // Status counts
  statusCounts: {
    active: number;
    paused: number;
    stopped: number;
    crashed: number;
  };

  // Data
  kpi: DashboardMetrics | null;
  sessions: TradingSessionSummary[];
  trades: Trade[];
  analytics: TradingAnalytics | null;

  // Meta
  isLoading: boolean;
  isRefreshing: boolean;
  lastUpdated: string | null;  // Client ISO timestamp of last successful fetch
  error: CockpitError | null;
}
```

### 4.4 Source of truth

| Concern | Source | Notes |
|---|---|---|
| KPIs (total PnL, win rate, capital, trade count) | `get_dashboard_metrics` RPC / `getUserDashboardMetrics({ sessionScope: "all" })` | All-time / current-state; **not** affected by date filter |
| Status counts | `trading_session_status_counts` RPC | Count of sessions per status for the current mode |
| Session list | `trading_sessions` query | Server seed + client refresh |
| Trade list | New `/api/trading-cockpit/trades` | Cursor pagination, never `LIMIT 200` |
| Analytics | New `/api/trading-cockpit/analytics` → `get_trading_analytics` RPC | Aggregates full filtered dataset in Postgres |
| Per-trade PnL | `trades.realized_pnl` when set; otherwise `calculate_effective_pnl` function using signed-notional fallback | Matches existing `src/lib/trading/build-trading-analytics.ts`; per-trade display marked "estimert" when fallback is used |
| Default mode | `user_profiles.preferred_trading_mode` | Persisted via existing `/api/trading/mode` POST only on explicit "Husk som standard" action |

---

## 5. Data Layer

### 5.1 New RPCs

#### `get_trading_analytics(p_user_id UUID, p_mode TEXT, p_trade_statuses TEXT[], p_session_statuses TEXT[], p_side TEXT, p_pair TEXT, p_search TEXT, p_from TIMESTAMPTZ, p_to TIMESTAMPTZ)`

- `p_trade_statuses` can be `NULL` for all trade statuses; otherwise an array of statuses from `trade_status` enum.
- `p_session_statuses` can be `NULL` for all session statuses; restricts trades to sessions with those statuses.
- `p_side` can be `NULL` for both sides; otherwise `buy` or `sell`.
- `p_pair` can be `NULL` for all pairs.
- `p_search` can be `NULL`; when set it matches `symbol` / `trading_pair` ILIKE `%search%`.
- `p_from`/`p_to` derive from the `period` query param (UTC boundaries).

Array params are passed from the API route as Postgres arrays built from repeated query keys.

Returns:
```sql
TOTAL_TRADES BIGINT,
WINNING_TRADES BIGINT,
LOSING_TRADES BIGINT,
WIN_RATE NUMERIC,
TOTAL_PNL NUMERIC,
TOTAL_FEES NUMERIC,
STARTING_CAPITAL NUMERIC,   -- earliest non-null starting_capital_nok for filtered sessions
MAX_DRAWDOWN_PCT NUMERIC,
PROFIT_FACTOR NUMERIC,
BEST_PAIR TEXT,
BEST_PAIR_PNL NUMERIC,
WORST_PAIR TEXT,
WORST_PAIR_PNL NUMERIC,
BEST_SESSION_ID UUID,
BEST_SESSION_PNL NUMERIC,
WORST_SESSION_ID UUID,
WORST_SESSION_PNL NUMERIC,
TRADES_BY_DAY JSONB,        -- [{date: "2026-06-28", pnl: 123.45, trades: 3}, ...]
TRADES_BY_SYMBOL JSONB      -- [{symbol: "BTCUSDT", pnl: 123.45, trades: 5}, ...]
```

#### `get_trades_paginated(p_user_id UUID, p_cursor TEXT, p_limit INT, p_mode TEXT, p_trade_statuses TEXT[], p_session_statuses TEXT[], p_side TEXT, p_pair TEXT, p_search TEXT, p_from TIMESTAMPTZ, p_to TIMESTAMPTZ)`

Keyset pagination on `(executed_at DESC, id DESC)`. `p_cursor` is base64 JSON of `{ executed_at: ISO, id: UUID }`. Returns `next_cursor` (base64 JSON) or `NULL`.

- `p_trade_statuses`, `p_session_statuses`, `p_side`, `p_pair`, `p_search`, `p_from`/`p_to` semantics match `get_trading_analytics`.

#### `trading_session_status_counts(p_user_id UUID, p_mode TEXT)`

Returns one row per status with columns `status TEXT, count BIGINT`.

### 5.2 New API routes

All routes authenticate with `supabase.auth.getUser()` (via `@supabase/ssr` route handler), reject 401 when missing, and set `user_id = user.id` in every query. All responses carry `Cache-Control: private, no-store, max-age=0`.

- `GET /api/trading-cockpit/metrics?mode=paper|live`
  - Calls `getUserDashboardMetrics({ mode, sessionScope: "all" })`.
  - For `mode=live`, calls `verifyLiveEntitlement(supabase, user.id)` first and returns 403 if not entitled.
  - Response: `{ metrics: DashboardMetrics }`
- `GET /api/trading-cockpit/sessions?mode=paper|live&limit=20&status=...`
  - Queries `trading_sessions` filtered by `user_id` and `mode`.
  - For `mode=live`, verifies live entitlement first.
  - Response: `{ sessions: TradingSessionSummary[] }`
- `GET /api/trading-cockpit/trades?mode=...&cursor=...&limit=...&pair=...&status=...&sessionStatus=...&side=...&from=...&to=...&search=...`
  - Validates inputs with Zod:
    - `mode`: enum `paper` | `live`
    - `limit`: number, min 1, max 100, default 25
    - `cursor`: base64 JSON of `{ executed_at: ISO8601, id: UUID }` or omitted
    - `status`, `sessionStatus`, `side`: enums (arrays supported via repeated query keys, e.g. `?status=filled&status=pending`)
    - `from`, `to`: ISO8601 datetimes or omitted
    - `search`: string trimmed, max 100 chars
  - Calls `get_trades_paginated`.
  - For `mode=live`, verifies live entitlement first.
  - Response: `{ trades: Trade[], next_cursor: string | null }`
- `GET /api/trading-cockpit/analytics?mode=...&period=7d|30d|90d|1y|all&pair=...&status=...&sessionStatus=...&side=...&search=...`
  - Validates inputs with Zod:
    - `mode`: enum `paper` | `live`
    - `period`: enum `7d` | `30d` | `90d` | `1y` | `all`, default `30d`
    - `pair`, `status`, `sessionStatus`, `side`, `search`: same rules as trades route
  - Maps `period` to UTC `from`/`to` boundaries.
  - Calls `get_trading_analytics`.
  - For `mode=live`, verifies live entitlement first.
  - Response: `{ analytics: TradingAnalytics }`
- Mode persistence reuses existing `/api/trading/mode` POST.
  - Cockpit calls this endpoint when the user taps "Husk som standard".
  - The existing route already validates live entitlement before switching to live.

### 5.3 Live entitlement helper

Extract a single, fail-closed helper to `src/lib/auth/live-trading.ts` and use it in every new route:

```ts
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
  if (!canAccessLiveAutoTrading(tier)) return false;
  if (!profile.binance_connected) return false;
  const { data: entitlements, error } = await supabase.rpc(
    "get_user_entitlements",
    { p_user_id: userId },
  );
  if (error || !entitlements?.length) return false;
  return Boolean(entitlements[0].auto_trade_allow_live);
}
```

Rules:
- Fail closed: any missing data returns `false`.
- Call `verifyLiveEntitlement(supabase, user.id)` at the top of every live-mode route before any query.
- If entitlement fails, return `403 Forbidden` with `{ error: "Live trading not available" }` and the client shows the existing live-mode upsell/lock screen.
- If entitlement is revoked while the user is viewing live mode, the next API call returns 403; the cockpit catches this, shows a lock/upgrade CTA, and automatically falls back to `mode=paper` in the URL.
- Existing `/api/trading/mode` POST should be refactored to use this same helper so there is one source of truth.

### 5.4 Data fixes required before/during implementation

1. Reuse existing `user_profiles.preferred_trading_mode`; do not add a new column.
2. Fix `trigger_update_session_state` to keep `current_capital_nok` updated (subagent found regression). **Do not** change how `trading_sessions.total_pnl` is computed; headline KPIs remain authoritative.
3. Create an immutable SQL function `calculate_effective_pnl(p_realized_pnl, p_total_value, p_side)` that returns:
   - `realized_pnl` when not NULL
   - otherwise `total_value` with sign based on `side` (buy = −, sell = +), matching `effectivePnlDelta` in `src/lib/trading/build-trading-analytics.ts`
4. Use the function in the new analytics/trades RPCs for **trade-level breakdown only**.
5. Audit and clean corrupted `realized_pnl` rows where the value is a percentage (from `position-monitor`, `taj-position-checker`) rather than absolute PnL.
6. Audit all `trades` insertion paths to set `realized_pnl` reliably; the fallback is only for legacy rows and paper fills without closed-loop PnL.
7. Clean up `src/lib/paper-trading/supabase.ts` schema mismatches (`amount` vs `quantity`, `status: 'executed'`).
8. Retire `/api/user/trades?limit=200` for cockpit analytics; keep only legacy callers until migration cleanup PR.
9. Do **not** build analytics from `/api/user/trades?limit=200`.

---

## 6. UI Design

### 6.1 Header (sticky)

Left to right on desktop; stacked on mobile:
- Mode pill: Paper / Live + icon + description
- Total capital (largest)
- Total PnL (absolute + %)
- Win rate
- Active sessions count
- Data freshness badge
- Refresh button

KPIs in the header are **all-time / current-state** and are not affected by the date filter used in Trades/Analytics. Mode switch shows:
- `modeDirty === true` → e.g. "Du viser Live nå. Standard er Paper."
- Switching to live requires confirmation if not already default.
- "Husk som standard" is a separate, explicit action (button next to the mode pill). It calls existing `/api/trading/mode` POST and sets `user_profiles.preferred_trading_mode`. The user can toggle mode freely during the session without persisting it.

### 6.2 Tabs

Persistent tab bar under header. Clicking a tab updates the URL `?tab=overview|trades|analysis` (via Next.js router `replace`, preserving `mode`). Server seed respects `tab` for initial focus but fetches the same initial payload regardless.

1. **Oversikt** (`tab=overview`)
   - KPI cards (same as header, rendered as grid for readability)
   - Active/paused sessions (cards, max 3 visible, "Vis alle" link → switches to `tab=trades`)
   - Latest trades (5)
   - Insights feed: 1–2 plain-language observations + safe CTA
   - Quick actions:
     - "Start ny sesjon" → navigates to `/no/dashboard/auto-trade?mode={currentMode}`
     - "Se alle handler" → switches to `tab=trades`
2. **Handler** (`tab=trades`)
   - Filter bar: date range, pair, side, trade status, session status, search
   - Desktop: sortable table (default sort `executed_at DESC`)
   - Mobile: card list + bottom sheet for details
   - Cursor pagination: "Last flere"
3. **Analyse** (`tab=analysis`)
   - Period selector: 7d / 30d / 90d / 1y / all (default 30d)
   - Analytics stat grid
   - PnL over time chart
   - Trades by symbol chart
   - Best/worst pair and session cards
   - Lazy-loaded on first tab visit

### 6.3 Mobile adaptations

- KPI header horizontally scrollable.
- Filters in bottom sheet.
- Session/trade details in bottom sheet.
- Tables become cards.
- Touch targets ≥ 48 px.
- Sticky sub-header with tabs.

### 6.4 Loading states

- KPI header: 4–5 `KpiCardsSkeleton` placeholders.
- Session list: 3 skeleton cards.
- Trade list: 5 skeleton rows (desktop) or cards (mobile).
- Analysis tab: skeleton stat grid + placeholder chart boxes until first data arrives.
- Use `animate-pulse` with `kp-bg-subtle` background; never layout-shift after load.

### 6.5 Empty states

| Tab | Key | Default copy (Norwegian) |
|---|---|---|
| Oversikt | `trading.cockpit.empty.overview.title` | Ingen aktiv sesjon |
| Oversikt | `trading.cockpit.empty.overview.description` | Start en paper-sesjon for å komme i gang. |
| Handler | `trading.cockpit.empty.trades.title` | Ingen handler i valgt periode |
| Handler | `trading.cockpit.empty.trades.description` | Endre filteret eller start en ny sesjon. |
| Analyse | `trading.cockpit.empty.analysis.title` | Ikke nok data ennå |
| Analyse | `trading.cockpit.empty.analysis.description` | Du trenger minst 5 handler for å vise analyse. |

### 6.6 Error states

- Global error: compact card with retry button, non-technical message.
- Partial error: KPIs load, list shows inline error + retry.
- Never show "Ingen handler ennå" when fetch failed.

---

## 7. Security

### 7.1 Checklist for every new `/api/trading-cockpit/*` route

- Authenticate with `supabase.auth.getUser()` (via `@supabase/ssr` route handler) and reject 401 if missing.
- Derive `user_id` only from the authenticated session; never trust a client-provided user id.
- Filter every query by `user_id`.
- Re-verify live entitlement on any live-mode read by calling `verifyLiveEntitlement(supabase, user.id)`.
- Validate input with Zod.
- Return generic error messages; never stack traces.
- Set `Cache-Control: private, no-store, max-age=0`.

### 7.2 Existing gaps to fix

- `POST /api/trading/sessions` (legacy route) does not check live entitlement.
- `PATCH /api/trading/sessions` does not re-verify live entitlement on resume.
- Some routes return `stack` in 500 responses.

---

## 8. i18n / Copy

New namespace: `trading.cockpit.*` inside `messages/no/trading.json` and `messages/en/trading.json`.

Key keys:
- `trading.cockpit.tabs.overview` / `trades` / `analysis`
- `trading.cockpit.kpi.totalCapital`, `totalPnl`, `totalReturn`, `winRate`, `activeSessions`, `totalTrades`
- `trading.cockpit.mode.paper`, `live`, `paperDesc`, `liveDesc`, `liveWarning`, `rememberAsDefault`
- `trading.cockpit.empty.overview.*`, `trades.*`, `analysis.*`
- `trading.cockpit.filter.*`
- `trading.cockpit.nextAction.*` (safe guidance only)
- `trading.cockpit.error.title`, `description`, `retry`
- `trading.cockpit.quickActions.startNewSession`, `viewAllTrades`

Terminology:
- Paper mode → **Lekepenger** / **Paper trading**
- Live mode → **Live trading**
- Session → **Sesjon** / **Session**
- Trade → **Handel** / **handler** / **Trade**
- Strategy → **Strategi** / **Strategy**

---

## 9. Analytics Specification

### 9.1 Headline metrics

| Metric | Formula | Display |
|---|---|---|
| Total return % | `total_pnl / starting_capital × 100` | with % |
| Total PnL NOK | `SUM(trading_sessions.total_pnl)` for filtered sessions | NOK |
| Win rate | `winning / (winning + losing)` | % |
| Max drawdown | peak-to-trough from daily PnL curve | % |
| Profit factor | `gross profit / ABS(gross loss)` | ratio |
| Fees as % of PnL | `SUM(fee) / NULLIF(ABS(total_pnl), 0) × 100` | % or "—" |
| Best/worst pair | pair with highest/lowest `SUM(effective_pnl)` | card |
| Best/worst session | session with highest/lowest `total_pnl` | card |

Headline totals (total PnL, win rate, profit factor, drawdown) use session-level `trading_sessions.total_pnl` where possible. Per-trade `effective_pnl` is used only for per-trade lists, symbol/day breakdowns, and best/worst pair. This keeps the analytics tab consistent with the cockpit header KPIs.

### 9.2 Edge cases

- Division by zero → `null` → display "—".
- No losing trades → profit factor "∞" with tooltip.
- `realized_pnl IS NULL` → use `effective_pnl` generated column (signed notional fallback); display marked "estimert". This matches existing client-side `effectivePnlDelta` and is understood as an approximation, not true realized PnL. It is acceptable for paper fills without closed-loop PnL and legacy rows, but new insertions should set `realized_pnl`.
- Mixed paper/live → always filter by mode.
- Currency: analytics are computed in the account's base currency (NOK). Use existing `useCurrency()` only for display formatting; all RPC math stays in NOK.

---

## 10. Performance

### 10.1 Must-do

- SSR initial KPIs, session list, and status counts in `handel/page.tsx`.
- `lastUpdated` is set to the client time of the last successful fetch (initial SSR or refresh); it is not a server timestamp.
- Lazy-load `AnalysisTab` content until first viewed.
- Use cursor pagination for trades; never `LIMIT 200` for analytics.
- Single unified realtime manager per cockpit: subscribe to `trades` and `trading_sessions` for the user, debounce 800 ms, invalidate query keys.
- Pause polling and realtime when `document.hidden`.
- Memoize `KpiCard`, `SessionCard`, `TradeRow`.
- Charts: reuse existing chart library already in the project. If none exists, use `recharts` (already permitted by bundle budget; verify with `ANALYZE=true npm run build`).

### 10.2 Should-do

- Disable chart animations when data > 100 points or on mobile.
- Downsample long equity curves.
- Run `ANALYZE=true npm run build` after implementation to inspect bundle impact.

---

## 11. Testing

### 11.1 Unit tests

- `useTradingCockpit.test.tsx`: mode switch, tab URL update, filter change, refresh, error state.
- `KpiCards.test.tsx`: loading, formatting, negative PnL color.
- `CockpitTabs.test.tsx`: tab switching, `aria-selected`, URL update.
- `TradePagination.test.tsx`: boundary states, cursor change.
- `EmptyState.test.tsx`: per-tab messages.

### 11.2 Integration / E2E

- `e2e/critical/trading-cockpit.spec.ts`:
  - Load `/no/handel`, KPIs visible.
  - Switch mode to live, URL updates, risk banner visible.
  - Tabs switch panels.
  - Filter + pagination on trades.
  - Empty states for new user.
  - Mobile responsive (375 px viewport).

### 11.3 Test utilities

Create `src/features/trading-cockpit/__tests__/test-utils.tsx` with `MockTradingCockpitProvider` and `renderWithProvider`.

---

## 12. Migration Strategy

### 12.1 Feature parity checklist before swapping `/handel`

- [ ] Header shows mode pill, total capital, total PnL, win rate, active sessions, freshness, refresh
- [ ] Mode toggle updates URL `?mode=paper|live` and requires confirmation for live
- [ ] "Husk som standard" persists to `user_profiles.preferred_trading_mode` via `/api/trading/mode`
- [ ] Tabs update URL `?tab=overview|trades|analysis`
- [ ] Overview tab: KPI cards, session list (max 3), latest 5 trades, insights feed, quick actions
- [ ] Trades tab: filters (date, pair, side, status, session, search), sortable table / mobile cards, cursor pagination
- [ ] Analysis tab: period selector, stat grid, PnL chart, symbol distribution, best/worst cards
- [ ] Empty and error states for all tabs
- [ ] Mobile responsive (375 px+): horizontal KPI scroll, bottom sheets, cards, ≥48 px touch targets
- [ ] All new API routes auth + user_id filter + live entitlement + Zod validation
- [ ] Realtime subscription debounced 800 ms, paused when hidden
- [ ] i18n keys added to both `no` and `en`
- [ ] Unit tests for provider, KPI cards, tabs, pagination, empty states
- [ ] E2E critical path passes

### 12.2 Steps

1. Create new `src/features/trading-cockpit/` feature in parallel.
2. Add Supabase migrations:
   - `calculate_effective_pnl` immutable function (no table lock)
   - status-counts RPC
   - analytics RPC (uses the function for per-trade breakdowns)
   - paginated trades RPC
   - data-quality cleanup for percentage-corrupted `realized_pnl` rows
   - deferred: generated stored `effective_pnl` column only after production table sizing
3. Add new API routes.
4. Build provider, shell, header, tabs.
5. Keep old `/handel`-specific wrappers until checklist above is complete. `UnifiedTradingDashboard` is still used by `/dashboard`, so it is not deprecated by this spec.
6. Swap `src/app/[locale]/(user)/handel/page.tsx` to render new cockpit.
7. Run full verification: lint, type-check, tests, i18n, build, cf:build, prod health.
8. Deploy. Monitor for 24 h.
9. Remove deprecated old components and retire `/api/user/trades?limit=200` callers in a separate cleanup PR.

---

## 13. Out of Scope (future specs)

- **Risk Guard:** daily max loss, per-session stop-loss, drawdown alerts, "stop trading today" button.
- **Realism Mode:** simulated fees, slippage, spread for paper trading.
- **AI Coach / explanations:** "Explain today's trades", weekly learning report.
- **Copy-trading cards / leaderboard:** trader comparison, verified live/paper badges.
- **Advanced order types or manual trading from the cockpit.**

---

## 14. Risks

| Risk | Mitigation |
|---|---|
| Data quality: `realized_pnl` NULL, stale `current_capital_nok` | Fix triggers before relying on per-trade analytics; use RPC/session totals for KPIs |
| Mode state divergence | URL is source of truth; context initialized from props; controlled toggle writes URL |
| Large trade history | Cursor pagination + server-side analytics |
| Mobile complexity | Use bottom sheets, card lists, sticky headers; test on small viewports |
| Realtime stampede | Single debounced invalidator in cockpit |
| Live-mode privilege escalation | Re-verify entitlement on every live read/mutation |

---

## 15. Open Questions / TODO

**Can be deferred:**
1. Do we need a materialized view for daily PnL to speed up the equity curve? (Decide after first performance test on realistic data.)
2. Should we deprecate `/dashboard/auto-trade` in favor of the cockpit, or keep it as the dedicated "start session" flow?
3. Should we add a generated stored `effective_pnl` column later, after sizing the production table?

---

## 16. Phase 0 Findings (completed)

### 16.1 PnL audit summary

`trades.realized_pnl` is set by many paths. The column is often `NULL` for:
- Buy/open trades
- Sells without a populated `open_position` in the linked session
- Trades inserted without `session_id`

Some paths also write **percentages** into `realized_pnl` (`position-monitor`, `taj-position-checker`), corrupting the column for absolute-PnL use.

Key write paths:
- `src/lib/trading/core/execute-trade.ts` — FIFO cost-basis for sells
- `src/app/api/cron/tick/route.ts` — FIFO for live tick trades + follower scaling
- `src/lib/auto-trading/binance-websocket.ts` — FIFO on closing fill
- `src/lib/paper-trading/supabase.ts` — backtest `pnl`
- `supabase/functions/process-copy-trades/index.ts` — simple cost-basis for sells
- `supabase/functions/position-monitor/index.ts` — writes **percentage** (corrupted)
- `supabase/functions/archived/taj-position-checker/index.ts` — writes **percentage** (corrupted)
- `supabase/migrations/20260506224244_fix_realized_pnl_and_partial_sells.sql` — `trigger_compute_realized_pnl` recomputes for sells
- `src/lib/trading-api.ts` `createPaperTrade` — caller-provided, often `null`

### 16.2 `effective_pnl` decision

Use an immutable SQL function `calculate_effective_pnl` in Phase 0, not a generated stored column, to avoid locking the production `trades` table.

```sql
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
```

Use it only in:
- `get_trading_analytics` for per-trade breakdowns
- `get_trades_paginated` for per-trade display

**Do not** use it in `trigger_update_session_state`. Headline KPIs remain from `trading_sessions.total_pnl`.

### 16.3 Data-quality guard

Before enabling trade-level analytics, run a cleanup migration to fix corrupted rows:

```sql
-- Example guard: flag rows where realized_pnl looks like a percentage
SELECT id, realized_pnl, total_value
FROM public.trades
WHERE realized_pnl IS NOT NULL
  AND ABS(realized_pnl) < 100
  AND ABS(realized_pnl) > 1
  AND status IN ('filled', 'partially_filled');
```

Remediation options:
- Set corrupted rows to `NULL` so `calculate_effective_pnl` falls back to signed notional.
- Or backfill from session/trade history if a reliable source exists.

### 16.4 Open insertion-path audit

The following paths insert trades without setting `realized_pnl`:
- `supabase/functions/sync-binance-trades/index.ts`
- `src/app/api/cron/twap-execute/route.ts`
- `src/lib/ai/auto-trading-engine.ts`
- `supabase/functions/signal-engine/index.ts`
- `supabase/functions/position-monitor/index.ts` (partial exits)
- `supabase/functions/archived/taj-copy-sync/index.ts`

Fixing these is a **separate follow-up cleanup**, not a blocker for the cockpit. The cockpit must therefore tolerate `NULL` `realized_pnl` gracefully and display fallback values as "estimert".
