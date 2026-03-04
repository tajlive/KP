-- =============================================================================
-- pg_cron Setup — Klarpakke Unified Trading System
-- Alle scheduled jobs kjøres fra Supabase (gratis tier)
-- =============================================================================

-- Aktiver nødvendige extensions
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =============================================================================
-- JOB 1: Trading Tick — hvert minutt
-- Prosesserer alle aktive trading_sessions: signaler, trades, copy-trading
-- =============================================================================
SELECT cron.unschedule('klarpakke-trading-tick') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'klarpakke-trading-tick'
);

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

-- =============================================================================
-- JOB 2: Daily Summary Email — kl. 07:00 UTC (09:00 norsk tid)
-- Sender daglig P&L-oppsummering til alle brukere med handler siste 24t
-- =============================================================================
SELECT cron.unschedule('klarpakke-daily-summary') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'klarpakke-daily-summary'
);

SELECT cron.schedule(
  'klarpakke-daily-summary',
  '0 7 * * *',
  $$
  SELECT net.http_get(
    url     := 'https://www.klarpakke.no/api/cron/daily-summary',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret', true)
    )
  );
  $$
);

-- =============================================================================
-- JOB 3: Session Cleanup — kl. 02:00 UTC daglig
-- Stopper sessions uten heartbeat siste 24 timer (direkte SQL, ingen HTTP)
-- =============================================================================
SELECT cron.unschedule('klarpakke-session-cleanup') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'klarpakke-session-cleanup'
);

SELECT cron.schedule(
  'klarpakke-session-cleanup',
  '0 2 * * *',
  $$
  UPDATE trading_sessions
  SET
    status     = 'stopped',
    stopped_at = NOW(),
    stop_reason = 'auto_cleanup_24h_no_heartbeat'
  WHERE status = 'active'
    AND last_heartbeat < NOW() - INTERVAL '24 hours';
  $$
);

-- =============================================================================
-- INSTRUKSJON: Sett CRON_SECRET i Supabase
-- Kjør dette manuelt i Supabase SQL Editor med din faktiske secret:
--
--   ALTER DATABASE postgres
--     SET "app.settings.cron_secret" = 'din-cron-secret-her';
--
-- Finn CRON_SECRET i Vercel Dashboard → Settings → Environment Variables
-- =============================================================================

-- Verifiser at jobs er registrert
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname LIKE 'klarpakke%'
ORDER BY jobname;
