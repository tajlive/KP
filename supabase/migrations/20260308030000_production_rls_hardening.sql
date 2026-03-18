-- Migration: 20260308030000_production_rls_hardening.sql
-- Purpose: Standardize and harden RLS for auto-trading tables

BEGIN;
-- 1. Ensure RLS is enabled on all core trading tables
ALTER TABLE IF EXISTS public.auto_trading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.auto_trading_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exchange_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_auto_trading_configs ENABLE ROW LEVEL SECURITY;
-- 2. Helper to drop policies safely
CREATE OR REPLACE FUNCTION public.drop_policy_if_exists(p_policy_name TEXT, p_table_name TEXT)
RETURNS void AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = p_table_name AND policyname = p_policy_name) THEN
        EXECUTE format('DROP POLICY %I ON public.%I', p_policy_name, p_table_name);
    END IF;
END;
$$ LANGUAGE plpgsql;
-- 3. auto_trading_sessions Policies
SELECT public.drop_policy_if_exists('Users can view their own sessions', 'auto_trading_sessions');
CREATE POLICY "Users can view their own sessions" 
ON public.auto_trading_sessions FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);
SELECT public.drop_policy_if_exists('Users can update their own sessions', 'auto_trading_sessions');
CREATE POLICY "Users can update their own sessions" 
ON public.auto_trading_sessions FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
-- 4. auto_trading_trades Policies
SELECT public.drop_policy_if_exists('Users can view their own auto-trades', 'auto_trading_trades');
CREATE POLICY "Users can view their own auto-trades" 
ON public.auto_trading_trades FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);
-- 5. exchange_connections Policies (CRITICAL: Private keys)
SELECT public.drop_policy_if_exists('Users can manage their own exchange keys', 'exchange_connections');
CREATE POLICY "Users can manage their own exchange keys" 
ON public.exchange_connections FOR ALL 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
-- 6. user_auto_trading_configs Policies
SELECT public.drop_policy_if_exists('Users can manage their own auto-trading config', 'user_auto_trading_configs');
CREATE POLICY "Users can manage their own auto-trading config" 
ON public.user_auto_trading_configs FOR ALL 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
-- Clean up
DROP FUNCTION public.drop_policy_if_exists(TEXT, TEXT);
COMMIT;
