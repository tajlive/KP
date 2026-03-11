-- ============================================================================
-- KLA-FIX: Consolidate and fix all auth user creation triggers
-- Problem: Multiple triggers can conflict during user signup
-- Solution: Single trigger function that handles all initialization safely
-- ============================================================================

-- Drop all existing triggers on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_defaults ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_onboarding ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_portfolio ON auth.users;
DROP TRIGGER IF EXISTS create_email_prefs_on_signup ON auth.users;
DROP TRIGGER IF EXISTS new_user_klt_bonus ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_referral ON auth.users;

-- Create consolidated trigger function
CREATE OR REPLACE FUNCTION handle_new_user_consolidated()
RETURNS TRIGGER AS $$
DECLARE
  new_profile_id UUID := gen_random_uuid();
BEGIN
  -- 1. Create user_profiles (main profile record)
  BEGIN
    INSERT INTO public.user_profiles (
      id, user_id, display_name, email_on_trade, email_on_crash, email_daily_digest,
      tier, role, provider, locale, created_at, updated_at
    )
    VALUES (
      new_profile_id,
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
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'user_profiles insert failed: %', SQLERRM;
  END;

  -- 2. Create email_preferences
  BEGIN
    INSERT INTO public.email_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'email_preferences insert failed: %', SQLERRM;
  END;

  -- 3. Create KLT balance
  BEGIN
    INSERT INTO public.kltbalances (userid, balance, total_earned)
    VALUES (NEW.id, 500, 500)
    ON CONFLICT (userid) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'kltbalances insert failed: %', SQLERRM;
  END;

  -- 4. Create onboarding_progress
  BEGIN
    INSERT INTO public.onboarding_progress (user_id)
    VALUES (NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'onboarding_progress insert failed: %', SQLERRM;
  END;

  -- 5. Create default portfolio
  BEGIN
    INSERT INTO public.portfolios (user_id, name, description)
    VALUES (NEW.id, 'Min Portefølje', 'Standard portefølje opprettet ved registrering');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'portfolios insert failed: %', SQLERRM;
  END;

  -- 6. Create user_settings (via user_profiles trigger or directly)
  BEGIN
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'user_settings insert failed: %', SQLERRM;
  END;

  -- 7. Create user_notification_settings
  BEGIN
    INSERT INTO public.user_notification_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'user_notification_settings insert failed: %', SQLERRM;
  END;

  -- 8. Create paper trading session
  BEGIN
    INSERT INTO public.paper_trading_sessions (user_id, starting_balance, current_balance)
    VALUES (NEW.id, 100000, 100000)
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'paper_trading_sessions insert failed: %', SQLERRM;
  END;

  -- 9. Create risk profiles
  BEGIN
    INSERT INTO public.risk_profiles (user_id, name, max_position_size_pct, stop_loss_pct, 
                                       max_total_exposure_pct, is_active) VALUES
      (NEW.id, 'forsiktig', 2.0, 3.0, 5.0, true),
      (NEW.id, 'moderat', 5.0, 5.0, 15.0, false),
      (NEW.id, 'aggressiv', 10.0, 10.0, 30.0, false)
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'risk_profiles insert failed: %', SQLERRM;
  END;

  -- 10. Handle referral if applicable
  BEGIN
    DECLARE
      v_ref_code TEXT := NEW.raw_user_meta_data->>'referral_code';
      v_referral_id UUID;
    BEGIN
      IF v_ref_code IS NOT NULL AND v_ref_code != '' THEN
        SELECT id INTO v_referral_id
        FROM public.referral_tracking
        WHERE referral_code = v_ref_code
          AND status = 'pending'
          AND referred_user_id IS NULL
          AND referrer_user_id != NEW.id
        LIMIT 1;

        IF v_referral_id IS NOT NULL THEN
          UPDATE public.referral_tracking
          SET referred_user_id = NEW.id, status = 'account_created', 
              signed_up_at = NOW(), updated_at = NOW()
          WHERE id = v_referral_id;

          INSERT INTO public.user_klt_balances (user_id, balance, total_earned)
          VALUES (NEW.id, 110, 110)
          ON CONFLICT (user_id) DO UPDATE
            SET balance = user_klt_balances.balance + 10,
                total_earned = user_klt_balances.total_earned + 10,
                updated_at = NOW();
        END IF;
      END IF;
    END;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'referral handling failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create single trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_consolidated();

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ All auth triggers consolidated into handle_new_user_consolidated()';
  RAISE NOTICE '✅ Single trigger on_auth_user_created created';
END $$;
