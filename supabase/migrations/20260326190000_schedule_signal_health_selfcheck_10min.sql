-- Schedule automated signal health self-check every 10 minutes.
-- Source of truth: Supabase pg_cron.

DO $$
DECLARE
  v_base_url TEXT;
BEGIN
  v_base_url := COALESCE(
    NULLIF(current_setting('app.settings.app_url', true), ''),
    'https://www.klarpakke.no'
  );

  BEGIN
    PERFORM cron.unschedule('signal-health-selfcheck-10min');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'signal-health-selfcheck-10min unschedule: %', SQLERRM;
  END;

  PERFORM cron.schedule(
    'signal-health-selfcheck-10min',
    '*/10 * * * *',
    format(
      $sql$
      SELECT
        net.http_post(
          url := %L,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || COALESCE(current_setting('app.settings.cron_secret', true), '')
          ),
          body := '{}'::jsonb
        ) AS request_id;
      $sql$,
      v_base_url || '/api/cron/signal-health-selfcheck'
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'signal-health-selfcheck-10min schedule: %', SQLERRM;
END $$;

