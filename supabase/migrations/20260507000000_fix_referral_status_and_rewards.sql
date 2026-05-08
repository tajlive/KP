-- ============================================
-- Referral System Fix: Status Sync + Rewards + Index
-- 2026-05-07
-- ============================================

-- 1. Fix trigger: 'account_created' → 'signed_up' (matches DB constraint)
-- The old trigger set 'account_created' which is NOT in the CHECK constraint.
-- This caused INSERT errors for users signing up via referral links.
CREATE OR REPLACE FUNCTION handle_new_user_consolidated()
RETURNS TRIGGER AS $$
DECLARE
  v_setting_id UUID;
  v_ref_code TEXT;
  v_referral_id UUID;
BEGIN
  -- Create user settings
  INSERT INTO public.user_settings (user_id, theme, locale, notifications_enabled)
  VALUES (NEW.id, 'system', 'no', true)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_consolidated();

-- 2. Add index for efficient monthly referral lookups
CREATE INDEX IF NOT EXISTS idx_referral_tracking_monthly
  ON referral_tracking(referrer_user_id, created_at);

-- 3. Add index for referred_user_id + status (reward eligibility checks)
CREATE INDEX IF NOT EXISTS idx_referral_tracking_referred_status
  ON referral_tracking(referred_user_id, status)
  WHERE referred_user_id IS NOT NULL;

-- 4. Migrate any existing rows with invalid status 'account_created' → 'signed_up'
UPDATE public.referral_tracking
SET status = 'signed_up'
WHERE status = 'account_created';

-- 5. Add comment documenting reward columns
COMMENT ON COLUMN public.referral_tracking.referrer_reward_months IS
  'Number of free months awarded to referrer when referred_user converts. Set by application logic or trigger.';
COMMENT ON COLUMN public.referral_tracking.referrer_reward_points IS
  'KLT points awarded to referrer when referred_user converts. Set by application logic or trigger.';
