-- Migration: Rename trade_history til trade_history_legacy
-- Idempotent: hopp over hvis trade_history mangler eller trade_history_legacy allerede finnes.

DO $$
DECLARE
    v_row_count INTEGER;
    v_fk_count INTEGER;
    v_has_trade_history BOOLEAN;
    v_has_legacy BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'trade_history') INTO v_has_trade_history;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'trade_history_legacy') INTO v_has_legacy;

    IF NOT v_has_trade_history OR v_has_legacy THEN
        RAISE NOTICE 'trade_history rename allerede utført eller tabell mangler, hopper over.';
        RETURN;
    END IF;

    SELECT COUNT(*) INTO v_row_count FROM trade_history;
    IF v_row_count > 0 THEN
        RAISE EXCEPTION 'trade_history har % rader! Kan ikke rename.', v_row_count;
    END IF;

    SELECT COUNT(*) INTO v_fk_count
    FROM information_schema.constraint_column_usage ccu
    JOIN information_schema.table_constraints tc ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'trade_history';

    IF v_fk_count > 0 THEN
        RAISE EXCEPTION 'trade_history har % FK-referanser! Kan ikke rename.', v_fk_count;
    END IF;

    EXECUTE 'ALTER TABLE trade_history RENAME TO trade_history_legacy';
    EXECUTE 'COMMENT ON TABLE trade_history_legacy IS ''Legacy: Tømt ved opprettelse. 2026-03-10.''';
    RAISE NOTICE 'trade_history omdøpt til trade_history_legacy.';
END $$;
