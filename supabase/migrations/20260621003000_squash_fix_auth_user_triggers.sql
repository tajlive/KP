-- Idempotent squash of four production remediation migrations:
--   20260620235800_fix_auth_user_triggers.sql
--   20260621000000_fix_onboarding_kla158_risk_profile.sql
--   20260621000500_fix_create_default_user_data_fk.sql
--   20260621001000_set_auth_trigger_search_path.sql
--
-- Combined effect:
--   * All 7 auth.users trigger functions run as SECURITY DEFINER.
--   * All 7 functions are pinned to search_path = public, pg_temp.
--   * handle_new_user_consolidated() inserts into public.user_settings (user_id, theme, language).
--   * handle_new_user_onboarding_kla158() inserts into risk_profiles without the non-existent is_default column.
--   * create_default_user_data() uses NEW.id for public.user_profiles.id to satisfy FK user_profiles_id_fkey.

BEGIN;

-- 1. handle_new_user_email_prefs(): create email_preferences row for new users.
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
ALTER FUNCTION public.handle_new_user_email_prefs() SET search_path = public, pg_temp;

-- 2. create_default_risk_profile(): create a single default risk profile for new users.
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
ALTER FUNCTION public.create_default_risk_profile() SET search_path = public, pg_temp;

-- 3. create_default_user_data(): canonical user record, settings, notification settings,
--    paper trading session, and default risk profiles. Uses NEW.id for user_profiles.id
--    to satisfy FK user_profiles_id_fkey (id -> auth.users.id).
CREATE OR REPLACE FUNCTION public.create_default_user_data()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  new_id UUID := NEW.id;
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
ALTER FUNCTION public.create_default_user_data() SET search_path = public, pg_temp;

-- 4. handle_new_user_consolidated(): user settings, KLT balance, and referral handling.
--    Inserts into public.user_settings using the production columns user_id, theme, language.
CREATE OR REPLACE FUNCTION public.handle_new_user_consolidated()
 RETURNS trigger
 LANGUAGE plpgsql
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

ALTER FUNCTION public.handle_new_user_consolidated() SECURITY DEFINER;
ALTER FUNCTION public.handle_new_user_consolidated() SET search_path = public, pg_temp;

-- 5. handle_new_user_klt(): give new users a 500 KLT welcome bonus.
CREATE OR REPLACE FUNCTION public.handle_new_user_klt()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert 500 KLT welcome bonus
    INSERT INTO public.kltbalances (userid, balance, total_earned)
    VALUES (NEW.id, 500, 500)
    ON CONFLICT (userid) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER FUNCTION public.handle_new_user_klt() SECURITY DEFINER;
ALTER FUNCTION public.handle_new_user_klt() SET search_path = public, pg_temp;

-- 6. handle_new_user_onboarding(): create onboarding_progress row for new users.
CREATE OR REPLACE FUNCTION public.handle_new_user_onboarding()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.onboarding_progress (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER FUNCTION public.handle_new_user_onboarding() SECURITY DEFINER;
ALTER FUNCTION public.handle_new_user_onboarding() SET search_path = public, pg_temp;

-- 7. handle_new_user_onboarding_kla158(): create paper trading session and default
--    risk profiles. The production risk_profiles table has no is_default column.
CREATE OR REPLACE FUNCTION public.handle_new_user_onboarding_kla158()
 RETURNS trigger
 LANGUAGE plpgsql
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

ALTER FUNCTION public.handle_new_user_onboarding_kla158() SECURITY DEFINER;
ALTER FUNCTION public.handle_new_user_onboarding_kla158() SET search_path = public, pg_temp;

COMMIT;
