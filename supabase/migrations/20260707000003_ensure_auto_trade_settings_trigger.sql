-- Ensure every user has an auto_trade_settings row, and new users get one on signup.
-- This fixes the gap where the consolidated auth.users trigger (handle_new_user_consolidated)
-- creates user_profiles, paper_trading_sessions, etc., but not auto_trade_settings.
-- The auto_trade_settings table is the canonical source for whether the cron tick engine
-- should process a user's sessions, so a missing row means auto-trading is silently ignored.

BEGIN;

-- 1. Robust, idempotent signup function with explicit search_path.
--    Uses the new column names aligned by migration 20260707000002.
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

-- 2. Attach a separate trigger so we do not disturb the consolidated trigger.
DROP TRIGGER IF EXISTS on_auth_user_created_auto_trade ON auth.users;
CREATE TRIGGER on_auth_user_created_auto_trade
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_auto_trade_settings_for_new_user();

-- 3. Backfill all existing users who do not already have a row.
--    Defaults for the other columns (risk_profile, max_position_percent, etc.)
--    are already set at the table level.
INSERT INTO public.auto_trade_settings (user_id, auto_trading_enabled)
SELECT id, false
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.auto_trade_settings WHERE user_id = auth.users.id
)
ON CONFLICT (user_id) DO NOTHING;

COMMIT;
