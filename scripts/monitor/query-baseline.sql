-- Baseline query for 48h monitoring
-- Run: psql "..." -f scripts/monitor/query-baseline.sql

WITH session_stats AS (
  SELECT 
    strategy_id,
    COUNT(*) as total_trades,
    SUM(CASE WHEN realized_pnl > 0 THEN 1 ELSE 0 END) as wins,
    SUM(CASE WHEN realized_pnl < 0 THEN 1 ELSE 0 END) as losses,
    AVG(realized_pnl) as avg_pnl,
    SUM(realized_pnl) as total_pnl,
    STDDEV(realized_pnl) as pnl_stddev
  FROM trades t
  JOIN trading_sessions s ON t.session_id = s.id
  WHERE t.created_at > NOW() - INTERVAL '24 hours'
    AND t.status = 'filled'
    AND t.realized_pnl IS NOT NULL
  GROUP BY strategy_id
),
portfolio AS (
  SELECT 
    user_id,
    SUM(initial_capital) as total_initial,
    SUM(current_capital) as total_current,
    ((SUM(initial_capital) - SUM(current_capital)) / NULLIF(SUM(initial_capital), 0)) * 100 as drawdown_pct
  FROM trading_sessions
  WHERE status IN ('active', 'stopped')
    AND (archived IS NULL OR archived = false)
  GROUP BY user_id
),
mtf_log AS (
  SELECT 
    COUNT(*) as total_mtf_logs,
    SUM(CASE WHEN details->>'mtf_blocked' = 'true' THEN 1 ELSE 0 END) as mtf_blocked_count
  FROM trading_logs
  WHERE action = 'regime_signal'
    AND created_at > NOW() - INTERVAL '24 hours'
),
position_size AS (
  SELECT 
    AVG((strategy_signal->>'position_size')::numeric) as avg_position_size,
    MAX((strategy_signal->>'position_size')::numeric) as max_position_size
  FROM trades
  WHERE created_at > NOW() - INTERVAL '24 hours'
    AND strategy_signal ? 'position_size'
)
SELECT json_build_object(
  'timestamp', NOW(),
  'period_hours', 24,
  'win_rate', (SELECT CASE WHEN SUM(total_trades) > 0 THEN SUM(wins)::numeric / SUM(total_trades) ELSE 0 END FROM session_stats),
  'total_trades', (SELECT COALESCE(SUM(total_trades), 0) FROM session_stats),
  'total_wins', (SELECT COALESCE(SUM(wins), 0) FROM session_stats),
  'total_losses', (SELECT COALESCE(SUM(losses), 0) FROM session_stats),
  'avg_drawdown_pct', (SELECT AVG(drawdown_pct) FROM portfolio),
  'max_drawdown_pct', (SELECT MAX(drawdown_pct) FROM portfolio),
  'sharpe_ratio', (SELECT CASE WHEN pnl_stddev > 0 THEN (avg_pnl / NULLIF(pnl_stddev, 0)) * sqrt(365) ELSE 0 END FROM session_stats LIMIT 1),
  'mtf_block_pct', (SELECT CASE WHEN total_mtf_logs > 0 THEN (mtf_blocked_count::numeric / total_mtf_logs) * 100 ELSE 0 END FROM mtf_log),
  'avg_position_size_pct', (SELECT COALESCE(avg_position_size, 0) * 100 FROM position_size),
  'max_position_size_pct', (SELECT COALESCE(max_position_size, 0) * 100 FROM position_size),
  'p0_errors', (SELECT COUNT(*) FROM trading_logs WHERE action = 'error' AND created_at > NOW() - INTERVAL '24 hours'),
  'strategy_breakdown', (SELECT json_agg(json_build_object('strategy_id', strategy_id, 'trades', total_trades, 'wins', wins, 'losses', losses, 'win_rate', CASE WHEN total_trades > 0 THEN wins::numeric / total_trades ELSE 0 END)) FROM session_stats)
) as metrics;
