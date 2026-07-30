-- =============================================================================
-- MIGRASJON: Fiks stale cron-auth for sync-prices og reconcile
-- Dato: 2026-07-30
-- Bakgrunn: klarpakke-sync-prices-5min og reconcile-binance-trades bruker
--           current_setting('app.settings.cron_secret', true) som er utdatert
--           etter vault-overgangen (2026-04-20). Resultat: 401 hvert 5. minutt
--           og timevis, coin_prices ble 4,6 timer stale.
-- Løsning: Re-schedule begge til å bruke klarpakke_trigger_cron() som leser
--          CRON_SECRET og APP_URL fra vault.decrypted_secrets.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1. sync-prices: hvert 5. minutt
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

-- 2. reconcile-binance-trades: hver time
DO $$
BEGIN
  PERFORM cron.unschedule('reconcile-binance-trades');
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Unschedule reconcile-binance-trades: %', SQLERRM;
END $$;

SELECT cron.schedule(
  'reconcile-binance-trades',
  '0 * * * *',
  $$SELECT public.klarpakke_trigger_cron('/api/cron/reconcile')$$
);

-- Verifikasjon
SELECT
  jobname,
  schedule,
  active
FROM cron.job
WHERE jobname IN ('klarpakke-sync-prices-5min', 'reconcile-binance-trades')
ORDER BY jobname;
