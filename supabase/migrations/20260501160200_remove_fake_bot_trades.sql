-- ============================================================================
-- Fix: Remove fake bot trades from production
-- Date: 2026-05-01
-- Context: 20260228100001_seed_leaderboard_bots.sql inserted fake trades
-- with old column names into production. These pollute aggregations.
-- This migration cleans them up and adds is_mock guard for future.
-- ============================================================================

-- 1. Add is_mock column to trades if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trades' AND column_name = 'is_mock'
  ) THEN
    ALTER TABLE public.trades ADD COLUMN is_mock BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- 2. Mark any existing fake bot trades as mock (in case they somehow fit schema)
UPDATE public.trades
SET is_mock = true
WHERE user_id IN (
  'b0700000-0000-0000-0000-000000000001',
  'b0700000-0000-0000-0000-000000000002',
  'b0700000-0000-0000-0000-000000000003'
);

-- 3. Delete fake bot trades (they use wrong columns and likely have NULLs in NOT NULL fields)
DELETE FROM public.trades
WHERE user_id IN (
  'b0700000-0000-0000-0000-000000000001',
  'b0700000-0000-0000-0000-000000000002',
  'b0700000-0000-0000-0000-000000000003'
);

-- 4. Delete fake bot trading sessions
DELETE FROM public.trading_sessions
WHERE user_id IN (
  'b0700000-0000-0000-0000-000000000001',
  'b0700000-0000-0000-0000-000000000002',
  'b0700000-0000-0000-0000-000000000003'
);

-- 5. Delete fake bot profiles (but keep auth.users to avoid FK issues)
-- Table is user_profiles, not profiles
DELETE FROM public.user_profiles
WHERE id IN (
  'b0700000-0000-0000-0000-000000000001',
  'b0700000-0000-0000-0000-000000000002',
  'b0700000-0000-0000-0000-000000000003'
);

-- 6. Add partial index to exclude mock trades from aggregations
CREATE INDEX IF NOT EXISTS idx_trades_real_only
ON public.trades (user_id, executed_at DESC)
WHERE is_mock = false;

-- 7. Leaderboard will be recreated in the next migration (20260501160400)
-- DO NOT refresh here — leaderboard may not exist yet
