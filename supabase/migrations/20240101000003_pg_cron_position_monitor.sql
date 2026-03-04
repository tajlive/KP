-- Migration: pg_cron_position_monitor — idempotent (safe to re-run)
SET statement_timeout = '30s';

-- ============================================================
-- pg_cron job for position-monitor Edge Function
-- Kjøres hver 5. minutt for å overvåke åpne posisjoner
-- ============================================================

-- Enable pg_cron extension (hvis ikke allerede aktivert)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule position-monitor to run every 5 minutes
SELECT cron.schedule(
  'position-monitor-5min',   -- job name
  '*/5 * * * *',             -- every 5 minutes
  $$
  SELECT net.http_post(
    url:='https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/position-monitor',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);
