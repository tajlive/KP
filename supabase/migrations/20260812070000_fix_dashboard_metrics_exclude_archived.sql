-- KLA-268: get_dashboard_metrics — filtrer arkiverte sesjoner.
-- 
-- Root cause (2026-08-12): matched_sessions mangler archived = false-filter.
-- Når p_statuses inkluderer "stopped", plukker RPC-en opp arkiverte sesjoner
-- og teller deres handler/sesjoner/volum inn i aktive dashboard-statistikker.
-- 2 av 4 brukere berørt (brukere med arkiverte sesjoner).
--
-- Fiks: legg archived = false i matched_sessions WHERE-clause.
-- Dette er riktig for ALLE kallere — arkiverte sesjoner er soft-delete og
-- skal ALDRI telle i dashboard.
--
-- Rollback: DROP + re-create uten archived-filter (se bunnen av filen).

DROP FUNCTION IF EXISTS get_dashboard_metrics(uuid, text, text[], timestamptz);

CREATE OR REPLACE FUNCTION get_dashboard_metrics(
  p_user_id uuid,
  p_mode text,
  p_statuses text[],
  p_cutoff timestamptz DEFAULT '2026-07-30T00:00:00Z'
)
RETURNS TABLE (
  total_pnl numeric,
  total_trades bigint,
  winning_trades bigint,
  losing_trades bigint,
  win_rate numeric,
  session_count bigint,
  avg_session_pnl numeric,
  current_capital numeric,
  daily_pnl numeric,
  total_volume numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH matched_sessions AS (
    SELECT s.id, s.current_capital_nok, s.total_pnl, s.created_at, s.status
    FROM trading_sessions s
    WHERE s.user_id = p_user_id
      AND s.mode::text = p_mode
      AND s.status::text = ANY(p_statuses)
      AND s.archived = false   -- KLA-268: arkiverte sesjoner er soft-delete
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
      AND t.executed_at >= p_cutoff
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
      COALESCE(SUM(ms.current_capital_nok) FILTER (WHERE ms.status::text = 'active'), 0) AS current_capital
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

GRANT EXECUTE ON FUNCTION get_dashboard_metrics(uuid, text, text[], timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_metrics(uuid, text, text[], timestamptz) TO anon;

COMMENT ON FUNCTION get_dashboard_metrics(uuid, text, text[], timestamptz) IS
  'Dashboard metrics. KLA-268 (2026-08-12): arkiverte sesjoner filtreres (archived=false). P0-fiks 2026-08-09: total_capital kun fra aktive. P1-A 2026-08-11: cutoff-filter.';

-- ── ROLLBACK ──────────────────────────────────────────────────────────────────
-- Kjøres ved behov for å rulle tilbake til versjon uten archived-filter:
--
-- DROP FUNCTION IF EXISTS get_dashboard_metrics(uuid, text, text[], timestamptz);
-- CREATE OR REPLACE FUNCTION get_dashboard_metrics(
--   p_user_id uuid, p_mode text, p_statuses text[],
--   p_cutoff timestamptz DEFAULT '2026-07-30T00:00:00Z'
-- ) ... (kopi av 20260811150000 uten archived-filter) ...