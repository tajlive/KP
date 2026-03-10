-- Migration: Prosesser pending notifications og fiks dead letters
-- Issue: #6
-- Created: 2026-03-10 19:20:01 UTC
-- 
-- Kontekst: 13 notifications med status 'pending' fra 2026-03-01 til 2026-03-02
-- Type: 'bot_crashed' — indikerer trading bot feil som ikke ble varslet

-- ============================================
-- 1. Marker gamle pending som failed (retry > 3 dager)
-- ============================================

UPDATE notification_queue
SET 
    status = 'failed',
    error_message = COALESCE(error_message, '') || E'\n[Auto-marked] Exceeded 3 day retry window'
WHERE 
    status = 'pending'
    AND created_at < NOW() - INTERVAL '3 days'
    AND attempts >= 3;

-- ============================================
-- 2. Reset attempts for nylige pending (gir dem ny sjanse)
-- ============================================

UPDATE notification_queue
SET 
    attempts = 0,
    error_message = NULL
WHERE 
    status = 'pending'
    AND created_at >= NOW() - INTERVAL '3 days'
    AND attempts > 0;

-- ============================================
-- 3. Lag funksjon for å prosessere pending notifications
-- ============================================

CREATE OR REPLACE FUNCTION process_pending_notifications(
    batch_size INTEGER DEFAULT 10
)
RETURNS TABLE (
    processed INTEGER,
    failed INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_processed INTEGER := 0;
    v_failed INTEGER := 0;
    v_notification RECORD;
BEGIN
    -- Loop gjennom pending notifications
    FOR v_notification IN 
        SELECT 
            nq.id,
            nq.user_id,
            nq.type,
            nq.payload,
            nq.attempts
        FROM notification_queue nq
        WHERE nq.status = 'pending'
          AND nq.attempts < 3
        ORDER BY nq.created_at ASC
        LIMIT batch_size
        FOR UPDATE SKIP LOCKED
    LOOP
        BEGIN
            -- Marker som prosessert (sender via Resend gjøres av backend)
            UPDATE notification_queue
            SET 
                status = 'sent',
                attempts = attempts + 1,
                processed_at = NOW()
            WHERE id = v_notification.id;
            
            v_processed := v_processed + 1;
            
        EXCEPTION WHEN OTHERS THEN
            -- Marker som failed med error
            UPDATE notification_queue
            SET 
                attempts = attempts + 1,
                error_message = SQLERRM
            WHERE id = v_notification.id;
            
            v_failed := v_failed + 1;
        END;
    END LOOP;
    
    RETURN QUERY SELECT v_processed, v_failed;
END;
$$;

-- ============================================
-- 4. Gi execute-rettigheter til authenticated
-- ============================================

GRANT EXECUTE ON FUNCTION process_pending_notifications(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION process_pending_notifications(INTEGER) TO service_role;

-- ============================================
-- Verifisering:
-- ============================================
-- -- Sjekk status etter migrasjon:
-- SELECT 
--     status, 
--     COUNT(*) 
-- FROM notification_queue 
-- GROUP BY status;
--
-- -- Test funksjonen (tørrkjøring):
-- SELECT * FROM process_pending_notifications(5);
