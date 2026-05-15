-- Migration: Add columns needed for constant trading optimization gap analysis
-- Created: 2026-05-15
-- Context: Enables GAP 1-7 metrics (TCA, backtest-live gap, fill rate, signal decay, adverse selection, P&L attribution, market impact)

-- ============================================================================
-- 1. TRADES: Execution quality columns
-- ============================================================================

-- Fill rate: percentage of order quantity actually filled (0-100)
ALTER TABLE public.trades
ADD COLUMN IF NOT EXISTS fill_rate NUMERIC(5,2);

COMMENT ON COLUMN public.trades.fill_rate IS
  'Percentage of order quantity filled (0-100). GAP-3 Fill Rate Monitor.';

-- Post-trade price snapshots for adverse selection analysis
ALTER TABLE public.trades
ADD COLUMN IF NOT EXISTS post_trade_price_1min NUMERIC(18,8);

COMMENT ON COLUMN public.trades.post_trade_price_1min IS
  'Market price 1 minute after trade execution. GAP-5 Adverse Selection detection.';

ALTER TABLE public.trades
ADD COLUMN IF NOT EXISTS post_trade_price_5min NUMERIC(18,8);

COMMENT ON COLUMN public.trades.post_trade_price_5min IS
  'Market price 5 minutes after trade execution. GAP-5 Adverse Selection detection.';

-- Execution latency in milliseconds
ALTER TABLE public.trades
ADD COLUMN IF NOT EXISTS latency_ms INTEGER;

COMMENT ON COLUMN public.trades.latency_ms IS
  'Signal-to-fill latency in milliseconds. GAP-4 Signal Decay analysis.';

-- Venue/exchange where order was executed
ALTER TABLE public.trades
ADD COLUMN IF NOT EXISTS venue TEXT DEFAULT 'binance';

COMMENT ON COLUMN public.trades.venue IS
  'Exchange/venue where the trade was executed. GAP-1 TCA venue comparison.';

-- Slippage in basis points (actual vs expected price)
ALTER TABLE public.trades
ADD COLUMN IF NOT EXISTS slippage_bps NUMERIC(10,4);

COMMENT ON COLUMN public.trades.slippage_bps IS
  'Price slippage in basis points. GAP-1 TCA slippage tracking.';

-- Spread at time of execution in basis points
ALTER TABLE public.trades
ADD COLUMN IF NOT EXISTS spread_bps NUMERIC(10,4);

COMMENT ON COLUMN public.trades.spread_bps IS
  'Bid-ask spread at execution time in basis points. GAP-1 TCA.';

-- ============================================================================
-- 2. BACKTEST_RESULTS: Strategy linkage
-- ============================================================================

-- Link backtest to specific strategy configuration
ALTER TABLE public.backtest_results
ADD COLUMN IF NOT EXISTS strategy_id TEXT;

COMMENT ON COLUMN public.backtest_results.strategy_id IS
  'Reference to the strategy configuration used for this backtest. GAP-2 Backtest-Live Gap analysis.';

-- Add index for strategy_id lookups
CREATE INDEX IF NOT EXISTS idx_backtest_results_strategy_id
  ON public.backtest_results (strategy_id)
  WHERE strategy_id IS NOT NULL;

-- ============================================================================
-- 3. INDEXES for new trade columns
-- ============================================================================

-- Fast fill rate queries for GAP-3
CREATE INDEX IF NOT EXISTS idx_trades_fill_rate
  ON public.trades (fill_rate)
  WHERE fill_rate IS NOT NULL;

-- Fast latency queries for GAP-4
CREATE INDEX IF NOT EXISTS idx_trades_latency_ms
  ON public.trades (latency_ms)
  WHERE latency_ms IS NOT NULL;

-- Fast venue queries for GAP-1
CREATE INDEX IF NOT EXISTS idx_trades_venue
  ON public.trades (venue, executed_at DESC);

-- Fast adverse selection queries for GAP-5
CREATE INDEX IF NOT EXISTS idx_trades_post_trade_prices
  ON public.trades (post_trade_price_1min, post_trade_price_5min)
  WHERE post_trade_price_1min IS NOT NULL OR post_trade_price_5min IS NOT NULL;

-- ============================================================================
-- 4. TRADING_GAP_METRICS: Historical storage for trend analysis
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trading_gap_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gap_name TEXT NOT NULL CHECK (gap_name IN (
    'TCA', 'BACKTEST_LIVE_GAP', 'FILL_RATE', 'SIGNAL_DECAY',
    'ADVERSE_SELECTION', 'PL_ATTRIBUTION', 'MARKET_IMPACT'
  )),
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  period_from TIMESTAMPTZ NOT NULL,
  period_to TIMESTAMPTZ NOT NULL,
  metrics JSONB NOT NULL,
  alert_triggered BOOLEAN NOT NULL DEFAULT false,
  alert_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for historical queries
CREATE INDEX IF NOT EXISTS idx_trading_gap_metrics_name_time
  ON public.trading_gap_metrics (gap_name, computed_at DESC);

CREATE INDEX IF NOT EXISTS idx_trading_gap_metrics_alert
  ON public.trading_gap_metrics (gap_name, alert_triggered, computed_at DESC)
  WHERE alert_triggered = true;

COMMENT ON TABLE public.trading_gap_metrics IS
  'Historical storage of all 7 trading optimization gap metrics for trend analysis.';

-- Enable RLS
ALTER TABLE public.trading_gap_metrics ENABLE ROW LEVEL SECURITY;

-- Admin-only access (sensitive trading data)
CREATE POLICY IF NOT EXISTS "Admin full access on trading_gap_metrics"
  ON public.trading_gap_metrics
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  ));

-- ============================================================================
-- 5. FUNCTION: Persist gap metrics
-- ============================================================================

CREATE OR REPLACE FUNCTION public.persist_gap_metrics(
  p_gap_name TEXT,
  p_period_from TIMESTAMPTZ,
  p_period_to TIMESTAMPTZ,
  p_metrics JSONB,
  p_alert_triggered BOOLEAN DEFAULT false,
  p_alert_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.trading_gap_metrics (
    gap_name, period_from, period_to, metrics, alert_triggered, alert_details
  ) VALUES (
    p_gap_name, p_period_from, p_period_to, p_metrics, p_alert_triggered, p_alert_details
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.persist_gap_metrics IS
  'Persists a trading gap metric snapshot for historical trend analysis.';
