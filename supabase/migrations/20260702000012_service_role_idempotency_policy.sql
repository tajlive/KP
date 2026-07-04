-- ============================================================================
-- Migration: Allow service_role to manage idempotency_keys
-- Date: 2026-07-02
-- Context: executeTrade uses a service-role Supabase client, but RLS is enabled
--          on idempotency_keys. Supabase service_role should bypass RLS, yet
--          production inserts were failing with 42501. This policy is a durable
--          guardrail that makes the permission explicit for all environments.
-- ============================================================================
CREATE POLICY IF NOT EXISTS service_role_all_idempotency_keys
ON public.idempotency_keys
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
