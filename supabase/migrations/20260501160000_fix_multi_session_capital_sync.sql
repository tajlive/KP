-- ============================================================================
-- Fix: Multi-session capital sync overwrite
-- Date: 2026-05-01
-- Context: trigger_update_session_state overwrote user_profiles.paper_balance,
-- wallets.balance, and portfolios.current_balance with a SINGLE session's
-- capital. Users with multiple bots saw wrong balances.
-- Fix: SUM across all active sessions for the user.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_update_session_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Update trading_sessions (source of truth for session capital)
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

  -- 2. SYNC user_profiles.paper_balance = SUM of all active paper sessions
  UPDATE public.user_profiles
  SET paper_balance = COALESCE((
    SELECT SUM(current_capital_nok)
    FROM public.trading_sessions
    WHERE user_id = NEW.user_id
      AND mode = 'paper'
      AND status = 'active'
  ), 0)
  WHERE id = NEW.user_id;

  -- 3. SYNC wallets.balance = SUM of all active sessions (paper + live)
  UPDATE public.wallets
  SET balance = COALESCE((
    SELECT SUM(current_capital_nok)
    FROM public.trading_sessions
    WHERE user_id = NEW.user_id
      AND status = 'active'
  ), 0)
  WHERE user_id = NEW.user_id;

  -- 4. SYNC portfolios.current_balance = SUM of all active sessions (paper + live)
  UPDATE public.portfolios
  SET current_balance = COALESCE((
    SELECT SUM(current_capital_nok)
    FROM public.trading_sessions
    WHERE user_id = NEW.user_id
      AND status = 'active'
  ), 0)
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trigger_update_session_state() IS
  'After INSERT on trades: updates session capital, position state, stats, AND syncs paper_balance/wallets/portfolios to SUM of all active sessions. Fixes multi-session overwrite bug.';
