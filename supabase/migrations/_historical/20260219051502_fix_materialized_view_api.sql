-- ============================================================================
-- CATEGORY 3: Fix materialized_view_in_api
-- Restrict access to paper_trading_leaderboard from public API
-- ============================================================================

-- Revoke public access to materialized view
REVOKE SELECT ON public.paper_trading_leaderboard FROM anon, authenticated;

-- Keep only service_role access
GRANT SELECT ON public.paper_trading_leaderboard TO service_role;
