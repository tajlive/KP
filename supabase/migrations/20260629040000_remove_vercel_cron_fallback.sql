-- =============================================================================
-- MIGRASJON: Fjern Vercel-fallback fra pg_cron URL-oppslag
-- Dato: 2026-06-29
-- Bakgrunn: Prosjektet kjører på Cloudflare Workers. APP_URL er nå kilde til
--           sannhet for cron callbacks. Fjerner fallback til VERCEL_APP_URL og
--           app.vercel_url for å eliminere aktiv Vercel-avhengighet.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =============================================================================
-- 1. Oppdater klarpakke_trigger_cron til kun å bruke APP_URL / FLY_APP_URL
-- =============================================================================
-- Merk: pg_net-funksjoner ligger i schema `net`, ikke `pg_net`.
CREATE OR REPLACE FUNCTION public.klarpakke_trigger_cron(path TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url    TEXT;
  v_secret TEXT;
BEGIN
  -- 1. APP_URL er canonical (Cloudflare Workers)
  SELECT decrypted_secret INTO v_url
  FROM vault.decrypted_secrets
  WHERE name = 'APP_URL'
  LIMIT 1;

  -- 2. Fallback til FLY_APP_URL eldre navn
  IF v_url IS NULL OR v_url = '' THEN
    SELECT decrypted_secret INTO v_url
    FROM vault.decrypted_secrets
    WHERE name = 'FLY_APP_URL'
    LIMIT 1;
  END IF;

  -- 3. Fallback til database-setting
  IF v_url IS NULL OR v_url = '' THEN
    v_url := current_setting('app.app_url', true);
  END IF;

  -- 4. Hent CRON_SECRET fra Vault
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'CRON_SECRET'
  LIMIT 1;

  IF v_secret IS NULL OR v_secret = '' THEN
    v_secret := current_setting('app.cron_secret', true);
  END IF;

  -- 5. Guard: ikke kjør uten config
  IF v_url IS NULL OR v_url = '' THEN
    RAISE WARNING 'klarpakke_trigger_cron: APP_URL mangler (Vault + current_setting). Hopper over %', path;
    RETURN;
  END IF;

  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE WARNING 'klarpakke_trigger_cron: CRON_SECRET mangler (Vault + current_setting). Hopper over %', path;
    RETURN;
  END IF;

  -- 6. Send HTTP POST via net (schema for pg_net-funksjoner i Supabase)
  PERFORM net.http_post(
    url     := v_url || path,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_secret,
      'Content-Type',  'application/json',
      'User-Agent',    'Supabase-pg_cron/1.1'
    ),
    body    := jsonb_build_object(
      'source', 'pg_cron',
      'triggered_at', NOW()
    )
  );
END;
$$;

-- =============================================================================
-- 2. Re-schedule aktive cron-jobber uten VERCEL_APP_URL-fallback
-- =============================================================================
-- Bruk sentral funksjon for URL-oppslag, secret-håndtering og guard/warnings.
-- cron.schedule med samme jobbnavn oppdaterer eksisterende jobb (idempotent).
SELECT cron.schedule(
  'klarpakke-trading-tca',
  '0 */6 * * *',
  'SELECT public.klarpakke_trigger_cron(''/api/cron/trading-tca'')'
);

SELECT cron.schedule(
  'klarpakke-backtest-live-gap',
  '30 */6 * * *',
  'SELECT public.klarpakke_trigger_cron(''/api/cron/backtest-live-gap'')'
);

SELECT cron.schedule(
  'klarpakke-fill-rate-monitor',
  '15 */6 * * *',
  'SELECT public.klarpakke_trigger_cron(''/api/cron/fill-rate-monitor'')'
);

SELECT cron.schedule(
  'klarpakke-signal-decay',
  '45 */6 * * *',
  'SELECT public.klarpakke_trigger_cron(''/api/cron/signal-decay'')'
);

SELECT cron.schedule(
  'klarpakke-adverse-selection',
  '20 */6 * * *',
  'SELECT public.klarpakke_trigger_cron(''/api/cron/adverse-selection'')'
);

SELECT cron.schedule(
  'klarpakke-pl-attribution',
  '10 */6 * * *',
  'SELECT public.klarpakke_trigger_cron(''/api/cron/pl-attribution'')'
);

SELECT cron.schedule(
  'klarpakke-market-impact',
  '40 */6 * * *',
  'SELECT public.klarpakke_trigger_cron(''/api/cron/market-impact'')'
);

SELECT cron.schedule(
  'klarpakke-balance-drift-check',
  '0 * * * *',
  'SELECT public.klarpakke_trigger_cron(''/api/cron/balance-drift-check'')'
);

-- =============================================================================
-- 3. Verifikasjon
-- =============================================================================
DO $$
DECLARE
  v_app_count int;
  v_fly_count int;
BEGIN
  SELECT count(*) INTO v_app_count FROM vault.secrets WHERE name = 'APP_URL';
  SELECT count(*) INTO v_fly_count FROM vault.secrets WHERE name = 'FLY_APP_URL';

  RAISE NOTICE 'Cron URL config: % APP_URL, % FLY_APP_URL (Vercel fallback removed)',
    v_app_count, v_fly_count;
END $$;
