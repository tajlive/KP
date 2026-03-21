-- Append-only logg for admin-handlinger (service role). Ingen SELECT for vanlige brukere.
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  admin_user_id uuid NOT NULL,
  action text NOT NULL,
  target_user_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at
  ON public.admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin
  ON public.admin_audit_log (admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target
  ON public.admin_audit_log (target_user_id)
  WHERE target_user_id IS NOT NULL;

COMMENT ON TABLE public.admin_audit_log IS 'Admin actions; insert via service role only; RLS blocks anon/auth SELECT';

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Ingen policies: autentiserte får ikke tilgang. Service role bypasser RLS.
