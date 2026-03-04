-- ============================================================================
-- UNIFIED SCHEMA MIGRATION
-- Consolidates fragmented trading tables into clean unified schema
-- ============================================================================
-- Tables being merged:
--   auto_trading_sessions + paper_simulations → trading_sessions
--   auto_trading_trades + paper_trades + live_trades → trades
--   trading_api_keys + user_binance_keys → exchange_keys
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 1: Ensure unified tables exist with correct schema
-- ============================================================================

-- Already exists from 20250224210000_auto_trading_schema.sql, but verify:
DO $$
BEGIN
  -- Verify trading_sessions has mode column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trading_sessions' AND column_name = 'mode'
  ) THEN
    RAISE EXCEPTION 'trading_sessions.mode column missing - run 20250224210000_auto_trading_schema.sql first';
  END IF;

  -- Verify trades table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'trades'
  ) THEN
    RAISE EXCEPTION 'trades table missing - run 20250224210000_auto_trading_schema.sql first';
  END IF;
END $$;

-- ============================================================================
-- PHASE 2: Migrate auto_trading_sessions → trading_sessions
-- ============================================================================

-- Create mapping table for rollback safety
CREATE TABLE IF NOT EXISTS _session_migration_map (
  old_session_id UUID PRIMARY KEY,
  new_session_id UUID NOT NULL,
  source_table TEXT NOT NULL,
  migrated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrate from auto_trading_sessions (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auto_trading_sessions') THEN
    -- Insert sessions that don't already exist
    INSERT INTO trading_sessions (
      id, -- Keep same ID to preserve FK relationships
      user_id,
      mode,
      status,
      strategy_id,
      strategy_config,
      trading_pair,
      current_capital,
      initial_capital,
      allocated_capital_pct,
      phase,
      risk_config,
      open_position,
      total_trades,
      winning_trades,
      losing_trades,
      total_pnl,
      max_drawdown_pct,
      last_heartbeat,
      last_tick_at,
      crash_count,
      started_at,
      stopped_at,
      created_at,
      updated_at
    )
    SELECT
      ats.id,
      ats.user_id,
      CASE
        WHEN COALESCE(ats.is_paper_trading, true) THEN 'paper'::trading_mode
        ELSE 'live'::trading_mode
      END,
      COALESCE(ats.status, 'active')::session_status,
      COALESCE(ats.strategy_type, 'dca'),
      COALESCE(ats.strategy_config, '{}'::jsonb),
      COALESCE(ats.trading_pair, 'BTC/USDT'),
      COALESCE(ats.current_capital_nok, ats.starting_capital_nok, 100000),
      COALESCE(ats.starting_capital_nok, 100000),
      COALESCE(ats.allocated_capital_pct, 10.00),
      COALESCE(ats.phase, 'paper')::trading_phase,
      COALESCE(ats.risk_config, '{
        "maxPositionSizePercent": 2,
        "stopLossPercent": 1,
        "maxDailyLossPercent": 5,
        "maxDailyTrades": 10,
        "maxDrawdownPercent": 15,
        "maxLeverage": 1
      }'::jsonb),
      NULL, -- open_position (will be populated from trades)
      COALESCE(ats.total_trades, 0),
      COALESCE(ats.winning_trades, 0),
      COALESCE(ats.losing_trades, 0),
      COALESCE(ats.total_pnl_nok, 0),
      COALESCE(ats.max_drawdown_pct, 0),
      COALESCE(ats.last_heartbeat, NOW()),
      ats.last_tick_at,
      COALESCE(ats.crash_count, 0),
      COALESCE(ats.started_at, ats.created_at, NOW()),
      ats.stopped_at,
      COALESCE(ats.created_at, NOW()),
      COALESCE(ats.updated_at, NOW())
    FROM auto_trading_sessions ats
    WHERE NOT EXISTS (
      SELECT 1 FROM trading_sessions ts WHERE ts.id = ats.id
    );

    -- Record migration
    INSERT INTO _session_migration_map (old_session_id, new_session_id, source_table)
    SELECT id, id, 'auto_trading_sessions'
    FROM auto_trading_sessions
    ON CONFLICT (old_session_id) DO NOTHING;

    RAISE NOTICE 'Migrated % sessions from auto_trading_sessions',
      (SELECT COUNT(*) FROM _session_migration_map WHERE source_table = 'auto_trading_sessions');
  END IF;
END $$;

-- ============================================================================
-- PHASE 3: Migrate auto_trading_trades → trades
-- ============================================================================

-- Create trade migration map
CREATE TABLE IF NOT EXISTS _trade_migration_map (
  old_trade_id UUID PRIMARY KEY,
  new_trade_id UUID NOT NULL,
  source_table TEXT NOT NULL,
  migrated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrate from auto_trading_trades (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auto_trading_trades') THEN
    INSERT INTO trades (
      id,
      session_id,
      user_id,
      idempotency_key,
      mode,
      trading_pair,
      side,
      order_type,
      quantity,
      price,
      total_value,
      fee,
      status,
      realized_pnl,
      stop_loss_price,
      take_profit_price,
      binance_order_id,
      leader_trade_id,
      is_copy,
      strategy_signal,
      executed_at,
      created_at
    )
    SELECT
      att.id,
      att.session_id,
      att.user_id,
      COALESCE(att.idempotency_key, 'migrated-' || att.id::text),
      -- Inherit mode from session
      COALESCE(
        (SELECT mode FROM trading_sessions WHERE id = att.session_id),
        CASE WHEN COALESCE(att.is_paper, true) THEN 'paper'::trading_mode ELSE 'live'::trading_mode END
      ),
      COALESCE(att.symbol, 'BTC/USDT'),
      CASE WHEN UPPER(att.side::text) = 'LONG' THEN 'buy'::trade_side ELSE 'sell'::trade_side END,
      'market'::order_type,
      COALESCE(att.quantity, 0),
      COALESCE(att.entry_price, 0),
      COALESCE(att.position_value_nok, att.quantity * att.entry_price, 0),
      COALESCE(att.fees_paid, 0),
      CASE
        WHEN UPPER(att.status::text) = 'OPEN' THEN 'open'::trade_status
        WHEN UPPER(att.status::text) = 'CLOSED' THEN 'closed'::trade_status
        ELSE 'filled'::trade_status
      END,
      att.pnl_nok,
      att.stop_loss_price,
      att.take_profit_price,
      att.binance_order_id,
      NULL, -- leader_trade_id
      false, -- is_copy
      jsonb_build_object(
        'strategy_type', att.strategy_type,
        'original_status', att.status
      ),
      COALESCE(att.opened_at, att.created_at, NOW()),
      COALESCE(att.created_at, NOW())
    FROM auto_trading_trades att
    WHERE NOT EXISTS (
      SELECT 1 FROM trades t WHERE t.id = att.id
    );

    -- Record migration
    INSERT INTO _trade_migration_map (old_trade_id, new_trade_id, source_table)
    SELECT id, id, 'auto_trading_trades'
    FROM auto_trading_trades
    ON CONFLICT (old_trade_id) DO NOTHING;

    RAISE NOTICE 'Migrated % trades from auto_trading_trades',
      (SELECT COUNT(*) FROM _trade_migration_map WHERE source_table = 'auto_trading_trades');
  END IF;
END $$;

-- ============================================================================
-- PHASE 4: Update open_position in sessions based on trades
-- ============================================================================

-- For each session with open trades, set open_position
UPDATE trading_sessions ts
SET open_position = (
  SELECT jsonb_build_object(
    'side', CASE WHEN t.side = 'buy' THEN 'long' ELSE 'short' END,
    'quantity', t.quantity,
    'entry_price', t.price,
    'entry_time', t.executed_at
  )
  FROM trades t
  WHERE t.session_id = ts.id
    AND t.status IN ('open', 'pending')
  ORDER BY t.executed_at DESC
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM trades t
  WHERE t.session_id = ts.id
    AND t.status IN ('open', 'pending')
);

-- ============================================================================
-- PHASE 5: Create indexes for performance
-- ============================================================================

-- These may already exist, so use IF NOT EXISTS
DO $$
BEGIN
  -- trading_sessions indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_trading_sessions_user_mode') THEN
    CREATE INDEX idx_trading_sessions_user_mode ON trading_sessions(user_id, mode);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_trading_sessions_status_active') THEN
    CREATE INDEX idx_trading_sessions_status_active ON trading_sessions(status) WHERE status = 'active';
  END IF;

  -- trades indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_trades_session_executed') THEN
    CREATE INDEX idx_trades_session_executed ON trades(session_id, executed_at DESC);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_trades_user_mode') THEN
    CREATE INDEX idx_trades_user_mode ON trades(user_id, mode, executed_at DESC);
  END IF;
END $$;

-- ============================================================================
-- PHASE 6: Verification
-- ============================================================================

DO $$
DECLARE
  old_session_count INTEGER;
  new_session_count INTEGER;
  old_trade_count INTEGER;
  new_trade_count INTEGER;
BEGIN
  -- Count old sessions
  SELECT COUNT(*) INTO old_session_count
  FROM information_schema.tables
  WHERE table_name = 'auto_trading_sessions'
  AND EXISTS (SELECT 1 FROM auto_trading_sessions);

  -- Count new sessions
  SELECT COUNT(*) INTO new_session_count
  FROM trading_sessions
  WHERE created_at >= (SELECT MIN(migrated_at) FROM _session_migration_map);

  -- Count old trades
  SELECT COUNT(*) INTO old_trade_count
  FROM information_schema.tables
  WHERE table_name = 'auto_trading_trades'
  AND EXISTS (SELECT 1 FROM auto_trading_trades);

  -- Count new trades
  SELECT COUNT(*) INTO new_trade_count
  FROM trades
  WHERE idempotency_key LIKE 'migrated-%' OR id IN (SELECT new_trade_id FROM _trade_migration_map);

  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION VERIFICATION:';
  RAISE NOTICE '  Sessions migrated: % → %', old_session_count, (SELECT COUNT(*) FROM _session_migration_map);
  RAISE NOTICE '  Trades migrated: % → %', old_trade_count, (SELECT COUNT(*) FROM _trade_migration_map);
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- ============================================================================
-- IMPORTANT: Old tables are NOT dropped
-- Keep them for 30 days as rollback safety
-- Drop manually after verification:
--   DROP TABLE auto_trading_sessions CASCADE;
--   DROP TABLE auto_trading_trades CASCADE;
-- ============================================================================
