-- Migration: Add risk_level column to user_auto_trading_configs
-- Date: 2026-03-28
-- Purpose: Persist user-selected risk level (low/medium/high) for auto-trading

ALTER TABLE user_auto_trading_configs
ADD COLUMN IF NOT EXISTS risk_level TEXT
  NOT NULL DEFAULT 'medium'
  CHECK (risk_level IN ('low', 'medium', 'high'));

COMMENT ON COLUMN user_auto_trading_configs.risk_level IS
  'User-selected risk level for auto-trading: low (Konservativ), medium (Balansert), high (Aggressiv)';
