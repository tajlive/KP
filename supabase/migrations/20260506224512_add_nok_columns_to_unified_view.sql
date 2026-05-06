-- ============================================================================
-- Add current_capital_nok and starting_capital_nok to unified_trading_sessions
-- Date: 2026-05-06
-- Context: The unified view was missing NOK columns, causing UI to show wrong
--          currency values. Bot dashboard and other consumers expect NOK.
-- ============================================================================

DROP VIEW IF EXISTS public.unified_trading_sessions CASCADE;

CREATE VIEW public.unified_trading_sessions
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
  ts.current_capital_nok,
  ts.initial_capital,
  ts.starting_capital_nok,
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
  (SELECT MAX(t.executed_at) FROM trades t WHERE t.session_id = ts.id) AS last_trade_at,
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

COMMENT ON VIEW public.unified_trading_sessions IS 'Unified view over trading_sessions for dashboard/RPC. Includes NOK columns for correct currency display.';
