-- Add binance_order_id to trades table for live trading audit trail
-- 2026-05-03

ALTER TABLE public.trades
ADD COLUMN IF NOT EXISTS binance_order_id TEXT;

-- Index for quick lookups by Binance order ID
CREATE INDEX IF NOT EXISTS idx_trades_binance_order_id
ON public.trades(binance_order_id)
WHERE binance_order_id IS NOT NULL;
