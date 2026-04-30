-- legacy-accepted: 8-sifret timestamp, deployet til prod 2026-04. Se AGENTS.md.
-- ============================================================
-- 2026-04-20: Fix pg_net schema reference in klarpakke_trigger_cron
--
-- Problem: pg_net extension installs in 'public' schema but
--          http_post lives in 'net' schema. The function used
--          pg_net.http_post which does not exist.
--          All 14 cron jobs were failing with:
--          "ERROR: schema pg_net does not exist"
-- ============================================================

CREATE OR REPLACE FUNCTION public.klarpakke_trigger_cron(path TEXT)
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

  -- 4. Send HTTP POST via net (RIKTIG schema — pg_net extension er i public,
  --    men http_post funksjonen ligger i net schema)
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
