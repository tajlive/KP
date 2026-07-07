-- Performance fee tracking for profitable auto-trades
-- Charges 5% of profit only when trade is profitable. Collected off-chain via Stripe billing.
-- Migrasjon: 20260708000000

CREATE TABLE IF NOT EXISTS public.performance_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  profit_nok NUMERIC NOT NULL DEFAULT 0,
  fee_nok NUMERIC NOT NULL DEFAULT 0,
  fee_percent NUMERIC NOT NULL DEFAULT 5.0,
  collected BOOLEAN NOT NULL DEFAULT false,
  collected_at TIMESTAMPTZ,
  stripe_invoice_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_perf_fees_user ON public.performance_fees(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_perf_fees_collected ON public.performance_fees(collected, created_at DESC)
  WHERE collected = false;

ALTER TABLE public.performance_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fees"
  ON public.performance_fees FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage fees"
  ON public.performance_fees FOR ALL
  TO service_role
  USING (true);

-- Function to calculate and insert performance fee on profitable trade close
CREATE OR REPLACE FUNCTION public.calculate_performance_fee()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profit_nok NUMERIC;
  v_fee_nok NUMERIC;
  v_fee_percent NUMERIC := 5.0;
BEGIN
  -- Only for auto-trades (not manual, not paper), and only when trade is profitable
  IF NEW.mode != 'live' THEN RETURN NEW; END IF;
  IF NEW.status != 'filled' THEN RETURN NEW; END IF;
  IF NEW.is_copy IS TRUE THEN RETURN NEW; END IF; -- Copy trades exempt

  -- Calculate profit: use effective_pnl or fallback to realized_pnl
  v_profit_nok := COALESCE(NEW.realized_pnl, 0);

  -- Only charge fee on profitable trades
  IF v_profit_nok <= 0 THEN RETURN NEW; END IF;

  v_fee_nok := ROUND(v_profit_nok * v_fee_percent / 100.0, 2);

  INSERT INTO public.performance_fees (
    user_id, trade_id, session_id,
    profit_nok, fee_nok, fee_percent
  ) VALUES (
    NEW.user_id, NEW.id, NEW.session_id,
    v_profit_nok, v_fee_nok, v_fee_percent
  );

  RETURN NEW;
END;
$$;

-- Trigger on trade updates (fee calculated when trade fills)
DROP TRIGGER IF EXISTS trg_performance_fee ON public.trades;
CREATE TRIGGER trg_performance_fee
  AFTER UPDATE OF status ON public.trades
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'filled')
  EXECUTE FUNCTION public.calculate_performance_fee();
