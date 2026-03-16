-- Migration: Rename auto_trades til auto_trades_legacy
-- Idempotent: hopp over hvis auto_trades mangler eller auto_trades_legacy allerede finnes.

DO $$
DECLARE
    v_row_count INTEGER;
    v_orphan_trade_notes INTEGER;
    v_has_auto_trades BOOLEAN;
    v_has_legacy BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'auto_trades') INTO v_has_auto_trades;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'auto_trades_legacy') INTO v_has_legacy;

    IF NOT v_has_auto_trades OR v_has_legacy THEN
        RAISE NOTICE 'auto_trades rename allerede utført eller tabell mangler, hopper over.';
        RETURN;
    END IF;

    SELECT COUNT(*) INTO v_row_count FROM auto_trades;
    IF v_row_count > 0 THEN
        RAISE EXCEPTION 'auto_trades har % rader! Kan ikke rename.', v_row_count;
    END IF;

    SELECT COUNT(*) INTO v_orphan_trade_notes
    FROM trade_notes tn
    WHERE EXISTS (SELECT 1 FROM auto_trades at WHERE at.id = tn.trade_id);
    RAISE NOTICE 'trade_notes-rader som peker på auto_trades: %', v_orphan_trade_notes;

    UPDATE trade_notes
    SET trade_id = NULL
    WHERE trade_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM auto_trades at WHERE at.id = trade_notes.trade_id);

    EXECUTE 'ALTER TABLE auto_trades RENAME TO auto_trades_legacy';
    EXECUTE 'COMMENT ON TABLE auto_trades_legacy IS ''Legacy: Tømt ved opprettelse. 2026-03-10.''';
    RAISE NOTICE 'auto_trades omdøpt til auto_trades_legacy.';
END $$;
