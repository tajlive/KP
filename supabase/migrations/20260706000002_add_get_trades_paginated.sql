-- ============================================================================
-- Trading Cockpit: cursor-paginated trade history (no arbitrary LIMIT 200)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_trades_paginated(
  p_user_id UUID,
  p_cursor TEXT,
  p_limit INT,
  p_mode TEXT,
  p_trade_statuses TEXT[],
  p_session_statuses TEXT[],
  p_side TEXT,
  p_pair TEXT,
  p_search TEXT,
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ
)
RETURNS TABLE(
  id UUID,
  session_id UUID,
  trading_pair TEXT,
  side TEXT,
  status TEXT,
  price NUMERIC,
  quantity NUMERIC,
  fee NUMERIC,
  total_value NUMERIC,
  realized_pnl NUMERIC,
  effective_pnl NUMERIC,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  strategy_signal JSONB,
  reason_code TEXT,
  indicator_snapshot JSONB,
  mode TEXT,
  next_cursor TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_executed_at TIMESTAMPTZ;
  v_id UUID;
BEGIN
  IF p_cursor IS NOT NULL THEN
    SELECT (cursor_data.payload->>'executed_at')::TIMESTAMPTZ,
           (cursor_data.payload->>'id')::UUID
    INTO v_executed_at, v_id
    FROM (
      SELECT convert_from(decode(p_cursor, 'base64'), 'UTF8')::jsonb AS payload
    ) AS cursor_data;
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.session_id,
    t.trading_pair,
    t.side::TEXT,
    t.status::TEXT,
    t.price,
    t.quantity,
    t.fee,
    t.total_value,
    t.realized_pnl,
    public.calculate_effective_pnl(t.realized_pnl, t.total_value, t.side::TEXT) AS effective_pnl,
    t.executed_at,
    t.created_at,
    t.strategy_signal,
    t.reason_code,
    t.indicator_snapshot,
    t.mode::TEXT,
    CASE WHEN count(*) OVER () > p_limit THEN
      encode(
        jsonb_build_object(
          'executed_at', t.executed_at,
          'id', t.id
        )::TEXT::BYTEA,
        'base64'
      )
    ELSE NULL END AS next_cursor
  FROM public.trades t
  JOIN public.trading_sessions s ON s.id = t.session_id
  WHERE t.user_id = p_user_id
    AND t.mode = p_mode::public.trading_mode
    AND (p_trade_statuses IS NULL OR t.status = ANY(p_trade_statuses::public.trade_status[]))
    AND (p_session_statuses IS NULL OR s.status = ANY(p_session_statuses::public.session_status[]))
    AND (p_side IS NULL OR t.side = p_side::public.trade_side)
    AND (p_pair IS NULL OR t.trading_pair ILIKE p_pair)
    AND (p_search IS NULL OR t.trading_pair ILIKE '%' || p_search || '%')
    AND (p_from IS NULL OR t.executed_at >= p_from)
    AND (p_to IS NULL OR t.executed_at < p_to)
    AND (
      p_cursor IS NULL
      OR (t.executed_at, t.id) < (v_executed_at, v_id)
    )
  ORDER BY t.executed_at DESC, t.id DESC
  LIMIT p_limit + 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_trades_paginated(UUID, TEXT, INT, TEXT, TEXT[], TEXT[], TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ)
  TO authenticated, service_role;
