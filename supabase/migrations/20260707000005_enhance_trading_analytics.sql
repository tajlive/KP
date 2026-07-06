-- ============================================================================
-- Trading Cockpit: enhance analytics with full drawdown, profit factor, and
-- per-symbol trade counts while preserving the existing function signature.
-- ============================================================================
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
      AND t.mode = p_mode::public.trading_mode
      AND (p_trade_statuses IS NULL OR t.status = ANY(p_trade_statuses::public.trade_status[]))
      AND (p_session_statuses IS NULL OR s.status = ANY(p_session_statuses::public.session_status[]))
      AND (p_side IS NULL OR t.side = p_side::public.trade_side)
      AND (p_pair IS NULL OR t.trading_pair ILIKE p_pair)
      AND (p_search IS NULL OR t.trading_pair ILIKE '%' || p_search || '%')
      AND (p_from IS NULL OR t.executed_at >= p_from)
      AND (p_to IS NULL OR t.executed_at < p_to)
  ),
  session_totals AS (
    SELECT
      s.id,
      s.starting_capital_nok,
      s.total_pnl AS session_pnl
    FROM public.trading_sessions s
    WHERE s.user_id = p_user_id
      AND s.mode = p_mode::public.trading_mode
      AND (p_session_statuses IS NULL OR s.status = ANY(p_session_statuses::public.session_status[]))
  ),
  trade_aggregates AS (
    SELECT
      COUNT(*)::BIGINT AS total_trades,
      COUNT(*) FILTER (WHERE effective_pnl > 0)::BIGINT AS winning_trades,
      COUNT(*) FILTER (WHERE effective_pnl < 0)::BIGINT AS losing_trades,
      COALESCE(SUM(fee), 0) AS total_fees,
      COALESCE(SUM(effective_pnl) FILTER (WHERE effective_pnl > 0), 0) AS gross_profit,
      COALESCE(ABS(SUM(effective_pnl) FILTER (WHERE effective_pnl < 0)), 0) AS gross_loss
    FROM filtered_trades
  ),
  session_aggregates AS (
    SELECT
      COALESCE(SUM(session_pnl), 0) AS session_total_pnl,
      COALESCE(SUM(starting_capital_nok), 0) AS starting_capital
    FROM session_totals
  ),
  pair_aggregates AS (
    SELECT
      trading_pair AS pair,
      SUM(effective_pnl) AS pnl,
      COUNT(*)::BIGINT AS trade_count,
      ROW_NUMBER() OVER (ORDER BY SUM(effective_pnl) DESC) AS rn_high,
      ROW_NUMBER() OVER (ORDER BY SUM(effective_pnl) ASC) AS rn_low
    FROM filtered_trades
    WHERE trading_pair IS NOT NULL
    GROUP BY trading_pair
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
      session_pnl,
      ROW_NUMBER() OVER (ORDER BY session_pnl DESC) AS rn_high,
      ROW_NUMBER() OVER (ORDER BY session_pnl ASC) AS rn_low
    FROM session_totals
  ),
  best_worst_session AS (
    SELECT
      (SELECT id FROM session_ranked WHERE rn_high = 1 LIMIT 1) AS best_session_id,
      (SELECT session_pnl FROM session_ranked WHERE rn_high = 1 LIMIT 1) AS best_session_pnl,
      (SELECT id FROM session_ranked WHERE rn_low = 1 LIMIT 1) AS worst_session_id,
      (SELECT session_pnl FROM session_ranked WHERE rn_low = 1 LIMIT 1) AS worst_session_pnl
  ),
  running_equity AS (
    SELECT
      ft.executed_at,
      ft.id,
      sa.starting_capital + SUM(ft.effective_pnl) OVER (
        ORDER BY ft.executed_at, ft.id
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
      ) AS equity
    FROM filtered_trades ft
    CROSS JOIN session_aggregates sa
  ),
  running_peak AS (
    SELECT
      re.equity,
      GREATEST(sa.starting_capital, MAX(re.equity) OVER (
        ORDER BY re.executed_at, re.id
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
      )) AS peak
    FROM running_equity re
    CROSS JOIN session_aggregates sa
  ),
  drawdown_calc AS (
    SELECT MIN((equity - peak) / NULLIF(peak, 0)) AS max_drawdown_pct
    FROM running_peak
  ),
  daily AS (
    SELECT
      jsonb_agg(
        jsonb_build_object('date', day, 'pnl', day_pnl, 'trades', day_trades)
        ORDER BY day
      ) AS trades_by_day
    FROM (
      SELECT
        day,
        COALESCE(SUM(effective_pnl), 0) AS day_pnl,
        COUNT(*) AS day_trades
      FROM filtered_trades
      GROUP BY day
    ) d
  ),
  by_symbol AS (
    SELECT
      jsonb_agg(
        jsonb_build_object('symbol', pair, 'pnl', pnl, 'trades', trade_count)
        ORDER BY pnl DESC
      ) AS trades_by_symbol
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
    dc.max_drawdown_pct,
    CASE WHEN ta.gross_loss > 0
      THEN ROUND(ta.gross_profit / ta.gross_loss, 2)
      ELSE NULL END AS profit_factor,
    bwp.best_pair,
    bwp.best_pair_pnl,
    bwp.worst_pair,
    bwp.worst_pair_pnl,
    bws.best_session_id,
    bws.best_session_pnl,
    bws.worst_session_id,
    bws.worst_session_pnl,
    (SELECT d.trades_by_day FROM daily d LIMIT 1) AS trades_by_day,
    (SELECT bs.trades_by_symbol FROM by_symbol bs LIMIT 1) AS trades_by_symbol
  FROM trade_aggregates ta
  CROSS JOIN session_aggregates sa
  CROSS JOIN best_worst_pair bwp
  CROSS JOIN best_worst_session bws
  CROSS JOIN drawdown_calc dc;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_trading_analytics(UUID, TEXT, TEXT[], TEXT[], TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ)
  TO authenticated, service_role;
