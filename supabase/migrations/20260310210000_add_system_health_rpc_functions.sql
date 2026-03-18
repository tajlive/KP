-- Migration: Legg til RPC-funksjoner for system health dashboard
-- Issue: Admin dashboard
-- Created: 2026-03-10 21:00:00 UTC
-- Drop first so return types can change (CREATE OR REPLACE cannot change OUT/TABLE type)
DROP FUNCTION IF EXISTS get_cron_jobs_status();
DROP FUNCTION IF EXISTS get_rls_status();
DROP FUNCTION IF EXISTS get_top_tables_by_rows(INTEGER);
DROP FUNCTION IF EXISTS get_system_metrics();
-- ============================================
-- 1. Hent cron job status med siste kjøring
-- ============================================
CREATE OR REPLACE FUNCTION get_cron_jobs_status()
RETURNS TABLE (
    jobname text,
    schedule text,
    active boolean,
    siste_kjøring timestamp with time zone,
    siste_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.jobname::text,
        j.schedule::text,
        j.active,
        d.start_time as siste_kjøring,
        d.status as siste_status
    FROM cron.job j
    LEFT JOIN LATERAL (
        SELECT d.start_time, d.status
        FROM cron.job_run_details d
        WHERE d.jobid = j.jobid
        ORDER BY d.start_time DESC
        LIMIT 1
    ) d ON true
    ORDER BY j.jobname;
END;
$$;
-- ============================================
-- 2. Hent RLS status for alle tabeller
-- ============================================
CREATE OR REPLACE FUNCTION get_rls_status()
RETURNS TABLE (
    total bigint,
    enabled bigint,
    tables jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total bigint;
    v_enabled bigint;
    v_tables jsonb;
BEGIN
    -- Tell totalt og aktivert
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE rowsecurity = true)
    INTO v_total, v_enabled
    FROM pg_tables
    WHERE schemaname = 'public';

    -- Hent detaljer for alle tabeller
    SELECT jsonb_agg(
        jsonb_build_object(
            'tablename', t.tablename,
            'rowsecurity', t.rowsecurity
        ) ORDER BY t.tablename
    )
    INTO v_tables
    FROM pg_tables t
    WHERE t.schemaname = 'public';

    RETURN QUERY SELECT v_total, v_enabled, v_tables;
END;
$$;
-- ============================================
-- 3. Hent topp tabeller etter radtall
-- ============================================
CREATE OR REPLACE FUNCTION get_top_tables_by_rows(limit_count integer DEFAULT 20)
RETURNS TABLE (
    tablename text,
    rader bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.relname::text as tablename,
        t.n_live_tup as rader
    FROM pg_stat_user_tables t
    WHERE t.schemaname = 'public'
    ORDER BY t.n_live_tup DESC
    LIMIT limit_count;
END;
$$;
-- ============================================
-- 4. Hent system metrics (for fremtidig bruk)
-- ============================================
CREATE OR REPLACE FUNCTION get_system_metrics()
RETURNS TABLE (
    metric_name text,
    metric_value bigint,
    metric_unit text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Notification queue stats
    RETURN QUERY
    SELECT 
        'notifications_' || nq.status as metric_name,
        COUNT(*)::bigint as metric_value,
        'count'::text as metric_unit
    FROM notification_queue nq
    GROUP BY nq.status;

    -- Pending notification queue age
    RETURN QUERY
    SELECT 
        'notifications_max_age_hours'::text as metric_name,
        COALESCE(
            MAX(EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600)::bigint,
            0
        ) as metric_value,
        'hours'::text as metric_unit
    FROM notification_queue
    WHERE status = 'pending';

    -- Failed notifications
    RETURN QUERY
    SELECT 
        'notifications_failed_recent'::text as metric_name,
        COUNT(*)::bigint as metric_value,
        'count'::text as metric_unit
    FROM notification_queue
    WHERE status = 'failed'
      AND updated_at > NOW() - INTERVAL '24 hours';
END;
$$;
-- ============================================
-- Rettigheter
-- ============================================
GRANT EXECUTE ON FUNCTION get_cron_jobs_status() TO authenticated;
GRANT EXECUTE ON FUNCTION get_cron_jobs_status() TO service_role;
GRANT EXECUTE ON FUNCTION get_rls_status() TO authenticated;
GRANT EXECUTE ON FUNCTION get_rls_status() TO service_role;
GRANT EXECUTE ON FUNCTION get_top_tables_by_rows(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_tables_by_rows(integer) TO service_role;
GRANT EXECUTE ON FUNCTION get_system_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_system_metrics() TO service_role;
-- ============================================
-- Verifisering:
-- ============================================
-- SELECT * FROM get_cron_jobs_status();
-- SELECT * FROM get_rls_status();
-- SELECT * FROM get_top_tables_by_rows(10);
-- SELECT * FROM get_system_metrics();;
