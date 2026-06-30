-- Align auto_trade_settings schema with generated types and codebase
-- Problem: production still has the old 20260208000002 schema with is_enabled,
-- max_position_size_percent, max_daily_trades, min_confidence_threshold.
-- Code and types expect auto_trading_enabled, max_position_percent,
-- daily_trade_limit, min_confidence, plus a few optional columns.
-- This migration renames/copies the columns without data loss and updates
-- dependent functions/triggers to use the new names.

BEGIN;

-- 1. Add missing columns that do not have a direct old counterpart.
ALTER TABLE public.auto_trade_settings
  ADD COLUMN IF NOT EXISTS auto_trading_enabled BOOLEAN,
  ADD COLUMN IF NOT EXISTS max_concurrent_positions INTEGER,
  ADD COLUMN IF NOT EXISTS min_order_size_usdt DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS notify_on_daily_limit BOOLEAN,
  ADD COLUMN IF NOT EXISTS notify_on_sl_tp BOOLEAN,
  ADD COLUMN IF NOT EXISTS notify_on_trade BOOLEAN;

-- 2. Copy is_enabled -> auto_trading_enabled for existing rows.
UPDATE public.auto_trade_settings
SET auto_trading_enabled = COALESCE(is_enabled, false)
WHERE auto_trading_enabled IS NULL;

-- 3. Set sensible defaults for newly added nullable columns.
ALTER TABLE public.auto_trade_settings
  ALTER COLUMN auto_trading_enabled SET DEFAULT false,
  ALTER COLUMN max_concurrent_positions SET DEFAULT 5,
  ALTER COLUMN min_order_size_usdt SET DEFAULT 20.00,
  ALTER COLUMN notify_on_daily_limit SET DEFAULT false,
  ALTER COLUMN notify_on_sl_tp SET DEFAULT true,
  ALTER COLUMN notify_on_trade SET DEFAULT true;

-- 4. Rename old columns to match generated types/code.
ALTER TABLE public.auto_trade_settings
  RENAME COLUMN max_position_size_percent TO max_position_percent;
ALTER TABLE public.auto_trade_settings
  RENAME COLUMN max_daily_trades TO daily_trade_limit;
ALTER TABLE public.auto_trade_settings
  RENAME COLUMN min_confidence_threshold TO min_confidence;

-- 5. Drop the old is_enabled column now that auto_trading_enabled holds the data.
ALTER TABLE public.auto_trade_settings
  DROP COLUMN IF EXISTS is_enabled;

-- 6. Replace the min_confidence check constraint with the new column name.
ALTER TABLE public.auto_trade_settings
  DROP CONSTRAINT IF EXISTS auto_trade_settings_min_confidence_threshold_check;
ALTER TABLE public.auto_trade_settings
  ADD CONSTRAINT auto_trade_settings_min_confidence_check
  CHECK (min_confidence IS NULL OR (min_confidence >= 0 AND min_confidence <= 100));

-- 7. Add a check constraint for max_concurrent_positions (matches archive migration).
ALTER TABLE public.auto_trade_settings
  DROP CONSTRAINT IF EXISTS auto_trade_settings_max_concurrent_positions_check;
ALTER TABLE public.auto_trade_settings
  ADD CONSTRAINT auto_trade_settings_max_concurrent_positions_check
  CHECK (max_concurrent_positions IS NULL OR (max_concurrent_positions >= 1 AND max_concurrent_positions <= 50));

-- 8. Update the user-signup trigger to use the new column name.
CREATE OR REPLACE FUNCTION public.create_auto_trade_settings_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.auto_trade_settings (user_id, auto_trading_enabled)
  VALUES (NEW.id, false)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog;

-- 9. (Skipped) get_available_auto_budget currently references the non-existent
--     public.auto_trades table, so it is already broken in production. Updating it
--     here would make the migration fail. It is not called by application code
--     (only present in generated types), so we leave it untouched and focus on
--     fixing the schema that /api/cron/tick actually uses.

COMMIT;
