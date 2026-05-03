-- ============================================================================
-- Fix: Leaderboard LEFT JOIN bug
-- Date: 2026-05-01
-- Context: WHERE clause on LEFT JOINed trades table turned it into INNER JOIN,
-- excluding users with no recent trades. Also fixed ROI calculation.
-- ============================================================================

DROP MATERIALIZED VIEW IF EXISTS public.leaderboard;

CREATE MATERIALIZED VIEW public.leaderboard AS
WITH recent_trades AS (
  SELECT
    t.user_id,
    COUNT(*) AS trade_count,
    COALESCE(SUM(t.realized_pnl), 0) AS total_pnl
  FROM public.trades t
  WHERE t.executed_at > now() - INTERVAL '30 days'
    AND t.status::text NOT IN ('cancelled', 'failed')
    AND t.is_mock = false
  GROUP BY t.user_id
  HAVING COUNT(*) >= 5
),
session_capital AS (
  SELECT
    ts.user_id,
    SUM(ts.current_capital_nok) AS total_current_capital,
    SUM(ts.starting_capital_nok) AS total_starting_capital
  FROM public.trading_sessions ts
  WHERE ts.status = 'active'
    AND ts.archived = false
  GROUP BY ts.user_id
)
SELECT
  up.id AS user_id,
  up.display_name,
  up.tier,
  COALESCE(rt.trade_count, 0) AS trade_count,
  COALESCE(rt.total_pnl, 0) AS total_pnl,
  COALESCE(sc.total_current_capital, up.paper_balance, 0) AS current_capital,
  COALESCE(sc.total_starting_capital, 100000) AS starting_capital,
  CASE
    WHEN COALESCE(sc.total_starting_capital, 100000) > 0
    THEN ROUND((COALESCE(rt.total_pnl, 0) / COALESCE(sc.total_starting_capital, 100000) * 100), 2)
    ELSE 0
  END AS roi_percent,
  up.created_at
FROM public.user_profiles up
LEFT JOIN recent_trades rt ON rt.user_id = up.id
LEFT JOIN session_capital sc ON sc.user_id = up.id
WHERE rt.user_id IS NOT NULL;  -- Only include users with qualifying trades

CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_user_id ON public.leaderboard (user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_roi ON public.leaderboard (roi_percent DESC);

COMMENT ON MATERIALIZED VIEW public.leaderboard IS
  'Leaderboard of top traders. Fixed LEFT JOIN bug: date filter moved to CTE. ROI uses total starting capital across all sessions. Excludes mock trades.';
