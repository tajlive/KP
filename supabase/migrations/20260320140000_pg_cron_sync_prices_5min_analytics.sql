-- Markedspriser hvert 5. minutt (støtter «live» dashboard / resultatsider)
-- Bruker klarpakke_trigger_cron() for konsistent vault-auth (fikset 2026-07-30).
-- Tidligere brukte denne direkte net.http_get med current_setting('app.settings.cron_secret')
-- som feilet med 401 etter vault-overgangen.

SET statement_timeout = '30s';

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  PERFORM cron.unschedule('klarpakke-sync-prices-5min');
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Unschedule klarpakke-sync-prices-5min: %', SQLERRM;
END $$;

SELECT cron.schedule(
  'klarpakke-sync-prices-5min',
  '*/5 * * * *',
  $$SELECT public.klarpakke_trigger_cron('/api/cron/sync-prices')$$
);
-- Kaller Vercel-appen /api/cron/sync-prices med CRON_SECRET (samme mønster som klarpakke-daily-summary).
-- Krever: ALTER DATABASE postgres SET "app.settings.cron_secret" = '…'; (se docs/trading/RESULTATER-ANALYTICS-2026.md)

SET statement_timeout = '30s';

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  PERFORM cron.unschedule('klarpakke-sync-prices-5min');
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Unschedule klarpakke-sync-prices-5min: %', SQLERRM;
END $$;

SELECT cron.schedule(
  'klarpakke-sync-prices-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_get(
    url := 'https://www.klarpakke.no/api/cron/sync-prices',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret', true),
      'Content-Type', 'application/json'
    )
  );
  $$
);
