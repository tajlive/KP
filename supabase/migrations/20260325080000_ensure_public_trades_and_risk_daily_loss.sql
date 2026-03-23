-- Repair drift: some Supabase-prosjekter har trading_sessions + RPC calculate_daily_loss
-- men mangler public.trades (feil: relation "trades" does not exist → paper execute blokkert).
-- Idempotent: trygg å kjøre flere ganger.

-- Enums kreves av trades (samme sett som 001_core_schema)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trading_mode') THEN
    CREATE TYPE public.trading_mode AS ENUM ('paper', 'live');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trade_side') THEN
    CREATE TYPE public.trade_side AS ENUM ('buy', 'sell');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trade_status') THEN
    CREATE TYPE public.trade_status AS ENUM ('pending', 'filled', 'partially_filled', 'cancelled', 'failed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_type') THEN
    CREATE TYPE public.order_type AS ENUM ('market', 'limit', 'stop_loss', 'take_profit');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.trades (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES public.trading_sessions(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id),

  idempotency_key TEXT NOT NULL,

  mode            public.trading_mode NOT NULL,
  trading_pair    TEXT NOT NULL,
  side            public.trade_side NOT NULL,
  order_type      public.order_type NOT NULL DEFAULT 'market',

  quantity        NUMERIC(18,8) NOT NULL,
  price           NUMERIC(18,8) NOT NULL,
  total_value     NUMERIC(15,2) NOT NULL,
  fee             NUMERIC(15,2) NOT NULL DEFAULT 0.00,

  status          public.trade_status NOT NULL DEFAULT 'filled',

  leader_trade_id UUID REFERENCES public.trades(id),
  is_copy         BOOLEAN NOT NULL DEFAULT false,

  binance_order_id TEXT,

  realized_pnl    NUMERIC(15,2),

  strategy_signal JSONB,

  executed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_trades_idempotency ON public.trades (idempotency_key);
CREATE INDEX IF NOT EXISTS idx_trades_session ON public.trades (session_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_user ON public.trades (user_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_user_mode ON public.trades (user_id, mode, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_leader ON public.trades (leader_trade_id) WHERE leader_trade_id IS NOT NULL;

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own trades" ON public.trades;
DROP POLICY IF EXISTS "Service role full access" ON public.trades;
CREATE POLICY "Users see own trades" ON public.trades
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Service role full access" ON public.trades
  FOR ALL USING (auth.role() = 'service_role');

-- Sikker DEFINER + eksplisitt public.* (samme som 20260324120000)
CREATE OR REPLACE FUNCTION public.calculate_daily_loss(p_user_id UUID, p_session_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  daily_loss NUMERIC;
BEGIN
  SELECT COALESCE(SUM(
    CASE
      WHEN t.side::text = 'sell' AND t.price < (
        SELECT AVG(t2.price) FROM public.trades t2
        WHERE t2.session_id = p_session_id
        AND t2.side::text = 'buy'
        AND t2.created_at::date = CURRENT_DATE
      ) THEN (t.price - (
        SELECT AVG(t2.price) FROM public.trades t2
        WHERE t2.session_id = p_session_id
        AND t2.side::text = 'buy'
        AND t2.created_at::date = CURRENT_DATE
      )) * t.quantity
      ELSE 0
    END
  ), 0) INTO daily_loss
  FROM public.trades t
  WHERE t.user_id = p_user_id
  AND t.session_id = p_session_id
  AND t.created_at::date = CURRENT_DATE
  AND t.side::text = 'sell';

  RETURN daily_loss;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_daily_loss(UUID, UUID) TO authenticated, service_role;
