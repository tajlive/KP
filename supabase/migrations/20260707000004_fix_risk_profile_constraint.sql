-- Fix auto_trade_settings risk_profile constraint mismatch
-- Problem: the app writes English risk_profile values (conservative/moderate/aggressive)
-- but the production constraint only accepted Norwegian values
-- (konservativ/moderat/aggressiv), causing every auto-trade activation to fail.
-- This migration drops the old constraint, converts existing rows, and adds a new
-- English constraint plus default.

BEGIN;

-- 1. Drop the old Norwegian constraint if it still exists.
ALTER TABLE public.auto_trade_settings
  DROP CONSTRAINT IF EXISTS auto_trade_settings_risk_profile_check;

-- 2. Convert existing Norwegian values to English values.
UPDATE public.auto_trade_settings
SET risk_profile = CASE risk_profile
  WHEN 'konservativ' THEN 'conservative'
  WHEN 'moderat'     THEN 'moderate'
  WHEN 'aggressiv'  THEN 'aggressive'
  ELSE risk_profile
END
WHERE risk_profile IN ('konservativ', 'moderat', 'aggressiv');

-- 3. Add the new English check constraint idempotently.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.auto_trade_settings'::regclass
      AND conname = 'auto_trade_settings_risk_profile_check'
  ) THEN
    ALTER TABLE public.auto_trade_settings
      ADD CONSTRAINT auto_trade_settings_risk_profile_check
      CHECK (risk_profile IN ('conservative', 'moderate', 'aggressive'));
  END IF;
END $$;

-- 4. Update the column default to the English canonical value.
ALTER TABLE public.auto_trade_settings
  ALTER COLUMN risk_profile SET DEFAULT 'conservative';

COMMIT;
