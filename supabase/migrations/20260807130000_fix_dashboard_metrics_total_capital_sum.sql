-- Fix: get_dashboard_metrics — total_capital skal være SUM over alle sesjoner,
-- ikke kun nyeste sesjons kapital.
--
-- Prod-avvik funnet 2026-08-07 (QA /no/handel): PORTEFØLJE VERDI viste 6 527 kr
-- for en bruker med 10 aktive sesjoner (53 298 kr). Rotårsak: RPC-en hentet
-- current_capital med `ORDER BY created_at DESC LIMIT 1` (kun nyeste sesjon)
-- i stedet for SUM(current_capital_nok) som migrasjon 20260501160100 definerer.
-- Prod og migrasjon hadde drifta fra hverandre (hotfix i SQL-konsoll).

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
  win_rate NUMERIC,
  session_count BIGINT,
  avg_session_pnl NUMERIC,
  total_capital NUMERIC,
  daily_pnl NUMERIC,
  total_volume NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH matched_sessions AS (
    SELECT s.id, s.current_capital_nok, s.total_pnl, s.created_at
    FROM trading_sessions s
    WHERE s.user_id = p_user_id
      AND s.mode::text = p_mode
      AND s.status::text = ANY(p_statuses)
  ),
  session_trades AS (
    SELECT
      t.session_id,
      t.realized_pnl,
      public.calculate_effective_pnl(t.realized_pnl, t.total_value, t.side::text) AS effective_pnl,
      t.total_value,
      t.executed_at
    FROM trades t
    WHERE t.user_id = p_user_id
      AND t.mode::text = p_mode
      AND t.session_id IN (SELECT id FROM matched_sessions)
  ),
  trade_agg AS (
    SELECT
      COUNT(*)::bigint AS total_trades,
      COUNT(*) FILTER (WHERE realized_pnl IS NOT NULL AND effective_pnl > 0)::bigint AS winning_trades,
      COUNT(*) FILTER (WHERE realized_pnl IS NOT NULL AND effective_pnl < 0)::bigint AS losing_trades,
      COALESCE(SUM(COALESCE(realized_pnl, 0)), 0) AS total_pnl,
      COALESCE(SUM(total_value), 0) AS total_volume
    FROM session_trades
  ),
  daily_trade_agg AS (
    SELECT COALESCE(SUM(realized_pnl), 0) AS daily_pnl
    FROM session_trades
    WHERE executed_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Oslo')
  ),
  session_agg AS (
    SELECT
      COUNT(*)::bigint AS session_count,
      COALESCE(AVG(ms.total_pnl), 0) AS avg_session_pnl,
      -- FIX: SUM over alle sesjoner (tidligere: kun nyeste sesjon via LIMIT 1)
      COALESCE(SUM(ms.current_capital_nok), 0) AS current_capital
    FROM matched_sessions ms
  )
  SELECT
    COALESCE(ta.total_pnl, 0),
    COALESCE(ta.total_trades, 0),
    COALESCE(ta.winning_trades, 0),
    COALESCE(ta.losing_trades, 0),
    CASE WHEN COALESCE(ta.winning_trades, 0) + COALESCE(ta.losing_trades, 0) > 0
      THEN ROUND(ta.winning_trades::numeric / (ta.winning_trades + ta.losing_trades), 3)
      ELSE 0
    END,
    COALESCE(sa.session_count, 0),
    COALESCE(sa.avg_session_pnl, 0),
    COALESCE(sa.current_capital, 0),
    COALESCE(dta.daily_pnl, 0),
    COALESCE(ta.total_volume, 0)
  FROM trade_agg ta
  CROSS JOIN session_agg sa
  CROSS JOIN daily_trade_agg dta;
END;
$$;

GRANT EXECUTE ON FUNCTION get_dashboard_metrics(UUID, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_metrics(UUID, TEXT, TEXT[]) TO anon;

COMMENT ON FUNCTION get_dashboard_metrics(UUID, TEXT, TEXT[]) IS
  'Unified dashboard metrics. total_capital = SUM of current_capital_nok across ALL matched sessions (fixed 2026-08-07: previously only newest session).';
