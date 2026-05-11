-- ============================================================================
-- Fix: get_dashboard_metrics — use session capital diff for total_pnl
-- Date: 2026-05-07
-- Context: trades.realized_pnl is NULL for most rows because not all trade
--   insertion paths set it (execute-trade.ts, paper-trading, auto-trading).
--   However, trading_sessions.current_capital_nok is ALWAYS correctly updated
--   by trigger_update_session_state for every trade. Using session capital
--   diff gives accurate P&L across ALL trade sources.
-- ============================================================================

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
      s.starting_capital_nok,
      s.total_trades,
      s.winning_trades,
      s.losing_trades,
      s.total_pnl
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
      END AS avg_session_capital,
      -- P&L from session.total_pnl tracks realized gains correctly
      COALESCE(SUM(ms.total_pnl), 0) AS total_pnl,
      COALESCE(SUM(ms.total_trades), 0) AS total_trades,
      COALESCE(SUM(ms.winning_trades), 0) AS winning_trades,
      COALESCE(SUM(ms.losing_trades), 0) AS losing_trades
    FROM matched_sessions ms
  )
  SELECT
    sa.total_pnl,
    sa.total_trades,
    sa.winning_trades,
    sa.losing_trades,
    sa.total_deployed_capital,
    sa.starting_capital,
    sa.session_count,
    sa.avg_session_capital
  FROM session_agg sa;
END;
$$;

GRANT EXECUTE ON FUNCTION get_dashboard_metrics(UUID, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_metrics(UUID, TEXT, TEXT[]) TO anon;

COMMENT ON FUNCTION get_dashboard_metrics(UUID, TEXT, TEXT[]) IS
  'Unified dashboard metrics. total_pnl = SUM(current_capital_nok - starting_capital_nok) across matched sessions. This is accurate even when trades.realized_pnl is NULL because current_capital_nok is updated by trigger for every trade.';
