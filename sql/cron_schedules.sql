-- ═══════════════════════════════════════════════════════════════
-- KLARPAKKE — pg_cron Schedules for Monitoring
-- Kjøres etter supabase db push for å sette opp cron-jobber
-- ═══════════════════════════════════════════════════════════════

-- Sørg for at pg_cron extension er aktivert
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Unschedule eksisterende jobs hvis de finnes (for idempotency)
SELECT cron.unschedule('daily-ops-report') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'daily-ops-report'
);
SELECT cron.unschedule('health-keepalive') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'health-keepalive'
);

-- ═══════════════════════════════════════════════════════════════
-- 1. Daily Ops Report — kl 07:00 CET (06:00 UTC)
-- ═══════════════════════════════════════════════════════════════

SELECT cron.schedule(
    'daily-ops-report',
    '0 6 * * *',  -- 06:00 UTC = 07:00 CET (vintertid)
    $$
    SELECT net.http_post(
        url := (
            select decrypted_secret 
            from vault.decrypted_secrets 
            where name = 'project_url'
        ) || '/functions/v1/daily-ops-report',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (
                select decrypted_secret 
                from vault.decrypted_secrets 
                where name = 'anon_key'
            )
        ),
        body := jsonb_build_object(
            'triggered_at', now(),
            'source', 'pg_cron'
        )
    ) as request_id;
    $$
);

-- Legg til kommentar
COMMENT ON FUNCTION pg_catalog.cron.schedule IS 'Daily ops report kl 07:00 CET';

-- ═══════════════════════════════════════════════════════════════
-- 2. Health Keepalive — hvert 5. minutt
-- Holder Edge Functions warm og logger health status
-- ═══════════════════════════════════════════════════════════════

SELECT cron.schedule(
    'health-keepalive',
    '*/5 * * * *',  -- Hvert 5. minutt
    $$
    SELECT net.http_get(
        url := (
            select decrypted_secret 
            from vault.decrypted_secrets 
            where name = 'project_url'
        ) || '/api/health'
    ) as request_id;
    $$
);

-- ═══════════════════════════════════════════════════════════════
-- 3. Webhook Events Cleanup — daglig kl 03:00 UTC
-- Sletter webhook events eldre enn 30 dager
-- ═══════════════════════════════════════════════════════════════

SELECT cron.schedule(
    'webhook-cleanup',
    '0 3 * * *',  -- 03:00 UTC
    $$
    DELETE FROM webhook_events 
    WHERE created_at < now() - interval '30 days';
    $$
);

-- ═══════════════════════════════════════════════════════════════
-- 4. Health Metrics Aggregation — hver time
-- Aggregerer health check data for trend-analyse
-- ═══════════════════════════════════════════════════════════════

SELECT cron.schedule(
    'health-metrics-aggregate',
    '0 * * * *',  -- Hver time
    $$
    INSERT INTO health_check_metrics (
        timestamp,
        overall_status,
        database_latency_ms,
        database_status,
        version
    )
    SELECT 
        date_trunc('hour', now()),
        mode() WITHIN GROUP (ORDER BY overall_status),
        avg(database_latency_ms)::int,
        mode() WITHIN GROUP (ORDER BY database_status),
        max(version)
    FROM health_check_metrics
    WHERE timestamp > now() - interval '1 hour'
    AND timestamp < date_trunc('hour', now())
    ON CONFLICT DO NOTHING;
    $$
);

-- ═══════════════════════════════════════════════════════════════
-- 5. Stale Alerts Cleanup — hver dag kl 04:00 UTC
-- Markerer gamle ubekreftede alerts som auto-resolved
-- ═══════════════════════════════════════════════════════════════

SELECT cron.schedule(
    'stale-alerts-cleanup',
    '0 4 * * *',  -- 04:00 UTC
    $$
    UPDATE monitoring_alerts
    SET resolved_at = now(),
        metadata = jsonb_set(
            coalesce(metadata, '{}'::jsonb),
            '{auto_resolved}',
            'true'::jsonb
        )
    WHERE acknowledged_at IS NULL
    AND created_at < now() - interval '7 days'
    AND resolved_at IS NULL;
    $$
);

-- ═══════════════════════════════════════════════════════════════
-- Verifiser at jobber er satt opp
-- ═══════════════════════════════════════════════════════════════

SELECT 
    jobname,
    schedule,
    active,
    CASE 
        WHEN jobname = 'daily-ops-report' THEN 'Daglig rapport kl 07:00 CET'
        WHEN jobname = 'health-keepalive' THEN 'Health ping hvert 5. min'
        WHEN jobname = 'webhook-cleanup' THEN 'Slett gamle webhooks'
        WHEN jobname = 'health-metrics-aggregate' THEN 'Aggreger health data'
        WHEN jobname = 'stale-alerts-cleanup' THEN 'Rydd gamle alerts'
    END as description
FROM cron.job
WHERE jobname IN (
    'daily-ops-report',
    'health-keepalive', 
    'webhook-cleanup',
    'health-metrics-aggregate',
    'stale-alerts-cleanup'
)
ORDER BY jobname;

-- ═══════════════════════════════════════════════════════════════
-- Vault Secrets Setup (må settes manuelt først)
-- ═══════════════════════════════════════════════════════════════

-- MERK: Disse må settes via Supabase Dashboard eller CLI:
--
-- supabase secrets set PROJECT_URL="https://www.klarpakke.no"
-- supabase secrets set ANON_KEY="eyJ..."
--
-- Eller insert i vault.decrypted_secrets:
--
-- INSERT INTO vault.secrets (name, secret)
-- VALUES ('project_url', 'https://www.klarpakke.no')
-- ON CONFLICT (name) DO UPDATE SET secret = EXCLUDED.secret;
--
-- INSERT INTO vault.secrets (name, secret)
-- VALUES ('anon_key', 'eyJ...')
-- ON CONFLICT (name) DO UPDATE SET secret = EXCLUDED.secret;

-- Kommentar om setup
COMMENT ON TABLE cron.job IS 'Cron jobs for Klarpakke monitoring. Krever vault secrets: project_url, anon_key';
