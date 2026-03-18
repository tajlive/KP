-- ============================================================================
-- Fiks: Auto trade-tilgang for Student og Bachelor
-- ============================================================================
-- Problem: get_user_entitlements ga can_use_autotrade=false til student/bachelor,
-- og auto_trade_max_strategies=0 for student. Per AUTO-TRADE-PLAN.md og PAYWALL.md
-- skal Student få 1 paper auto trade, og Bachelor få 1 auto trade (paper+live).
--
-- Endringer:
-- 1. can_use_autotrade: true for student, bachelor, master, phd, professor
-- 2. auto_trade_max_strategies: 1 for student (var 0)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_entitlements(p_user_id UUID)
RETURNS TABLE (
  subscription_tier TEXT,
  subscription_status TEXT,
  is_trial_active BOOLEAN,
  is_trial_expired BOOLEAN,
  can_access_spot BOOLEAN,
  can_access_futures BOOLEAN,
  can_use_sms BOOLEAN,
  can_use_autotrade BOOLEAN,
  can_use_copy_trading BOOLEAN,
  can_use_limit_orders BOOLEAN,
  can_use_margin BOOLEAN,
  futures_quiz_passed BOOLEAN,
  trial_days_remaining INTEGER,
  auto_trade_max_strategies INTEGER,
  auto_trade_max_positions INTEGER,
  auto_trade_allow_live BOOLEAN,
  auto_trade_allow_paper BOOLEAN
) AS $$
DECLARE
  v_tier_slug TEXT;
  v_status TEXT;
  v_trial_ends TIMESTAMPTZ;
  v_is_trial_active BOOLEAN;
  v_futures_quiz_passed BOOLEAN;
BEGIN
  -- Hent brukerens subscription info (samme som 20260220042622)
  SELECT 
    s.tier_slug,
    s.status,
    s.current_period_end,
    COALESCE(
      (SELECT bool_or(qa.passed) 
       FROM quiz_attempts qa 
       JOIN quizzes q ON qa.quiz_id = q.id 
       WHERE qa.user_id = p_user_id AND q.slug = 'futures'),
      false
    )
  INTO v_tier_slug, v_status, v_trial_ends, v_futures_quiz_passed
  FROM subscriptions s
  WHERE s.user_id = p_user_id AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1;

  -- Default til student hvis ingen aktiv subscription
  IF v_tier_slug IS NULL THEN
    v_tier_slug := 'student';
    v_status := 'inactive';
  END IF;

  -- Sjekk trial status
  v_is_trial_active := v_status = 'trial' AND v_trial_ends > NOW();

  RETURN QUERY
  SELECT 
    v_tier_slug,
    v_status,
    v_is_trial_active,
    CASE WHEN v_trial_ends < NOW() AND v_status = 'trial' THEN true ELSE false END,
    -- can_access_spot: alle betalende tiers
    v_tier_slug IN ('bachelor', 'master', 'phd', 'professor') OR v_is_trial_active,
    -- can_access_futures: kun professor (med quiz)
    v_tier_slug = 'professor' AND v_futures_quiz_passed,
    -- can_use_sms: master og opp
    v_tier_slug IN ('master', 'phd', 'professor'),
    -- can_use_autotrade: student+ (alle har minst 1 paper; student=paper only) — FIKS 2026-03-18
    v_tier_slug IN ('student', 'bachelor', 'master', 'phd', 'professor'),
    -- can_use_copy_trading: master og opp
    v_tier_slug IN ('master', 'phd', 'professor'),
    -- can_use_limit_orders: bachelor og opp
    v_tier_slug IN ('bachelor', 'master', 'phd', 'professor'),
    -- can_use_margin: professor kun
    v_tier_slug = 'professor',
    v_futures_quiz_passed,
    CASE WHEN v_trial_ends > NOW() THEN EXTRACT(DAY FROM (v_trial_ends - NOW()))::INTEGER ELSE 0 END,
    -- Auto Trade grenser: student=1 paper, bachelor=1, master=3, phd/prof=ubegrenset — FIKS 2026-03-18
    CASE 
      WHEN v_tier_slug = 'student' THEN 1
      WHEN v_tier_slug = 'bachelor' THEN 1
      WHEN v_tier_slug = 'master' THEN 3
      WHEN v_tier_slug IN ('phd', 'professor') THEN -1
      ELSE 1
    END,
    CASE 
      WHEN v_tier_slug = 'student' THEN 1
      WHEN v_tier_slug = 'bachelor' THEN 3
      WHEN v_tier_slug = 'master' THEN 7
      WHEN v_tier_slug IN ('phd', 'professor') THEN -1
      ELSE 1
    END,
    -- allow_live: bachelor og opp (student = KUN paper)
    v_tier_slug IN ('bachelor', 'master', 'phd', 'professor'),
    -- allow_paper: alle
    true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.get_user_entitlements(UUID) SET search_path = public, pg_catalog;

ALTER FUNCTION public.get_user_entitlements(UUID) SET search_path = public, pg_catalog;
COMMENT ON FUNCTION public.get_user_entitlements(UUID) IS 
  'Entitlements per tier. Auto trade: student=1 paper, bachelor=1, master=3, phd/prof=ubegrenset. Oppdatert 2026-03-18.';
