-- ============================================================================
-- AUDIT EVENTS & SECURITY EVENTS
-- Append-only immutable audit log + security event stream for compliance,
-- audit and UX trust layer.
--
-- NOTE: Hash-chaining is intentionally omitted in this iteration. Supabase JS
-- client cannot execute lock+select+insert in a single transaction, so a robust
-- hash chain would require a server-side Postgres function and a DB-level HMAC
-- secret. We ship a simple append-only log now and defer hash-chaining to a
-- later iteration.
-- ============================================================================

-- ============================================================================
-- 1. AUDIT EVENTS (append-only immutable log)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence       BIGSERIAL UNIQUE,
  occurred_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id       UUID,
  actor_type     TEXT NOT NULL CHECK (actor_type IN ('user', 'admin', 'system')),
  action         TEXT NOT NULL,
  resource_type  TEXT NOT NULL,
  resource_id    TEXT,
  session_id     TEXT,
  ip_address     INET,
  before_state   JSONB,
  after_state    JSONB,
  metadata       JSONB
);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor_id
  ON public.audit_events (actor_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_resource
  ON public.audit_events (resource_type, resource_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_action
  ON public.audit_events (action, occurred_at DESC);
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
-- Only service-role access is expected for audit logs.
DROP POLICY IF EXISTS service_role_only_select ON public.audit_events;
CREATE POLICY service_role_only_select ON public.audit_events
  FOR SELECT TO service_role USING (true);
DROP POLICY IF EXISTS service_role_only_insert ON public.audit_events;
CREATE POLICY service_role_only_insert ON public.audit_events
  FOR INSERT TO service_role WITH CHECK (true);
-- ============================================================================
-- 2. SECURITY EVENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.security_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id      UUID,
  event_type   TEXT NOT NULL,
  severity     TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  ip_address   INET,
  user_agent   TEXT,
  details      JSONB
);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id
  ON public.security_events (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_severity
  ON public.security_events (severity, occurred_at DESC);
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_role_only_select ON public.security_events;
CREATE POLICY service_role_only_select ON public.security_events
  FOR SELECT TO service_role USING (true);
DROP POLICY IF EXISTS service_role_only_insert ON public.security_events;
CREATE POLICY service_role_only_insert ON public.security_events
  FOR INSERT TO service_role WITH CHECK (true);
-- ----------------------------------------------------------------------------
-- 2b. SERVICE-ROLE GRANTS (least privilege)
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT, REFERENCES ON public.audit_events TO service_role;
GRANT SELECT, INSERT, REFERENCES ON public.security_events TO service_role;
GRANT USAGE ON SEQUENCE public.audit_events_sequence_seq TO service_role;
-- ============================================================================
-- 3. APPEND-ONLY ENFORCEMENT
-- ============================================================================
CREATE OR REPLACE FUNCTION public.prevent_audit_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Audit tables are append-only';
END;
$$;
DROP TRIGGER IF EXISTS audit_events_append_only_row ON public.audit_events;
CREATE TRIGGER audit_events_append_only_row
  BEFORE UPDATE OR DELETE ON public.audit_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_mutation();
DROP TRIGGER IF EXISTS audit_events_append_only_truncate ON public.audit_events;
CREATE TRIGGER audit_events_append_only_truncate
  BEFORE TRUNCATE ON public.audit_events
  FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_audit_mutation();
DROP TRIGGER IF EXISTS security_events_append_only_row ON public.security_events;
CREATE TRIGGER security_events_append_only_row
  BEFORE UPDATE OR DELETE ON public.security_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_mutation();
DROP TRIGGER IF EXISTS security_events_append_only_truncate ON public.security_events;
CREATE TRIGGER security_events_append_only_truncate
  BEFORE TRUNCATE ON public.security_events
  FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_audit_mutation();
