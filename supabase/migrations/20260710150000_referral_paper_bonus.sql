-- ============================================
-- Referral Paper-Bonus System
-- 2026-07-10
-- ============================================

-- 1. Add paper-bonus tracking to referral_tracking
ALTER TABLE public.referral_tracking
  ADD COLUMN IF NOT EXISTS referrer_reward_nok INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referred_reward_nok INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_awarded_at TIMESTAMPTZ;

COMMENT ON COLUMN public.referral_tracking.referrer_reward_nok IS
  'Paper bonus i NOK awarded to referrer when referred_user completes first trade';
COMMENT ON COLUMN public.referral_tracking.referred_reward_nok IS
  'Paper bonus i NOK awarded to referred_user when they complete first trade';
COMMENT ON COLUMN public.referral_tracking.bonus_awarded_at IS
  'When the paper bonus was awarded';

-- 2. Add referral_code to user_profiles if not exists
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_user_profiles_referral_code
  ON public.user_profiles(referral_code)
  WHERE referral_code IS NOT NULL;

-- 3. Function: Award paper bonus when referred user completes first trade
CREATE OR REPLACE FUNCTION public.award_referral_bonus()
RETURNS TRIGGER AS $$
DECLARE
  v_referrer_id UUID;
  v_referral_id UUID;
  v_bonus_nok CONSTANT INTEGER := 5000;
BEGIN
  -- Only for paper-mode first trades
  IF NEW.mode != 'paper' THEN
    RETURN NEW;
  END IF;

  -- Find referral where this user is the referred_user and bonus not yet awarded
  SELECT id, referrer_user_id INTO v_referral_id, v_referrer_id
  FROM public.referral_tracking
  WHERE referred_user_id = NEW.user_id
    AND status IN ('signed_up', 'trial_completed')
    AND (bonus_awarded_at IS NULL)
  LIMIT 1;

  IF v_referral_id IS NOT NULL AND v_referrer_id IS NOT NULL THEN
    -- Award bonus to referrer
    UPDATE public.user_profiles
    SET paper_balance = COALESCE(paper_balance, 0) + v_bonus_nok
    WHERE id = v_referrer_id;

    -- Award bonus to referred user
    UPDATE public.user_profiles
    SET paper_balance = COALESCE(paper_balance, 0) + v_bonus_nok
    WHERE id = NEW.user_id;

    -- Mark bonus as awarded
    UPDATE public.referral_tracking
    SET
      status = 'converted',
      referrer_reward_nok = v_bonus_nok,
      referred_reward_nok = v_bonus_nok,
      bonus_awarded_at = NOW(),
      converted_at = NOW(),
      updated_at = NOW()
    WHERE id = v_referral_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on trades table
DROP TRIGGER IF EXISTS on_first_trade_award_referral_bonus ON public.trades;
CREATE TRIGGER on_first_trade_award_referral_bonus
  AFTER INSERT ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.award_referral_bonus();

-- 4. Function: Get top referrers this month (for leaderboard/badge)
CREATE OR REPLACE FUNCTION public.get_top_referrers(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  count BIGINT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_start_of_month TIMESTAMPTZ := date_trunc('month', NOW());
BEGIN
  RETURN QUERY
  SELECT
    rt.referrer_user_id AS user_id,
    COALESCE(up.display_name, 'Anonym')::TEXT AS display_name,
    COUNT(*)::BIGINT AS count
  FROM public.referral_tracking rt
  LEFT JOIN public.user_profiles up ON up.id = rt.referrer_user_id
  WHERE rt.status IN ('signed_up', 'trial_completed', 'converted')
    AND rt.signed_up_at >= v_start_of_month
  GROUP BY rt.referrer_user_id, up.display_name
  ORDER BY count DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_top_referrers TO authenticated, service_role;
