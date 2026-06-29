-- Reconciliation run tracking table
-- Stores the outcome of each Binance trade reconciliation pass.

CREATE TABLE IF NOT EXISTS public.reconciliation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  trades_checked INTEGER NOT NULL DEFAULT 0,
  divergences INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  details JSONB DEFAULT '[]'::jsonb
);

COMMENT ON TABLE public.reconciliation_runs IS
  'Aggregated results from hourly Binance trade reconciliation passes.';

ALTER TABLE public.reconciliation_runs ENABLE ROW LEVEL SECURITY;
