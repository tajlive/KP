-- DB-sikkerhetsnett for paper trading.
-- Mål: hindre fremtidig inflasjon av paper-saldoer selv om
-- applikasjonskoden har bugs.

BEGIN;

-- 1) Avvis handler med ugyldig kvantum/verdi
CREATE OR REPLACE FUNCTION fn_guard_trade_invariants()
RETURNS TRIGGER AS $$
DECLARE
  session_capital numeric;
  max_paper_value numeric := 1000000; -- 1M NOK hard tak for paper
BEGIN
  IF NEW.quantity <= 0 OR NEW.total_value <= 0 OR NEW.price <= 0 THEN
    RAISE EXCEPTION 'Invalid trade: quantity/total_value/price must be positive (trade %)', NEW.id
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.mode = 'paper' AND NEW.total_value > max_paper_value THEN
    -- Hent session-kapital for bedre feilmelding
    SELECT current_capital_nok INTO session_capital
    FROM trading_sessions WHERE id = NEW.session_id;
    RAISE EXCEPTION 'Paper trade value % exceeds max allowed % (session capital %)', NEW.total_value, max_paper_value, session_capital
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_trade_invariants ON trades;
CREATE TRIGGER trg_guard_trade_invariants
BEFORE INSERT ON trades
FOR EACH ROW
EXECUTE FUNCTION fn_guard_trade_invariants();

-- 2) Avvis open_position som ikke stemmer overens med trading_pair
CREATE OR REPLACE FUNCTION fn_guard_session_position_symbol()
RETURNS TRIGGER AS $$
DECLARE
  pos_symbol text;
  entry_price numeric;
BEGIN
  IF NEW.open_position IS NOT NULL AND NEW.trading_pair IS NOT NULL THEN
    pos_symbol := NEW.open_position->>'symbol';
    entry_price := (NEW.open_position->>'entry_price')::numeric;

    IF pos_symbol IS NOT NULL AND pos_symbol <> NEW.trading_pair THEN
      RAISE EXCEPTION 'open_position symbol % does not match trading_pair %', pos_symbol, NEW.trading_pair
        USING ERRCODE = 'check_violation';
    END IF;

    -- Bakoverkompatibel sjekk: gjetter symbol fra entry_price hvis symbol mangler
    IF pos_symbol IS NULL AND entry_price IS NOT NULL THEN
      IF NEW.trading_pair = 'BTCUSDT' AND entry_price <= 100000 THEN
        RAISE EXCEPTION 'open_position entry_price % is not valid for BTCUSDT', entry_price;
      ELSIF NEW.trading_pair = 'ETHUSDT' AND (entry_price <= 5000 OR entry_price > 50000) THEN
        RAISE EXCEPTION 'open_position entry_price % is not valid for ETHUSDT', entry_price;
      ELSIF NEW.trading_pair = 'SOLUSDT' AND (entry_price <= 100 OR entry_price > 2000) THEN
        RAISE EXCEPTION 'open_position entry_price % is not valid for SOLUSDT', entry_price;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_session_position_symbol ON trading_sessions;
CREATE TRIGGER trg_guard_session_position_symbol
BEFORE INSERT OR UPDATE ON trading_sessions
FOR EACH ROW
EXECUTE FUNCTION fn_guard_session_position_symbol();

-- 3) Logg/varsel hvis paper-saldo blir unormalt høy
CREATE OR REPLACE FUNCTION fn_guard_paper_capital_sanity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.mode = 'paper' AND NEW.current_capital_nok > 10000000 AND NEW.status = 'active' THEN
    RAISE WARNING 'Paper session % has suspiciously high capital: %', NEW.id, NEW.current_capital_nok;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_paper_capital_sanity ON trading_sessions;
CREATE TRIGGER trg_guard_paper_capital_sanity
BEFORE INSERT OR UPDATE ON trading_sessions
FOR EACH ROW
EXECUTE FUNCTION fn_guard_paper_capital_sanity();

COMMIT;
