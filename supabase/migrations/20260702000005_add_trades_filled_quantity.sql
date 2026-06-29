ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS filled_quantity NUMERIC(18,8);

COMMENT ON COLUMN public.trades.filled_quantity IS 'Actually filled quantity as reported by the exchange.';
