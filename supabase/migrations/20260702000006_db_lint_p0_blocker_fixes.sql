-- ============================================================================
-- Migration: Fix P0 DB lint blockers identified by `npm run db:lint:gate`
-- Date: 2026-07-02
-- ============================================================================
-- Lint errors fixed by this migration:
-- 1. column s.tier_slug does not exist (subscriptions)  -> ADD COLUMN IF NOT EXISTS
-- 2. column "current_balance" does not exist (portfolios) -> ADD COLUMN IF NOT EXISTS
-- 3. column "description" of relation "portfolios" does not exist -> ADD COLUMN IF NOT EXISTS
-- 4. column "total_invested" does not exist (portfolios) -> ADD COLUMN IF NOT EXISTS
-- 5. column "initial_balance" does not exist (portfolios) -> ADD COLUMN IF NOT EXISTS
-- 6. column "total_profit" does not exist (portfolios) -> ADD COLUMN IF NOT EXISTS
-- 7. column "total_profit_percent" does not exist (portfolios) -> ADD COLUMN IF NOT EXISTS
-- 8. column "date" does not exist (auto_trade_daily_stats) -> generated column from trade_date
-- 9. relation "public.market_volatility" does not exist -> CREATE TABLE IF NOT EXISTS
-- 10. operator does not exist: uuid = text (get_binance_vault_keys) -> cast to UUID
-- 11. record "v_stats" has no field "total_pnl" (check_daily_loss_limit) -> use total_profit_loss
-- 12. relation "paper_trading_sessions" does not exist (initialize_user_manually) -> create table
-- 13. column "order_type" is of type order_type but expression is character varying (place_paper_trade_with_slippage) -> explicit cast
-- 14. function jsonb_in(bytea) does not exist (get_trades_paginated) -> convert_from/decode already present; ensure grant
-- ============================================================================

-- ============================================================================
-- 1. Add missing columns to subscriptions
-- ============================================================================

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS tier_slug TEXT;

-- ============================================================================
-- 2. Add missing columns to portfolios
-- ============================================================================

ALTER TABLE public.portfolios
  ADD COLUMN IF NOT EXISTS current_balance DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS total_invested DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS initial_balance DECIMAL(15,2) DEFAULT 100000.00,
  ADD COLUMN IF NOT EXISTS total_profit DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_profit_percent DECIMAL(8,2) DEFAULT 0;

-- Backfill portfolios.current_balance from the legacy balance column so
-- existing rows remain consistent with application logic.
DO $$
BEGIN
  UPDATE public.portfolios
  SET current_balance = balance
  WHERE current_balance IS NULL;
END $$;

-- Make current_balance non-null with the same default as balance so future
-- rows inserted by triggers get a sensible value.
ALTER TABLE public.portfolios
  ALTER COLUMN current_balance SET DEFAULT 100000.00,
  ALTER COLUMN current_balance SET NOT NULL;

-- The codebase still references auto_trade_daily_stats.date. The table was
-- recreated with trade_date, so expose a generated "date" column kept in
-- sync with trade_date without requiring application changes.
ALTER TABLE public.auto_trade_daily_stats
  ADD COLUMN IF NOT EXISTS "date" DATE GENERATED ALWAYS AS (trade_date) STORED;

-- ============================================================================
-- 3. Ensure public.market_volatility exists for calculate_paper_slippage
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.market_volatility (
  symbol VARCHAR(20) PRIMARY KEY,
  volatility_24h DECIMAL(10,6) DEFAULT 0.1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. Ensure paper_trading_sessions exists for initialize_user_manually
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.paper_trading_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  starting_balance DECIMAL(20,8) DEFAULT 100000.00,
  current_balance DECIMAL(20,8) DEFAULT 100000.00,
  total_pnl DECIMAL(20,8) DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('active', 'paused', 'completed')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_paper_trading_sessions_user_id
  ON public.paper_trading_sessions(user_id);

ALTER TABLE public.paper_trading_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own paper sessions" ON public.paper_trading_sessions;
CREATE POLICY "Users manage own paper sessions"
  ON public.paper_trading_sessions FOR ALL
  USING (auth.uid() = user_id);

GRANT ALL ON public.paper_trading_sessions TO authenticated, service_role;

-- ============================================================================
-- 5. Fix get_binance_vault_keys: cast text vault-reference ids to UUID
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_binance_vault_keys(p_user_id UUID)
RETURNS TABLE(api_key TEXT, api_secret TEXT, is_testnet BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT secret FROM vault.secrets WHERE id = bc.api_key_id::UUID),
    (SELECT secret FROM vault.secrets WHERE id = bc.api_secret_id::UUID),
    bc.is_testnet
  FROM public.binance_connections bc
  WHERE bc.user_id = p_user_id;
END;
$$;

-- ============================================================================
-- 6. Fix check_daily_loss_limit: use total_profit_loss column name
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_daily_loss_limit(p_user_id UUID)
RETURNS TABLE (should_stop BOOLEAN, current_loss_percent NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_settings public.auto_trade_settings%ROWTYPE;
  v_stats public.auto_trade_daily_stats%ROWTYPE;
  v_portfolio_value NUMERIC := 10000;
  v_loss_percent NUMERIC;
BEGIN
  SELECT * INTO v_settings
  FROM public.auto_trade_settings
  WHERE user_id = p_user_id;

  SELECT * INTO v_stats
  FROM public.auto_trade_daily_stats
  WHERE user_id = p_user_id AND "date" = CURRENT_DATE;

  IF NOT FOUND THEN
    v_loss_percent := 0;
  ELSE
    v_loss_percent := ABS(v_stats.total_profit_loss / NULLIF(v_portfolio_value, 0) * 100);
  END IF;

  RETURN QUERY
  SELECT
    v_loss_percent >= COALESCE(v_settings.daily_loss_limit_percent, 100),
    v_loss_percent;
END;
$$;

-- ============================================================================
-- 7. Fix get_portfolio_overview_v2: remove total_invested (column no longer used)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_portfolio_overview_v2(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_result JSONB;
  v_total_value NUMERIC := 0;
  v_position_count INTEGER := 0;
BEGIN
  SELECT COALESCE(SUM(usd_value), 0), COUNT(*)
  INTO v_total_value, v_position_count
  FROM public.binance_balances
  WHERE user_id = p_user_id AND COALESCE(free, 0) + COALESCE(locked, 0) > 0;

  IF v_total_value = 0 THEN
    SELECT
      COALESCE(SUM(current_balance), 0),
      COUNT(*)
    INTO v_total_value, v_position_count
    FROM public.portfolios
    WHERE user_id = p_user_id;
  END IF;

  v_result := jsonb_build_object(
    'totalValue', v_total_value,
    'totalInvested', 0,
    'positionCount', v_position_count,
    'hasRealAccount', EXISTS (
      SELECT 1
      FROM public.exchange_api_keys
      WHERE user_id = p_user_id AND is_active = true
    ),
    'lastSynced', (SELECT MAX(updated_at) FROM public.binance_balances WHERE user_id = p_user_id)
  );

  RETURN v_result;
END;
$$;

-- ============================================================================
-- 8. Fix place_paper_trade_with_slippage: cast order_type and add idempotency_key
-- ============================================================================

CREATE OR REPLACE FUNCTION public.place_paper_trade_with_slippage(
  p_user_id UUID,
  p_symbol VARCHAR,
  p_side VARCHAR,
  p_order_type VARCHAR,
  p_amount NUMERIC,
  p_requested_price NUMERIC
)
RETURNS TABLE (
  trade_id UUID,
  execution_price NUMERIC,
  slippage_bps NUMERIC,
  slippage_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_trade_id UUID;
  v_exec_price NUMERIC;
  v_slippage_bps NUMERIC;
  v_slippage_amt NUMERIC;
  v_session_id UUID;
BEGIN
  SELECT ts.id
  INTO v_session_id
  FROM public.trading_sessions ts
  WHERE ts.user_id = p_user_id
    AND ts.mode = 'paper'
    AND ts.status = 'active'
  ORDER BY ts.started_at DESC NULLS LAST
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'no_active_paper_session';
  END IF;

  SELECT
    s.execution_price,
    s.slippage_bps,
    s.slippage_amount
  INTO v_exec_price, v_slippage_bps, v_slippage_amt
  FROM public.calculate_paper_slippage(
    p_symbol, p_side, p_order_type, p_amount, p_requested_price
  ) AS s
  LIMIT 1;

  INSERT INTO public.trades (
    session_id,
    user_id,
    idempotency_key,
    mode,
    trading_pair,
    side,
    order_type,
    quantity,
    price,
    total_value,
    fee,
    status,
    executed_at
  )
  VALUES (
    v_session_id,
    p_user_id,
    public.generate_trade_idempotency_key(v_session_id, p_side::public.trade_side, NOW()),
    'paper',
    p_symbol,
    p_side::public.trade_side,
    p_order_type::public.order_type,
    p_amount,
    v_exec_price,
    p_amount * v_exec_price,
    0,
    'filled',
    NOW()
  )
  RETURNING id INTO v_trade_id;

  RETURN QUERY
  SELECT v_trade_id, v_exec_price, v_slippage_bps, v_slippage_amt;
END;
$$;

-- ============================================================================
-- 9. Ensure get_trades_paginated uses convert_from (already fixed in previous run) and grant
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
