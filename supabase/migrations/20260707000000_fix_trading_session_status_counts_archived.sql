-- ============================================================================
-- Trading Cockpit: fix session status counts to exclude archived sessions
-- ============================================================================
-- Problem: trading_session_status_counts counted archived sessions, while
-- getUserDashboardMetrics/get_dashboard_metrics filtered archived = false.
-- This caused status badge counts in the Cockpit to differ from metrics.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trading_session_status_counts(
  p_user_id UUID,
  p_mode TEXT
)
RETURNS TABLE(status TEXT, count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status::TEXT, COUNT(*)::BIGINT
  FROM public.trading_sessions
  WHERE user_id = p_user_id
    AND mode = p_mode::public.trading_mode
    AND archived = FALSE
  GROUP BY status::TEXT;
$$;

GRANT EXECUTE ON FUNCTION public.trading_session_status_counts(UUID, TEXT)
  TO authenticated, service_role;
