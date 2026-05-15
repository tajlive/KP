-- Add USDT/NOK exchange rate to trades for audit trail
-- Ensures every trade records the FX rate used at execution time

-- 1. Add column (nullable — historical trades don't have this)
ALTER TABLE public.trades
ADD COLUMN IF NOT EXISTS usdt_nok_rate NUMERIC(10,4);

COMMENT ON COLUMN public.trades.usdt_nok_rate IS
  'USDT→NOK exchange rate at trade execution time. Audit trail for P&L verification.';

-- 2. Index for rate-based queries (e.g., "trades executed when rate was anomalous")
CREATE INDEX IF NOT EXISTS idx_trades_usdt_nok_rate
  ON public.trades (usdt_nok_rate)
  WHERE usdt_nok_rate IS NOT NULL;
