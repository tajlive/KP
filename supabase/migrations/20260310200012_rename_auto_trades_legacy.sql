-- Migration: Rename auto_trades til auto_trades_legacy
-- Issue: #6 (Fase 2)
-- Created: 2026-03-10 20:00:12 UTC
-- Risiko: 🟠 Medium (0 rader, MEN FK fra trade_notes)
-- Rollback: ALTER TABLE auto_trades_legacy RENAME TO auto_trades;

-- ============================================
-- Verifisering før rename
-- ============================================
DO $$
DECLARE
    v_row_count INTEGER;
    v_orphan_trade_notes INTEGER;
BEGIN
    -- Sjekk at tabellen er tom
    SELECT COUNT(*) INTO v_row_count FROM auto_trades;
    
    IF v_row_count > 0 THEN
        RAISE EXCEPTION 'auto_trades har % rader! Kan ikke rename.', v_row_count;
    END IF;
    
    -- Sjekk om trade_notes har rader som peker på auto_trades
    SELECT COUNT(*) INTO v_orphan_trade_notes
    FROM trade_notes tn
    WHERE EXISTS (
        SELECT 1 FROM auto_trades at WHERE at.id = tn.trade_id
    );
    
    -- Siden auto_trades er tom, vil ikke trade_notes ha noen treff
    -- Men vi logger det for dokumentasjon
    RAISE NOTICE 'trade_notes-rader som peker på auto_trades: %', v_orphan_trade_notes;
    
    RAISE NOTICE 'Verifisering OK: auto_trades er tom.';
END $$;

-- ============================================
-- Håndter trade_notes FK (nullstill hvis nødvendig)
-- ============================================
-- Siden auto_trades er tom, vil dette ikke påvirke noen rader
-- Men vi kjører det for å være sikre
UPDATE trade_notes
SET trade_id = NULL
WHERE trade_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM auto_trades at WHERE at.id = trade_notes.trade_id
  );

-- ============================================
-- Rename tabell
-- ============================================
ALTER TABLE IF EXISTS auto_trades
RENAME TO auto_trades_legacy;

-- ============================================
-- Legg til kommentar
-- ============================================
COMMENT ON TABLE auto_trades_legacy IS 
    'Legacy: Tømt ved opprettelse (0 rader). '
    'trade_notes FK nullstilt (ingen rader påvirket siden tabellen var tom). '
    'Opprettet 2026-03-10 som del av Issue #6. '
    'Kan slettes etter 30 dager i produksjon.';

-- ============================================
-- Verifisering etter rename
-- ============================================
SELECT 
    'auto_trades_legacy' as tabell,
    COUNT(*) as rader
FROM auto_trades_legacy;

-- Sjekk at trade_notes fortsatt er konsistent
SELECT 
    'trade_notes_med_null_trade_id' as sjekk,
    COUNT(*) as antall
FROM trade_notes
WHERE trade_id IS NULL;

-- ============================================
-- Test/Rollback:
-- ============================================
-- -- Gjenopprett hvis nødvendig:
-- ALTER TABLE auto_trades_legacy RENAME TO auto_trades;
