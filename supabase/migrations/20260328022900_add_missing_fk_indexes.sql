-- Migration: Add missing foreign key indexes
-- Created: 2026-03-28
-- Risk Level: LOW (adding indexes only, no data changes)
-- Benefit: Improves DELETE/UPDATE/JOIN performance on foreign keys
-- Tables affected: 33

-- ============================================================
-- AUTO TRADING TABLES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_auto_trade_log_bot_config_id ON auto_trade_log(bot_config_id);
CREATE INDEX IF NOT EXISTS idx_auto_trading_configs_risk_profile_id ON auto_trading_configs(risk_profile_id);
CREATE INDEX IF NOT EXISTS idx_auto_trading_sessions_user_id ON auto_trading_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_trading_backtests_user_id ON auto_trading_backtests(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_trades_user_id ON auto_trades(user_id);

-- ============================================================
-- COPY TRADING TABLES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_copy_trade_queue_follower_id ON copy_trade_queue(follower_id);
CREATE INDEX IF NOT EXISTS idx_copy_trade_queue_leader_id ON copy_trade_queue(leader_id);
CREATE INDEX IF NOT EXISTS idx_copy_trading_follows_follower_id ON copy_trading_follows(follower_id);

-- ============================================================
-- MARKETPLACE TABLES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller_id ON marketplace_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_strategy_id ON marketplace_listings(strategy_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_subscriptions_listing_id ON marketplace_subscriptions(listing_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_subscriptions_user_strategy_id ON marketplace_subscriptions(user_strategy_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_subscriptions_subscriber_id ON marketplace_subscriptions(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_performance_fees_creator_id ON performance_fees(creator_id);
CREATE INDEX IF NOT EXISTS idx_performance_fees_follower_id ON performance_fees(follower_id);
CREATE INDEX IF NOT EXISTS idx_performance_fees_strategy_id ON performance_fees(strategy_id);

-- ============================================================
-- TRADING TABLES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_trade_history_user_id ON trade_history(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_decisions_risk_profile_id ON trade_decisions(risk_profile_id);
CREATE INDEX IF NOT EXISTS idx_trade_rejections_risk_profile_id ON trade_rejections(risk_profile_id);
CREATE INDEX IF NOT EXISTS idx_trades_leader_trade_id ON trades(leader_trade_id);
CREATE INDEX IF NOT EXISTS idx_saved_strategies_user_id ON saved_strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_strategy_reviews_user_id ON strategy_reviews(user_id);

-- ============================================================
-- USER & CONFIG TABLES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_beta_feedback_user_id ON beta_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_alert_configs_user_id ON bot_alert_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_chart_signals_user_id ON chart_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_logs_user_id ON trading_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_unified_circuit_breaker_logs_user_id ON unified_circuit_breaker_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_unified_daily_metrics_user_id ON unified_daily_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_auto_trading_configs_strategy_id ON user_auto_trading_configs(strategy_id);
CREATE INDEX IF NOT EXISTS idx_user_trading_config_referred_by ON user_trading_config(referred_by);
CREATE INDEX IF NOT EXISTS idx_vipps_payments_course_id ON vipps_payments(course_id);
CREATE INDEX IF NOT EXISTS idx_vipps_payments_user_id ON vipps_payments(user_id);

-- ============================================================
-- VERIFICATION QUERY
-- ============================================================
-- After migration, run:
-- SELECT count(*) as new_indexes FROM pg_indexes 
-- WHERE indexname LIKE 'idx_%' 
-- AND schemaname = 'public'
-- AND indexdef LIKE '%2026-03-28%';  -- Check creation time
