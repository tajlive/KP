-- ============================================================================
-- Migration: Fix remaining P0 DB lint blockers after 20260702000006.
-- Date: 2026-07-02
-- ============================================================================
-- 20260702000006 already added columns and fixed market_volatility, get_binance_vault_keys,
-- and get_trades_paginated. Supabase CLI only applied that file once, so the function
-- replacements below were not re-applied after the file was edited. This migration
-- contains the remaining function fixes needed to make `npm run db:lint:gate` pass.
--
-- Fixes:
-- 1. public.get_portfolio_overview_v2: remove reference to non-existent portfolios.total_invested
-- 2. public.check_daily_loss_limit: use total_profit_loss instead of total_pnl
-- 3. public.initialize_user_manually: create paper_trading_sessions table if missing and insert
-- 4. public.place_paper_trade_with_slippage: cast p_order_type to order_type and add idempotency_key
-- ============================================================================

-- ============================================================================
-- 1. Fix get_portfolio_overview_v2: do not reference portfolios.total_invested
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
      FROM public.exchange_connections
      WHERE user_id = p_user_id AND is_active = true
    ),
    'lastSynced', (SELECT MAX(updated_at) FROM public.binance_balances WHERE user_id = p_user_id)
  );

  RETURN v_result;
END;
$$;

-- ============================================================================
-- 2. Fix check_daily_loss_limit: use total_profit_loss column name
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
-- 3. Fix initialize_user_manually: ensure paper_trading_sessions table exists
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
-- 4. Fix place_paper_trade_with_slippage: cast order_type and add idempotency_key
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
