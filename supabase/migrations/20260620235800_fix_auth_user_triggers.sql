-- Idempotent remediation for auth.users INSERT 500 errors.
--
-- Root cause:
--   1. Three auth trigger functions were SECURITY INVOKER. Auth inserts run as
--      supabase_auth_admin, which lacks INSERT on public tables.
--   2. handle_new_user_consolidated() inserted into public.user_settings using
--      the non-existent columns `locale` and `notifications_enabled`.
--
-- Fix:
--   * Recreate the three functions and set SECURITY DEFINER (via ALTER FUNCTION,
--     which is safe when the function is referenced by triggers).
--   * Recreate handle_new_user_consolidated() using the production columns
--     `user_id`, `theme`, `language`.

BEGIN;

-- 1. Make handle_new_user_email_prefs() run as its owner (postgres).
CREATE OR REPLACE FUNCTION public.handle_new_user_email_prefs()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO email_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$function$;

ALTER FUNCTION public.handle_new_user_email_prefs() SECURITY DEFINER;

-- 2. Make create_default_risk_profile() run as its owner (postgres).
CREATE OR REPLACE FUNCTION public.create_default_risk_profile()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO risk_profiles (user_id, name, max_position_pct, max_exposure_pct, max_daily_loss_pct)
  VALUES (NEW.id, 'moderat', 5.0, 15.0, 3.0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

ALTER FUNCTION public.create_default_risk_profile() SECURITY DEFINER;

-- 3. Make create_default_user_data() run as its owner (postgres).
CREATE OR REPLACE FUNCTION public.create_default_user_data()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  new_id UUID := gen_random_uuid();
BEGIN
  -- Create user_profiles (canonical user record)
  INSERT INTO public.user_profiles (
    id, user_id, display_name, email_on_trade, email_on_crash, email_daily_digest,
    tier, role, provider, locale, created_at, updated_at
  )
  VALUES (
    new_id,
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name',
             split_part(NEW.email, '@', 1), 'Trader'),
    true, true, true,
    'free', 'user',
    COALESCE(NEW.raw_user_meta_data->>'provider', 'email'),
    COALESCE(NEW.raw_user_meta_data->>'locale', 'no'),
    NOW(), NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Create user_settings
  INSERT INTO user_settings (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;

  -- Create user_notification_settings
  INSERT INTO user_notification_settings (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;

  -- Create paper trading session using unified schema
  INSERT INTO trading_sessions (
    user_id, trading_pair, mode, strategy_id, status,
    starting_capital_nok, current_capital_nok, initial_capital, current_capital,
    total_trades, winning_trades, losing_trades, total_pnl,
    strategy_config, started_at, last_heartbeat
  )
  VALUES (
    NEW.id, 'BTCUSDT', 'paper', 'manual', 'active',
    100000, 100000, 100000, 100000,
    0, 0, 0, 0,
    '{}', NOW(), NOW()
  )
  ON CONFLICT DO NOTHING;

  -- Create default risk profiles
  INSERT INTO risk_profiles (user_id, name, max_position_size_pct, stop_loss_pct,
                             max_total_exposure_pct, is_active) VALUES
    (NEW.id, 'forsiktig', 2.0, 3.0, 5.0, true),
    (NEW.id, 'moderat', 5.0, 5.0, 15.0, false),
    (NEW.id, 'aggressiv', 10.0, 10.0, 30.0, false)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;

ALTER FUNCTION public.create_default_user_data() SECURITY DEFINER;

-- 4. Fix handle_new_user_consolidated() to match production user_settings columns.
CREATE OR REPLACE FUNCTION public.handle_new_user_consolidated()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_setting_id UUID;
  v_ref_code TEXT;
  v_referral_id UUID;
BEGIN
  -- Create user settings
  INSERT INTO public.user_settings (user_id, theme, language)
  VALUES (NEW.id, 'system', 'no')
  ON CONFLICT (user_id) DO NOTHING;

  -- Initialize user KLT balance
  INSERT INTO public.user_klt_balances (user_id, balance, total_earned)
  VALUES (NEW.id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Handle referral code if present in user metadata
  BEGIN
    v_ref_code := NEW.raw_user_meta_data->>'referral_code';

    IF v_ref_code IS NOT NULL AND v_ref_code != '' THEN
      -- Find pending referral record matching this code
      SELECT id INTO v_referral_id
      FROM public.referral_tracking
      WHERE referral_code = v_ref_code
        AND status = 'pending'
        AND referred_user_id IS NULL
        AND referrer_user_id != NEW.id
      LIMIT 1;

      IF v_referral_id IS NOT NULL THEN
        -- Update referral: user signed up
        UPDATE public.referral_tracking
        SET referred_user_id = NEW.id,
            status = 'signed_up',
            signed_up_at = NOW(),
            updated_at = NOW()
        WHERE id = v_referral_id;

        -- Give referred user welcome KLT bonus
        INSERT INTO public.user_klt_balances (user_id, balance, total_earned)
        VALUES (NEW.id, 110, 110)
        ON CONFLICT (user_id) DO UPDATE
          SET balance = user_klt_balances.balance + 110,
              total_earned = user_klt_balances.total_earned + 110,
              updated_at = NOW();
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'referral handling failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

COMMIT;
