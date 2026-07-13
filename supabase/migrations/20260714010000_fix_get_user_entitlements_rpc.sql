-- Fix get_user_entitlements RPC: fjernet referanse til manglende subscriptions-tabell
-- Bruker user_profiles.tier som eneste kilde
DROP FUNCTION IF EXISTS public.get_user_entitlements(UUID);

CREATE OR REPLACE FUNCTION public.get_user_entitlements(p_user_id UUID)
RETURNS TABLE(
  tier_slug TEXT,
  status TEXT,
  is_trial_active BOOLEAN,
  trial_expired BOOLEAN,
  can_access_spot BOOLEAN,
  can_access_futures BOOLEAN,
  can_use_sms BOOLEAN,
  can_use_autotrade BOOLEAN,
  can_use_copy_trading BOOLEAN,
  can_use_limit_orders BOOLEAN,
  can_use_margin BOOLEAN,
  futures_quiz_passed BOOLEAN,
  trial_days_remaining INTEGER,
  max_auto_trade_paper_sessions INTEGER,
  max_auto_trade_live_sessions INTEGER,
  auto_trade_allow_live BOOLEAN,
  auto_trade_allow_paper BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_tier_slug TEXT;
  v_status TEXT := 'inactive';
  v_futures_quiz_passed BOOLEAN := false;
BEGIN
  SELECT up.tier::text INTO v_tier_slug
  FROM user_profiles up WHERE up.id = p_user_id LIMIT 1;

  IF v_tier_slug IS NULL OR v_tier_slug NOT IN ('student','bachelor','master','phd','professor') THEN
    v_tier_slug := 'student';
  END IF;

  IF v_tier_slug = 'professor' THEN v_status := 'active'; END IF;

  SELECT COALESCE(bool_or(qa.passed), false) INTO v_futures_quiz_passed
  FROM quiz_attempts qa
  JOIN quizzes q ON qa.quiz_id = q.id
  WHERE qa.user_id = p_user_id AND q.slug = 'futures';

  RETURN QUERY SELECT
    v_tier_slug, v_status, false, false,
    v_tier_slug IN ('bachelor','master','phd','professor'),
    v_tier_slug = 'professor' AND v_futures_quiz_passed,
    v_tier_slug IN ('master','phd','professor'),
    true,
    v_tier_slug IN ('master','phd','professor'),
    v_tier_slug IN ('bachelor','master','phd','professor'),
    v_tier_slug = 'professor',
    v_futures_quiz_passed, 0,
    CASE WHEN v_tier_slug = 'student' THEN 1 WHEN v_tier_slug = 'bachelor' THEN 1 WHEN v_tier_slug = 'master' THEN 3 ELSE -1 END,
    CASE WHEN v_tier_slug = 'student' THEN 1 WHEN v_tier_slug = 'bachelor' THEN 3 WHEN v_tier_slug = 'master' THEN 7 ELSE -1 END,
    v_tier_slug IN ('bachelor','master','phd','professor'),
    true;
END;
$$;
