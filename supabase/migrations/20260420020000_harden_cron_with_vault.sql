-- =============================================================================
-- MIGRASJON: Harden pg_cron med Supabase Vault
-- Dato: 2026-04-20
-- Bakgrunn: current_setting('app.vercel_url', true) forsvinner ved restart.
-- Løsning: Les config fra vault.decrypted_secrets med fallback til current_setting.
-- =============================================================================

-- Sikre at vault-ekstensjonen er tilgjengelig
CREATE EXTENSION IF NOT EXISTS pgsodium;
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- =============================================================================
-- VAULT SECRETS: Opprett kun hvis de ikke finnes fra før
-- =============================================================================

DO $$
DECLARE
  v_count int;
BEGIN
  -- VERCEL_APP_URL
  SELECT count(*) INTO v_count
  FROM vault.secrets WHERE name = 'VERCEL_APP_URL';

  IF v_count = 0 THEN
    PERFORM vault.create_secret(
      'https://www.klarpakke.no',
      'VERCEL_APP_URL',
      'Vercel app URL for pg_cron HTTP callbacks'
    );
    RAISE NOTICE 'Created Vault secret: VERCEL_APP_URL';
  ELSE
    RAISE NOTICE 'Vault secret VERCEL_APP_URL already exists — skipping';
  END IF;

  -- CRON_SECRET
  SELECT count(*) INTO v_count
  FROM vault.secrets WHERE name = 'CRON_SECRET';

  IF v_count = 0 THEN
    PERFORM vault.create_secret(
      '581260aab4a12c3de264c0094f2e884f1306e82be43aa87e27c541ff19708f2c',
      'CRON_SECRET',
      'Authorization secret for cron HTTP callbacks'
    );
    RAISE NOTICE 'Created Vault secret: CRON_SECRET';
  ELSE
    RAISE NOTICE 'Vault secret CRON_SECRET already exists — skipping';
  END IF;
END $$;

-- =============================================================================
-- HELPER FUNCTION: Oppdatert med Vault + fallback
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
  -- 1. Prøv Vault først (persistert, overlever restart)
  SELECT decrypted_secret INTO v_url
  FROM vault.decrypted_secrets
  WHERE name = 'VERCEL_APP_URL'
  LIMIT 1;

  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'CRON_SECRET'
  LIMIT 1;

  -- 2. Fallback til current_setting (bakoverkompatibilitet)
  IF v_url IS NULL OR v_url = '' THEN
    v_url := current_setting('app.vercel_url', true);
  END IF;

  IF v_secret IS NULL OR v_secret = '' THEN
    v_secret := current_setting('app.cron_secret', true);
  END IF;

  -- 3. Guard: ikke kjør uten config
  IF v_url IS NULL OR v_url = '' THEN
    RAISE WARNING 'klarpakke_trigger_cron: VERCEL_APP_URL mangler (Vault + current_setting). Hopper over %', path;
    RETURN;
  END IF;

  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE WARNING 'klarpakke_trigger_cron: CRON_SECRET mangler (Vault + current_setting). Hopper over %', path;
    RETURN;
  END IF;

  -- 4. Send HTTP POST via pg_net
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
-- VERIFIKASJON (kjøres automatisk ved migrasjon)
-- =============================================================================
DO $$
DECLARE
  v_url_count int;
  v_secret_count int;
BEGIN
  SELECT count(*) INTO v_url_count
  FROM vault.secrets WHERE name = 'VERCEL_APP_URL';

  SELECT count(*) INTO v_secret_count
  FROM vault.secrets WHERE name = 'CRON_SECRET';

  IF v_url_count = 0 OR v_secret_count = 0 THEN
    RAISE WARNING 'Vault secrets ikke opprettet. Sjekk at supabase_vault er aktivert.';
  ELSE
    RAISE NOTICE 'Vault hardening OK: % URL secret(s), % CRON secret(s)', v_url_count, v_secret_count;
  END IF;
END $$;
