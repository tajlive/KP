-- Migration: Add Strategy Performance Tracking
-- Date: 2026-04-16
-- Description: Table for persistent Kelly Criterion statistics

CREATE TABLE IF NOT EXISTS public.strategy_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id TEXT NOT NULL,
  win_rate DECIMAL(5,4) NOT NULL DEFAULT 0.5,
  avg_win_pct DECIMAL(10,4) NOT NULL DEFAULT 0,
  avg_loss_pct DECIMAL(10,4) NOT NULL DEFAULT 0,
  kelly_fraction DECIMAL(10,6) NOT NULL DEFAULT 0,
  sample_size INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, strategy_id)
);

-- Enable RLS
ALTER TABLE public.strategy_performance ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "strategy_performance_select"
  ON public.strategy_performance
  FOR SELECT
  USING (user_id = (select auth.uid()));

-- Service role access for Edge Functions
CREATE POLICY "strategy_performance_service_access"
  ON public.strategy_performance
  FOR ALL
  USING (current_setting('role', true) = 'service_role');

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_strategy_performance_user_strategy 
  ON public.strategy_performance(user_id, strategy_id);
