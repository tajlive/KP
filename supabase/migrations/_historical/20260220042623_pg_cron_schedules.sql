-- ============================================================================
-- PG_CRON SCHEDULER — Auto Trade Strategy Runner
-- Kjører strategier på definerte schedule
-- ============================================================================

-- Sikre at pg_cron er aktivert
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Hent Supabase prosjekt-ref fra env (må erstattes ved kjøring)
-- MERK: Erstatt <PROJECT_REF> med faktisk prosjekt-ref: vuxbjlykgmzskxbclquf

-- DCA Trygg: Mandager kl 09:00 UTC (ugentlig DCA)
SELECT cron.schedule(
  'klarpakke-dca-weekly',
  '0 9 * * 1',
  $$
  SELECT net.http_post(
    url    := 'https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/strategy-runner',
    body   := '{"strategy":"dca_trygg"}'::jsonb,
    headers:= jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    )
  );
  $$
) ON CONFLICT (jobname) DO UPDATE SET 
  schedule = EXCLUDED.schedule,
  command = EXCLUDED.command;

-- Trend Balansert: Daglig kl 21:00 UTC (daglig trend-sjekk)
SELECT cron.schedule(
  'klarpakke-trend-daily',
  '0 21 * * *',
  $$
  SELECT net.http_post(
    url    := 'https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/strategy-runner',
    body   := '{"strategy":"trend_balansert"}'::jsonb,
    headers:= jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    )
  );
  $$
) ON CONFLICT (jobname) DO UPDATE SET 
  schedule = EXCLUDED.schedule,
  command = EXCLUDED.command;

-- Multi-Signal: Hver 4. time (00:05, 04:05, 08:05, 12:05, 16:05, 20:05 UTC)
SELECT cron.schedule(
  'klarpakke-multisignal-4h',
  '5 0,4,8,12,16,20 * * *',
  $$
  SELECT net.http_post(
    url    := 'https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/strategy-runner',
    body   := '{"strategy":"multisignal_aktiv"}'::jsonb,
    headers:= jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    )
  );
  $$
) ON CONFLICT (jobname) DO UPDATE SET 
  schedule = EXCLUDED.schedule,
  command = EXCLUDED.command;

-- Grid Bot: Hvert minutt (sjekk grid-nivåer ofte)
SELECT cron.schedule(
  'klarpakke-grid-check',
  '* * * * *',
  $$
  SELECT net.http_post(
    url    := 'https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/strategy-runner',
    body   := '{"strategy":"grid_bot"}'::jsonb,
    headers:= jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    )
  );
  $$
) ON CONFLICT (jobname) DO UPDATE SET 
  schedule = EXCLUDED.schedule,
  command = EXCLUDED.command;

-- AI Copy: Hvert 5. minutt (sjekk nye signaler)
SELECT cron.schedule(
  'klarpakke-aicopy-poll',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url    := 'https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/strategy-runner',
    body   := '{"strategy":"ai_copy"}'::jsonb,
    headers:= jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    )
  );
  $$
) ON CONFLICT (jobname) DO UPDATE SET 
  schedule = EXCLUDED.schedule,
  command = EXCLUDED.command;

-- Verifiser at jobbene er registrert
SELECT 
  jobname, 
  schedule, 
  active,
  CASE 
    WHEN jobname = 'klarpakke-dca-weekly' THEN 'DCA Trygg - Mandag 09:00 UTC'
    WHEN jobname = 'klarpakke-trend-daily' THEN 'Trend Balansert - Daglig 21:00 UTC'
    WHEN jobname = 'klarpakke-multisignal-4h' THEN 'Multi-Signal - Hver 4.time'
    WHEN jobname = 'klarpakke-grid-check' THEN 'Grid Bot - Hvert minutt'
    WHEN jobname = 'klarpakke-aicopy-poll' THEN 'AI Copy - Hvert 5.min'
    ELSE 'Ukjent'
  END as description
FROM cron.job 
WHERE jobname LIKE 'klarpakke-%'
ORDER BY jobname;
