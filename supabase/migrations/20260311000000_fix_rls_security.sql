-- ============================================
-- RLS SECURITY FIX — 2026-03-11
-- SECURITY DEFINER → INVOKER + RLS Policies
-- ============================================

BEGIN;

-- ============================================
-- SEKSJON A: SECURITY DEFINER → INVOKER
-- api.* views med riktig sikkerhetsmodell
-- ============================================

-- api.risk_profiles (alle kolonner fra public.risk_profiles for egen bruker)
DROP VIEW IF EXISTS api.risk_profiles CASCADE;
CREATE OR REPLACE VIEW api.risk_profiles
WITH (security_invoker = on)
AS
SELECT * FROM public.risk_profiles WHERE user_id = auth.uid();

COMMENT ON VIEW api.risk_profiles IS 'Brukerens egne risikoprofiler — SECURITY INVOKER';
GRANT SELECT ON api.risk_profiles TO authenticated;

-- api.auto_trading_configs
DROP VIEW IF EXISTS api.auto_trading_configs CASCADE;
CREATE OR REPLACE VIEW api.auto_trading_configs
WITH (security_invoker = on)
AS
SELECT * FROM public.auto_trading_configs WHERE user_id = auth.uid();

COMMENT ON VIEW api.auto_trading_configs IS 'Brukerens auto-trading konfigurasjoner — SECURITY INVOKER';
GRANT SELECT ON api.auto_trading_configs TO authenticated;

-- api.paper_trading_sessions
DROP VIEW IF EXISTS api.paper_trading_sessions CASCADE;
CREATE OR REPLACE VIEW api.paper_trading_sessions
WITH (security_invoker = on)
AS
SELECT * FROM public.paper_trading_sessions WHERE user_id = auth.uid();

COMMENT ON VIEW api.paper_trading_sessions IS 'Brukerens paper trading-økter — SECURITY INVOKER';
GRANT SELECT ON api.paper_trading_sessions TO authenticated;

-- ============================================
-- SEKSJON B: RLS POLICIES — BRUKERDATA
-- Bruker-isolasjon for sensitive trading-data
-- ============================================

-- Aktiver RLS på alle tabeller (idempotent)
ALTER TABLE IF EXISTS public.real_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.trading_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.strategy_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_trading_config ENABLE ROW LEVEL SECURITY;

-- real_positions: kun hvis tabellen har user_id (noen miljøer har account_id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'real_positions' AND column_name = 'user_id') THEN
    DROP POLICY IF EXISTS "users_own_rows" ON public.real_positions;
    DROP POLICY IF EXISTS "users_insert_own" ON public.real_positions;
    DROP POLICY IF EXISTS "users_update_own" ON public.real_positions;
    DROP POLICY IF EXISTS "users_delete_own" ON public.real_positions;
    DROP POLICY IF EXISTS "real_positions_select_own" ON public.real_positions;
    DROP POLICY IF EXISTS "real_positions_insert_own" ON public.real_positions;
    DROP POLICY IF EXISTS "real_positions_update_own" ON public.real_positions;
    DROP POLICY IF EXISTS "real_positions_delete_own" ON public.real_positions;
    CREATE POLICY "real_positions_select_own" ON public.real_positions FOR SELECT USING (user_id = auth.uid());
    CREATE POLICY "real_positions_insert_own" ON public.real_positions FOR INSERT WITH CHECK (user_id = auth.uid());
    CREATE POLICY "real_positions_update_own" ON public.real_positions FOR UPDATE USING (user_id = auth.uid());
    CREATE POLICY "real_positions_delete_own" ON public.real_positions FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;

-- trading_logs, strategy_logs, user_trading_config: policies kun hvis user_id finnes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trading_logs' AND column_name = 'user_id') THEN
    DROP POLICY IF EXISTS "trading_logs_select_own" ON public.trading_logs;
    DROP POLICY IF EXISTS "trading_logs_insert_own" ON public.trading_logs;
    CREATE POLICY "trading_logs_select_own" ON public.trading_logs FOR SELECT USING (user_id = auth.uid());
    CREATE POLICY "trading_logs_insert_own" ON public.trading_logs FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'strategy_logs' AND column_name = 'user_id') THEN
    DROP POLICY IF EXISTS "strategy_logs_select_own" ON public.strategy_logs;
    DROP POLICY IF EXISTS "strategy_logs_insert_own" ON public.strategy_logs;
    CREATE POLICY "strategy_logs_select_own" ON public.strategy_logs FOR SELECT USING (user_id = auth.uid());
    CREATE POLICY "strategy_logs_insert_own" ON public.strategy_logs FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_trading_config' AND column_name = 'user_id') THEN
    DROP POLICY IF EXISTS "user_config_select_own" ON public.user_trading_config;
    DROP POLICY IF EXISTS "user_config_insert_own" ON public.user_trading_config;
    DROP POLICY IF EXISTS "user_config_update_own" ON public.user_trading_config;
    CREATE POLICY "user_config_select_own" ON public.user_trading_config FOR SELECT USING (user_id = auth.uid());
    CREATE POLICY "user_config_insert_own" ON public.user_trading_config FOR INSERT WITH CHECK (user_id = auth.uid());
    CREATE POLICY "user_config_update_own" ON public.user_trading_config FOR UPDATE USING (user_id = auth.uid());
  END IF;
END $$;

-- ============================================
-- SEKSJON C: RLS POLICIES — ADMIN/SYSTEM
-- Service role only for system-tabeller
-- ============================================

-- Aktiver RLS
ALTER TABLE IF EXISTS public.admin_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.emergency_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.global_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stripe_events ENABLE ROW LEVEL SECURITY;

-- Funksjon for å sjekke service_role
CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role';
EXCEPTION
  WHEN OTHERS THEN RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- admin_alerts: Kun service_role
DROP POLICY IF EXISTS "admin_alerts_service_role" ON public.admin_alerts;

CREATE POLICY "admin_alerts_service_role"
  ON public.admin_alerts
  FOR ALL
  USING (public.is_service_role());

-- ai_cache: Kun service_role
DROP POLICY IF EXISTS "ai_cache_service_role" ON public.ai_cache;

CREATE POLICY "ai_cache_service_role"
  ON public.ai_cache
  FOR ALL
  USING (public.is_service_role());

-- emergency_logs: Kun service_role
DROP POLICY IF EXISTS "emergency_logs_service_role" ON public.emergency_logs;

CREATE POLICY "emergency_logs_service_role"
  ON public.emergency_logs
  FOR ALL
  USING (public.is_service_role());

-- global_settings: Kun service_role
DROP POLICY IF EXISTS "global_settings_service_role" ON public.global_settings;

CREATE POLICY "global_settings_service_role"
  ON public.global_settings
  FOR ALL
  USING (public.is_service_role());

-- stripe_events: Kun service_role
DROP POLICY IF EXISTS "stripe_events_service_role" ON public.stripe_events;

CREATE POLICY "stripe_events_service_role"
  ON public.stripe_events
  FOR ALL
  USING (public.is_service_role());

-- ============================================
-- SEKSJON D: VERIFISERING
-- ============================================

-- Verifiser view security settings
SELECT 
  n.nspname as schema,
  c.relname as view_name,
  CASE 
    WHEN c.reloptions @> ARRAY['security_invoker=on'] THEN 'SECURITY INVOKER ✅'
    WHEN c.reloptions @> ARRAY['security_invoker=off'] THEN 'SECURITY DEFINER ❌'
    ELSE 'STANDARD'
  END as security_setting
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'api'
AND c.relname IN ('risk_profiles', 'auto_trading_configs', 'paper_trading_sessions');

-- Verifiser RLS policies
SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN qual::text LIKE '%auth.uid()%' THEN 'USER ISOLATION ✅'
    WHEN qual::text LIKE '%service_role%' THEN 'SERVICE ROLE ✅'
    ELSE 'CUSTOM'
  END as policy_type
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
  'real_positions','trading_logs','strategy_logs','user_trading_config',
  'admin_alerts','ai_cache','emergency_logs','global_settings','stripe_events'
)
ORDER BY tablename, policyname;

-- Verifiser RLS enabled
SELECT 
  relname as table_name,
  relrowsecurity as rls_enabled,
  CASE WHEN relrowsecurity THEN '✅ RLS Enabled' ELSE '❌ RLS Disabled' END as status
FROM pg_class
WHERE relname IN (
  'real_positions','trading_logs','strategy_logs','user_trading_config',
  'admin_alerts','ai_cache','emergency_logs','global_settings','stripe_events'
)
AND relnamespace = 'public'::regnamespace;

COMMIT;

-- ============================================
-- POST-DEPLOY VERIFISERING
-- Kjør dette manuelt etter deploy:
-- ============================================
/*
-- Test som autentisert bruker (skal se kun egne rader):
SET ROLE authenticated;
SET request.jwt.claims = '{"sub":"test-user-id"}';
SELECT COUNT(*) FROM api.risk_profiles;
SELECT COUNT(*) FROM api.auto_trading_configs;
SELECT COUNT(*) FROM api.paper_trading_sessions;

-- Test som service_role (skal fungere for admin-tabeller):
SET ROLE service_role;
SELECT COUNT(*) FROM public.admin_alerts;

-- Reset
RESET ROLE;
*/
