-- Add pg_cron jobs for constant monitoring
-- 1. Balance drift check: every hour
-- 2. Currency rate monitor: daily (update-usdt-nok already exists, we verify it)

-- Ensure pg_cron is available
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1. Balance drift check — runs every hour
-- Uses Vault secrets for URL and CRON_SECRET
SELECT cron.schedule(
  'klarpakke-balance-drift-check',
  '0 * * * *',
  $$
    SELECT net.http_post(
      url := coalesce(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'VERCEL_APP_URL' LIMIT 1),
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

COMMENT ON JOB klarpakke-balance-drift-check IS
  'Hourly balance drift detection across trading_sessions, user_profiles, wallets, portfolios';
