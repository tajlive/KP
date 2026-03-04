-- ============================================================================
-- 🚀 CRON MIGRATION - SUPABASE PG_CRON SETUP
-- ============================================================================
-- Flytter cron-oppgaver fra Vercel til Supabase for å unngå Hobby-begrensninger

-- 1. Aktiver utvidelser
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Fjern eventuelle eksisterende jobber for å unngå duplikater ved re-run
SELECT cron.unschedule('strategy-runner-5min');
SELECT cron.unschedule('daily-analysis-cron');

-- 3. Schedule strategy-runner (Hvert 5. minutt for trading-ticks)
-- Bruker 'app.settings.service_role_key' som må være satt i Supabase Project Settings / Vault
SELECT cron.schedule(
  'strategy-runner-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/strategy-runner',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);

-- 4. Schedule cron-daily-analysis (Daglig kl 00:00 UTC)
SELECT cron.schedule(
  'daily-analysis-cron',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url:='https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/cron-daily-analysis',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);

-- Kommentar: 'app.settings.service_role_key' kan settes via:
-- ALTER DATABASE postgres SET "app.settings.service_role_key" = 'din-service-role-key';
