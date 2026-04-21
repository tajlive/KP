-- =============================================================================
-- MIGRASJON: Alle Vercel Crons → Supabase pg_cron + pg_net
-- Dato: 2026-04-18
-- Beslutning: Alle crons kjøres i Supabase for pålitelighet og lavere latency
-- Alle handlere er HTTP-baserte → trigges via pg_net.http_post() til
-- Vercel API-endepunkter med CRON_SECRET autentisering
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =============================================================================
-- CONFIG: Sett disse som Supabase Vault Secrets:
--   VERCEL_APP_URL = https://www.klarpakke.no
--   CRON_SECRET    = <din CRON_SECRET verdi>
-- Hent med: SELECT current_setting('app.cron_secret', true);
-- Sett med: ALTER DATABASE postgres SET app.cron_secret = '<secret>';
--           ALTER DATABASE postgres SET app.vercel_url = 'https://www.klarpakke.no';
-- =============================================================================

-- Rydd opp eksisterende cron-jobs ved re-kjøring
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname LIKE 'klarpakke-%';

-- =============================================================================
-- HELPER FUNCTION: HTTP POST til Vercel API
-- =============================================================================
CREATE OR REPLACE FUNCTION klarpakke_trigger_cron(path TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url TEXT;
  v_secret TEXT;
BEGIN
  v_url    := current_setting('app.vercel_url', true);
  v_secret := current_setting('app.cron_secret', true);

  IF v_url IS NULL OR v_url = '' THEN
    RAISE WARNING 'app.vercel_url ikke satt – hopper over cron-kall til %', path;
    RETURN;
  END IF;

  PERFORM pg_net.http_post(
    url     := v_url || path,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || COALESCE(v_secret, ''),
      'Content-Type',  'application/json',
      'User-Agent',    'Supabase-pg_cron/1.0'
    ),
    body    := '{"source":"pg_cron"}'::jsonb
  );
END;
$$;

-- =============================================================================
-- CRON JOBS
-- =============================================================================

-- 1. sync-prices — hvert 5. minutt
-- ORIGINAL: /api/cron/sync-prices | SCHEDULE: */5 * * * *
-- Henter priser fra Binance og upsert til coin_prices
SELECT cron.schedule(
  'klarpakke-sync-prices',
  '*/5 * * * *',
  $$SELECT klarpakke_trigger_cron('/api/cron/sync-prices')$$
);

-- 2. tick — hvert 5. minutt
-- ORIGINAL: /api/cron/tick | SCHEDULE: */5 * * * *
-- Prosesserer alle trading-sessions (DCA, TrendFollow, MultiSignal, Grid)
SELECT cron.schedule(
  'klarpakke-tick',
  '*/5 * * * *',
  $$SELECT klarpakke_trigger_cron('/api/cron/tick')$$
);

-- 3. auto-trade — hvert 10. minutt
-- ORIGINAL: /api/cron/auto-trade | SCHEDULE: */10 * * * *
-- Kjører runAutoTradingCycle for alle aktive brukere
SELECT cron.schedule(
  'klarpakke-auto-trade',
  '*/10 * * * *',
  $$SELECT klarpakke_trigger_cron('/api/cron/auto-trade')$$
);

-- 4. outbox-recovery — hvert 10. minutt
-- ORIGINAL: /api/cron/outbox-recovery | SCHEDULE: */10 * * * *
-- Prosesserer pending outbox, synkroniserer Redis→Supabase
SELECT cron.schedule(
  'klarpakke-outbox-recovery',
  '*/10 * * * *',
  $$SELECT klarpakke_trigger_cron('/api/cron/outbox-recovery')$$
);

-- 5. cron-health — hvert 30. minutt
-- ORIGINAL: /api/cron/cron-health | SCHEDULE: */30 * * * *
-- Overvåker at alle crons kjører som forventet
SELECT cron.schedule(
  'klarpakke-cron-health',
  '*/30 * * * *',
  $$SELECT klarpakke_trigger_cron('/api/cron/cron-health')$$
);

-- 6. signal-health-selfcheck — hvert 30. minutt
-- ORIGINAL: /api/cron/signal-health-selfcheck | SCHEDULE: */30 * * * *
-- Sjekker at signal-systemet er operativt
SELECT cron.schedule(
  'klarpakke-signal-health-selfcheck',
  '*/30 * * * *',
  $$SELECT klarpakke_trigger_cron('/api/cron/signal-health-selfcheck')$$
);

-- 7. feature-loader — 15 min etter hver time
-- ORIGINAL: /api/cron/feature-loader | SCHEDULE: 15 * * * *
-- Laster feature flags og konfigurasjoner
SELECT cron.schedule(
  'klarpakke-feature-loader',
  '15 * * * *',
  $$SELECT klarpakke_trigger_cron('/api/cron/feature-loader')$$
);

-- 8. ai-engine — hver time
-- ORIGINAL: /api/cron/ai-engine | SCHEDULE: 0 * * * *
-- Kjører AI-signalgenerering og markedsanalyse
SELECT cron.schedule(
  'klarpakke-ai-engine',
  '0 * * * *',
  $$SELECT klarpakke_trigger_cron('/api/cron/ai-engine')$$
);

-- 9. health-check — hver time
-- ORIGINAL: /api/cron/health-check | SCHEDULE: 0 * * * *
-- Full system health check (Supabase, API, signals, trading)
SELECT cron.schedule(
  'klarpakke-health-check',
  '5 * * * *',
  $$SELECT klarpakke_trigger_cron('/api/cron/health-check')$$
);

-- 10. ai-metrics — hvert 4. time
-- ORIGINAL: /api/cron/ai-metrics | SCHEDULE: 0 */4 * * *
-- Samler og lagrer AI-ytelsesmetrikker
SELECT cron.schedule(
  'klarpakke-ai-metrics',
  '0 */4 * * *',
  $$SELECT klarpakke_trigger_cron('/api/cron/ai-metrics')$$
);

-- 11. daily-summary — kl 06:00 daglig
-- ORIGINAL: /api/cron/daily-summary | SCHEDULE: 0 6 * * *
-- Genererer og sender daglig handelsoppsummering til brukere
SELECT cron.schedule(
  'klarpakke-daily-summary',
  '0 6 * * *',
  $$SELECT klarpakke_trigger_cron('/api/cron/daily-summary')$$
);

-- 12. update-usdt-nok — kl 06:00 daglig
-- ORIGINAL: /api/cron/update-usdt-nok | SCHEDULE: 0 6 * * *
-- Oppdaterer USDT/NOK-kurs
SELECT cron.schedule(
  'klarpakke-update-usdt-nok',
  '10 6 * * *',
  $$SELECT klarpakke_trigger_cron('/api/cron/update-usdt-nok')$$
);

-- 13. keepalive — hver 5. dag kl 06:00
-- ORIGINAL: /api/cron/keepalive | SCHEDULE: 0 6 */5 * *
-- Holder Supabase-tilkoblingen varm (mindre viktig nå med pg_cron aktiv)
SELECT cron.schedule(
  'klarpakke-keepalive',
  '0 6 */5 * *',
  $$SELECT klarpakke_trigger_cron('/api/cron/keepalive')$$
);

-- 14. mifid2-export — kl 01:00 daglig
-- ORIGINAL: /api/cron/mifid2-export | SCHEDULE: 0 1 * * *
-- MiFID II rapporteringseksport (regulatorisk krav)
SELECT cron.schedule(
  'klarpakke-mifid2-export',
  '0 1 * * *',
  $$SELECT klarpakke_trigger_cron('/api/cron/mifid2-export')$$
);

-- =============================================================================
-- MONITORING VIEW: Se alle aktive cron-jobs
-- =============================================================================
CREATE OR REPLACE VIEW klarpakke_cron_status AS
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

-- Bruk: SELECT * FROM klarpakke_cron_status;

-- =============================================================================
-- ALERT VIEW: Finn feilende cron-jobs (siste 24t)
-- =============================================================================
CREATE OR REPLACE VIEW klarpakke_cron_failures AS
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

-- Bruk: SELECT * FROM klarpakke_cron_failures;

-- =============================================================================
-- NESTE STEG:
-- 1. Kjør i Supabase SQL Editor:
--    ALTER DATABASE postgres SET app.vercel_url = 'https://www.klarpakke.no';
--    ALTER DATABASE postgres SET app.cron_secret = '<din CRON_SECRET>';
-- 2. Aktiver pg_cron under Supabase Dashboard → Database → Extensions
-- 3. Kjør denne migrasjonen: supabase db push
-- 4. Verifiser: SELECT * FROM klarpakke_cron_status;
-- =============================================================================
