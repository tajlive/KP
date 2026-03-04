-- ============================================================================
-- MIGRATION: Fix Cron Tick - Støtt begge session typer midlertidig
-- Dato: 2026-02-25
-- Formål: Fikse P0.1 - Cron tick prosesserer feil tabell
-- 
-- MERK: Dette er en midlertidig fiks. Langsiktig løsning er å merge tabeller.
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Opprett view som forener begge session typer
-- ============================================================================

CREATE OR REPLACE VIEW v_all_active_sessions AS
-- Trading sessions (standard)
SELECT 
  id,
  user_id,
  mode,
  status,
  strategy_id,
  strategy_config,
  trading_pair,
  current_capital,
  initial_capital,
  open_position,
  total_trades,
  winning_trades,
  total_pnl,
  last_heartbeat,
  last_tick_at,
  crash_count,
  started_at,
  stopped_at,
  'trading_sessions'::text as source_table
FROM trading_sessions
WHERE status = 'active'

UNION ALL

-- Auto trading sessions (legacy - skal fjernes etter migrering)
SELECT 
  id,
  user_id,
  CASE WHEN is_paper_trading THEN 'paper' ELSE 'live' END as mode,
  CASE 
    WHEN status = 'error' THEN 'crashed'
    ELSE status
  END::session_status as status,
  COALESCE((
    SELECT id::text FROM auto_trading_strategies 
    WHERE name = strategy_name LIMIT 1
  ), 'dca') as strategy_id,
  '{}'::jsonb as strategy_config,  -- Mangler i auto_trading_sessions
  'BTC/USDT' as trading_pair,  -- Standard - bør migreres
  current_capital_nok as current_capital,
  starting_capital_nok as initial_capital,
  NULL::jsonb as open_position,  -- Mangler i auto_trading_sessions
  total_trades,
  winning_trades,
  total_pnl_nok as total_pnl,
  updated_at as last_heartbeat,  -- Bruk updated_at som heartbeat
  NULL as last_tick_at,
  0 as crash_count,
  started_at,
  ended_at as stopped_at,
  'auto_trading_sessions'::text as source_table
FROM auto_trading_sessions
WHERE status = 'active';

-- ============================================================================
-- STEP 2: Opprett funksjon for å prosessere alle sessions
-- ============================================================================

CREATE OR REPLACE FUNCTION process_all_active_sessions(
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  session_id UUID,
  user_id UUID,
  mode trading_mode,
  strategy_id TEXT,
  trading_pair TEXT,
  current_capital NUMERIC,
  source_table TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.user_id,
    v.mode,
    v.strategy_id,
    v.trading_pair,
    v.current_capital,
    v.source_table
  FROM v_all_active_sessions v
  ORDER BY v.last_tick_at ASC NULLS FIRST
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 3: Oppdater last_heartbeat på auto_trading_sessions når tick skjer
-- ============================================================================

CREATE OR REPLACE FUNCTION update_auto_session_heartbeat(
  p_session_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE auto_trading_sessions
  SET updated_at = NOW()
  WHERE id = p_session_id
    AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 4: Opprett funksjon for å insert trade i riktig tabell
-- ============================================================================

CREATE OR REPLACE FUNCTION insert_trade_for_session(
  p_session_id UUID,
  p_user_id UUID,
  p_mode trading_mode,
  p_trading_pair TEXT,
  p_side trade_side,
  p_quantity NUMERIC,
  p_price NUMERIC,
  p_total_value NUMERIC,
  p_idempotency_key TEXT,
  p_source_table TEXT DEFAULT 'trading_sessions'
)
RETURNS UUID AS $$
DECLARE
  v_trade_id UUID;
BEGIN
  IF p_source_table = 'auto_trading_sessions' THEN
    -- Insert i auto_trading_trades for legacy sessions
    INSERT INTO auto_trading_trades (
      session_id,
      user_id,
      symbol,
      side,
      entry_price,
      quantity,
      position_value_nok,
      status,
      is_paper,
      opened_at
    ) VALUES (
      p_session_id,
      p_user_id,
      REPLACE(p_trading_pair, '/', ''),
      CASE WHEN p_side = 'buy' THEN 'LONG' ELSE 'SHORT' END,
      p_price,
      p_quantity,
      p_total_value,
      'OPEN',
      p_mode = 'paper',
      NOW()
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_trade_id;
  ELSE
    -- Insert i trades for standard sessions
    INSERT INTO trades (
      session_id,
      user_id,
      mode,
      trading_pair,
      side,
      quantity,
      price,
      total_value,
      fee,
      status,
      idempotency_key,
      executed_at
    ) VALUES (
      p_session_id,
      p_user_id,
      p_mode,
      p_trading_pair,
      p_side,
      p_quantity,
      p_price,
      p_total_value,
      0,
      'filled',
      p_idempotency_key,
      NOW()
    )
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id INTO v_trade_id;
  END IF;
  
  RETURN v_trade_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 5: Verifiser view fungerer
-- ============================================================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM v_all_active_sessions;
  RAISE NOTICE 'v_all_active_sessions inneholder % aktive sessions', v_count;
END $$;

COMMIT;
