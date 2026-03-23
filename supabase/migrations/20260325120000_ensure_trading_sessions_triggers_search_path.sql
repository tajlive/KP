-- Repair: trigger_update_session_state / trigger_trade_notification uten search_path → 42P01
-- «relation trading_sessions does not exist» ved INSERT på public.trades (SECURITY DEFINER + tom search_path).
-- Idempotent: kolonner ADD IF NOT EXISTS, funksjoner REPLACE med SET search_path = public og public.*.

-- Enums som trades/sessions trenger (oversikt med 20260325080000)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trading_mode') THEN
    CREATE TYPE public.trading_mode AS ENUM ('paper', 'live');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_status') THEN
    CREATE TYPE public.session_status AS ENUM ('active', 'paused', 'crashed', 'stopped');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trading_phase') THEN
    CREATE TYPE public.trading_phase AS ENUM ('paper', 'micro', 'small', 'full');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_level') THEN
    CREATE TYPE public.risk_level AS ENUM ('conservative', 'balanced', 'aggressive');
  END IF;
END $$;

-- Kjerne-tabell hvis helt manglende
CREATE TABLE IF NOT EXISTS public.trading_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode public.trading_mode NOT NULL DEFAULT 'paper',
  status public.session_status NOT NULL DEFAULT 'active',
  strategy_id TEXT NOT NULL DEFAULT 'dca',
  strategy_config JSONB NOT NULL DEFAULT '{}',
  trading_pair TEXT NOT NULL DEFAULT 'BTC/USDT',
  risk_level public.risk_level DEFAULT 'balanced',
  current_capital NUMERIC(15,2) NOT NULL DEFAULT 100000.00,
  initial_capital NUMERIC(15,2) NOT NULL DEFAULT 100000.00,
  current_capital_nok NUMERIC(15,2) NOT NULL DEFAULT 100000.00,
  starting_capital_nok NUMERIC(15,2) NOT NULL DEFAULT 100000.00,
  open_position JSONB,
  total_trades INTEGER NOT NULL DEFAULT 0,
  winning_trades INTEGER NOT NULL DEFAULT 0,
  losing_trades INTEGER NOT NULL DEFAULT 0,
  total_pnl NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  max_drawdown_pct NUMERIC(5,2) DEFAULT 0.00,
  phase public.trading_phase DEFAULT 'paper',
  phase_started_at TIMESTAMPTZ DEFAULT now(),
  last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_tick_at TIMESTAMPTZ,
  crash_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  stopped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Utfyll manglende kolonner på eldre / minimale tabeller
ALTER TABLE public.trading_sessions ADD COLUMN IF NOT EXISTS strategy_id TEXT NOT NULL DEFAULT 'dca';
ALTER TABLE public.trading_sessions ADD COLUMN IF NOT EXISTS strategy_config JSONB NOT NULL DEFAULT '{}';
ALTER TABLE public.trading_sessions ADD COLUMN IF NOT EXISTS trading_pair TEXT NOT NULL DEFAULT 'BTC/USDT';
ALTER TABLE public.trading_sessions ADD COLUMN IF NOT EXISTS current_capital NUMERIC(15,2) NOT NULL DEFAULT 100000.00;
ALTER TABLE public.trading_sessions ADD COLUMN IF NOT EXISTS initial_capital NUMERIC(15,2) NOT NULL DEFAULT 100000.00;
ALTER TABLE public.trading_sessions ADD COLUMN IF NOT EXISTS current_capital_nok NUMERIC(15,2) NOT NULL DEFAULT 100000.00;
ALTER TABLE public.trading_sessions ADD COLUMN IF NOT EXISTS starting_capital_nok NUMERIC(15,2) NOT NULL DEFAULT 100000.00;
ALTER TABLE public.trading_sessions ADD COLUMN IF NOT EXISTS open_position JSONB;
ALTER TABLE public.trading_sessions ADD COLUMN IF NOT EXISTS total_trades INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.trading_sessions ADD COLUMN IF NOT EXISTS winning_trades INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.trading_sessions ADD COLUMN IF NOT EXISTS losing_trades INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.trading_sessions ADD COLUMN IF NOT EXISTS total_pnl NUMERIC(15,2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.trading_sessions ADD COLUMN IF NOT EXISTS max_drawdown_pct NUMERIC(5,2) DEFAULT 0.00;
ALTER TABLE public.trading_sessions ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.trading_sessions ADD COLUMN IF NOT EXISTS last_tick_at TIMESTAMPTZ;
ALTER TABLE public.trading_sessions ADD COLUMN IF NOT EXISTS crash_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.trading_sessions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.trading_sessions ADD COLUMN IF NOT EXISTS stopped_at TIMESTAMPTZ;
ALTER TABLE public.trading_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.trading_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Enum-kolonner kun hvis de ikke finnes (unngå duplikat-navn)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trading_sessions' AND column_name = 'risk_level'
  ) THEN
    ALTER TABLE public.trading_sessions
      ADD COLUMN risk_level public.risk_level DEFAULT 'balanced';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trading_sessions' AND column_name = 'phase'
  ) THEN
    ALTER TABLE public.trading_sessions
      ADD COLUMN phase public.trading_phase DEFAULT 'paper';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trading_sessions' AND column_name = 'phase_started_at'
  ) THEN
    ALTER TABLE public.trading_sessions
      ADD COLUMN phase_started_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_session
  ON public.trading_sessions (user_id, trading_pair)
  WHERE status::text = 'active';
CREATE INDEX IF NOT EXISTS idx_sessions_heartbeat
  ON public.trading_sessions (last_heartbeat)
  WHERE status::text = 'active';
CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.trading_sessions (user_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_user_mode ON public.trading_sessions (user_id, mode);

ALTER TABLE public.trading_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own sessions" ON public.trading_sessions;
DROP POLICY IF EXISTS "Users can manage own sessions" ON public.trading_sessions;
DROP POLICY IF EXISTS "Users can view own trading sessions" ON public.trading_sessions;
DROP POLICY IF EXISTS "Service role full access trading_sessions" ON public.trading_sessions;
CREATE POLICY "Users manage own sessions" ON public.trading_sessions
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Service role full access trading_sessions" ON public.trading_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- notification_queue (valgfri for notify-trigger)
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL CHECK (type IN (
    'trade_executed', 'bot_crashed', 'bot_recovered',
    'copy_started', 'daily_digest', 'subscription_change'
  )),
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS on_trade_update_session ON public.trades;
DROP TRIGGER IF EXISTS on_trade_notify ON public.trades;

CREATE OR REPLACE FUNCTION public.trigger_update_session_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.trading_sessions
  SET
    current_capital = CASE
      WHEN NEW.side::text = 'buy' THEN current_capital - NEW.total_value - NEW.fee
      WHEN NEW.side::text = 'sell' THEN current_capital + NEW.total_value - NEW.fee
      ELSE current_capital
    END,
    current_capital_nok = CASE
      WHEN NEW.side::text = 'buy' THEN current_capital_nok - NEW.total_value - NEW.fee
      WHEN NEW.side::text = 'sell' THEN current_capital_nok + NEW.total_value - NEW.fee
      ELSE current_capital_nok
    END,
    open_position = CASE
      WHEN NEW.side::text = 'buy' THEN jsonb_build_object(
        'side', 'long',
        'quantity', NEW.quantity,
        'entry_price', NEW.price,
        'entry_time', NEW.executed_at
      )
      WHEN NEW.side::text = 'sell' THEN NULL
      ELSE open_position
    END,
    total_trades = total_trades + 1,
    winning_trades = CASE
      WHEN NEW.realized_pnl IS NOT NULL AND NEW.realized_pnl > 0 THEN winning_trades + 1
      ELSE winning_trades
    END,
    losing_trades = CASE
      WHEN NEW.realized_pnl IS NOT NULL AND NEW.realized_pnl < 0 THEN losing_trades + 1
      ELSE losing_trades
    END,
    total_pnl = total_pnl + COALESCE(NEW.realized_pnl, 0),
    last_tick_at = now(),
    updated_at = now()
  WHERE id = NEW.session_id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_trade_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  should_notify BOOLEAN := false;
BEGIN
  BEGIN
    SELECT u.email_on_trade INTO should_notify
    FROM public.user_profiles u
    WHERE u.id = NEW.user_id;

    IF COALESCE(should_notify, false) THEN
      INSERT INTO public.notification_queue (user_id, type, payload)
      VALUES (
        NEW.user_id,
        'trade_executed',
        jsonb_build_object(
          'trade_id', NEW.id,
          'side', NEW.side,
          'quantity', NEW.quantity,
          'price', NEW.price,
          'trading_pair', NEW.trading_pair,
          'is_copy', NEW.is_copy,
          'realized_pnl', NEW.realized_pnl
        )
      );
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'trigger_trade_notification skipped: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_trade_update_session
  AFTER INSERT ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_session_state();

CREATE TRIGGER on_trade_notify
  AFTER INSERT ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_trade_notification();
