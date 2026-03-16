-- Migration: Rename live_trades til live_trades_legacy
-- Issue: #6 (Fase 2)
-- Created: 2026-03-10 20:00:10 UTC
-- Idempotent: kun hvis live_trades finnes på remote.

DO $$
DECLARE
    v_row_count INTEGER;
    v_fk_count INTEGER;
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'live_trades'
    ) INTO v_exists;

    IF NOT v_exists THEN
        RAISE NOTICE 'live_trades finnes ikke, hopper over rename.';
        RETURN;
    END IF;

    -- Verifisering før rename
    SELECT COUNT(*) INTO v_row_count FROM live_trades;
    IF v_row_count > 0 THEN
        RAISE EXCEPTION 'live_trades har % rader! Kan ikke rename.', v_row_count;
    END IF;

    SELECT COUNT(*) INTO v_fk_count
    FROM information_schema.constraint_column_usage ccu
    JOIN information_schema.table_constraints tc
        ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'live_trades';

    IF v_fk_count > 0 THEN
        RAISE EXCEPTION 'live_trades har % FK-referanser! Kan ikke rename.', v_fk_count;
    END IF;

    EXECUTE 'ALTER TABLE live_trades RENAME TO live_trades_legacy';
    EXECUTE 'COMMENT ON TABLE live_trades_legacy IS ''Legacy: Tømt ved opprettelse. Opprettet 2026-03-10.''';
    RAISE NOTICE 'live_trades omdøpt til live_trades_legacy.';
END $$;
