-- ============================================================================
-- CATEGORY 4b: Fix service_role policies scope
-- Replace public/authenticated with service_role for service operations
-- ============================================================================

-- A) Fix audit_logs policies
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.audit_logs;
CREATE POLICY "service_role_insert_audit_logs"
  ON public.audit_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- B) Fix auto_trades policies
DROP POLICY IF EXISTS "Service role can insert trades" ON public.auto_trades;
DROP POLICY IF EXISTS "Service role can update trades" ON public.auto_trades;
CREATE POLICY "service_role_insert_trades"
  ON public.auto_trades FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "service_role_update_trades"
  ON public.auto_trades FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- C) Fix klt_transactions policies
DROP POLICY IF EXISTS "Service can insert transactions" ON public.klt_transactions;
CREATE POLICY "service_role_insert_transactions"
  ON public.klt_transactions FOR INSERT
  TO service_role
  WITH CHECK (true);

-- D) Fix onboarding_events policies
DROP POLICY IF EXISTS "Service role can insert onboarding events" ON public.onboarding_events;
CREATE POLICY "service_role_insert_onboarding"
  ON public.onboarding_events FOR INSERT
  TO service_role
  WITH CHECK (true);

-- E) Fix push_subscriptions policies
DROP POLICY IF EXISTS "Service role can manage push subscriptions" ON public.push_subscriptions;
CREATE POLICY "service_role_manage_push"
  ON public.push_subscriptions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- F) Fix subscriptions policies
DROP POLICY IF EXISTS "Service role can insert subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role can update subscriptions" ON public.subscriptions;
CREATE POLICY "service_role_insert_subscriptions"
  ON public.subscriptions FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "service_role_update_subscriptions"
  ON public.subscriptions FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- G) Fix system_health_logs policies
DROP POLICY IF EXISTS "Allow service role to insert health logs" ON public.system_health_logs;
CREATE POLICY "service_role_insert_health_logs"
  ON public.system_health_logs FOR INSERT
  TO service_role
  WITH CHECK (true);
