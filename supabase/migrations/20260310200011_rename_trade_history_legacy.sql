-- Migration: Rename trade_history til trade_history_legacy
-- Issue: #6 (Fase 2)
-- Created: 2026-03-10 20:00:11 UTC
-- Risiko: 🟡 Lav (0 rader, ingen FK-referanser)
-- Rollback: ALTER TABLE trade_history_legacy RENAME TO trade_history;

-- ============================================
-- Verifisering før rename
-- ============================================
DO $$
DECLARE
    v_row_count INTEGER;
    v_fk_count INTEGER;
BEGIN
    -- Sjekk at tabellen er tom
    SELECT COUNT(*) INTO v_row_count FROM trade_history;
    
    IF v_row_count > 0 THEN
        RAISE EXCEPTION 'trade_history har % rader! Kan ikke rename.', v_row_count;
    END IF;
    
    -- Sjekk at ingen FK peker på denne tabellen
    SELECT COUNT(*) INTO v_fk_count
    FROM information_schema.constraint_column_usage ccu
    JOIN information_schema.table_constraints tc
        ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'trade_history';
    
    IF v_fk_count > 0 THEN
        RAISE EXCEPTION 'trade_history har % FK-referanser! Kan ikke rename.', v_fk_count;
    END IF;
    
    RAISE NOTICE 'Verifisering OK: trade_history er tom og har ingen FK-referanser.';
END $$;

-- ============================================
-- Rename tabell
-- ============================================
ALTER TABLE IF EXISTS trade_history
RENAME TO trade_history_legacy;

-- ============================================
-- Legg til kommentar
-- ============================================
COMMENT ON TABLE trade_history_legacy IS 
    'Legacy: Tømt ved opprettelse (0 rader), ingen FK-referanser. '
    'Opprettet 2026-03-10 som del av Issue #6. '
    'Kan slettes etter 30 dager i produksjon.';

-- ============================================
-- Verifisering etter rename
-- ============================================
SELECT 
    'trade_history_legacy' as tabell,
    COUNT(*) as rader
FROM trade_history_legacy;

-- ============================================
-- Test/Rollback:
-- ============================================
-- -- Gjenopprett hvis nødvendig:
-- ALTER TABLE trade_history_legacy RENAME TO trade_history;
