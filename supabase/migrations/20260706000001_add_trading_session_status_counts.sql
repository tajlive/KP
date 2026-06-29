-- ============================================================================
-- Trading Cockpit: session status counts per user + mode
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
  SELECT status, COUNT(*)::BIGINT
  FROM public.trading_sessions
  WHERE user_id = p_user_id
    AND mode = p_mode::public.trading_mode
  GROUP BY status;
$$;

GRANT EXECUTE ON FUNCTION public.trading_session_status_counts(UUID, TEXT)
  TO authenticated, service_role;
