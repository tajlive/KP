-- SmartTrader v3: trading bot loggføring og session-konfigurasjon

-- 1. Utvid trading_sessions med SmartTrader-konfigurasjon
ALTER TABLE public.trading_sessions
  ADD COLUMN IF NOT EXISTS smart_trader_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS smart_trader_config JSONB DEFAULT '{}';

-- 2. Loggtabell for bot-aktivitet
CREATE TABLE IF NOT EXISTS public.smart_trader_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.trading_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'signal', 'trade_executed', 'trade_skipped', 'stop_loss', 'take_profit',
    'position_checked', 'error', 'config_change'
  )),
  details JSONB NOT NULL DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_smart_trader_log_session
  ON public.smart_trader_log(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_smart_trader_log_user
  ON public.smart_trader_log(user_id, created_at DESC);

ALTER TABLE public.smart_trader_log ENABLE ROW LEVEL SECURITY;

-- RLS: users see own logs (idempotent: drop foer create)
DROP POLICY IF EXISTS "Users see own smart trader logs" ON public.smart_trader_log;
CREATE POLICY "Users see own smart trader logs"
  ON public.smart_trader_log FOR ALL
  USING (auth.uid() = user_id);

GRANT ALL ON public.smart_trader_log TO authenticated, service_role;

-- 3. Indeks for å finne aktive SmartTrader-sessions raskt
CREATE INDEX IF NOT EXISTS idx_trading_sessions_smart_trader
  ON public.trading_sessions(user_id)
  WHERE smart_trader_enabled = true AND status = 'active';
