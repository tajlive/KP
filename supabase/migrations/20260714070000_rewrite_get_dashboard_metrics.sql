-- Rewrite get_dashboard_metrics to aggregate from trades, not session columns
-- This prevents stale data when trading_sessions columns aren't updated

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(
  p_user_id uuid,
  p_mode text,
  p_statuses text[]
)
RETURNS TABLE(
  total_pnl numeric,
  total_trades bigint,
  winning_trades bigint,
  losing_trades bigint,
  win_rate numeric,
  session_count bigint,
  avg_session_pnl numeric,
  total_capital numeric,
  daily_pnl numeric,
  total_volume numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH matched_sessions AS (
    SELECT s.id, s.current_capital_nok, s.total_pnl, s.created_at
    FROM trading_sessions s
    WHERE s.user_id = p_user_id
      AND s.mode::text = p_mode
      AND s.archived = false
      AND s.status::text = ANY(p_statuses)
  ),
  session_trades AS (
    SELECT
      t.session_id,
      public.calculate_effective_pnl(t.realized_pnl, t.total_value, t.side::text) AS effective_pnl,
      t.total_value
    FROM trades t
    WHERE t.user_id = p_user_id
      AND t.mode::text = p_mode
      AND t.session_id IN (SELECT id FROM matched_sessions)
  ),
  trade_agg AS (
    SELECT
      COUNT(*)::bigint AS total_trades,
      COUNT(*) FILTER (WHERE effective_pnl > 0)::bigint AS winning_trades,
      COUNT(*) FILTER (WHERE effective_pnl < 0)::bigint AS losing_trades,
      COALESCE(SUM(effective_pnl), 0) AS total_pnl,
      COALESCE(SUM(total_value), 0) AS total_volume
    FROM session_trades
  ),
  latest_capital AS (
    SELECT ms.current_capital_nok
    FROM matched_sessions ms
    WHERE ms.current_capital_nok IS NOT NULL
    ORDER BY ms.created_at DESC LIMIT 1
  ),
  session_agg AS (
    SELECT
      COUNT(*)::bigint AS session_count,
      COALESCE(AVG(ms.total_pnl), 0) AS avg_session_pnl,
      COALESCE((SELECT current_capital_nok FROM latest_capital),
        (SELECT paper_balance FROM user_profiles WHERE id = p_user_id), 0) AS current_capital
    FROM matched_sessions ms
  )
  SELECT
    COALESCE(ta.total_pnl, 0),
    COALESCE(ta.total_trades, 0),
    COALESCE(ta.winning_trades, 0),
    COALESCE(ta.losing_trades, 0),
    CASE WHEN COALESCE(ta.winning_trades + ta.losing_trades, 0) > 0
      THEN ROUND(ta.winning_trades::numeric / (ta.winning_trades + ta.losing_trades) * 100, 1)
      ELSE 0 END,
    sa.session_count,
    ROUND(sa.avg_session_pnl, 2),
    sa.current_capital,
    0::numeric,
    COALESCE(ta.total_volume, 0)
  FROM trade_agg ta, session_agg sa;
END;
$$;
