-- =============================================================================
-- Trade Execution Outbox
-- =============================================================================
-- Guarantees DB/Exchange consistency for trade execution
-- Pattern: Stage -> Execute -> Confirm
--
-- Solves: "Trade executed on exchange but DB insert failed"
-- =============================================================================

CREATE TABLE IF NOT EXISTS trade_outbox (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('market', 'limit')),
  mode TEXT NOT NULL CHECK (mode IN ('paper', 'live')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'executing', 'confirmed', 'failed', 'reconciling')),
  exchange_order_id TEXT,
  executed_price NUMERIC,
  executed_quantity NUMERIC,
  fee NUMERIC DEFAULT 0,
  error TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  executed_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ
);

-- Indexer for effektive queries
CREATE INDEX IF NOT EXISTS idx_trade_outbox_user_status ON trade_outbox(user_id, status);
CREATE INDEX IF NOT EXISTS idx_trade_outbox_status ON trade_outbox(status);
CREATE INDEX IF NOT EXISTS idx_trade_outbox_executing ON trade_outbox(status, next_retry_at) WHERE status IN ('executing', 'reconciling');
CREATE INDEX IF NOT EXISTS idx_trade_outbox_created ON trade_outbox(created_at);

-- RLS policies
ALTER TABLE trade_outbox ENABLE ROW LEVEL SECURITY;

-- Users can only see their own outbox entries
CREATE POLICY "Users can view own trade outbox" ON trade_outbox
  FOR SELECT USING (user_id = auth.uid());

-- System can insert/update (called from Edge Functions)
CREATE POLICY "System can manage trade outbox" ON trade_outbox
  FOR ALL USING (true)
  WITH CHECK (true);

COMMENT ON TABLE trade_outbox IS 'Transactional outbox for trade execution ensuring DB/Exchange consistency';
COMMENT ON COLUMN trade_outbox.status IS 'pending=staged, executing=exchange call in progress, confirmed=complete, failed=permanent failure, reconciling=retry needed';
COMMENT ON COLUMN trade_outbox.exchange_order_id IS 'Order ID from exchange (Binance/Bybit)';
COMMENT ON COLUMN trade_outbox.attempts IS 'Number of reconciliation attempts';

-- =============================================================================
-- Reconciliation Cron Job
-- =============================================================================
-- Prosesserer trades som er i 'executing' eller 'reconciling' status
-- Kjører hvert 2. minutt
-- =============================================================================

-- Funksjon for å prosessere trade outbox
CREATE OR REPLACE FUNCTION process_trade_outbox()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  entry RECORD;
  max_attempts CONSTANT INTEGER := 5;
BEGIN
  -- Hent entries som trenger reconciling
  FOR entry IN 
    SELECT * FROM trade_outbox
    WHERE status IN ('executing', 'reconciling')
      AND attempts < max_attempts
      AND (next_retry_at IS NULL OR next_retry_at <= now())
    ORDER BY created_at
    LIMIT 100
  LOOP
    -- Sjekk om trade finnes i trades-tabellen (bekreftet gjennomført)
    IF EXISTS (
      SELECT 1 FROM trades 
      WHERE user_id = entry.user_id 
        AND trading_pair = entry.symbol
        AND created_at >= entry.created_at - interval '1 minute'
        AND created_at <= now()
    ) THEN
      -- Trade er bekreftet i trades-tabellen
      UPDATE trade_outbox 
      SET status = 'confirmed', 
          updated_at = now()
      WHERE id = entry.id;
    ELSE
      -- Trade mangler i trades-tabellen, øk attempts og schedule retry
      UPDATE trade_outbox 
      SET attempts = attempts + 1,
          status = CASE WHEN attempts + 1 >= max_attempts THEN 'failed' ELSE 'reconciling' END,
          next_retry_at = now() + (interval '1 minute' * (attempts + 1)),
          updated_at = now()
      WHERE id = entry.id;
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION process_trade_outbox() IS 'Background reconciliation of trade outbox entries';
