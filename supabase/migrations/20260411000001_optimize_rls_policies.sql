-- Migration: Optimize RLS Policies for Performance
-- Date: 2026-04-11
-- Description: Replace auth.uid() with (select auth.uid()) to prevent per-row evaluation
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- ============================================
-- USER PROFILES - Optimize policies
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own leaderboard preference" ON public.user_profiles;
DROP POLICY IF EXISTS "Users read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.user_profiles;

-- Create optimized policies (single policy per action)
CREATE POLICY "user_profiles_select"
  ON public.user_profiles
  FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "user_profiles_insert"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "user_profiles_update"
  ON public.user_profiles
  FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================
-- TRADES - Optimize policies
-- ============================================

DROP POLICY IF EXISTS "Users can manage own trades" ON public.trades;
DROP POLICY IF EXISTS "Users see own trades" ON public.trades;
DROP POLICY IF EXISTS "own_data" ON public.trades;

CREATE POLICY "trades_select"
  ON public.trades
  FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "trades_insert"
  ON public.trades
  FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "trades_update"
  ON public.trades
  FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "trades_delete"
  ON public.trades
  FOR DELETE
  USING (user_id = (select auth.uid()));

-- ============================================
-- TRADING SESSIONS - Optimize policies
-- ============================================

DROP POLICY IF EXISTS "Users manage own sessions" ON public.trading_sessions;
DROP POLICY IF EXISTS "Service role full access trading_sessions" ON public.trading_sessions;

CREATE POLICY "trading_sessions_select"
  ON public.trading_sessions
  FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "trading_sessions_insert"
  ON public.trading_sessions
  FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "trading_sessions_update"
  ON public.trading_sessions
  FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "trading_sessions_delete"
  ON public.trading_sessions
  FOR DELETE
  USING (user_id = (select auth.uid()));

-- Service role access
CREATE POLICY "trading_sessions_service"
  ON public.trading_sessions
  FOR ALL
  USING (current_setting('role', true) = 'service_role');

-- ============================================
-- POSITIONS - Optimize policies
-- ============================================

DROP POLICY IF EXISTS "Users can manage own positions" ON public.positions;
DROP POLICY IF EXISTS "Users manage own positions" ON public.positions;
DROP POLICY IF EXISTS "positions_insert_own" ON public.positions;
DROP POLICY IF EXISTS "positions_select_own" ON public.positions;
DROP POLICY IF EXISTS "positions_update_own" ON public.positions;

CREATE POLICY "positions_select"
  ON public.positions
  FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "positions_insert"
  ON public.positions
  FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "positions_update"
  ON public.positions
  FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "positions_delete"
  ON public.positions
  FOR DELETE
  USING (user_id = (select auth.uid()));

-- ============================================
-- COPY TRADING FOLLOWS - Optimize policies
-- ============================================

DROP POLICY IF EXISTS "Users can manage own follows" ON public.copy_trading_follows;
DROP POLICY IF EXISTS "Users can view own follows" ON public.copy_trading_follows;
DROP POLICY IF EXISTS "Users manage own follows" ON public.copy_trading_follows;
DROP POLICY IF EXISTS "Users see own follows" ON public.copy_trading_follows;

CREATE POLICY "copy_trading_follows_select"
  ON public.copy_trading_follows
  FOR SELECT
  USING (follower_id = (select auth.uid()));

CREATE POLICY "copy_trading_follows_insert"
  ON public.copy_trading_follows
  FOR INSERT
  WITH CHECK (follower_id = (select auth.uid()));

CREATE POLICY "copy_trading_follows_update"
  ON public.copy_trading_follows
  FOR UPDATE
  USING (follower_id = (select auth.uid()))
  WITH CHECK (follower_id = (select auth.uid()));

CREATE POLICY "copy_trading_follows_delete"
  ON public.copy_trading_follows
  FOR DELETE
  USING (follower_id = (select auth.uid()));

-- ============================================
-- NOTIFICATIONS - Optimize policies
-- ============================================

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can manage own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

CREATE POLICY "notifications_select"
  ON public.notifications
  FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "notifications_insert"
  ON public.notifications
  FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "notifications_update"
  ON public.notifications
  FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "notifications_delete"
  ON public.notifications
  FOR DELETE
  USING (user_id = (select auth.uid()));

-- ============================================
-- ONBOARDING PROGRESS - Optimize policies
-- ============================================

DROP POLICY IF EXISTS "Users can view own onboarding progress" ON public.onboarding_progress;
DROP POLICY IF EXISTS "Users can insert own onboarding progress" ON public.onboarding_progress;
DROP POLICY IF EXISTS "Users can update own onboarding progress" ON public.onboarding_progress;
DROP POLICY IF EXISTS "Users can manage own onboarding" ON public.onboarding_progress;
DROP POLICY IF EXISTS "own_data" ON public.onboarding_progress;

CREATE POLICY "onboarding_progress_select"
  ON public.onboarding_progress
  FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "onboarding_progress_insert"
  ON public.onboarding_progress
  FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "onboarding_progress_update"
  ON public.onboarding_progress
  FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "onboarding_progress_delete"
  ON public.onboarding_progress
  FOR DELETE
  USING (user_id = (select auth.uid()));

-- ============================================
-- Add indexes for foreign keys (performance)
-- ============================================

-- Check if indexes exist before creating
DO $$
BEGIN
  -- ai_decision_log
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ai_decision_log_user_id') THEN
    CREATE INDEX idx_ai_decision_log_user_id ON public.ai_decision_log(user_id);
  END IF;

  -- audit_logs
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_logs_signal_id') THEN
    CREATE INDEX idx_audit_logs_signal_id ON public.audit_logs(signal_id);
  END IF;

  -- auto_trade_log
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_auto_trade_log_user_id') THEN
    CREATE INDEX idx_auto_trade_log_user_id ON public.auto_trade_log(user_id);
  END IF;

  -- auto_trade_log (bot_config_id)
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_auto_trade_log_bot_config_id') THEN
    CREATE INDEX idx_auto_trade_log_bot_config_id ON public.auto_trade_log(bot_config_id);
  END IF;

  -- auto_trading_configs
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_auto_trading_configs_risk_profile_id') THEN
    CREATE INDEX idx_auto_trading_configs_risk_profile_id ON public.auto_trading_configs(risk_profile_id);
  END IF;

  -- auto_trading_sessions
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_auto_trading_sessions_user_id') THEN
    CREATE INDEX idx_auto_trading_sessions_user_id ON public.auto_trading_sessions(user_id);
  END IF;

  -- backtest_results
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_backtest_results_user_id') THEN
    CREATE INDEX idx_backtest_results_user_id ON public.backtest_results(user_id);
  END IF;

  -- beta_feedback
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_beta_feedback_user_id') THEN
    CREATE INDEX idx_beta_feedback_user_id ON public.beta_feedback(user_id);
  END IF;

  -- bot_alert_configs
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_bot_alert_configs_user_id') THEN
    CREATE INDEX idx_bot_alert_configs_user_id ON public.bot_alert_configs(user_id);
  END IF;

  -- bot_configs
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_bot_configs_user_id') THEN
    CREATE INDEX idx_bot_configs_user_id ON public.bot_configs(user_id);
  END IF;

  -- chart_signals
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chart_signals_user_id') THEN
    CREATE INDEX idx_chart_signals_user_id ON public.chart_signals(user_id);
  END IF;

  -- email_log
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_email_log_user_id') THEN
    CREATE INDEX idx_email_log_user_id ON public.email_log(user_id);
  END IF;

  -- leaderboard_history
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leaderboard_history_user_id') THEN
    CREATE INDEX idx_leaderboard_history_user_id ON public.leaderboard_history(user_id);
  END IF;

  -- marketplace_listings
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_marketplace_listings_seller_id') THEN
    CREATE INDEX idx_marketplace_listings_seller_id ON public.marketplace_listings(seller_id);
  END IF;

  -- marketplace_listings (strategy_id)
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_marketplace_listings_strategy_id') THEN
    CREATE INDEX idx_marketplace_listings_strategy_id ON public.marketplace_listings(strategy_id);
  END IF;

  -- notification_queue
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notification_queue_user_id') THEN
    CREATE INDEX idx_notification_queue_user_id ON public.notification_queue(user_id);
  END IF;

  -- paper_positions
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_paper_positions_account_id') THEN
    CREATE INDEX idx_paper_positions_account_id ON public.paper_positions(account_id);
  END IF;

  -- quiz_attempts
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_quiz_attempts_quiz_id') THEN
    CREATE INDEX idx_quiz_attempts_quiz_id ON public.quiz_attempts(quiz_id);
  END IF;

  -- quiz_questions
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_quiz_questions_quiz_id') THEN
    CREATE INDEX idx_quiz_questions_quiz_id ON public.quiz_questions(quiz_id);
  END IF;

  -- risk_violations
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_risk_violations_user_id') THEN
    CREATE INDEX idx_risk_violations_user_id ON public.risk_violations(user_id);
  END IF;

  -- saved_strategies
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_saved_strategies_user_id') THEN
    CREATE INDEX idx_saved_strategies_user_id ON public.saved_strategies(user_id);
  END IF;

  -- strategy_reviews
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_strategy_reviews_user_id') THEN
    CREATE INDEX idx_strategy_reviews_user_id ON public.strategy_reviews(user_id);
  END IF;

  -- trade_history
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_trade_history_user_id') THEN
    CREATE INDEX idx_trade_history_user_id ON public.trade_history(user_id);
  END IF;

  -- xp_transactions
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_xp_transactions_user_id') THEN
    CREATE INDEX idx_xp_transactions_user_id ON public.xp_transactions(user_id);
  END IF;
END $$;

-- ============================================
-- Remove unused indexes (cleanup)
-- ============================================

DO $$
BEGIN
  -- List of indexes to remove (confirmed unused)
  DROP INDEX IF EXISTS public.idx_user_profiles_dismissed_card;
  DROP INDEX IF EXISTS public.idx_klt_transactions_type;
  DROP INDEX IF EXISTS public.idx_kelly_stats_user_id;
  DROP INDEX IF EXISTS public.idx_optimal_trades_user_id;
  DROP INDEX IF EXISTS public.idx_binance_balances_user;
  DROP INDEX IF EXISTS public.idx_user_gamification_xp;
  DROP INDEX IF EXISTS public.idx_user_roles_role;
  DROP INDEX IF EXISTS public.idx_vipps_payments_course_id;
  DROP INDEX IF EXISTS public.idx_vipps_payments_user_id;
  DROP INDEX IF EXISTS public.idx_marketplace_subscriptions_listing_id;
  DROP INDEX IF EXISTS public.idx_marketplace_subscriptions_user_strategy_id;
END $$;

-- ============================================
-- Function security fixes (search_path)
-- ============================================

-- Fix functions without search_path
ALTER FUNCTION public.cleanup_old_notifications SET search_path = public;
ALTER FUNCTION public.sync_capital_nok_columns SET search_path = public;
ALTER FUNCTION public.update_regime_cache_updated_at SET search_path = public;
ALTER FUNCTION public.calculate_daily_loss SET search_path = public;
ALTER FUNCTION public.update_sonar_sentiment_cache_updated_at SET search_path = public;
ALTER FUNCTION public.check_beta_kill_switch SET search_path = public;

-- ============================================
-- Notes for remaining manual fixes:
-- ============================================
-- 1. RLS policies for service_role tables need manual review
-- 2. Tables with "always true" policies (intentional for public access):
--    - beta_signups, waitlist, page_visits, signup_funnel, system_alerts
--    These are intentional and should not be changed
-- 3. pg_net extension: Consider moving to separate schema if security concern
