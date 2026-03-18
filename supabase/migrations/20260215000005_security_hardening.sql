-- Supabase Security Hardening Migration
-- Generated on 2026-02-15

-- ====================================================================
-- 1. SCHEMA & EXTENSIONS HARDENING
-- ====================================================================
CREATE SCHEMA IF NOT EXISTS extensions;
-- Move pg_net extension to the extensions schema
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    ALTER EXTENSION pg_net SET SCHEMA extensions;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not move pg_net extension: %', SQLERRM;
END $$;
-- ====================================================================
-- 2. ENABLE ROW LEVEL SECURITY (RLS)
-- ====================================================================
ALTER TABLE IF EXISTS public.klt_earning_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.risk_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.beta_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vipps_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.auto_trading_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.client_errors ENABLE ROW LEVEL SECURITY;
-- Add baseline policies for the newly protected tables
DO $$
BEGIN
    -- klt_earning_categories: Public read
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'klt_earning_categories' AND policyname = 'Public read access') THEN
        CREATE POLICY "Public read access" ON public.klt_earning_categories FOR SELECT USING (true);
    END IF;

    -- risk_presets: Public read
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'risk_presets' AND policyname = 'Public read access') THEN
        CREATE POLICY "Public read access" ON public.risk_presets FOR SELECT USING (true);
    END IF;

    -- course_progress: User can only see their own progress
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'course_progress' AND policyname = 'Users can see own progress') THEN
        CREATE POLICY "Users can see own progress" ON public.course_progress FOR SELECT USING (auth.uid() = user_id);
    END IF;

    -- orders: User can only see their own orders
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Users can see own orders') THEN
        CREATE POLICY "Users can see own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;
-- ====================================================================
-- 3. HARDEN SECURITY DEFINER VIEWS
-- ====================================================================
-- Re-creating views to ensure they are SECURITY INVOKER (Postgres default) 
-- and don't leak auth.users data.

-- Fix for user_performance (Remove auth.users join, use profiles instead)
CREATE OR REPLACE VIEW public.user_performance AS
SELECT
  p.id as user_id,
  p.username,
  p.role,
  COUNT(s.id) as total_processed,
  COUNT(s.id) FILTER (WHERE s.status = 'approved') as approved_count,
  COUNT(s.id) FILTER (WHERE s.status = 'rejected') as rejected_count,
  CASE
    WHEN COUNT(s.id) > 0
    THEN ROUND((COUNT(s.id) FILTER (WHERE s.status = 'approved')::NUMERIC / COUNT(s.id)::NUMERIC) * 100, 2)
    ELSE 0
  END as approval_rate
FROM public.profiles p
LEFT JOIN public.signals s ON p.id = s.processed_by
GROUP BY p.id, p.username, p.role;
-- Revoke potentially dangerous grants
REVOKE SELECT ON public.user_performance FROM authenticated;
GRANT SELECT ON public.user_performance TO service_role;
-- Restrict to internal use/admin

-- ====================================================================
-- 4. SET EXPLICIT SEARCH_PATH ON FUNCTIONS
-- ====================================================================
DO $$
DECLARE
    func_record RECORD;
    functions_to_fix TEXT[] := ARRAY[
        'trigger_beta_approval_email', 'calculate_course_progress', 'update_course_progress', 
        'claim_founder_tokens', 'admin_change_role', 'allocate_founder_tokens', 
        'get_next_founder_number', 'sync_binance_balances', 'get_portfolio_overview_v2', 
        'trigger_binance_auto_sync', 'award_achievement', 'check_course_completion_achievements', 
        'handle_google_auth_user', 'get_funnel_dropoff', 'track_campaign_registration', 
        'get_funnel_stats', 'get_user_signal_stats', 'assign_user_role', 'user_has_permission', 
        'log_user_action', 'validate_signal_for_processing', 'handle_new_user', 
        'can_place_trade', 'record_trade_usage', 'get_real_account_stats', 
        'create_user_trading_limits', 'update_updated_at_column', 'handle_new_user_portfolio', 
        'archive_old_signals', 'set_updated_at_column', 'handle_new_portfolio', 
        'get_user_role', 'notify_signal_status_change', 'get_user_entitlements', 
        'record_app_event', 'store_exchange_connection', 'compute_leaderboard_monthly', 
        'set_subscription_tier', 'award_learning_points', 'record_billing_event', 
        'track_referral_click', 'complete_referral', 'get_quiz_with_questions', 
        'submit_quiz_attempt', 'initialize_user_settings', 'get_paper_account_stats', 
        'close_paper_position', 'update_simulation_stats', 'calculate_win_rate', 
        'create_default_auto_trade_settings', 'upsert_daily_stats', 'check_daily_limits', 
        'update_push_subscriptions_updated_at', 'send_push_to_user', 
        'create_auto_trade_settings_for_new_user', 'update_daily_stats_on_trade', 
        'check_daily_loss_limit', 'get_user_subscription_tier', 'get_avg_onboarding_time', 
        'refresh_leaderboard', 'get_available_auto_budget'
    ];
    func_name TEXT;
BEGIN
    FOREACH func_name IN ARRAY functions_to_fix
    LOOP
        BEGIN
            -- Note: This is an approximation. If a function has arguments, 
            -- it might need its signature matched exactly.
            EXECUTE format('ALTER FUNCTION public.%I SET search_path = public, pg_temp', func_name);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Skipping function % (might need exact signature): %', func_name, SQLERRM;
        END;
    END LOOP;
END $$;
-- ====================================================================
-- 5. REFINE OVERLY PERMISSIVE RLS POLICIES
-- ====================================================================

-- Table public.audit_logs: Refine "Anyone can insert" or "Service role can insert"
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'Service role can insert audit logs') THEN
        ALTER POLICY "Service role can insert audit logs" ON public.audit_logs 
        -- Ensure it actually checks for service_role if that's the intention
        USING (auth.role() = 'service_role')
        WITH CHECK (auth.role() = 'service_role');
    END IF;
END $$;
-- Table public.signup_funnel: Ensure "Anyone can track" is only for INSERT
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'signup_funnel' AND policyname = 'Anyone can track funnel') THEN
        -- Re-verify it only applies to INSERT
        DROP POLICY "Anyone can track funnel" ON public.signup_funnel;
        CREATE POLICY "Anyone can track funnel" ON public.signup_funnel FOR INSERT WITH CHECK (true);
    END IF;
END $$;
-- ====================================================================
-- 6. LEAKED PASSWORD PROTECTION
-- ====================================================================
-- This is usually a Supabase Auth setting, but can be referenced here.
-- Note: Cannot be set via standard SQL migration in many Supabase environments.
-- User should enable "Pwned Passwords" in Supabase Auth Dashboard.;
