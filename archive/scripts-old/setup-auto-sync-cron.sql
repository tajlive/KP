-- ============================================================
-- Setup Auto-Sync Cron Job for Trade Synchronization
-- ============================================================
-- 
-- Dette setter opp en cron-jobb som kjører hvert 15. minutt
-- og synkroniserer trades for alle brukere med Binance API
--

-- 1. Sjekk om pg_cron extension er tilgjengelig
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Fjern eksisterende jobb hvis den finnes (for å unngå duplikater)
SELECT cron.unschedule('auto-sync-trades');

-- 3. Opprett ny cron-jobb
-- Kjører hvert 15. minutt: */15 * * * *
-- For testing hvert minutt: * * * * *
-- For testing hver time: 0 * * * *
SELECT cron.schedule(
    'auto-sync-trades',           -- Jobb-navn
    '*/15 * * * *',              -- Cron schedule (hvert 15. minutt)
    $$
    SELECT net.http_post(
        'https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/auto-sync-trades',
        '{}',
        '{
            "Content-Type": "application/json",
            "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"
        }'::jsonb,
        30000  -- Timeout: 30 sekunder
    );
    $$
);

-- 4. Verifiser at jobben er opprettet
SELECT 
    jobid,
    jobname,
    schedule,
    active
FROM cron.job
WHERE jobname = 'auto-sync-trades';

-- 5. Se kjøringshistorikk (siste 10)
SELECT 
    jobid,
    jobname,
    status,
    start_time,
    end_time
FROM cron.job_run_details
WHERE jobname = 'auto-sync-trades'
ORDER BY start_time DESC
LIMIT 10;

-- ============================================================
-- ALTERNATIV: Kjør manuelt én gang for testing
-- ============================================================
-- Fjern kommentar under for å teste umiddelbart:

-- SELECT net.http_post(
--     'https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/auto-sync-trades',
--     '{}',
--     '{
--         "Content-Type": "application/json"
--     }'::jsonb,
--     30000
-- );

-- ============================================================
-- NYTTIG: Administrasjon
-- ============================================================

-- Stoppe jobben midlertidig:
-- SELECT cron.unschedule('auto-sync-trades');

-- Endre til hver time istedenfor:
-- SELECT cron.schedule('auto-sync-trades', '0 * * * *', $$...$$);

-- Se alle cron-jobber:
-- SELECT * FROM cron.job;

-- Se alle kjøringer:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 50;
