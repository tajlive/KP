-- ═══════════════════════════════════════════════════════════════════════════
-- KLARPAKKE: BOT HEALTH ALERTING MED TELEGRAM
-- ═══════════════════════════════════════════════════════════════════════════
-- Oppretter cron-job som sjekker bot_health tabellen hvert 10. minutt
-- Sender Telegram alert hvis bots er nede eller har feil
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 8.1: SJEKK ELLER OPPRETT bot_health TABELL
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;

SELECT 
  'SJEKKER bot_health TABELL' as title;

-- Sjekk om tabellen eksisterer
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'bot_health') as column_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'bot_health';

-- Vis kolonner hvis tabellen finnes
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'bot_health'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8.2: OPPRETT bot_health TABELL (hvis den ikke finnes)
-- ═══════════════════════════════════════════════════════════════════════════
-- Uncomment og kjør hvis tabellen ikke eksisterer:
/*

CREATE TABLE IF NOT EXISTS public.bot_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'idle',
  last_error TEXT,
  last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bot_health_status ON public.bot_health(status);
CREATE INDEX IF NOT EXISTS idx_bot_health_heartbeat ON public.bot_health(last_heartbeat);
CREATE INDEX IF NOT EXISTS idx_bot_health_bot_name ON public.bot_health(bot_name);

-- RLS
ALTER TABLE public.bot_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bot_health_select_all" ON public.bot_health
FOR SELECT TO authenticated USING (true);

CREATE POLICY "bot_health_insert_all" ON public.bot_health
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "bot_health_update_all" ON public.bot_health
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

*/

-- ═══════════════════════════════════════════════════════════════════════════
-- 8.3: SJEKK ELLER OPPRETT broadcast-telegram EDGE FUNCTION
-- ═══════════════════════════════════════════════════════════════════════════
/*

Edge Function må eksistere på:
https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/broadcast-telegram

Sjekk at den finnes i: supabase/functions/broadcast-telegram/index.ts

Hvis den ikke finnes, opprett den:

*/

-- ═══════════════════════════════════════════════════════════════════════════
-- 8.4: OPPRETT/OPPDATER MONITORING CRON-JOB
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;

SELECT 
  'OPRETTER BOT HEALTH MONITORING CRON-JOB' as title;

-- Aktiver pg_cron (hvis ikke allerede aktiv)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Fjern gammel jobb hvis den finnes
SELECT cron.unschedule('bot-health-monitor');

-- Opprett ny monitoring cron-job
-- Denne kjører hvert 10. minutt og sjekker for unhealthy bots
SELECT cron.schedule(
  'bot-health-monitor',
  '*/10 * * * *',  -- Hvert 10. minutt
  $cron$
  WITH unhealthy_bots AS (
    SELECT 
      bot_name,
      status,
      last_error,
      last_heartbeat,
      EXTRACT(EPOCH FROM (NOW() - last_heartbeat))/60 AS minutes_since_heartbeat,
      metadata
    FROM bot_health
    WHERE status = 'error'
       OR status = 'stopped'
       OR last_heartbeat < NOW() - INTERVAL '15 minutes'
       OR (metadata->>'consecutive_failures')::int > 5
  ),
  alert_data AS (
    SELECT 
      COUNT(*) as bot_count,
      string_agg(
        '🔴 ' || bot_name || ' (' || status || ')' ||
        CASE 
          WHEN last_error IS NOT NULL THEN ': ' || LEFT(last_error, 100)
          ELSE ': No heartbeat for ' || ROUND(minutes_since_heartbeat)::text || ' min'
        END,
        E'\n'
      ) as alert_message
    FROM unhealthy_bots
  )
  SELECT 
    CASE 
      WHEN bot_count > 0 THEN
        net.http_post(
          url := 'https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/broadcast-telegram',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.anon_key', true)
          ),
          body := jsonb_build_object(
            'type', 'bot_health_alert',
            'message', '🚨 Bot Health Alert (' || bot_count || ' unhealthy bots):\n\n' || alert_message,
            'timestamp', NOW(),
            'severity', CASE WHEN bot_count > 3 THEN 'critical' ELSE 'warning' END
          )
        )
      ELSE NULL
    END
  FROM alert_data;
  $cron$
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 8.5: VERIFISER CRON-JOB
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;

SELECT 
  'VERIFISERING: Cron-job detaljer' as title;

SELECT 
  jobid,
  jobname,
  schedule,
  active,
  CASE 
    WHEN active THEN '✅ Aktiv'
    ELSE '❌ Inaktiv'
  END as status
FROM cron.job 
WHERE jobname = 'bot-health-monitor';

-- Vis siste kjøringer
SELECT 
  'SISTE KJØRINGER:' as info;

SELECT 
  runid,
  jobid,
  job_pid,
  database,
  start_time,
  end_time,
  CASE 
    WHEN status = 'succeeded' THEN '✅ ' || status
    ELSE '❌ ' || status
  END as status,
  LEFT(return_message, 100) as return_message_preview
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'bot-health-monitor')
ORDER BY start_time DESC
LIMIT 5;

SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8.6: TEST ALERTING (simuler feil)
-- ═══════════════════════════════════════════════════════════════════════════
/*

-- TEST: Simuler en bot med feil
INSERT INTO bot_health (bot_name, status, last_error, last_heartbeat)
VALUES (
  'test-alert-bot',
  'error',
  'Connection timeout to Binance API',
  NOW() - INTERVAL '20 minutes'
)
ON CONFLICT (bot_name) 
DO UPDATE SET 
  status = 'error',
  last_error = 'Connection timeout to Binance API',
  last_heartbeat = NOW() - INTERVAL '20 minutes',
  updated_at = NOW();

-- Vent 10 minutter (eller kjør manuelt):
-- SELECT cron.run_job('bot-health-monitor');

-- Sjekk at alert ble sendt:
-- SELECT * FROM cron.job_run_details WHERE jobid = [jobid] ORDER BY start_time DESC LIMIT 1;

-- Rydd opp:
-- DELETE FROM bot_health WHERE bot_name = 'test-alert-bot';

*/

-- ═══════════════════════════════════════════════════════════════════════════
-- 8.7: ALTERNATIV MANUELL ALERT-FUNKSJON
-- ═══════════════════════════════════════════════════════════════════════════
-- Hvis cron ikke er tilgjengelig, opprett en funksjon som kan kalles manuelt:

CREATE OR REPLACE FUNCTION public.check_bot_health_and_alert()
RETURNS TABLE(
  bot_name TEXT,
  status TEXT,
  alert_sent BOOLEAN,
  error_message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_alert_message TEXT;
  v_bot_count INTEGER;
  v_response JSONB;
BEGIN
  -- Finn unhealthy bots
  RETURN QUERY
  WITH unhealthy AS (
    SELECT 
      bh.bot_name,
      bh.status,
      bh.last_error,
      EXTRACT(EPOCH FROM (NOW() - bh.last_heartbeat))/60 AS minutes_since_heartbeat
    FROM bot_health bh
    WHERE bh.status = 'error'
       OR bh.status = 'stopped'
       OR bh.last_heartbeat < NOW() - INTERVAL '15 minutes'
  ),
  alert_summary AS (
    SELECT 
      COUNT(*) as cnt,
      string_agg(
        '🔴 ' || bot_name || ' (' || status || '): ' ||
        COALESCE(last_error, 'No heartbeat for ' || ROUND(minutes_since_heartbeat)::text || ' min'),
        E'\n'
      ) as msg
    FROM unhealthy
  )
  SELECT 
    u.bot_name,
    u.status,
    CASE WHEN (SELECT cnt FROM alert_summary) > 0 THEN true ELSE false END as alert_sent,
    COALESCE(u.last_error, 'No heartbeat for ' || ROUND(u.minutes_since_heartbeat)::text || ' min') as error_msg
  FROM unhealthy u;
  
  -- Send alert hvis det er unhealthy bots
  SELECT cnt, msg INTO v_bot_count, v_alert_message
  FROM (
    SELECT 
      COUNT(*) as cnt,
      string_agg(
        '🔴 ' || bot_name || ' (' || status || '): ' ||
        COALESCE(last_error, 'No heartbeat'),
        E'\n'
      ) as msg
    FROM bot_health
    WHERE status = 'error'
       OR status = 'stopped'
       OR last_heartbeat < NOW() - INTERVAL '15 minutes'
  ) sub;
  
  IF v_bot_count > 0 THEN
    -- Send til Edge Function
    SELECT content::jsonb INTO v_response
    FROM net.http_post(
      url := 'https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/broadcast-telegram',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.anon_key', true)
      ),
      body := jsonb_build_object(
        'type', 'bot_health_alert',
        'message', '🚨 Bot Health Alert (' || v_bot_count || ' unhealthy bots):\n\n' || v_alert_message,
        'timestamp', NOW()
      )
    );
  END IF;
  
  RETURN;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8.8: VERIFISERING
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;

SELECT 
  'VERIFISERING: Komponenter opprettet' as title;

SELECT 
  'bot_health tabell' as component,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bot_health') 
    THEN '✅ Eksisterer'
    ELSE '❌ Mangler'
  END as status;

UNION ALL

SELECT 
  'pg_cron extension' as component,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') 
    THEN '✅ Aktiv'
    ELSE '❌ Inaktiv'
  END as status;

UNION ALL

SELECT 
  'bot-health-monitor cron-job' as component,
  CASE 
    WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'bot-health-monitor') 
    THEN '✅ Aktiv'
    ELSE '❌ Inaktiv'
  END as status;

UNION ALL

SELECT 
  'check_bot_health_and_alert() function' as component,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_name = 'check_bot_health_and_alert'
    ) 
    THEN '✅ Eksisterer'
    ELSE '❌ Mangler'
  END as status;

SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;
