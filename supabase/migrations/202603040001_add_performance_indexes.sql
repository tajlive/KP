/*
-- ═══════════════════════════════════════════════════════════════════════════
-- PERFORMANCE INDEXES - Added 2026-03-04
-- ═══════════════════════════════════════════════════════════════════════════

-- For leaderboard queries (hyppig brukt)
-- CREATE INDEX IF NOT EXISTS idx_trading_stats_win_rate 
--   ON trading_stats(user_id, win_rate DESC) 
--   WHERE total_trades > 10;

-- For copy-trading (viktig for ytelse)
-- CREATE INDEX IF NOT EXISTS idx_copy_relationships_leader 
--   ON copy_trading_relationships(leader_id, is_active) 
--   WHERE is_active = true;

-- For paper trading sessions
-- CREATE INDEX IF NOT EXISTS idx_paper_simulations_active 
--   ON paper_simulations(user_id, is_active, created_at DESC);

-- For execution logs (analyse)
-- CREATE INDEX IF NOT EXISTS idx_execution_logs_analysis 
--   ON execution_logs(user_id, trading_mode, created_at DESC);

-- For auto-trading trades (hovedtabell)
-- CREATE INDEX IF NOT EXISTS idx_auto_trades_user_status 
--   ON auto_trading_trades(user_id, status, created_at DESC);

-- For trades lookup
-- CREATE INDEX IF NOT EXISTS idx_trades_symbol_time 
--   ON trades(symbol, executed_at DESC); -- trades uses trading_pair, not symbol!

-- COMMENT ON INDEX idx_trading_stats_win_rate IS 'Optimalisert for leaderboard queries';
-- COMMENT ON INDEX idx_copy_relationships_leader IS 'Optimalisert for copy-trading follower lookup';
-- CREATE INDEX IF NOT EXISTS idx_paper_simulations_active 
--   ON paper_simulations(user_id, is_active, created_at DESC);
-- COMMENT ON INDEX idx_paper_simulations_active IS 'Rask lookup av aktive simuleringer';
*/
