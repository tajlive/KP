-- Job queue for admin-generated cockpit screenshot reports.
-- Workers (GitHub Actions) run the Playwright script, upload to a private
-- Supabase Storage bucket, and write the signed URL back to this row.
-- Service role writes; admin reads only through the API.

CREATE TABLE IF NOT EXISTS public.cockpit_report_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  signed_url text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cockpit_report_jobs_admin
  ON public.cockpit_report_jobs (admin_user_id);

CREATE INDEX IF NOT EXISTS idx_cockpit_report_jobs_target
  ON public.cockpit_report_jobs (target_user_id);

CREATE INDEX IF NOT EXISTS idx_cockpit_report_jobs_status
  ON public.cockpit_report_jobs (status);

CREATE INDEX IF NOT EXISTS idx_cockpit_report_jobs_created_at
  ON public.cockpit_report_jobs (created_at DESC);

COMMENT ON TABLE public.cockpit_report_jobs IS
  'Admin cockpit screenshot report jobs; service role writes, admin reads via API only.';

ALTER TABLE public.cockpit_report_jobs ENABLE ROW LEVEL SECURITY;

-- No user-facing policies; service role bypasses RLS. Admin access is gated
-- in the API route and the audit log is appended separately.
