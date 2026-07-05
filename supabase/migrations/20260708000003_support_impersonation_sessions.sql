-- Support impersonation sessions for admin "see as user X" feature.
-- V1: short-lived, audited, read-only sessions for test/known accounts.

CREATE TABLE IF NOT EXISTS public.support_impersonation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_jti uuid NOT NULL UNIQUE,
  admin_user_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  reason text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  ended_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.support_impersonation_sessions IS 'Admin impersonation sessions for read-only support. Managed by service role; no direct user access.';

CREATE INDEX IF NOT EXISTS idx_support_impersonation_sessions_admin
  ON public.support_impersonation_sessions (admin_user_id);
CREATE INDEX IF NOT EXISTS idx_support_impersonation_sessions_target
  ON public.support_impersonation_sessions (target_user_id);
CREATE INDEX IF NOT EXISTS idx_support_impersonation_sessions_expires
  ON public.support_impersonation_sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_support_impersonation_sessions_jti
  ON public.support_impersonation_sessions (token_jti);

ALTER TABLE public.support_impersonation_sessions ENABLE ROW LEVEL SECURITY;

-- No user-facing policies; service role and SECURITY DEFINER functions handle access.

-- Verification function used by middleware and API guards.
-- SECURITY DEFINER bypasses RLS so callers (anon/authenticated) can verify a JTI
-- without reading the table directly. The JTI itself is secret.
CREATE OR REPLACE FUNCTION public.verify_impersonation_session(p_jti uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.support_impersonation_sessions
    WHERE token_jti = p_jti
      AND ended_at IS NULL
      AND revoked_at IS NULL
      AND expires_at > now()
  );
END;
$$;

-- Audit helper: mark all active sessions for a JTI as ended.
CREATE OR REPLACE FUNCTION public.end_impersonation_session(p_jti uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.support_impersonation_sessions
  SET
    ended_at = now(),
    updated_at = now()
  WHERE token_jti = p_jti
    AND ended_at IS NULL
    AND revoked_at IS NULL;
END;
$$;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_impersonation_session(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.end_impersonation_session(uuid) TO service_role;
