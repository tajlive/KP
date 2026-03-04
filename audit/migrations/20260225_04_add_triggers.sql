-- ============================================================================
-- MIGRATION: Legg til triggers på auto_trading_trades
-- Dato: 2026-02-25
-- Formål: Fikse P0.2 - Triggers kun på trades, ikke auto_trading_trades
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Trigger for å oppdatere auto_trading_sessions etter trade
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_update_auto_trading_session()
RETURNS TRIGGER AS $$
DECLARE
  v_current_capital NUMERIC;
  v_total_pnl NUMERIC;
  v_winning_trades INTEGER;
  v_losing_trades INTEGER;
BEGIN
  -- Beregn ny capital og PnL
  SELECT 
    current_capital_nok,
    total_pnl_nok,
    winning_trades,
    losing_trades
  INTO 
    v_current_capital,
    v_total_pnl,
    v_winning_trades,
    v_losing_trades
  FROM auto_trading_sessions
  WHERE id = NEW.session_id;
  
  -- Oppdater session state
  UPDATE auto_trading_sessions
  SET 
    current_capital_nok = CASE
      WHEN NEW.status = 'OPEN' THEN v_current_capital - NEW.position_value_nok
      WHEN NEW.status = 'CLOSED' AND NEW.pnl_nok IS NOT NULL THEN 
        v_current_capital + NEW.position_value_nok + NEW.pnl_nok
      ELSE v_current_capital
    END,
    total_trades = total_trades + CASE WHEN NEW.status = 'OPEN' THEN 1 ELSE 0 END,
    winning_trades = CASE 
      WHEN NEW.status = 'CLOSED' AND NEW.pnl_nok > 0 THEN v_winning_trades + 1
      ELSE v_winning_trades
    END,
    losing_trades = CASE 
      WHEN NEW.status = 'CLOSED' AND NEW.pnl_nok <= 0 THEN v_losing_trades + 1
      ELSE v_losing_trades
    END,
    total_pnl_nok = v_total_pnl + COALESCE(NEW.pnl_nok, 0),
    updated_at = NOW()
  WHERE id = NEW.session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fjern eksisterende trigger hvis den finnes
DROP TRIGGER IF EXISTS on_auto_trade_update_session ON auto_trading_trades;

-- Opprett trigger
CREATE TRIGGER on_auto_trade_update_session
  AFTER INSERT OR UPDATE ON auto_trading_trades
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_auto_trading_session();

-- ============================================================================
-- STEP 2: Trigger for notifikasjoner på auto_trading_trades
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_auto_trade_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_should_notify BOOLEAN;
  v_user_id UUID;
BEGIN
  -- Hent user_id fra session
  SELECT user_id INTO v_user_id
  FROM auto_trading_sessions
  WHERE id = NEW.session_id;
  
  -- Sjekk notifikasjonsinnstillinger (hvis vi har dem)
  v_should_notify := true;  -- Standard på inntil vi har config
  
  IF v_should_notify AND NEW.status = 'CLOSED' THEN
    INSERT INTO notification_queue (user_id, type, payload)
    VALUES (
      v_user_id, 
      'trade_executed', 
      jsonb_build_object(
        'trade_id', NEW.id,
        'symbol', NEW.symbol,
        'side', NEW.side,
        'pnl_nok', NEW.pnl_nok,
        'close_reason', NEW.close_reason,
        'session_id', NEW.session_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fjern eksisterende trigger hvis den finnes
DROP TRIGGER IF EXISTS on_auto_trade_notify ON auto_trading_trades;

-- Opprett trigger
CREATE TRIGGER on_auto_trade_notify
  AFTER UPDATE ON auto_trading_trades
  FOR EACH ROW
  WHEN (OLD.status = 'OPEN' AND NEW.status = 'CLOSED')
  EXECUTE FUNCTION trigger_auto_trade_notification();

-- ============================================================================
-- STEP 3: Trigger for daily metrics på auto_trading_trades
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_update_auto_daily_metrics()
RETURNS TRIGGER AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_session_id UUID := NEW.session_id;
  v_user_id UUID;
  v_starting_capital NUMERIC;
BEGIN
  -- Hent user_id og starting_capital fra session
  SELECT user_id, starting_capital_nok 
  INTO v_user_id, v_starting_capital
  FROM auto_trading_sessions
  WHERE id = v_session_id;
  
  -- Insert eller oppdater daily metrics
  INSERT INTO auto_trading_daily_metrics (
    session_id,
    user_id,
    date,
    trades_count,
    winning_trades,
    losing_trades,
    daily_pnl_nok,
    starting_capital_nok,
    ending_capital_nok
  )
  VALUES (
    v_session_id,
    v_user_id,
    v_today,
    1,
    CASE WHEN NEW.pnl_nok > 0 THEN 1 ELSE 0 END,
    CASE WHEN NEW.pnl_nok <= 0 THEN 1 ELSE 0 END,
    COALESCE(NEW.pnl_nok, 0),
    v_starting_capital,
    v_starting_capital + COALESCE(NEW.pnl_nok, 0)
  )
  ON CONFLICT (session_id, date)
  DO UPDATE SET
    trades_count = auto_trading_daily_metrics.trades_count + 1,
    winning_trades = auto_trading_daily_metrics.winning_trades + 
      CASE WHEN NEW.pnl_nok > 0 THEN 1 ELSE 0 END,
    losing_trades = auto_trading_daily_metrics.losing_trades + 
      CASE WHEN NEW.pnl_nok <= 0 THEN 1 ELSE 0 END,
    daily_pnl_nok = auto_trading_daily_metrics.daily_pnl_nok + COALESCE(NEW.pnl_nok, 0),
    ending_capital_nok = auto_trading_daily_metrics.starting_capital_nok + 
      auto_trading_daily_metrics.daily_pnl_nok + COALESCE(NEW.pnl_nok, 0),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fjern eksisterende trigger hvis den finnes
DROP TRIGGER IF EXISTS on_auto_trade_update_metrics ON auto_trading_trades;

-- Opprett trigger
CREATE TRIGGER on_auto_trade_update_metrics
  AFTER UPDATE ON auto_trading_trades
  FOR EACH ROW
  WHEN (OLD.status = 'OPEN' AND NEW.status = 'CLOSED')
  EXECUTE FUNCTION trigger_update_auto_daily_metrics();

-- ============================================================================
-- STEP 4: Verifiser triggers ble opprettet
-- ============================================================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_trigger
  WHERE tgname LIKE '%auto_trade%'
    AND tgrelid = 'auto_trading_trades'::regclass;
  
  RAISE NOTICE 'Opprettet % triggers på auto_trading_trades', v_count;
  
  IF v_count < 3 THEN
    RAISE WARNING '⚠️  Forventet 3 triggers, fant %', v_count;
  END IF;
END $$;

COMMIT;
