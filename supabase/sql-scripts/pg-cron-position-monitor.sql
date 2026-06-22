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
    url:='https://pskhryjzkobytnfwucrb.supabase.co/functions/v1/position-monitor',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);

-- Verify job was created
SELECT * FROM cron.job WHERE jobname = 'position-monitor-5min';
