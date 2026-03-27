-- ============================================================================
-- KLA FIX: Add missing _nok capital columns + unique index guard
-- Dato: 2026-03-27
-- Rotårsak: API /auto-trading/paper skriver både starting_capital_nok og
--   initial_capital, men kun initial_capital/current_capital eksisterer i DB.
--   Kolonnene med _nok-suffiks manglet → Supabase kastet column-not-found.
-- ============================================================================

-- 1. Legg til manglende kolonner (idempotent)
ALTER TABLE trading_sessions
  ADD COLUMN IF NOT EXISTS starting_capital_nok NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS current_capital_nok  NUMERIC(15,2);

-- 2. Backfill eksisterende rader fra initial_capital / current_capital
UPDATE trading_sessions
SET
  starting_capital_nok = initial_capital,
  current_capital_nok  = current_capital
WHERE starting_capital_nok IS NULL
   OR current_capital_nok  IS NULL;

-- 3. Legg til computed-defaults for fremtidige rader
--    (trigger holder _nok-kolonner synkronisert med initial/current_capital)
CREATE OR REPLACE FUNCTION sync_capital_nok_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Alltid hold _nok-kolonnene i sync med hoved-kolonnene
  IF NEW.starting_capital_nok IS NULL THEN
    NEW.starting_capital_nok := NEW.initial_capital;
  END IF;
  IF NEW.current_capital_nok IS NULL THEN
    NEW.current_capital_nok := NEW.current_capital;
  END IF;
  -- Og omvendt: hvis _nok settes, men ikke hoved-kolonnen
  IF NEW.initial_capital IS NULL AND NEW.starting_capital_nok IS NOT NULL THEN
    NEW.initial_capital := NEW.starting_capital_nok;
  END IF;
  IF NEW.current_capital IS NULL AND NEW.current_capital_nok IS NOT NULL THEN
    NEW.current_capital := NEW.current_capital_nok;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_capital_nok ON trading_sessions;
CREATE TRIGGER trg_sync_capital_nok
  BEFORE INSERT OR UPDATE ON trading_sessions
  FOR EACH ROW EXECUTE FUNCTION sync_capital_nok_columns();

-- 4. Dropp unik-indeks på (user_id, trading_pair) WHERE active
--    Denne blokkerer bruker fra å starte flere bots på samme par.
--    P0-fix: byt til unik på (user_id, trading_pair, strategy_id) så
--    brukeren kan ha DCA + Trend på BTCUSDT parallelt.
DROP INDEX IF EXISTS idx_unique_active_session;
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_session
  ON trading_sessions (user_id, trading_pair, strategy_id)
  WHERE status = 'active';

-- 5. Legg til last_heartbeat default (sikrer NOT NULL ved INSERT)
ALTER TABLE trading_sessions
  ALTER COLUMN last_heartbeat SET DEFAULT now();

-- Verifiser
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'trading_sessions'
  AND column_name IN (
    'initial_capital', 'current_capital',
    'starting_capital_nok', 'current_capital_nok',
    'last_heartbeat'
  )
ORDER BY column_name;
