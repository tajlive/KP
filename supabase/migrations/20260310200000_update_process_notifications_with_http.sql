-- Migration: Oppdater process_pending_notifications med HTTP-kall og dead-letter
-- Issue: #6 (Fase 2)
-- Created: 2026-03-10 20:00:00 UTC
-- Rollback: CREATE OR REPLACE FUNCTION process_pending_notifications(INTEGER) med gammel implementasjon

-- ============================================
-- 1. Hjelpefunksjon: Sjekk email preferences
-- ============================================
CREATE OR REPLACE FUNCTION should_send_notification(
    p_user_id UUID,
    p_notification_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_prefs RECORD;
BEGIN
    -- Hent brukerens email preferences
    SELECT 
        transaction_emails,
        trading_alerts,
        marketing_emails
    INTO v_prefs
    FROM email_preferences
    WHERE user_id = p_user_id;
    
    -- Hvis ingen preferences, default til true for transaction/trading
    IF v_prefs IS NULL THEN
        RETURN p_notification_type IN ('trade_executed', 'trade_failed', 'bot_crashed', 'price_alert');
    END IF;
    
    -- Sjekk basert på type
    CASE p_notification_type
        WHEN 'trade_executed', 'trade_failed', 'bot_crashed' THEN
            RETURN v_prefs.transaction_emails = true;
        WHEN 'price_alert', 'signal' THEN
            RETURN v_prefs.trading_alerts = true;
        WHEN 'marketing', 'newsletter' THEN
            RETURN v_prefs.marketing_emails = true;
        ELSE
            -- Default: send hvis transaction_emails er på
            RETURN v_prefs.transaction_emails = true;
    END CASE;
END;
$$;

-- ============================================
-- 2. Hovedfunksjon: Prosesser med HTTP og dead-letter
-- ============================================
-- Må droppe først pga. endret retur-type (3 kolonner istedenfor 2)
DROP FUNCTION IF EXISTS process_pending_notifications(INTEGER);

CREATE FUNCTION process_pending_notifications(
    batch_size INTEGER DEFAULT 10
)
RETURNS TABLE (
    processed INTEGER,
    failed INTEGER,
    skipped INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_processed INTEGER := 0;
    v_failed INTEGER := 0;
    v_skipped INTEGER := 0;
    v_notification RECORD;
    v_should_send BOOLEAN;
    v_http_result JSONB;
    v_payload JSONB;
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
            -- Sjekk om brukeren vil ha denne typen notifikasjon
            v_should_send := should_send_notification(v_notification.user_id, v_notification.type);
            
            IF NOT v_should_send THEN
                -- Skip: Bruker har slått av denne typen
                UPDATE notification_queue
                SET 
                    status = 'skipped',
                    processed_at = NOW(),
                    error_message = 'Bruker har slått av denne typen notifikasjoner'
                WHERE id = v_notification.id;
                
                v_skipped := v_skipped + 1;
                CONTINUE;
            END IF;
            
            -- Bygg payload med metadata
            v_payload := jsonb_build_object(
                'notification_id', v_notification.id,
                'user_id', v_notification.user_id,
                'type', v_notification.type,
                'payload', v_notification.payload,
                'attempt', v_notification.attempts + 1
            );
            
            -- Kall Edge Function for å sende via Resend
            BEGIN
                SELECT net.http_post(
                    url := 'https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/unified-notifications?action=process-single',
                    headers := jsonb_build_object(
                        'Content-Type', 'application/json',
                        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
                    ),
                    body := v_payload
                ) INTO v_http_result;
                
                -- Sjekk HTTP respons
                IF (v_http_result->>'status')::INTEGER BETWEEN 200 AND 299 THEN
                    -- Suksess
                    UPDATE notification_queue
                    SET 
                        status = 'sent',
                        attempts = attempts + 1,
                        sent_at = NOW(),
                        processed_at = NOW(),
                        error_message = NULL
                    WHERE id = v_notification.id;
                    
                    v_processed := v_processed + 1;
                ELSE
                    -- HTTP error
                    UPDATE notification_queue
                    SET 
                        attempts = attempts + 1,
                        error_message = 'HTTP ' || (v_http_result->>'status') || ': ' || COALESCE(v_http_result->>'content', 'Ukjent feil')
                    WHERE id = v_notification.id;
                    
                    v_failed := v_failed + 1;
                END IF;
                
            EXCEPTION WHEN OTHERS THEN
                -- Network/andre feil
                UPDATE notification_queue
                SET 
                    attempts = attempts + 1,
                    error_message = 'Network/feil: ' || SQLERRM
                WHERE id = v_notification.id;
                
                v_failed := v_failed + 1;
            END;
            
        EXCEPTION WHEN OTHERS THEN
            -- Uventet feil, marker som failed
            UPDATE notification_queue
            SET 
                status = 'failed',
                attempts = attempts + 1,
                error_message = 'Uventet feil: ' || SQLERRM
            WHERE id = v_notification.id;
            
            v_failed := v_failed + 1;
        END;
    END LOOP;
    
    -- Håndter dead-letters (attempts >= 3, fortsatt pending)
    UPDATE notification_queue
    SET 
        status = 'failed',
        error_message = COALESCE(error_message, '') || E'\n[Dead-letter] Max attempts reached'
    WHERE status = 'pending'
      AND attempts >= 3;
    
    RETURN QUERY SELECT v_processed, v_failed, v_skipped;
END;
$$;

-- ============================================
-- 3. Rettigheter
-- ============================================
GRANT EXECUTE ON FUNCTION should_send_notification(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION should_send_notification(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION process_pending_notifications(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION process_pending_notifications(INTEGER) TO service_role;

-- ============================================
-- Verifisering:
-- ============================================
-- -- Test funksjonen:
-- SELECT * FROM process_pending_notifications(5);
--
-- -- Sjekk status etter kjøring:
-- SELECT status, COUNT(*) FROM notification_queue GROUP BY status;
--
-- -- Sjekk dead-letters:
-- SELECT * FROM notification_queue WHERE status = 'failed' ORDER BY updated_at DESC;
