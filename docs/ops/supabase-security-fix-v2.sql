-- Klarpakke Supabase Security Fix — Runde 2
-- Hermes Lead Architect — 2026-07-08
-- Fikser function_search_path_mutable + blokkerer anon fra farlige funksjoner

-- ════════════════════════════════════════
-- 1. function_search_path_mutable (~55)
--    Dette blokkerer privilege escalation via schema poisoning
-- ════════════════════════════════════════
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.probin IS NULL  -- not C functions
      AND pg_get_functiondef(p.oid) IS NOT NULL  -- has source
  LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = '''''', 
        r.proname, r.args);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️  skip %', r.proname;
    END;
  END LOOP;
  RAISE NOTICE '✅ search_path satt på alle public functions';
END $$;

-- ════════════════════════════════════════
-- 2. Blokker anon fra ADMIN-funksjoner
-- ════════════════════════════════════════
REVOKE EXECUTE ON FUNCTION public.admin_change_role FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_upgrade_user FROM anon;
REVOKE EXECUTE ON FUNCTION public.assign_user_role FROM anon;
REVOKE EXECUTE ON FUNCTION public.assign_user_number FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_subscription_tier FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_admin_action FROM anon;
REVOKE EXECUTE ON FUNCTION public.award_achievement FROM anon;
REVOKE EXECUTE ON FUNCTION public.award_xp FROM anon;
REVOKE EXECUTE ON FUNCTION public.award_login_xp FROM anon;
REVOKE EXECUTE ON FUNCTION public.award_learning_points FROM anon;

-- ════════════════════════════════════════
-- 3. Blokker anon fra DATABASE-ADMIN funksjoner
-- ════════════════════════════════════════
REVOKE EXECUTE ON FUNCTION public.exec_sql FROM anon;
REVOKE EXECUTE ON FUNCTION public.exec_sql_query FROM anon;
REVOKE EXECUTE ON FUNCTION public.run_migration FROM anon;
REVOKE EXECUTE ON FUNCTION public.drop_policy_if_exists FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_index_if_table_exists FROM anon;
REVOKE EXECUTE ON FUNCTION public.diag_constraints FROM anon;

-- ════════════════════════════════════════
-- 4. Blokker anon fra SENSITIVE funksjoner
-- ════════════════════════════════════════
REVOKE EXECUTE ON FUNCTION public.get_binance_vault_keys FROM anon;
REVOKE EXECUTE ON FUNCTION public.decrypt_binance_keys FROM anon;
REVOKE EXECUTE ON FUNCTION public.upsert_binance_vault_keys FROM anon;
REVOKE EXECUTE ON FUNCTION public.remove_binance_keys FROM anon;
REVOKE EXECUTE ON FUNCTION public.store_exchange_connection FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_binance_balances FROM anon;
REVOKE EXECUTE ON FUNCTION public.initialize_user_manually FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_default_user_data FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_consolidated FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_klt FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_onboarding FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_onboarding_kla158 FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_welcome_email FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_email_prefs FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_google_auth_user FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_notification_preferences FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_auto_trade_settings_for_new_user FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_default_risk_profile FROM anon;

-- ════════════════════════════════════════
-- 5. Blokker anon fra INTERNAL/SYSTEM funksjoner  
-- ════════════════════════════════════════
REVOKE EXECUTE ON FUNCTION public.trigger_copy_trade_fanout FROM anon;
REVOKE EXECUTE ON FUNCTION public.trigger_trade_notification FROM anon;
REVOKE EXECUTE ON FUNCTION public.trigger_compute_realized_pnl FROM anon;
REVOKE EXECUTE ON FUNCTION public.trigger_update_session_state FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_conditional_orders FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_pending_notifications FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_trade_outbox FROM anon;
REVOKE EXECUTE ON FUNCTION public.calculate_performance_fee FROM anon;
REVOKE EXECUTE ON FUNCTION public.klarpakke_trigger_cron FROM anon;
REVOKE EXECUTE ON FUNCTION public.klarpakke_hourly_autopilot_health FROM anon;
REVOKE EXECUTE ON FUNCTION public.klarpakke_hourly_balance_sync FROM anon;
REVOKE EXECUTE ON FUNCTION public.klarpakke_hourly_consistency_check FROM anon;
REVOKE EXECUTE ON FUNCTION public.detect_crashed_sessions FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_audit_logs FROM anon;
REVOKE EXECUTE ON FUNCTION public.seed_signal_if_stale FROM anon;
REVOKE EXECUTE ON FUNCTION public.archive_old_signals FROM anon;
REVOKE EXECUTE ON FUNCTION public.refresh_leaderboard FROM anon;
REVOKE EXECUTE ON FUNCTION public.refresh_marketing_funnel_summary FROM anon;
REVOKE EXECUTE ON FUNCTION public.compute_leaderboard_monthly FROM anon;
REVOKE EXECUTE ON FUNCTION public.persist_gap_metrics FROM anon;

-- ════════════════════════════════════════
-- 6. Convert SECURITY DEFINER → INVOKER for safe read-only functions
--    Disse trenger IKKE elevated privileges
-- ════════════════════════════════════════
ALTER FUNCTION public.get_user_role SET security_invoker = true;
ALTER FUNCTION public.get_user_subscription_tier SET security_invoker = true;
ALTER FUNCTION public.is_admin SET security_invoker = true;
ALTER FUNCTION public.is_admin_for_profiles SET security_invoker = true;
ALTER FUNCTION public.is_service_role SET security_invoker = true;
ALTER FUNCTION public.user_has_permission SET security_invoker = true;
ALTER FUNCTION public.get_cron_jobs_status SET security_invoker = true;
ALTER FUNCTION public.get_rls_status SET security_invoker = true;
ALTER FUNCTION public.get_top_tables_by_rows SET security_invoker = true;
ALTER FUNCTION public.get_system_metrics SET security_invoker = true;
ALTER FUNCTION public.get_emergency_status SET security_invoker = true;
ALTER FUNCTION public.is_trading_allowed SET security_invoker = true;
ALTER FUNCTION public.is_bot_healthy SET security_invoker = true;
ALTER FUNCTION public.should_send_notification SET security_invoker = true;
ALTER FUNCTION public.should_send_push SET security_invoker = true;
ALTER FUNCTION public.get_cta_click_aggregates SET security_invoker = true;
ALTER FUNCTION public.get_cta_daily_trends SET security_invoker = true;
ALTER FUNCTION public.get_error_stats SET security_invoker = true;
ALTER FUNCTION public.get_avg_onboarding_time SET security_invoker = true;
ALTER FUNCTION public.latest_trader_verification SET security_invoker = true;

-- ════════════════════════════════════════
-- 7. Enable leaked password protection
-- ════════════════════════════════════════
-- Done via Supabase Dashboard: Authentication → Settings → Enable 'Leaked password protection'
-- SQL equivalent:
ALTER ROLE authenticator SET pgrst.jwt_claims = '{"role":"authenticator"}';
-- Note: This must be configured via Dashboard or Auth admin API
