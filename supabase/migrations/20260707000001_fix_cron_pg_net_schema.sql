-- =============================================================================
-- 2026-07-07: Re-apply correct pg_net schema reference in klarpakke_trigger_cron
-- =============================================================================
--
-- Problem: Some environments still have klarpakke_trigger_cron calling
--          pg_net.http_post(...), but pg_net extension functions live in
--          schema `net`, not `pg_net`. This causes every cron job that uses
--          the wrapper to fail with:
--            ERROR: schema "pg_net" does not exist
--          As a result /api/cron/tick never runs, so active trading sessions
--          never get their last_heartbeat updated and are marked as crashed
--          by detect_crashed_sessions() after 5 minutes.
--
-- Fix: Ensure the wrapper uses net.http_post(...) regardless of prior state.
--
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
  -- 1. APP_URL is canonical (Cloudflare Workers)
  SELECT decrypted_secret INTO v_url
  FROM vault.decrypted_secrets
  WHERE name = 'APP_URL'
  LIMIT 1;

  -- 2. Fallback to FLY_APP_URL older name
  IF v_url IS NULL OR v_url = '' THEN
    SELECT decrypted_secret INTO v_url
    FROM vault.decrypted_secrets
    WHERE name = 'FLY_APP_URL'
    LIMIT 1;
  END IF;

  -- 3. Fallback to database setting
  IF v_url IS NULL OR v_url = '' THEN
    v_url := current_setting('app.app_url', true);
  END IF;

  -- 4. Get CRON_SECRET from Vault
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'CRON_SECRET'
  LIMIT 1;

  IF v_secret IS NULL OR v_secret = '' THEN
    v_secret := current_setting('app.cron_secret', true);
  END IF;

  -- 5. Guard: do not run without config
  IF v_url IS NULL OR v_url = '' THEN
    RAISE WARNING 'klarpakke_trigger_cron: APP_URL missing (Vault + current_setting). Skipping %', path;
    RETURN;
  END IF;

  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE WARNING 'klarpakke_trigger_cron: CRON_SECRET missing (Vault + current_setting). Skipping %', path;
    RETURN;
  END IF;

  -- 6. Send HTTP POST via net (pg_net extension functions live in schema `net`)
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
