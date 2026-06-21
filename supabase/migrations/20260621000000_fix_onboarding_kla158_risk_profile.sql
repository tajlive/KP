-- Follow-up fix: handle_new_user_onboarding_kla158 referenced the non-existent
-- column `is_default` on public.risk_profiles. Auth inserts run as
-- supabase_auth_admin and the error is hidden behind GoTrue, causing a 500.

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user_onboarding_kla158()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- 1. Create default paper trading session
  INSERT INTO paper_trading_sessions (user_id, starting_balance, current_balance, is_active)
  VALUES (NEW.id, 100000, 100000, true)
  ON CONFLICT DO NOTHING;

  -- 2. Create default risk profiles (production table has no is_default column)
  INSERT INTO risk_profiles (user_id, name, max_position_size_pct, stop_loss_pct, max_total_exposure_pct, is_active) VALUES
    (NEW.id, 'forsiktig', 2.0, 3.0, 5.0, true),
    (NEW.id, 'moderat', 5.0, 5.0, 15.0, false),
    (NEW.id, 'aggressiv', 10.0, 10.0, 30.0, false)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;

COMMIT;
