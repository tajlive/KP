-- ============================================================================
-- 📊 COMPOSITE INDEXES - OPTIMIZATION PHASE
-- ============================================================================
-- Forbedrer ytelse på dashboard og bot-status queries

-- 1. Index for bot-status P&L og historikk
CREATE INDEX IF NOT EXISTS idx_trades_user_id_executed_at 
ON trades(user_id, executed_at DESC);
-- 2. Index for aktiv strategi-oppslag
CREATE INDEX IF NOT EXISTS idx_user_strategies_user_id_status_created_at 
ON user_strategies(user_id, status, created_at DESC);
-- 3. Index for trading_sessions fallback
CREATE INDEX IF NOT EXISTS idx_trading_sessions_user_id_status_created_at 
ON trading_sessions(user_id, status, created_at DESC);
-- 4. Index for leaderboard og resultater
CREATE INDEX IF NOT EXISTS idx_trades_user_id_realized_pnl 
ON trades(user_id, realized_pnl DESC) 
WHERE realized_pnl IS NOT NULL;
