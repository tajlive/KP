-- Restore /api/health signal-engine heartbeat after Cloudflare Workers migration.
-- The Supabase Edge Function `signal-engine` cannot write bot_health from the
-- new project (env/RLS issue), so the existing Cloudflare cron selfcheck route
-- is now the source of truth for the heartbeat row.

-- 1. bot_health upserts require a unique constraint on bot_name.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bot_health_bot_name_unique'
  ) THEN
    ALTER TABLE public.bot_health
      ADD CONSTRAINT bot_health_bot_name_unique UNIQUE (bot_name);
  END IF;
END
$$;

-- 2. Remove the old 10-minute selfcheck cron to avoid duplicates.
SELECT cron.unschedule('signal-health-selfcheck-10min');

-- 3. Repurpose signal-engine-5min to call the Workers selfcheck route.
--    CRON_SECRET is stored in vault.decrypted_secrets (used by newer crons).
SELECT cron.unschedule('signal-engine-5min');
SELECT cron.schedule(
  'signal-engine-5min',
  '*/5 * * * *',
  $CRON$
    SELECT net.http_post(
      url := 'https://www.klarpakke.no/api/cron/signal-health-selfcheck',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(
          (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1),
          current_setting('app.settings.cron_secret', true),
          ''
        )
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $CRON$
);
