-- Migration: Rename live_trades til live_trades_legacy
-- Issue: #6 (Fase 2)
-- Created: 2026-03-10 20:00:10 UTC
-- Risiko: 🟡 Lav (0 rader, ingen FK-referanser)
-- Rollback: ALTER TABLE live_trades_legacy RENAME TO live_trades;

-- ============================================
-- Verifisering før rename
-- ============================================
DO $$
DECLARE
    v_row_count INTEGER;
    v_fk_count INTEGER;
BEGIN
    -- Sjekk at tabellen er tom
    SELECT COUNT(*) INTO v_row_count FROM live_trades;
    
    IF v_row_count > 0 THEN
        RAISE EXCEPTION 'live_trades har % rader! Kan ikke rename.', v_row_count;
    END IF;
    
    -- Sjekk at ingen FK peker på denne tabellen
    SELECT COUNT(*) INTO v_fk_count
    FROM information_schema.constraint_column_usage ccu
    JOIN information_schema.table_constraints tc
        ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'live_trades';
    
    IF v_fk_count > 0 THEN
        RAISE EXCEPTION 'live_trades har % FK-referanser! Kan ikke rename.', v_fk_count;
    END IF;
    
    RAISE NOTICE 'Verifisering OK: live_trades er tom og har ingen FK-referanser.';
END $$;

-- ============================================
-- Rename tabell
-- ============================================
ALTER TABLE IF EXISTS live_trades
RENAME TO live_trades_legacy;

-- ============================================
-- Legg til kommentar
-- ============================================
COMMENT ON TABLE live_trades_legacy IS 
    'Legacy: Tømt ved opprettelse (0 rader), ingen FK-referanser. '
    'Opprettet 2026-03-10 som del av Issue #6. '
    'Kan slettes etter 30 dager i produksjon.';

-- ============================================
-- Verifisering etter rename
-- ============================================
SELECT 
    'live_trades_legacy' as tabell,
    COUNT(*) as rader
FROM live_trades_legacy;

-- ============================================
-- Test/Rollback:
-- ============================================
-- -- Gjenopprett hvis nødvendig:
-- ALTER TABLE live_trades_legacy RENAME TO live_trades;
