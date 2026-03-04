-- ============================================================================
-- SECURITY FIX: Add RLS policies for tables with RLS enabled but no policies
-- Issue: Linter reported 5 tables with RLS enabled but no policies
-- ============================================================================

-- 1. analytics_events - Track user events
DROP POLICY IF EXISTS "analytics_events_insert_own" ON analytics_events;
DROP POLICY IF EXISTS "analytics_events_select_own" ON analytics_events;
DROP POLICY IF EXISTS "analytics_events_select_service" ON analytics_events;
DROP POLICY IF EXISTS "insert_own_events" ON analytics_events;
DROP POLICY IF EXISTS "service_all_analytics" ON analytics_events;

CREATE POLICY "insert_own_events" ON analytics_events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "service_all_analytics" ON analytics_events
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. auto_trading_strategies - Global configuration table (no user_id)
-- This is a system config table, authenticated can view active, service_role full access
DROP POLICY IF EXISTS "auto_trading_strategies_insert_own" ON auto_trading_strategies;
DROP POLICY IF EXISTS "auto_trading_strategies_select_own" ON auto_trading_strategies;
DROP POLICY IF EXISTS "auto_trading_strategies_update_own" ON auto_trading_strategies;
DROP POLICY IF EXISTS "auto_trading_strategies_delete_own" ON auto_trading_strategies;
DROP POLICY IF EXISTS "auto_trading_strategies_select_public" ON auto_trading_strategies;
DROP POLICY IF EXISTS "service_all_strategies" ON auto_trading_strategies;
DROP POLICY IF EXISTS "authenticated_select_strategies" ON auto_trading_strategies;

CREATE POLICY "authenticated_select_strategies" ON auto_trading_strategies
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "service_all_strategies" ON auto_trading_strategies
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. beta_signups - Email collection (no user_id)
-- Public can insert, service_role can read
DROP POLICY IF EXISTS "beta_signups_insert_public" ON beta_signups;
DROP POLICY IF EXISTS "beta_signups_select_service" ON beta_signups;
DROP POLICY IF EXISTS "service_all_beta" ON beta_signups;
DROP POLICY IF EXISTS "public_insert_beta" ON beta_signups;

CREATE POLICY "public_insert_beta" ON beta_signups
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "service_all_beta" ON beta_signups
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. client_errors - Error tracking
DROP POLICY IF EXISTS "client_errors_insert_own" ON client_errors;
DROP POLICY IF EXISTS "client_errors_select_service" ON client_errors;
DROP POLICY IF EXISTS "service_all_errors" ON client_errors;
DROP POLICY IF EXISTS "insert_own_errors" ON client_errors;

CREATE POLICY "insert_own_errors" ON client_errors
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "service_all_errors" ON client_errors
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. vipps_payments - Payment records (no user_id, uses order_id)
-- Join with orders to check ownership
DROP POLICY IF EXISTS "vipps_payments_insert_service" ON vipps_payments;
DROP POLICY IF EXISTS "vipps_payments_select_own" ON vipps_payments;
DROP POLICY IF EXISTS "vipps_payments_select_service" ON vipps_payments;
DROP POLICY IF EXISTS "service_all_payments" ON vipps_payments;
DROP POLICY IF EXISTS "select_own_payments" ON vipps_payments;

CREATE POLICY "select_own_payments" ON vipps_payments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM orders o 
    WHERE o.id = vipps_payments.order_id 
    AND o.user_id = auth.uid()
  ));

CREATE POLICY "service_all_payments" ON vipps_payments
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
