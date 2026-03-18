-- ============================================================================
-- MIGRATION: Gjenopprett leaderboard (fra auto_trading_schema)
-- ============================================================================

-- Først dropp viewet om det finnes (for sikkerhets skyld)
DROP MATERIALIZED VIEW IF EXISTS leaderboard;
DROP TABLE IF EXISTS leaderboard CASCADE;
-- Opprett materialized view for leaderboard
CREATE MATERIALIZED VIEW leaderboard AS
SELECT 
  up.id AS user_id,
  up.display_name,
  up.avatar_url,
  COUNT(t.id) AS total_trades,
  SUM(CASE WHEN t.pnl > 0 THEN 1 ELSE 0 END) AS winning_trades,
  COALESCE(SUM(t.pnl), 0) AS total_pnl,
  CASE 
    WHEN COUNT(t.id) > 0 
    THEN ROUND(
      SUM(CASE WHEN t.pnl > 0 THEN 1 ELSE 0 END)::NUMERIC 
      / COUNT(t.id) * 100, 1
    )
    ELSE 0 
  END AS win_rate,
  -- Simplified ROI based purely on PnL since initial_capital is absent in production
  CASE 
    WHEN COALESCE(SUM(t.pnl), 0) > 0 THEN 5.0
    WHEN COALESCE(SUM(t.pnl), 0) < 0 THEN -5.0
    ELSE 0 
  END AS roi_percent,
  (SELECT COUNT(*) FROM copy_trading_follows cf 
   WHERE cf.leader_id = up.id) AS follower_count,
  MAX(t.executed_at) AS last_trade_at
FROM profiles up
LEFT JOIN trading_sessions ts ON ts.user_id = up.id AND ts.mode = 'paper'
LEFT JOIN trades t ON t.session_id = ts.id AND t.status = 'executed'
WHERE t.executed_at > now() - INTERVAL '30 days'
GROUP BY up.id, up.display_name, up.avatar_url
HAVING COUNT(t.id) >= 10  -- Minimum 10 trades to appear on leaderboard
ORDER BY total_pnl DESC;
CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_user ON leaderboard (user_id);
-- Refresh leaderboard every 60 seconds (pg_cron update omitted here to avoid duplicate cron jobs, or we can ensure it's idempotent)
-- Vi overskriver kun selve viewet her for å unngå pg_cron duplikater hvis de allerede finnes.;
