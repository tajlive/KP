-- Sprint 11: pg_cron-schedules for strategy-runner
-- MERK: Erstatt <PROJECT_REF> og <SERVICE_ROLE_KEY> med faktiske verdier
-- eller kjør via scripts/setup-complete.sh
--
-- Kjør disse i Supabase SQL Editor etter at strategy-runner EF er deployed:

-- DCA Trygg: mandager kl 09:00 UTC
SELECT cron.schedule(
  'klarpakke-dca-weekly',
  '0 9 * * 1',
  $$
  SELECT net.http_post(
    url    := 'https://<PROJECT_REF>.supabase.co/functions/v1/strategy-runner',
    body   := '{"strategy":"dca_trygg"}'::jsonb,
    headers:= jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    )
  );
  $$
);

-- Trend Balansert: daglig kl 21:00 UTC
SELECT cron.schedule(
  'klarpakke-trend-daily',
  '0 21 * * *',
  $$
  SELECT net.http_post(
    url    := 'https://<PROJECT_REF>.supabase.co/functions/v1/strategy-runner',
    body   := '{"strategy":"trend_balansert"}'::jsonb,
    headers:= jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    )
  );
  $$
);

-- Multi-Signal: hvert 4. time (00:05, 04:05, 08:05, 12:05, 16:05, 20:05 UTC)
SELECT cron.schedule(
  'klarpakke-multisignal-4h',
  '5 0,4,8,12,16,20 * * *',
  $$
  SELECT net.http_post(
    url    := 'https://<PROJECT_REF>.supabase.co/functions/v1/strategy-runner',
    body   := '{"strategy":"multisignal_aktiv"}'::jsonb,
    headers:= jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    )
  );
  $$
);

-- Grid Bot: hvert minutt
SELECT cron.schedule(
  'klarpakke-grid-check',
  '* * * * *',
  $$
  SELECT net.http_post(
    url    := 'https://<PROJECT_REF>.supabase.co/functions/v1/strategy-runner',
    body   := '{"strategy":"grid_bot"}'::jsonb,
    headers:= jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    )
  );
  $$
);

-- AI Copy: hvert 5. minutt
SELECT cron.schedule(
  'klarpakke-aicopy-poll',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url    := 'https://<PROJECT_REF>.supabase.co/functions/v1/strategy-runner',
    body   := '{"strategy":"ai_copy"}'::jsonb,
    headers:= jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    )
  );
  $$
);

-- Verifiser at jobbene er registrert:
-- SELECT jobname, schedule, command FROM cron.job ORDER BY jobname;
