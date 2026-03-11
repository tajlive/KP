-- ============================================================================
-- KLA-FIX: Fix auth user creation triggers
-- 
-- Issues fixed:
-- 1. Nested DECLARE in block 10 (referral) - invalid PL/pgSQL syntax
--    DECLARE must be at function level, not inside BEGIN blocks
-- 2. on_user_profile_created trigger was causing failures because
--    initialize_user_settings() was being called but user_settings
--    was already created by handle_new_user_consolidated()
-- ============================================================================

-- Fix 1: Update handle_new_user_consolidated with correct syntax
CREATE OR REPLACE FUNCTION handle_new_user_consolidated()
RETURNS TRIGGER AS $$
DECLARE
  new_profile_id UUID := gen_random_uuid();
  v_ref_code     TEXT;
  v_referral_id  UUID;
BEGIN
  -- 1. user_profiles
  BEGIN
    INSERT INTO public.user_profiles (
      id, user_id, display_name,
      email_on_trade, email_on_crash, email_daily_digest,
      tier, role, provider, locale, created_at, updated_at
    ) VALUES (
      new_profile_id, NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name',
               NEW.raw_user_meta_data->>'name',
               split_part(NEW.email, '@', 1), 'Trader'),
      true, true, true,
      'free', 'user',
      COALESCE(NEW.raw_user_meta_data->>'provider', 'email'),
      COALESCE(NEW.raw_user_meta_data->>'locale', 'no'),
      NOW(), NOW()
    ) ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'user_profiles insert failed: %', SQLERRM;
  END;

  -- 2. email_preferences
  BEGIN
    INSERT INTO public.email_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'email_preferences failed: %', SQLERRM;
  END;

  -- 3. kltbalances
  BEGIN
    INSERT INTO public.kltbalances (userid, balance, total_earned)
    VALUES (NEW.id, 500, 500)
    ON CONFLICT (userid) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'kltbalances failed: %', SQLERRM;
  END;

  -- 4. onboarding_progress
  BEGIN
    INSERT INTO public.onboarding_progress (user_id)
    VALUES (NEW.id)
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'onboarding_progress failed: %', SQLERRM;
  END;

  -- 5. portfolios
  BEGIN
    INSERT INTO public.portfolios (user_id, name, description)
    VALUES (NEW.id, 'Min Portefølje', 'Standard portefølje')
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'portfolios failed: %', SQLERRM;
  END;

  -- 6. user_settings
  BEGIN
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'user_settings failed: %', SQLERRM;
  END;

  -- 7. user_notification_settings
  BEGIN
    INSERT INTO public.user_notification_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'user_notification_settings failed: %', SQLERRM;
  END;

  -- 8. paper_trading_sessions
  BEGIN
    INSERT INTO public.paper_trading_sessions (user_id, starting_balance, current_balance)
    VALUES (NEW.id, 100000, 100000)
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'paper_trading_sessions failed: %', SQLERRM;
  END;

  -- 9. risk_profiles
  BEGIN
    INSERT INTO public.risk_profiles
      (user_id, name, max_position_size_pct, stop_loss_pct, max_total_exposure_pct, is_active)
    VALUES
      (NEW.id, 'forsiktig', 2.0, 3.0,  5.0,  true),
      (NEW.id, 'moderat',   5.0, 5.0,  15.0, false),
      (NEW.id, 'aggressiv', 10.0, 10.0, 30.0, false)
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'risk_profiles failed: %', SQLERRM;
  END;

  -- 10. referral handling (DECLARE vars moved to function level)
  BEGIN
    v_ref_code := NEW.raw_user_meta_data->>'referral_code';
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
        SET referred_user_id = NEW.id,
            status = 'account_created',
            signed_up_at = NOW(),
            updated_at = NOW()
        WHERE id = v_referral_id;

        INSERT INTO public.user_klt_balances (user_id, balance, total_earned)
        VALUES (NEW.id, 110, 110)
        ON CONFLICT (user_id) DO UPDATE
          SET balance = user_klt_balances.balance + 10,
              total_earned = user_klt_balances.total_earned + 10,
              updated_at = NOW();
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'referral failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 2: Drop conflicting trigger on user_profiles
-- This trigger was calling initialize_user_settings() which conflicted
-- with the user_settings insert in handle_new_user_consolidated()
DROP TRIGGER IF EXISTS on_user_profile_created ON user_profiles;

-- Ensure the main trigger exists and is the only one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_consolidated();

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ handle_new_user_consolidated() fixed: nested DECLARE moved to function level';
  RAISE NOTICE '✅ on_user_profile_created trigger dropped (was causing conflicts)';
  RAISE NOTICE '✅ on_auth_user_created trigger recreated';
END $$;
