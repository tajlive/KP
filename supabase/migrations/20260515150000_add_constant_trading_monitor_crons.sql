-- Constant Trading Monitor — pg_cron jobs for all 7 gap analyses
-- Runs every 6 hours at minute 0, 30, 15, 45, 20, 10, 40 respectively

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1. TCA Dashboard — every 6h at :00
SELECT cron.schedule(
  'klarpakke-trading-tca',
  '0 */6 * * *',
  'SELECT net.http_post(url := coalesce((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''VERCEL_APP_URL'' LIMIT 1), current_setting(''app.vercel_url'', true)) || ''/api/cron/trading-tca'', headers := jsonb_build_object(''Authorization'', ''Bearer '' || coalesce((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''CRON_SECRET'' LIMIT 1), current_setting(''app.cron_secret'', true), '''')), timeout_milliseconds := 25000)'
);

-- 2. Backtest vs Live Gap — every 6h at :30
SELECT cron.schedule(
  'klarpakke-backtest-live-gap',
  '30 */6 * * *',
  'SELECT net.http_post(url := coalesce((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''VERCEL_APP_URL'' LIMIT 1), current_setting(''app.vercel_url'', true)) || ''/api/cron/backtest-live-gap'', headers := jsonb_build_object(''Authorization'', ''Bearer '' || coalesce((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''CRON_SECRET'' LIMIT 1), current_setting(''app.cron_secret'', true), '''')), timeout_milliseconds := 25000)'
);

-- 3. Fill Rate Monitor — every 6h at :15
SELECT cron.schedule(
  'klarpakke-fill-rate-monitor',
  '15 */6 * * *',
  'SELECT net.http_post(url := coalesce((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''VERCEL_APP_URL'' LIMIT 1), current_setting(''app.vercel_url'', true)) || ''/api/cron/fill-rate-monitor'', headers := jsonb_build_object(''Authorization'', ''Bearer '' || coalesce((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''CRON_SECRET'' LIMIT 1), current_setting(''app.cron_secret'', true), '''')), timeout_milliseconds := 25000)'
);

-- 4. Signal Decay — every 6h at :45
SELECT cron.schedule(
  'klarpakke-signal-decay',
  '45 */6 * * *',
  'SELECT net.http_post(url := coalesce((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''VERCEL_APP_URL'' LIMIT 1), current_setting(''app.vercel_url'', true)) || ''/api/cron/signal-decay'', headers := jsonb_build_object(''Authorization'', ''Bearer '' || coalesce((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''CRON_SECRET'' LIMIT 1), current_setting(''app.cron_secret'', true), '''')), timeout_milliseconds := 25000)'
);

-- 5. Adverse Selection — every 6h at :20
SELECT cron.schedule(
  'klarpakke-adverse-selection',
  '20 */6 * * *',
  'SELECT net.http_post(url := coalesce((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''VERCEL_APP_URL'' LIMIT 1), current_setting(''app.vercel_url'', true)) || ''/api/cron/adverse-selection'', headers := jsonb_build_object(''Authorization'', ''Bearer '' || coalesce((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''CRON_SECRET'' LIMIT 1), current_setting(''app.cron_secret'', true), '''')), timeout_milliseconds := 25000)'
);

-- 6. P&L Attribution — every 6h at :10
SELECT cron.schedule(
  'klarpakke-pl-attribution',
  '10 */6 * * *',
  'SELECT net.http_post(url := coalesce((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''VERCEL_APP_URL'' LIMIT 1), current_setting(''app.vercel_url'', true)) || ''/api/cron/pl-attribution'', headers := jsonb_build_object(''Authorization'', ''Bearer '' || coalesce((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''CRON_SECRET'' LIMIT 1), current_setting(''app.cron_secret'', true), '''')), timeout_milliseconds := 25000)'
);

-- 7. Market Impact — every 6h at :40
SELECT cron.schedule(
  'klarpakke-market-impact',
  '40 */6 * * *',
  'SELECT net.http_post(url := coalesce((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''VERCEL_APP_URL'' LIMIT 1), current_setting(''app.vercel_url'', true)) || ''/api/cron/market-impact'', headers := jsonb_build_object(''Authorization'', ''Bearer '' || coalesce((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''CRON_SECRET'' LIMIT 1), current_setting(''app.cron_secret'', true), '''')), timeout_milliseconds := 25000)'
);
