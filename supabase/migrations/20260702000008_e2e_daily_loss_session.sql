-- ============================================================================
-- Migration: Restore calculate_daily_loss(p_user_id, p_session_id) for E2E
-- Date: 2026-07-02
-- Context: Latest migration (20260501160300) changed signature to (p_user_id, p_date).
--          Risk engine calls (p_user_id, p_session_id), so the RPC fails closed
--          with DAILY_LOSS_CHECK_FAILED. This migration restores the session
--          signature used by the risk engine.
-- ============================================================================

-- Drop all legacy overloads to avoid ambiguous function calls.
DROP FUNCTION IF EXISTS public.calculate_daily_loss(UUID, UUID);
DROP FUNCTION IF EXISTS public.calculate_daily_loss(UUID, DATE);
DROP FUNCTION IF EXISTS public.calculate_daily_loss(UUID);
DROP FUNCTION IF EXISTS public.calculate_daily_loss();

-- Session-based signature used by the risk engine.
CREATE OR REPLACE FUNCTION public.calculate_daily_loss(
  p_user_id UUID,
  p_session_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    SUM(
      CASE
        WHEN t.realized_pnl < 0 THEN ABS(t.realized_pnl)
        ELSE 0
      END
    ),
    0
  )
  FROM public.trades t
  WHERE t.user_id = p_user_id
    AND t.session_id = p_session_id
    AND t.created_at::date = CURRENT_DATE
    AND t.status IN ('filled', 'partially_filled');
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_daily_loss(UUID, UUID) TO authenticated, service_role;

COMMENT ON FUNCTION public.calculate_daily_loss(UUID, UUID) IS
  'Calculates total realized loss for a user/session on the current date. Used by the risk engine before trade execution.';
