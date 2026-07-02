-- ============================================================================
-- Migration: Add indicator_snapshot column to trades
-- Date: 2026-07-02
-- Context: executeTrade inserts indicator_snapshot but the column was missing
--          from the live schema, causing paper/live execute to fail with
--          PGRST204 / "Could not find the 'indicator_snapshot' column".
-- ============================================================================

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS indicator_snapshot JSONB;
