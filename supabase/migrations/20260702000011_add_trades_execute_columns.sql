-- ============================================================================
-- Migration: Add missing executeTrade columns to trades
-- Date: 2026-07-02
-- Context: executeTrade inserts filled_quantity, idempotency_scope,
--          usdt_nok_rate, reason_code, reason_params, indicator_snapshot.
--          indicator_snapshot was added in 20260702000010; this migration adds
--          the remaining columns.
-- ============================================================================

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS filled_quantity NUMERIC(18,8),
  ADD COLUMN IF NOT EXISTS idempotency_scope TEXT,
  ADD COLUMN IF NOT EXISTS usdt_nok_rate NUMERIC(15,6),
  ADD COLUMN IF NOT EXISTS reason_code TEXT,
  ADD COLUMN IF NOT EXISTS reason_params JSONB;
