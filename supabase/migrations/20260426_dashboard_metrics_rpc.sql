-- legacy-accepted: 8-sifret timestamp, deployet til prod 2026-04. Se AGENTS.md.
-- ============================================================================
-- RPC: get_dashboard_metrics
-- Enterprise-grade single-query aggregation for dashboard metrics.
-- Replaces in-memory TypeScript aggregation with PostgreSQL CTEs.
--
-- Deployed: 2026-04-26
-- ============================================================================

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
  total_capital NUMERIC,
  starting_capital NUMERIC
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
      COALESCE(SUM(ms.current_capital_nok), 0) AS total_capital,
      COALESCE(SUM(ms.starting_capital_nok), 0) AS starting_capital
    FROM matched_sessions ms
  ),
  trade_agg AS (
    SELECT
      COALESCE(SUM(t.realized_pnl), 0) AS total_pnl,
      COUNT(*) AS total_trades,
      COUNT(*) FILTER (WHERE t.realized_pnl > 0) AS winning_trades,
      COUNT(*) FILTER (WHERE t.realized_pnl < 0) AS losing_trades
    FROM trades t
    WHERE t.session_id IN (SELECT id FROM matched_sessions)
      AND t.user_id = p_user_id
      AND t.mode::text = p_mode
      AND t.status::text NOT IN ('cancelled', 'failed')
  )
  SELECT
    ta.total_pnl,
    ta.total_trades,
    ta.winning_trades,
    ta.losing_trades,
    sa.total_capital,
    sa.starting_capital
  FROM session_agg sa, trade_agg ta;
END;
$$;

-- Grant execute to authenticated users (bypassed by service role anyway,
-- but explicit grant prevents "function does not exist" errors in RLS contexts)
GRANT EXECUTE ON FUNCTION get_dashboard_metrics(UUID, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_metrics(UUID, TEXT, TEXT[]) TO anon;

COMMENT ON FUNCTION get_dashboard_metrics(UUID, TEXT, TEXT[]) IS
  'Unified dashboard metrics aggregation. Returns total P&L, trade counts, win/loss counts, and capital sums for a user+mode+status scope.';
