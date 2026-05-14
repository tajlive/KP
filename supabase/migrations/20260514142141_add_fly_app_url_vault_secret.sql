-- =============================================================================
-- MIGRASJON: Legg til FLY_APP_URL i Vault + oppdater cron trigger
-- Dato: 2026-05-14
-- Bakgrunn: Migrert fra Vercel til Fly.io. pg_cron treffer feil endpoint
--           hvis VERCEL_APP_URL fortsatt peker til Vercel.
-- =============================================================================

-- Sikre at vault-ekstensjonen er tilgjengelig
CREATE EXTENSION IF NOT EXISTS pgsodium;
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- =============================================================================
-- VAULT SECRET: FLY_APP_URL (opprett kun hvis den ikke finnes)
-- =============================================================================

DO $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM vault.secrets WHERE name = 'FLY_APP_URL';

  IF v_count = 0 THEN
    PERFORM vault.create_secret(
      'https://www.klarpakke.no',
      'FLY_APP_URL',
      'Fly.io app URL for pg_cron HTTP callbacks (post-Vercel migration)'
    );
    RAISE NOTICE 'Created Vault secret: FLY_APP_URL';
  ELSE
    RAISE NOTICE 'Vault secret FLY_APP_URL already exists — skipping';
  END IF;
END $$;

-- =============================================================================
-- OPPDATER HELPER FUNCTION: Prøv FLY_APP_URL først, deretter VERCEL_APP_URL fallback
-- =============================================================================
CREATE OR REPLACE FUNCTION klarpakke_trigger_cron(path TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url    TEXT;
  v_secret TEXT;
BEGIN
  -- 1. Prøv FLY_APP_URL først (nytt, post-migrering)
  SELECT decrypted_secret INTO v_url
  FROM vault.decrypted_secrets
  WHERE name = 'FLY_APP_URL'
  LIMIT 1;

  -- 2. Fallback til VERCEL_APP_URL (bakoverkompatibilitet)
  IF v_url IS NULL OR v_url = '' THEN
    SELECT decrypted_secret INTO v_url
    FROM vault.decrypted_secrets
    WHERE name = 'VERCEL_APP_URL'
    LIMIT 1;
  END IF;

  -- 3. Fallback til current_setting (eldre bakoverkompatibilitet)
  IF v_url IS NULL OR v_url = '' THEN
    v_url := current_setting('app.vercel_url', true);
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
    RAISE WARNING 'klarpakke_trigger_cron: FLY_APP_URL/VERCEL_APP_URL mangler (Vault + current_setting). Hopper over %', path;
    RETURN;
  END IF;

  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE WARNING 'klarpakke_trigger_cron: CRON_SECRET mangler (Vault + current_setting). Hopper over %', path;
    RETURN;
  END IF;

  -- 6. Send HTTP POST via pg_net
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
-- VERIFIKASJON
-- =============================================================================
DO $$
DECLARE
  v_fly_count int;
  v_vercel_count int;
  v_secret_count int;
BEGIN
  SELECT count(*) INTO v_fly_count
  FROM vault.secrets WHERE name = 'FLY_APP_URL';

  SELECT count(*) INTO v_vercel_count
  FROM vault.secrets WHERE name = 'VERCEL_APP_URL';

  SELECT count(*) INTO v_secret_count
  FROM vault.secrets WHERE name = 'CRON_SECRET';

  RAISE NOTICE 'Vault status: % FLY_APP_URL, % VERCEL_APP_URL, % CRON_SECRET',
    v_fly_count, v_vercel_count, v_secret_count;
END $$;
