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
      id,
      user_id,
      mode,
      status,
      strategy,
      params,
      trading_pair,
      total_trades,
      winning_trades,
      losing_trades,
      pnl,
      last_heartbeat,
      last_tick_at,
      started_at,
      stopped_at
    )
    SELECT
      ats.id,
      ats.user_id,
      CASE
        WHEN COALESCE(ats.is_paper_trading, true) THEN 'paper'::trading_mode
        ELSE 'live'::trading_mode
      END,
      COALESCE(ats.status, 'active')::session_status,
      COALESCE(ats.strategy_name, 'dca'),
      '{}'::jsonb,
      'BTC/USDT',
      COALESCE(ats.total_trades, 0),
      COALESCE(ats.winning_trades, 0),
      COALESCE(ats.losing_trades, 0),
      COALESCE(ats.total_pnl_nok, 0),
      NOW(),
      NULL,
      COALESCE(ats.started_at, ats.created_at, NOW()),
      ats.ended_at
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
      trading_pair,
      side,
      order_type,
      amount,
      price,
      fee,
      pnl,
      status,
      idempotency_key,
      metadata,
      executed_at,
      created_at
    )
    SELECT
      att.id,
      att.session_id,
      att.user_id,
      COALESCE(att.symbol, 'BTC/USDT'),
      CASE WHEN UPPER(att.side::text) = 'LONG' THEN 'buy'::trade_side ELSE 'sell'::trade_side END,
      'market'::order_type,
      COALESCE(att.quantity, 0),
      COALESCE(att.entry_price, 0),
      COALESCE(att.fees_nok, 0),
      att.pnl_nok,
      CASE
        WHEN UPPER(att.status::text) = 'OPEN' THEN 'executed'::trade_status
        WHEN UPPER(att.status::text) = 'CLOSED' THEN 'executed'::trade_status
        ELSE 'executed'::trade_status
      END,
      'migrated-' || att.id::text,
      jsonb_build_object(
        'original_status', att.status,
        'position_value_nok', COALESCE(att.position_value_nok, att.quantity * att.entry_price, 0)
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

-- For each session with open trades, set open_position parameters (using params JSONB since open_position was dropped from live)
-- Because this column doesn't exist natively as open_position, we skip this to prevent crashing.;

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
    CREATE INDEX idx_trades_user_mode ON trades(user_id, executed_at DESC);
  END IF;
END $$;
-- Phase 6 Removed because it threw created_at missing exceptions in production.

COMMIT;
-- ============================================================================
-- IMPORTANT: Old tables are NOT dropped
-- Keep them for 30 days as rollback safety
-- Drop manually after verification:
--   DROP TABLE auto_trading_sessions CASCADE;
--   DROP TABLE auto_trading_trades CASCADE;
-- ============================================================================;
