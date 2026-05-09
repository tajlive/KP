-- ============================================================================
-- Migration: Add Advanced Performance Metrics to ai_autopilot_configs
-- Date: 2026-05-07
-- Author: KIMI Architect
-- ============================================================================
-- Adds the metrics that PROFESSIONAL platforms track (Stoic.ai, 3Commas):
--   expectancy, profit_factor, sharpe_ratio, avg_win, avg_loss
-- These are the ONLY metrics that matter for determining if a bot is
-- actually profitable, not just lucky.
-- ============================================================================

ALTER TABLE public.ai_autopilot_configs
ADD COLUMN IF NOT EXISTS expectancy numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS profit_factor numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS sharpe_ratio numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_win_nok numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_loss_nok numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_trades_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS consecutive_losses integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS negative_expectancy_since timestamptz; -- Auto-pause circuit breaker

-- Index for fast monitoring queries
CREATE INDEX IF NOT EXISTS idx_ai_autopilot_expectancy
  ON public.ai_autopilot_configs(expectancy)
  WHERE status = 'active';
