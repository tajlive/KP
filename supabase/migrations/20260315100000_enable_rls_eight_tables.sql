-- =============================================================================
-- Migration: 20260315100000_enable_rls_eight_tables.sql
-- Linear: KLA-165
-- Purpose: Enable RLS on 8 public tables with at least one policy per table.
-- Idempotent: checks RLS state, uses drop_policy_if_exists before CREATE POLICY.
-- =============================================================================

BEGIN;

-- =============================================================================
-- HELPER: drop_policy_if_exists (public schema)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.drop_policy_if_exists(
  p_policy_name TEXT,
  p_table_name TEXT
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = p_table_name
      AND policyname = p_policy_name
  ) THEN
    EXECUTE format('DROP POLICY %I ON public.%I', p_policy_name, p_table_name);
  END IF;
END;
$$;

-- =============================================================================
-- 1. auto_trades — user_id = auth.uid()
-- =============================================================================
ALTER TABLE IF EXISTS public.auto_trades ENABLE ROW LEVEL SECURITY;

SELECT public.drop_policy_if_exists('Users see own trades', 'auto_trades');
SELECT public.drop_policy_if_exists('auto_trades_own', 'auto_trades');
CREATE POLICY "auto_trades_own"
  ON public.auto_trades
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- 2. trade_history — bruk tabell som finnes (trade_history eller trade_history_legacy)
-- =============================================================================
DO $$
DECLARE
  v_table TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'trade_history') THEN
    v_table := 'trade_history';
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);
    PERFORM public.drop_policy_if_exists('Users see own history', v_table);
    PERFORM public.drop_policy_if_exists('trade_history_own', v_table);
    EXECUTE format(
      'CREATE POLICY "trade_history_own" ON public.%I FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())',
      v_table
    );
    RAISE NOTICE 'RLS enabled on public.trade_history';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'trade_history_legacy') THEN
    v_table := 'trade_history_legacy';
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);
    PERFORM public.drop_policy_if_exists('trade_history_legacy_own', v_table);
    EXECUTE format(
      'CREATE POLICY "trade_history_legacy_own" ON public.%I FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())',
      v_table
    );
    RAISE NOTICE 'RLS enabled on public.trade_history_legacy';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'trade_history RLS: %', SQLERRM;
    RAISE;
END;
$$;

-- =============================================================================
-- 3. trading_risk_config — user_id = auth.uid()
-- =============================================================================
ALTER TABLE IF EXISTS public.trading_risk_config ENABLE ROW LEVEL SECURITY;

SELECT public.drop_policy_if_exists('Users see own config', 'trading_risk_config');
SELECT public.drop_policy_if_exists('trading_risk_config_own', 'trading_risk_config');
CREATE POLICY "trading_risk_config_own"
  ON public.trading_risk_config
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- 4. _trigger_debug — service_role only (system/debug table, no user_id)
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_trigger_debug') THEN
    ALTER TABLE public._trigger_debug ENABLE ROW LEVEL SECURITY;
    CREATE OR REPLACE FUNCTION public.is_service_role()
    RETURNS BOOLEAN AS $fn$
    BEGIN
      RETURN current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'is_service_role: %', SQLERRM;
        RETURN FALSE;
    END;
    $fn$ LANGUAGE plpgsql SECURITY DEFINER;
    PERFORM public.drop_policy_if_exists('_trigger_debug_service_role', '_trigger_debug');
    CREATE POLICY "_trigger_debug_service_role"
      ON public._trigger_debug
      FOR ALL
      USING (public.is_service_role());
    RAISE NOTICE 'RLS enabled on public._trigger_debug (service_role only)';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '_trigger_debug RLS: %', SQLERRM;
    RAISE;
END;
$$;

-- =============================================================================
-- 5. saved_strategies — user_id = auth.uid(); SELECT kan inkludere is_public
-- =============================================================================
ALTER TABLE IF EXISTS public.saved_strategies ENABLE ROW LEVEL SECURITY;

SELECT public.drop_policy_if_exists('Users see own + public strategies', 'saved_strategies');
SELECT public.drop_policy_if_exists('Users manage own strategies', 'saved_strategies');
SELECT public.drop_policy_if_exists('saved_strategies_select', 'saved_strategies');
SELECT public.drop_policy_if_exists('saved_strategies_manage_own', 'saved_strategies');
CREATE POLICY "saved_strategies_select"
  ON public.saved_strategies
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_public = true);
CREATE POLICY "saved_strategies_manage_own"
  ON public.saved_strategies
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- 6. notification_preferences — user_id = auth.uid()
-- =============================================================================
ALTER TABLE IF EXISTS public.notification_preferences ENABLE ROW LEVEL SECURITY;

SELECT public.drop_policy_if_exists('Users manage own prefs', 'notification_preferences');
SELECT public.drop_policy_if_exists('notification_preferences_own', 'notification_preferences');
CREATE POLICY "notification_preferences_own"
  ON public.notification_preferences
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- 7. user_activity_logs — user_id = auth.uid()
-- =============================================================================
ALTER TABLE IF EXISTS public.user_activity_logs ENABLE ROW LEVEL SECURITY;

SELECT public.drop_policy_if_exists('Users see own logs', 'user_activity_logs');
SELECT public.drop_policy_if_exists('user_activity_logs_select_own', 'user_activity_logs');
SELECT public.drop_policy_if_exists('user_activity_logs_insert_own', 'user_activity_logs');
CREATE POLICY "user_activity_logs_select_own"
  ON public.user_activity_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "user_activity_logs_insert_own"
  ON public.user_activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- 8. beta_feedback — user_id = auth.uid() (INSERT + SELECT own)
-- =============================================================================
ALTER TABLE IF EXISTS public.beta_feedback ENABLE ROW LEVEL SECURITY;

SELECT public.drop_policy_if_exists('Users submit own feedback', 'beta_feedback');
SELECT public.drop_policy_if_exists('beta_feedback_insert_own', 'beta_feedback');
SELECT public.drop_policy_if_exists('beta_feedback_select_own', 'beta_feedback');
CREATE POLICY "beta_feedback_insert_own"
  ON public.beta_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "beta_feedback_select_own"
  ON public.beta_feedback
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- Optional: Enable RLS only if not already (idempotent check)
-- (ALTER TABLE ... ENABLE RLS is already idempotent; no-op if already enabled)
-- =============================================================================

-- Clean up helper
DROP FUNCTION IF EXISTS public.drop_policy_if_exists(TEXT, TEXT);

COMMIT;

-- =============================================================================
-- Summary (for deploy verification)
-- =============================================================================
-- auto_trades:            policy "auto_trades_own" (ALL, user_id = auth.uid())
-- trade_history:         policy "trade_history_own" on trade_history and/or "trade_history_legacy_own" on trade_history_legacy
-- trading_risk_config:   policy "trading_risk_config_own" (ALL, user_id = auth.uid())
-- _trigger_debug:        policy "_trigger_debug_service_role" (service_role only)
-- saved_strategies:      "saved_strategies_select" (SELECT own+public), "saved_strategies_manage_own" (ALL own)
-- notification_preferences: policy "notification_preferences_own" (ALL, user_id = auth.uid())
-- user_activity_logs:    "user_activity_logs_select_own", "user_activity_logs_insert_own"
-- beta_feedback:         "beta_feedback_insert_own", "beta_feedback_select_own"
