-- ============================================================================
-- FIX: Security Definer Views — klarpakke_cron_status + klarpakke_cron_failures
-- Issue: Supabase linter 0010_security_definer_view
-- Action: Recreate with SECURITY INVOKER + lock down grants to service_role
-- ============================================================================

-- These views read from pg_cron system tables (cron.job, cron.job_run_details).
-- They are admin-only monitoring tools and should NEVER be accessible to
-- regular authenticated users or anon.

-- Drop and recreate klarpakke_cron_status with explicit SECURITY INVOKER
DROP VIEW IF EXISTS public.klarpakke_cron_status;

CREATE OR REPLACE VIEW public.klarpakke_cron_status
WITH (security_invoker = on) AS
SELECT
  j.jobname,
  j.schedule,
  j.active,
  r.start_time,
  r.end_time,
  EXTRACT(EPOCH FROM (r.end_time - r.start_time))::int AS duration_sec,
  r.status,
  r.return_message
FROM cron.job j
LEFT JOIN LATERAL (
  SELECT *
  FROM cron.job_run_details
  WHERE jobid = j.jobid
  ORDER BY start_time DESC
  LIMIT 1
) r ON true
WHERE j.jobname LIKE 'klarpakke-%'
ORDER BY j.jobname;

-- Drop and recreate klarpakke_cron_failures with explicit SECURITY INVOKER
DROP VIEW IF EXISTS public.klarpakke_cron_failures;

CREATE OR REPLACE VIEW public.klarpakke_cron_failures
WITH (security_invoker = on) AS
SELECT
  j.jobname,
  r.start_time,
  r.status,
  r.return_message
FROM cron.job j
JOIN cron.job_run_details r ON j.jobid = r.jobid
WHERE j.jobname LIKE 'klarpakke-%'
  AND r.status != 'succeeded'
  AND r.start_time > NOW() - INTERVAL '24 hours'
ORDER BY r.start_time DESC;

-- Lock down: revoke from all, grant only to service_role (admin/monitoring)
REVOKE ALL ON public.klarpakke_cron_status FROM PUBLIC, authenticated, anon;
GRANT SELECT ON public.klarpakke_cron_status TO service_role;

REVOKE ALL ON public.klarpakke_cron_failures FROM PUBLIC, authenticated, anon;
GRANT SELECT ON public.klarpakke_cron_failures TO service_role;
