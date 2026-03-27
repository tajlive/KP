-- ============================================================================
-- KLA FIX: Forbedret capital-sync trigger
-- Dato: 2026-03-27
-- Problem: Forrige trigger synkroniserte kun når kolonner er NULL.
--   Men executePaperTrade og resetPaperTradingSession oppdaterer KUN
--   current_capital_nok, noe som fører til at current_capital avviker over tid.
-- Løsning: Sync ALLTID begge retninger ved enhver endring.
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_capital_nok_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Ved INSERT: sett _nok fra hoved-kolonne hvis ikke eksplisitt satt
  IF TG_OP = 'INSERT' THEN
    IF NEW.starting_capital_nok IS NULL THEN
      NEW.starting_capital_nok := NEW.initial_capital;
    END IF;
    IF NEW.current_capital_nok IS NULL THEN
      NEW.current_capital_nok := NEW.current_capital;
    END IF;
    IF NEW.initial_capital IS NULL AND NEW.starting_capital_nok IS NOT NULL THEN
      NEW.initial_capital := NEW.starting_capital_nok;
    END IF;
    IF NEW.current_capital IS NULL AND NEW.current_capital_nok IS NOT NULL THEN
      NEW.current_capital := NEW.current_capital_nok;
    END IF;
  END IF;

  -- Ved UPDATE: hvis en side endres, synkroniser den andre
  IF TG_OP = 'UPDATE' THEN
    -- current_capital_nok ble endret → oppdater current_capital
    IF NEW.current_capital_nok IS DISTINCT FROM OLD.current_capital_nok
       AND NEW.current_capital = OLD.current_capital THEN
      NEW.current_capital := NEW.current_capital_nok;
    END IF;
    -- current_capital ble endret → oppdater current_capital_nok
    IF NEW.current_capital IS DISTINCT FROM OLD.current_capital
       AND NEW.current_capital_nok = OLD.current_capital_nok THEN
      NEW.current_capital_nok := NEW.current_capital;
    END IF;
    -- starting_capital_nok ble endret → oppdater initial_capital
    IF NEW.starting_capital_nok IS DISTINCT FROM OLD.starting_capital_nok
       AND NEW.initial_capital = OLD.initial_capital THEN
      NEW.initial_capital := NEW.starting_capital_nok;
    END IF;
    -- initial_capital ble endret → oppdater starting_capital_nok
    IF NEW.initial_capital IS DISTINCT FROM OLD.initial_capital
       AND NEW.starting_capital_nok = OLD.starting_capital_nok THEN
      NEW.starting_capital_nok := NEW.initial_capital;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger er allerede på tabellen — erstatt
DROP TRIGGER IF EXISTS trg_sync_capital_nok ON trading_sessions;
CREATE TRIGGER trg_sync_capital_nok
  BEFORE INSERT OR UPDATE ON trading_sessions
  FOR EACH ROW EXECUTE FUNCTION sync_capital_nok_columns();

-- Verifiser: sjekk at ingen rader har avvik mellom kolonnene
SELECT COUNT(*) AS rows_with_mismatch
FROM trading_sessions
WHERE current_capital != current_capital_nok
   OR initial_capital  != starting_capital_nok;
