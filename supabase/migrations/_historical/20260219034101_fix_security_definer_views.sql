-- ============================================================================
-- SECURITY FIX: Add explicit grants for existing views
-- Issue: 0010_security_definer_view linter finding
-- Note: All views are already NORMAL (not SECURITY DEFINER)
-- This migration adds explicit grants for security compliance
-- ============================================================================

-- Admin-only views (service_role only)
REVOKE ALL ON public.admin_user_list FROM PUBLIC, authenticated, anon;
GRANT SELECT ON public.admin_user_list TO service_role;

REVOKE ALL ON public.campaign_stats FROM PUBLIC, authenticated, anon;
GRANT SELECT ON public.campaign_stats TO service_role;

REVOKE ALL ON public.signup_funnel_stats FROM PUBLIC, authenticated, anon;
GRANT SELECT ON public.signup_funnel_stats TO service_role;

REVOKE ALL ON public.user_stats_summary FROM PUBLIC, authenticated, anon;
GRANT SELECT ON public.user_stats_summary TO service_role;

REVOKE ALL ON public.user_referrals_summary FROM PUBLIC, authenticated, anon;
GRANT SELECT ON public.user_referrals_summary TO service_role;

REVOKE ALL ON public.user_entitlements FROM PUBLIC, authenticated, anon;
GRANT SELECT ON public.user_entitlements TO service_role;

-- User-facing views (authenticated + service_role)
REVOKE ALL ON public.active_signals_summary FROM PUBLIC, anon;
GRANT SELECT ON public.active_signals_summary TO authenticated, service_role;

REVOKE ALL ON public.active_subscriptions FROM PUBLIC, anon;
GRANT SELECT ON public.active_subscriptions TO authenticated, service_role;

REVOKE ALL ON public.current_leaderboard FROM PUBLIC, anon;
GRANT SELECT ON public.current_leaderboard TO authenticated, service_role;

REVOKE ALL ON public.public_strategies FROM PUBLIC, anon;
GRANT SELECT ON public.public_strategies TO authenticated, service_role;

REVOKE ALL ON public.user_performance FROM PUBLIC, anon;
GRANT SELECT ON public.user_performance TO authenticated, service_role;

REVOKE ALL ON public.v_active_paper_positions FROM PUBLIC, anon;
GRANT SELECT ON public.v_active_paper_positions TO authenticated, service_role;

REVOKE ALL ON public.v_active_real_positions FROM PUBLIC, anon;
GRANT SELECT ON public.v_active_real_positions TO authenticated, service_role;

REVOKE ALL ON public.v_paper_trading_stats FROM PUBLIC, anon;
GRANT SELECT ON public.v_paper_trading_stats TO authenticated, service_role;

REVOKE ALL ON public.v_user_trading_summary FROM PUBLIC, anon;
GRANT SELECT ON public.v_user_trading_summary TO authenticated, service_role;
