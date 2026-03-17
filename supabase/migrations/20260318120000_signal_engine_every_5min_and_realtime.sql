-- Signal-engine: kjør hvert 5. minutt (mer spennende for brukere)
-- + Slå på Realtime for trading_signals så nye signaler dukker opp med en gang i UI

SET statement_timeout = '30s';

-- ============================================================
-- 1) Realtime for trading_signals (nye signaler pushet til klient)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'trading_signals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trading_signals;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Realtime trading_signals: %', SQLERRM;
END $$;

-- ============================================================
-- 2) pg_cron: bytt fra hver time til hvert 5. minutt
-- ============================================================
DO $$
BEGIN
  PERFORM cron.unschedule('signal-engine-hourly');
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Unschedule signal-engine-hourly: %', SQLERRM;
END $$;
DO $$
BEGIN
  PERFORM cron.unschedule('signal-engine-5min');
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Unschedule signal-engine-5min: %', SQLERRM;
END $$;

-- Ny jobb: hvert 5. minutt (spennende, brukere følger med)
-- Samme URL og auth som 20240101000002 – juster om prosjektet bruker annen URL
SELECT cron.schedule(
  'signal-engine-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/signal-engine',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);
