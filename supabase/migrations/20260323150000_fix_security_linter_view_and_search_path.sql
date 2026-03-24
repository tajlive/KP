-- Supabase database linter (mars 2026):
-- 1) ERROR security_definer_view on public.unified_trading_sessions → security_invoker so RLS applies to caller.
-- 2) WARN function_search_path_mutable on handle_new_user, can_follow_leader, decrypt_binance_keys.

CREATE OR REPLACE VIEW public.unified_trading_sessions
WITH (security_invoker = true)
AS
SELECT
  ts.id,
  ts.user_id,
  ts.mode::TEXT AS mode,
  ts.status::TEXT AS status,
  ts.strategy_id AS strategy,
  ts.strategy_config AS config,
  ts.trading_pair AS symbol,
  ts.current_capital,
  ts.initial_capital,
  ts.total_pnl,
  CASE
    WHEN ts.initial_capital > 0 THEN (ts.total_pnl / ts.initial_capital) * 100
    ELSE 0
  END AS total_pnl_pct,
  ts.total_trades,
  ts.winning_trades,
  ts.losing_trades,
  CASE
    WHEN ts.total_trades > 0 THEN (ts.winning_trades::NUMERIC / ts.total_trades::NUMERIC) * 100
    ELSE 0
  END AS win_rate,
  ts.max_drawdown_pct,
  ts.open_position,
  ts.last_heartbeat,
  (SELECT MAX(t.executed_at) FROM public.trades t WHERE t.session_id = ts.id) AS last_trade_at,
  ts.started_at,
  ts.stopped_at,
  ts.created_at,
  ts.updated_at,
  NULL::UUID AS copy_of_session_id,
  NULL::TEXT AS currency,
  NULL::NUMERIC AS daily_loss_limit_pct,
  NULL::NUMERIC AS stop_loss_pct,
  NULL::NUMERIC AS take_profit_pct,
  NULL::NUMERIC AS max_position_pct,
  FALSE AS is_public,
  0::INTEGER AS followers_count
FROM public.trading_sessions ts;

COMMENT ON VIEW public.unified_trading_sessions IS 'Unified view over trading_sessions. security_invoker=true for Supabase linter / correct RLS evaluation.';

ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_catalog;
ALTER FUNCTION public.can_follow_leader(UUID) SET search_path = public, pg_catalog;
ALTER FUNCTION public.decrypt_binance_keys(UUID, UUID) SET search_path = public, pg_catalog;
