-- Migration: Legg til copy_source_session_id i trading_sessions
-- Trengs av mirrorTradeToFollowers i cron/tick for å finne follower-sesjoner
-- Refererer direkte til leder-sesjonen (session-til-session kobling)

ALTER TABLE public.trading_sessions
  ADD COLUMN IF NOT EXISTS copy_source_session_id uuid
    REFERENCES public.trading_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_trading_sessions_copy_source
  ON public.trading_sessions(copy_source_session_id)
  WHERE copy_source_session_id IS NOT NULL;

COMMENT ON COLUMN public.trading_sessions.copy_source_session_id IS
  'FK til leder-sesjon for copy trading. NULL = ikke en kopi-sesjon.';
