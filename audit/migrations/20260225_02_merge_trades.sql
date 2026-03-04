-- ============================================================================
-- MIGRATION: Merge auto_trading_trades → trades
-- Dato: 2026-02-25
-- Formål: Fikse P0.4 - Duplikate trade tabeller
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Legg til manglende kolonner i trades
-- ============================================================================

DO $$
BEGIN
  -- take_profit_price
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trades' AND column_name = 'take_profit_price'
  ) THEN
    ALTER TABLE trades ADD COLUMN take_profit_price NUMERIC(18,8);
  END IF;
  
  -- stop_loss_price
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trades' AND column_name = 'stop_loss_price'
  ) THEN
    ALTER TABLE trades ADD COLUMN stop_loss_price NUMERIC(18,8);
  END IF;
  
  -- close_reason
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trades' AND column_name = 'close_reason'
  ) THEN
    ALTER TABLE trades ADD COLUMN close_reason TEXT;
  END IF;
  
  -- leverage
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trades' AND column_name = 'leverage'
  ) THEN
    ALTER TABLE trades ADD COLUMN leverage NUMERIC(3,1) DEFAULT 1.0;
  END IF;
  
  -- opened_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trades' AND column_name = 'opened_at'
  ) THEN
    ALTER TABLE trades ADD COLUMN opened_at TIMESTAMPTZ;
  END IF;
  
  -- closed_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trades' AND column_name = 'closed_at'
  ) THEN
    ALTER TABLE trades ADD COLUMN closed_at TIMESTAMPTZ;
  END IF;
  
  -- exit_price
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trades' AND column_name = 'exit_price'
  ) THEN
    ALTER TABLE trades ADD COLUMN exit_price NUMERIC(18,8);
  END IF;
  
  -- is_paper (for å skille paper/live når mode endres)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trades' AND column_name = 'is_paper'
  ) THEN
    ALTER TABLE trades ADD COLUMN is_paper BOOLEAN DEFAULT true;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Opprett mapping tabell for trades
-- ============================================================================

CREATE TABLE IF NOT EXISTS _trade_migration_map (
  old_trade_id UUID PRIMARY KEY REFERENCES auto_trading_trades(id),
  new_trade_id UUID NOT NULL REFERENCES trades(id),
  migrated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 3: Migrer data fra auto_trading_trades til trades
-- ============================================================================

INSERT INTO trades (
  session_id,
  user_id,
  idempotency_key,
  mode,
  trading_pair,
  side,
  order_type,
  quantity,
  price,
  exit_price,
  total_value,
  fee,
  status,
  realized_pnl,
  strategy_signal,
  stop_loss_price,
  take_profit_price,
  leverage,
  close_reason,
  is_paper,
  opened_at,
  closed_at,
  executed_at,
  created_at
)
SELECT 
  -- Map old session_id til new session_id
  COALESCE(
    (SELECT new_session_id FROM _session_migration_map 
     WHERE old_session_id = att.session_id),
    att.session_id  -- Fallback til gammel ID hvis mapping mangler
  ) as session_id,
  att.user_id,
  -- Generer idempotency key
  'migrated-' || att.id::text as idempotency_key,
  'paper'::trading_mode as mode,
  -- Konverter symbol til trading_pair format
  CASE 
    WHEN att.symbol LIKE '%USDT' THEN 
      SUBSTRING(att.symbol FROM 1 FOR LENGTH(att.symbol) - 4) || '/USDT'
    WHEN att.symbol LIKE '%BTC' THEN 
      SUBSTRING(att.symbol FROM 1 FOR LENGTH(att.symbol) - 3) || '/BTC'
    ELSE att.symbol || '/USDT'
  END as trading_pair,
  -- Konverter side (LONG/SHORT → buy/sell)
  CASE 
    WHEN att.side = 'LONG' THEN 'buy'::trade_side
    WHEN att.side = 'SHORT' THEN 'sell'::trade_side
    ELSE 'buy'::trade_side
  END as side,
  'market'::order_type as order_type,
  att.quantity,
  att.entry_price as price,
  att.exit_price,
  att.position_value_nok as total_value,
  COALESCE(att.fees_nok, 0) as fee,
  -- Konverter status
  CASE 
    WHEN att.status = 'OPEN' THEN 'pending'::trade_status
    WHEN att.status = 'CLOSED' THEN 'filled'::trade_status
    WHEN att.status = 'STOPPED' THEN 'cancelled'::trade_status
    WHEN att.status = 'LIQUIDATED' THEN 'failed'::trade_status
    ELSE 'filled'::trade_status
  END as status,
  att.pnl_nok as realized_pnl,
  -- Build strategy_signal JSONB
  jsonb_build_object(
    'entry_price', att.entry_price,
    'stop_loss', att.stop_loss_price,
    'take_profit', att.take_profit_price,
    'risk_score', att.risk_score,
    'market_volatility', att.market_volatility_pct
  ) as strategy_signal,
  att.stop_loss_price,
  att.take_profit_price,
  att.leverage,
  att.close_reason,
  true as is_paper,  -- Alle auto_trading_trades er paper
  att.opened_at,
  att.closed_at,
  COALESCE(att.closed_at, att.opened_at) as executed_at,
  att.created_at
FROM auto_trading_trades att
WHERE NOT EXISTS (
  SELECT 1 FROM _trade_migration_map m 
  WHERE m.old_trade_id = att.id
)
ON CONFLICT (idempotency_key) DO NOTHING
RETURNING id, idempotency_key;

-- ============================================================================
-- STEP 4: Oppdater mapping tabell for trades
-- ============================================================================

INSERT INTO _trade_migration_map (old_trade_id, new_trade_id)
SELECT 
  att.id as old_trade_id,
  t.id as new_trade_id
FROM auto_trading_trades att
JOIN trades t ON t.idempotency_key = 'migrated-' || att.id::text
WHERE NOT EXISTS (
  SELECT 1 FROM _trade_migration_map m 
  WHERE m.old_trade_id = att.id
)
ON CONFLICT (old_trade_id) DO NOTHING;

-- ============================================================================
-- STEP 5: Verifiser migrering
-- ============================================================================

DO $$
DECLARE
  v_old_count INTEGER;
  v_new_count INTEGER;
  v_migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_old_count FROM auto_trading_trades;
  SELECT COUNT(*) INTO v_new_count FROM trades WHERE idempotency_key LIKE 'migrated-%';
  SELECT COUNT(*) INTO v_migrated_count FROM _trade_migration_map;
  
  RAISE NOTICE 'Trade migrering status:';
  RAISE NOTICE '  - Gamle trades (auto_trading_trades): %', v_old_count;
  RAISE NOTICE '  - Nye migrated trades: %', v_new_count;
  RAISE NOTICE '  - Migrerte mappings: %', v_migrated_count;
  
  IF v_migrated_count < v_old_count THEN
    RAISE WARNING '⚠️  % trades ble ikke migrert!', v_old_count - v_migrated_count;
  END IF;
END $$;

COMMIT;
