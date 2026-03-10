-- Migration: Schedule notification processing cron job
-- Issue: #6 (Fase 2)
-- Created: 2026-03-10 20:00:01 UTC
-- Rollback: SELECT cron.unschedule('process-notification-queue');

-- ============================================
-- 1. Sikre at pg_cron er aktivert
-- ============================================
-- NOTE: pg_cron må være aktivert i supabase.com dashboard
-- (Extensions → pg_cron → Enable)

-- ============================================
-- 2. Fjern eksisterende jobb med samme navn (idempotent)
-- ============================================
DO $$
BEGIN
    PERFORM cron.unschedule('process-notification-queue');
EXCEPTION WHEN OTHERS THEN
    -- Jobben eksisterte ikke, fortsett
    NULL;
END $$;

-- ============================================
-- 3. Opprett ny cron-jobb
-- Kjør hvert 5. minutt for å prosessere notification queue
-- ============================================
SELECT cron.schedule(
    'process-notification-queue',
    '*/5 * * * *',
    $$
    SELECT process_pending_notifications(10);
    $$
);

-- ============================================
-- 4. Verifiser at jobben ble opprettet
-- ============================================
SELECT 
    jobid,
    jobname,
    schedule,
    active
FROM cron.job
WHERE jobname = 'process-notification-queue';

-- ============================================
-- Verifisering etter deploy:
-- ============================================
-- -- Sjekk at jobben finnes:
-- SELECT * FROM cron.job WHERE jobname = 'process-notification-queue';
--
-- -- Sjekk cron logs (hvis tilgjengelig):
-- SELECT * FROM cron.job_run_details 
-- WHERE jobname = 'process-notification-queue' 
-- ORDER BY start_time DESC 
-- LIMIT 5;
--
-- -- Test manuell kjøring:
-- SELECT * FROM process_pending_notifications(5);
