-- Migration: pg_cron_signal_engine — idempotent (safe to re-run)
SET statement_timeout = '30s';

-- ============================================================
-- pg_cron job for signal-engine Edge Function
-- Kjøres hver time for å generere trading-signaler
-- ============================================================

-- Enable pg_cron extension (hvis ikke allerede aktivert)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule signal-engine to run every hour
SELECT cron.schedule(
  'signal-engine-hourly',    -- job name
  '0 * * * *',               -- every hour at minute 0
  $$
  SELECT net.http_post(
    url:='https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/signal-engine',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);
