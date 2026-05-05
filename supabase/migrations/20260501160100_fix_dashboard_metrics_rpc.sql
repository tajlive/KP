-- ============================================================================
-- Fix: get_dashboard_metrics — include ALL trades for the user+mode
-- Date: 2026-05-05
-- Context: Previously filtered trades by session status, hiding trades from
-- crashed/stopped sessions. Now aggregates ALL non-cancelled trades for the
-- user+mode, while session capital still respects the scope filter.
-- ============================================================================

-- Must drop first because we changed the logic
DROP FUNCTION IF EXISTS get_dashboard_metrics(UUID, TEXT, TEXT[]);

CREATE OR REPLACE FUNCTION get_dashboard_metrics(
  p_user_id UUID,
  p_mode TEXT,
  p_statuses TEXT[]
)
RETURNS TABLE(
  total_pnl NUMERIC,
  total_trades BIGINT,
  winning_trades BIGINT,
  losing_trades BIGINT,
  total_deployed_capital NUMERIC,
  starting_capital NUMERIC,
  session_count BIGINT,
  avg_session_capital NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH matched_sessions AS (
    SELECT
      s.id,
      s.current_capital_nok,
      s.starting_capital_nok
    FROM trading_sessions s
    WHERE s.user_id = p_user_id
      AND s.mode::text = p_mode
      AND s.archived = false
      AND s.status::text = ANY(p_statuses)
  ),
  session_agg AS (
    SELECT
      COALESCE(SUM(ms.current_capital_nok), 0) AS total_deployed_capital,
      COALESCE(SUM(ms.starting_capital_nok), 0) AS starting_capital,
      COUNT(*) AS session_count,
      CASE WHEN COUNT(*) > 0
        THEN COALESCE(SUM(ms.current_capital_nok), 0) / COUNT(*)
        ELSE 0
      END AS avg_session_capital
    FROM matched_sessions ms
  ),
  -- Include ALL user trades for this mode, not just trades from scoped sessions
  trade_agg AS (
    SELECT
      COALESCE(SUM(t.realized_pnl), 0) AS total_pnl,
      COUNT(*) AS total_trades,
      COUNT(*) FILTER (WHERE t.realized_pnl > 0) AS winning_trades,
      COUNT(*) FILTER (WHERE t.realized_pnl < 0) AS losing_trades
    FROM trades t
    WHERE t.user_id = p_user_id
      AND t.mode::text = p_mode
      AND t.status::text NOT IN ('cancelled', 'failed')
  )
  SELECT
    ta.total_pnl,
    ta.total_trades,
    ta.winning_trades,
    ta.losing_trades,
    sa.total_deployed_capital,
    sa.starting_capital,
    sa.session_count,
    sa.avg_session_capital
  FROM session_agg sa, trade_agg ta;
END;
$$;

GRANT EXECUTE ON FUNCTION get_dashboard_metrics(UUID, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_metrics(UUID, TEXT, TEXT[]) TO anon;

COMMENT ON FUNCTION get_dashboard_metrics(UUID, TEXT, TEXT[]) IS
  'Unified dashboard metrics. total_deployed_capital = SUM across all active sessions. session_count and avg_session_capital added for clarity. Fixes double-count confusion.';
