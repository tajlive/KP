-- Varig cron-helseovervåking + auth-fikser (2026-07-30)
--
-- Bakgrunn: pg_cron-jobber (klarpakke-trading-tick, smart-trader-v3,
-- reconcile-binance-trades) fikk 401 i timevis/dager uten at noe fanget det —
-- cron.job_run_details viser "succeeded" selv ved HTTP 401. Trading-motoren
-- var reelt parkert. Denne migrasjonen etablerer registrering + analyse.

-- 1. Helselogg
CREATE TABLE IF NOT EXISTS public.cron_health_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  detected_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL,
  response_id bigint,
  job_name text,
  status_code int,
  timed_out boolean,
  error_detail text,
  created timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS cron_health_events_response_uidx
  ON public.cron_health_events (response_id) WHERE response_id IS NOT NULL;

-- 2. Idempotent innsamler (kjøres av cron-health-collector hvert 15. min)
CREATE OR REPLACE FUNCTION public.log_cron_health_failures()
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER
AS $f$
DECLARE inserted_count int;
BEGIN
  INSERT INTO public.cron_health_events (source, response_id, status_code, timed_out, error_detail, created)
  SELECT 'http_response', r.id, r.status_code, r.timed_out,
         left(coalesce(r.error_msg, r.content, ''), 300), r.created
  FROM net._http_response r
  WHERE r.created > now() - interval '2 hours'
    AND (r.status_code IS NULL OR r.status_code NOT BETWEEN 200 AND 299)
  ON CONFLICT (response_id) WHERE response_id IS NOT NULL DO NOTHING;

  INSERT INTO public.cron_health_events (source, job_name, error_detail, created)
  SELECT 'job_run', j.jobname, left(coalesce(rd.return_message, rd.status), 300), rd.start_time
  FROM cron.job_run_details rd JOIN cron.job j ON j.jobid = rd.jobid
  WHERE rd.start_time > now() - interval '2 hours' AND rd.status <> 'succeeded';

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$f$;

SELECT cron.schedule('cron-health-collector', '14,29,44,59 * * * *', $c$SELECT public.log_cron_health_failures()$c$);

-- 3. klarpakke_trigger_cron: timeout 5s → 25s (tick tar ~7s for 13 sesjoner)
CREATE OR REPLACE FUNCTION public.klarpakke_trigger_cron(path text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE v_url TEXT; v_secret TEXT;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'APP_URL' LIMIT 1;
  IF v_url IS NULL OR v_url = '' THEN
    SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'FLY_APP_URL' LIMIT 1;
  END IF;
  IF v_url IS NULL OR v_url = '' THEN v_url := current_setting('app.app_url', true); END IF;
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1;
  IF v_secret IS NULL OR v_secret = '' THEN v_secret := current_setting('app.cron_secret', true); END IF;
  IF v_url IS NULL OR v_url = '' THEN RAISE WARNING 'klarpakke_trigger_cron: APP_URL missing. Skipping %', path; RETURN; END IF;
  IF v_secret IS NULL OR v_secret = '' THEN RAISE WARNING 'klarpakke_trigger_cron: CRON_SECRET missing. Skipping %', path; RETURN; END IF;
  PERFORM net.http_post(
    url := v_url || path,
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret, 'Content-Type', 'application/json', 'User-Agent', 'Supabase-pg_cron/1.1'),
    body := jsonb_build_object('source', 'pg_cron', 'triggered_at', NOW()),
    timeout_milliseconds := 25000
  );
END;
$function$;

-- MERK (utført manuelt 2026-07-30, gjenskap ved behov):
-- - vault CRON_SECRET oppdatert til gjeldende verdi (matchet workeren)
-- - cron.alter_job: klarpakke-trading-tick → SELECT public.klarpakke_trigger_cron('/api/cron/tick')
-- - cron.alter_job: smart-trader-v3 + reconcile-binance-trades → auth fra vault.decrypted_secrets
-- - cron.alter_job: klarpakke-daily-pnl-report → la til Authorization-header fra vault
