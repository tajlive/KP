-- ═══════════════════════════════════════════════════════════════════════════════
-- ENHANCED NOTIFICATION CLEANUP
-- 
-- Forbedret retention policy for unified_notifications:
-- - Beholder viktige varsler lenger (trades, system)
-- - Aggressiv cleanup av lav-prioritet varsler
-- - Partisjonering-ready struktur
-- ═══════════════════════════════════════════════════════════════════════════════

-- Funksjon for intelligent notification cleanup
CREATE OR REPLACE FUNCTION cleanup_notifications_intelligent()
RETURNS TABLE (
    deleted_count BIGINT,
    retention_days INTEGER,
    category TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted BIGINT;
BEGIN
    -- Kategori 1: Høy prioritet - behold 90 dager (trades, system alerts)
    SELECT COUNT(*) INTO v_deleted
    FROM unified_notifications
    WHERE 
        created_at < NOW() - INTERVAL '90 days'
        AND (
            type IN ('trade_executed', 'trade_closed', 'system_alert', 'circuit_breaker')
            OR priority = 'high'
        )
        AND read = true;
    
    DELETE FROM unified_notifications
    WHERE 
        created_at < NOW() - INTERVAL '90 days'
        AND (
            type IN ('trade_executed', 'trade_closed', 'system_alert', 'circuit_breaker')
            OR priority = 'high'
        )
        AND read = true;
    
    RETURN QUERY SELECT v_deleted, 90, 'high_priority'::TEXT;
    
    -- Kategori 2: Normal prioritet - behold 30 dager (prices, signals)
    SELECT COUNT(*) INTO v_deleted
    FROM unified_notifications
    WHERE 
        created_at < NOW() - INTERVAL '30 days'
        AND (
            type IN ('price_alert', 'signal_generated', 'market_update')
            OR priority = 'normal'
            OR priority IS NULL
        )
        AND read = true;
    
    DELETE FROM unified_notifications
    WHERE 
        created_at < NOW() - INTERVAL '30 days'
        AND (
            type IN ('price_alert', 'signal_generated', 'market_update')
            OR priority = 'normal'
            OR priority IS NULL
        )
        AND read = true;
    
    RETURN QUERY SELECT v_deleted, 30, 'normal_priority'::TEXT;
    
    -- Kategori 3: Lav prioritet - behold 7 dager (info, marketing)
    SELECT COUNT(*) INTO v_deleted
    FROM unified_notifications
    WHERE 
        created_at < NOW() - INTERVAL '7 days'
        AND (
            type IN ('info', 'marketing', 'feature_announcement')
            OR priority = 'low'
        );
    
    DELETE FROM unified_notifications
    WHERE 
        created_at < NOW() - INTERVAL '7 days'
        AND (
            type IN ('info', 'marketing', 'feature_announcement')
            OR priority = 'low'
        );
    
    RETURN QUERY SELECT v_deleted, 7, 'low_priority'::TEXT;
    
    -- Kategori 4: Unread gamle - behold 180 dager
    SELECT COUNT(*) INTO v_deleted
    FROM unified_notifications
    WHERE 
        created_at < NOW() - INTERVAL '180 days'
        AND read = false;
    
    DELETE FROM unified_notifications
    WHERE 
        created_at < NOW() - INTERVAL '180 days'
        AND read = false;
    
    RETURN QUERY SELECT v_deleted, 180, 'unread_old'::TEXT;
    
    RETURN;
END;
$$;

-- Kjør cleanup og logg resultat
DO $$
DECLARE
    v_result RECORD;
    v_total_deleted BIGINT := 0;
BEGIN
    RAISE NOTICE 'Starter intelligent notification cleanup...';
    
    FOR v_result IN SELECT * FROM cleanup_notifications_intelligent()
    LOOP
        RAISE NOTICE 'Slettet % notifications (kategori: %, retention: % dager)',
            v_result.deleted_count, v_result.category, v_result.retention_days;
        v_total_deleted := v_total_deleted + v_result.deleted_count;
    END LOOP;
    
    RAISE NOTICE 'Totalt slettet: % notifications', v_total_deleted;
    
    -- Oppdater stats
    ANALYZE unified_notifications;
END;
$$;

-- Oppdater eksisterende cleanup jobb
SELECT cron.unschedule('cleanup-notifications');

SELECT cron.schedule(
    'cleanup-notifications',
    '0 2 * * *',  -- Hver dag kl 02:00
    $$
    SELECT cleanup_notifications_intelligent();
    $$
);

-- Legg til indekser for raskere cleanup (hvis de ikke finnes)
DO $$
BEGIN
    -- Indeks for created_at + read (brukes av cleanup)
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_unified_notifications_cleanup'
    ) THEN
        CREATE INDEX CONCURRENTLY idx_unified_notifications_cleanup 
        ON unified_notifications(created_at, read) 
        WHERE read = true;
    END IF;
    
    -- Indeks for type + created_at
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_unified_notifications_type_date'
    ) THEN
        CREATE INDEX CONCURRENTLY idx_unified_notifications_type_date 
        ON unified_notifications(type, created_at);
    END IF;
END;
$$;

-- Vis current retention policy status
SELECT 
    'Retention Policy Status' as check_type,
    cron.jobname as job_name,
    cron.schedule as schedule,
    'Active' as status
FROM cron.job
WHERE jobname = 'cleanup-notifications'
UNION ALL
SELECT 
    'Table Stats' as check_type,
    'unified_notifications' as job_name,
    pg_size_pretty(pg_total_relation_size('unified_notifications')) as schedule,
    (SELECT count(*)::text || ' rows' FROM unified_notifications) as status;
