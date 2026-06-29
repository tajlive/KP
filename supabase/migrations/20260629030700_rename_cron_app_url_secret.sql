-- =============================================================================
-- MIGRASJON: Flytt cron URL-hemmelighet fra Vercel/Fly-navn til APP_URL
-- Dato: 2026-06-29
-- Bakgrunn: Prosjektet kjører nå på Cloudflare Workers. Cron-jobber skal
--           hente URL fra en nøytral APP_URL-hemmelighet, med fallback til
--           eldre FLY_APP_URL / VERCEL_APP_URL for bakoverkompatibilitet.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgsodium;
CREATE EXTENSION IF NOT EXISTS supabase_vault;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =============================================================================
-- 1. Opprett APP_URL i Vault hvis den ikke finnes (verdi = produksjonsdomene)
-- =============================================================================
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM vault.secrets WHERE name = 'APP_URL';

  IF v_count = 0 THEN
    -- Fallback-verdier: eksisterende FLY_APP_URL, deretter VERCEL_APP_URL
    PERFORM vault.create_secret(
      coalesce(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'FLY_APP_URL' LIMIT 1),
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'VERCEL_APP_URL' LIMIT 1),
        'https://www.klarpakke.no'
      ),
      'APP_URL',
      'Canonical app URL for pg_cron HTTP callbacks (Cloudflare Workers)'
    );
    RAISE NOTICE 'Created Vault secret: APP_URL';
  ELSE
    RAISE NOTICE 'Vault secret APP_URL already exists — skipping';
  END IF;
END $$;

-- Sett ny nøytral app_url database-setting (ignorerer feil hvis ikke tillatt)
DO $$
BEGIN
  EXECUTE 'ALTER DATABASE postgres SET app.app_url = ''https://www.klarpakke.no''';
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set app.app_url: %', SQLERRM;
END $$;

-- =============================================================================
-- 2. Oppdater klarpakke_trigger_cron til å bruke APP_URL
-- =============================================================================
CREATE OR REPLACE FUNCTION public.klarpakke_trigger_cron(path TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url    TEXT;
  v_secret TEXT;
BEGIN
  -- 1. Prøv APP_URL først (nytt, Cloudflare Workers)
  SELECT decrypted_secret INTO v_url
  FROM vault.decrypted_secrets
  WHERE name = 'APP_URL'
  LIMIT 1;

  -- 2. Fallback til FLY_APP_URL (eldre navn, peker til www.klarpakke.no)
  IF v_url IS NULL OR v_url = '' THEN
    SELECT decrypted_secret INTO v_url
    FROM vault.decrypted_secrets
    WHERE name = 'FLY_APP_URL'
    LIMIT 1;
  END IF;

  -- 3. Fallback til VERCEL_APP_URL (eldre navn)
  IF v_url IS NULL OR v_url = '' THEN
    SELECT decrypted_secret INTO v_url
    FROM vault.decrypted_secrets
    WHERE name = 'VERCEL_APP_URL'
    LIMIT 1;
  END IF;

  -- 4. Fallback til current_setting (eldre navn)
  IF v_url IS NULL OR v_url = '' THEN
    v_url := current_setting('app.app_url', true);
  END IF;

  IF v_url IS NULL OR v_url = '' THEN
    v_url := current_setting('app.vercel_url', true);
  END IF;

  -- 5. Hent CRON_SECRET fra Vault
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'CRON_SECRET'
  LIMIT 1;

  IF v_secret IS NULL OR v_secret = '' THEN
    v_secret := current_setting('app.cron_secret', true);
  END IF;

  -- 6. Guard: ikke kjør uten config
  IF v_url IS NULL OR v_url = '' THEN
    RAISE WARNING 'klarpakke_trigger_cron: APP_URL mangler (Vault + current_setting). Hopper over %', path;
    RETURN;
  END IF;

  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE WARNING 'klarpakke_trigger_cron: CRON_SECRET mangler (Vault + current_setting). Hopper over %', path;
    RETURN;
  END IF;

  -- 7. Send HTTP POST via pg_net
  PERFORM pg_net.http_post(
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
-- 3. Re-schedule aktive cron-jobber som hardkodet VERCEL_APP_URL
-- =============================================================================

SELECT cron.schedule(
  'klarpakke-trading-tca',
  '0 */6 * * *',
  'SELECT net.http_post(url := coalesce((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''APP_URL'' LIMIT 1), (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''FLY_APP_URL'' LIMIT 1), (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''VERCEL_APP_URL'' LIMIT 1), current_setting(''app.app_url'', true), current_setting(''app.vercel_url'', true)) || ''/api/cron/trading-tca'', headers := jsonb_build_object(''Authorization'', ''Bearer '' || coalesce((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''CRON_SECRET'' LIMIT 1), current_setting(''app.cron_secret'', true), '''')), timeout_milliseconds := 25000)'
);

SELECT cron.schedule(
  'klarpakke-backtest-live-gap',
  '30 */6 * * *',
  'SELECT net.http_post(url := coalesce((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''APP_URL'' LIMIT 1), (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''FLY_APP_URL'' LIMIT 1), (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''VERCEL_APP_URL'' LIMIT 1), current_setting(''app.app_url'', true), current_setting(''app.vercel_url'', true)) || ''/api/cron/backtest-live-gap'', headers := jsonb_build_object(''Authorization'', ''Bearer '' || coalesce((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''CRON_SECRET'' LIMIT 1), current_setting(''app.cron_secret'', true), '''')), timeout_milliseconds := 25000)'
);

SELECT cron.schedule(
  'klarpakke-fill-rate-monitor',
  '15 */6 * * *',
  'SELECT net.http_post(url := coalesce((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''APP_URL'' LIMIT 1), (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''FLY_APP_URL'' LIMIT 1), (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''VERCEL_APP_URL'' LIMIT 1), current_setting(''app.app_url'', true), current_setting(''app.vercel_url'', true)) || ''/api/cron/fill-rate-monitor'', headers := jsonb_build_object(''Authorization'', ''Bearer '' || coalesce((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''CRON_SECRET'' LIMIT 1), current_setting(''app.cron_secret'', true), '''')), timeout_milliseconds := 25000)'
);

SELECT cron.schedule(
  'klarpakke-signal-decay',
  '45 */6 * * *',
  'SELECT net.http_post(url := coalesce((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''APP_URL'' LIMIT 1), (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''FLY_APP_URL'' LIMIT 1), (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''VERCEL_APP_URL'' LIMIT 1), current_setting(''app.app_url'', true), current_setting(''app.vercel_url'', true)) || ''/api/cron/signal-decay'', headers := jsonb_build_object(''Authorization'', ''Bearer '' || coalesce((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''CRON_SECRET'' LIMIT 1), current_setting(''app.cron_secret'', true), '''')), timeout_milliseconds := 25000)'
);

SELECT cron.schedule(
  'klarpakke-adverse-selection',
  '20 */6 * * *',
  'SELECT net.http_post(url := coalesce((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''APP_URL'' LIMIT 1), (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''FLY_APP_URL'' LIMIT 1), (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''VERCEL_APP_URL'' LIMIT 1), current_setting(''app.app_url'', true), current_setting(''app.vercel_url'', true)) || ''/api/cron/adverse-selection'', headers := jsonb_build_object(''Authorization'', ''Bearer '' || coalesce((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''CRON_SECRET'' LIMIT 1), current_setting(''app.cron_secret'', true), '''')), timeout_milliseconds := 25000)'
);

SELECT cron.schedule(
  'klarpakke-pl-attribution',
  '10 */6 * * *',
  'SELECT net.http_post(url := coalesce((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''APP_URL'' LIMIT 1), (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''FLY_APP_URL'' LIMIT 1), (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''VERCEL_APP_URL'' LIMIT 1), current_setting(''app.app_url'', true), current_setting(''app.vercel_url'', true)) || ''/api/cron/pl-attribution'', headers := jsonb_build_object(''Authorization'', ''Bearer '' || coalesce((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''CRON_SECRET'' LIMIT 1), current_setting(''app.cron_secret'', true), '''')), timeout_milliseconds := 25000)'
);

SELECT cron.schedule(
  'klarpakke-market-impact',
  '40 */6 * * *',
  'SELECT net.http_post(url := coalesce((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''APP_URL'' LIMIT 1), (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''FLY_APP_URL'' LIMIT 1), (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''VERCEL_APP_URL'' LIMIT 1), current_setting(''app.app_url'', true), current_setting(''app.vercel_url'', true)) || ''/api/cron/market-impact'', headers := jsonb_build_object(''Authorization'', ''Bearer '' || coalesce((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''CRON_SECRET'' LIMIT 1), current_setting(''app.cron_secret'', true), '''')), timeout_milliseconds := 25000)'
);

SELECT cron.schedule(
  'klarpakke-balance-drift-check',
  '0 * * * *',
  $$
    SELECT net.http_post(
      url := coalesce(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'APP_URL' LIMIT 1),
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'FLY_APP_URL' LIMIT 1),
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'VERCEL_APP_URL' LIMIT 1),
        current_setting('app.app_url', true),
        current_setting('app.vercel_url', true)
      ) || '/api/cron/balance-drift-check',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || coalesce(
          (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1),
          current_setting('app.cron_secret', true),
          ''
        )
      ),
      timeout_milliseconds := 25000
    )
  $$
);

-- =============================================================================
-- 4. Verifikasjon
-- =============================================================================
DO $$
DECLARE
  v_app_count int;
  v_fly_count int;
  v_vercel_count int;
  v_secret_count int;
BEGIN
  SELECT count(*) INTO v_app_count FROM vault.secrets WHERE name = 'APP_URL';
  SELECT count(*) INTO v_fly_count FROM vault.secrets WHERE name = 'FLY_APP_URL';
  SELECT count(*) INTO v_vercel_count FROM vault.secrets WHERE name = 'VERCEL_APP_URL';
  SELECT count(*) INTO v_secret_count FROM vault.secrets WHERE name = 'CRON_SECRET';

  RAISE NOTICE 'Vault status: % APP_URL, % FLY_APP_URL, % VERCEL_APP_URL, % CRON_SECRET',
    v_app_count, v_fly_count, v_vercel_count, v_secret_count;
END $$;
