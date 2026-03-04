-- =============================================================================
-- Klarpakke Auto-Trading: Supabase pg_cron Setup
-- Kjør i Supabase Dashboard → SQL Editor → New query
-- =============================================================================

-- Steg 1: Aktiver pg_net (HTTP-kall fra database)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Steg 2: Aktiver pg_cron (scheduled jobs)
-- NB: pg_cron er allerede aktivert på Supabase Pro — sjekk Extensions-siden
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Steg 3: Sett cron_secret (erstatt med din CRON_SECRET fra Vercel env vars)
ALTER DATABASE postgres SET "app.settings.cron_secret" = 'a18a07d157e02cbe4f4efad46eec7dbcb456ac3e31ae51f67d7e2e73f09e2df8';

-- Steg 4: Trading tick — hvert minutt
SELECT cron.schedule(
  'klarpakke-trading-tick',
  '* * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://www.klarpakke.no/api/cron/tick',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret', true),
      'Content-Type',  'application/json'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Steg 5: Recovery — hvert 5. minutt (restart crashed sessions)
SELECT cron.schedule(
  'klarpakke-trading-recover',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://www.klarpakke.no/api/auto-trading/recover',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret', true),
      'Content-Type',  'application/json'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Verifiser at jobbene er opprettet:
SELECT jobid, schedule, jobname, active
FROM cron.job
WHERE jobname LIKE 'klarpakke%';

-- ============================================================
-- NYTTIGE KOMMANDOER (kjør ved behov):
-- ============================================================

-- Se siste 20 kjøringer:
-- SELECT jobname, status, start_time, end_time, return_message
-- FROM cron.job_run_details
-- JOIN cron.job USING (jobid)
-- WHERE jobname LIKE 'klarpakke%'
-- ORDER BY start_time DESC LIMIT 20;

-- Pause trading (stopp cron midlertidig):
-- UPDATE cron.job SET active = false WHERE jobname = 'klarpakke-trading-tick';

-- Gjenoppta trading:
-- UPDATE cron.job SET active = true WHERE jobname = 'klarpakke-trading-tick';

-- Slett jobbene (permanent):
-- SELECT cron.unschedule('klarpakke-trading-tick');
-- SELECT cron.unschedule('klarpakke-trading-recover');
