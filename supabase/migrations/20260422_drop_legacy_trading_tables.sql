-- legacy-accepted: 8-sifret timestamp, deployet til prod 2026-04. Se AGENTS.md.
-- Migration: Drop legacy trading tables superseded by unified schema
-- Date: 2026-04-22
--
-- Tables being dropped:
--   - auto_trading_trades  → superseded by `trades` (has idempotency_key, mode, etc.)
--   - paper_trading_sessions → superseded by `trading_sessions` with mode='paper'
--   - live_trades          → superseded by `trades` with mode='live'
--
-- Drop auto_trading_trades (code already migrated to `trades`)
DROP TABLE IF EXISTS auto_trading_trades CASCADE;

-- Drop paper_trading_sessions (data migrated to trading_sessions in 20260226000001_unified_schema_migration.sql)
DROP TABLE IF EXISTS paper_trading_sessions CASCADE;

-- Drop auto_trades (code migrated to unified `trades` table)
DROP TABLE IF EXISTS auto_trades CASCADE;

-- Drop live_trades (superseded by trades.mode='live', may already be gone)
DROP TABLE IF EXISTS live_trades CASCADE;
