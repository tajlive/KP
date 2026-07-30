-- Schedule hourly Binance trade reconciliation via pg_cron.
-- The job is idempotent: calling cron.schedule with an existing name updates it.
-- Bruker klarpakke_trigger_cron() for konsistent vault-auth (fikset 2026-07-30).
-- Tidligere brukte denne direkte net.http_get med current_setting('app.settings.cron_secret')
-- som feilet med 401 etter vault-overgangen.

-- Ensure required extensions are available.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'reconcile-binance-trades',
  '0 * * * *',
  $$SELECT public.klarpakke_trigger_cron('/api/cron/reconcile')$$
);
-- The job is idempotent: calling cron.schedule with an existing name updates it.

-- Ensure required extensions are available.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'reconcile-binance-trades',
  '0 * * * *',
  $$ SELECT net.http_get(
    url := 'https://www.klarpakke.no/api/cron/reconcile',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret', true)
    )
  ) $$
);

-- Hourly reconciliation of live Binance trades against exchange order status.
