-- DB Schema Cleanup Phase 2: Remove redundant indexes and add ON DELETE to remaining FK's

-- Drop redundant indexes (keep the best-named one)
DROP INDEX IF EXISTS public.idx_ai_decision_log_user_id;
DROP INDEX IF EXISTS public.auto_trade_log_user_id_idx;
DROP INDEX IF EXISTS public.idx_auto_trading_backtests_user_id;
DROP INDEX IF EXISTS public.idx_auto_trading_configs_user_id;
DROP INDEX IF EXISTS public.idx_auto_trading_sessions_user;
DROP INDEX IF EXISTS public.bot_configs_user_id_idx;
DROP INDEX IF EXISTS public.idx_notifications_is_read;
DROP INDEX IF EXISTS public.idx_profiles_role;
DROP INDEX IF EXISTS public.idx_quiz_attempts_quiz;
DROP INDEX IF EXISTS public.idx_quiz_questions_quiz;
DROP INDEX IF EXISTS public.idx_trades_session;
DROP INDEX IF EXISTS public.idx_trades_user;
DROP INDEX IF EXISTS public.idx_sessions_heartbeat;

-- Add ON DELETE CASCADE (child has no meaning without parent)
ALTER TABLE public.archived_trade_summaries DROP CONSTRAINT archived_trade_summaries_user_id_fkey;
ALTER TABLE public.archived_trade_summaries ADD CONSTRAINT archived_trade_summaries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.audit_logs DROP CONSTRAINT audit_logs_user_id_fkey;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.binance_key_access_log DROP CONSTRAINT binance_key_access_log_user_id_fkey;
ALTER TABLE public.binance_key_access_log ADD CONSTRAINT binance_key_access_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.copy_trade_queue DROP CONSTRAINT copy_trade_queue_follower_id_fkey;
ALTER TABLE public.copy_trade_queue ADD CONSTRAINT copy_trade_queue_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.copy_trade_queue DROP CONSTRAINT copy_trade_queue_leader_id_fkey;
ALTER TABLE public.copy_trade_queue ADD CONSTRAINT copy_trade_queue_leader_id_fkey FOREIGN KEY (leader_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.league_participants DROP CONSTRAINT league_participants_league_id_fkey;
ALTER TABLE public.league_participants ADD CONSTRAINT league_participants_league_id_fkey FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE;

ALTER TABLE public.notification_queue DROP CONSTRAINT notification_queue_user_id_fkey;
ALTER TABLE public.notification_queue ADD CONSTRAINT notification_queue_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_auto_trading_configs DROP CONSTRAINT user_auto_trading_configs_strategy_id_fkey;
ALTER TABLE public.user_auto_trading_configs ADD CONSTRAINT user_auto_trading_configs_strategy_id_fkey FOREIGN KEY (strategy_id) REFERENCES auto_trading_strategies(id) ON DELETE CASCADE;

ALTER TABLE public.user_badges DROP CONSTRAINT user_badges_badge_id_fkey;
ALTER TABLE public.user_badges ADD CONSTRAINT user_badges_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE;

ALTER TABLE public.user_roles DROP CONSTRAINT user_roles_user_id_fkey;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add ON DELETE SET NULL (child can exist without parent)
ALTER TABLE public.audit_logs DROP CONSTRAINT audit_logs_signal_id_fkey;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_signal_id_fkey FOREIGN KEY (signal_id) REFERENCES signals(id) ON DELETE SET NULL;

ALTER TABLE public.client_errors DROP CONSTRAINT client_errors_resolved_by_fkey;
ALTER TABLE public.client_errors ADD CONSTRAINT client_errors_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.copy_trade_queue DROP CONSTRAINT copy_trade_queue_original_trade_id_fkey;
ALTER TABLE public.copy_trade_queue ADD CONSTRAINT copy_trade_queue_original_trade_id_fkey FOREIGN KEY (original_trade_id) REFERENCES trades(id) ON DELETE SET NULL;

ALTER TABLE public.profiles DROP CONSTRAINT profiles_referred_by_fkey;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public.signals DROP CONSTRAINT signals_created_by_fkey;
ALTER TABLE public.signals ADD CONSTRAINT signals_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.signals DROP CONSTRAINT signals_processed_by_fkey;
ALTER TABLE public.signals ADD CONSTRAINT signals_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.trade_decisions DROP CONSTRAINT trade_decisions_risk_profile_id_fkey;
ALTER TABLE public.trade_decisions ADD CONSTRAINT trade_decisions_risk_profile_id_fkey FOREIGN KEY (risk_profile_id) REFERENCES risk_profiles(id) ON DELETE SET NULL;

ALTER TABLE public.trades DROP CONSTRAINT trades_leader_trade_id_fkey;
ALTER TABLE public.trades ADD CONSTRAINT trades_leader_trade_id_fkey FOREIGN KEY (leader_trade_id) REFERENCES trades(id) ON DELETE SET NULL;
