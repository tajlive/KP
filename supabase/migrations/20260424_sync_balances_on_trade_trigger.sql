-- legacy-accepted: 8-sifret timestamp, deployet til prod 2026-04. Se AGENTS.md.
-- Migration: Extend trigger_update_session_state to sync paper_balance, wallets, and portfolios
-- Date: 2026-04-24
-- Author: KIMI
-- Context: Users saw different balances across dashboard, portfolio, and trading pages
-- because trades only updated trading_sessions.current_capital_nok but not user_profiles.paper_balance,
-- wallets.balance, or portfolios.current_balance.

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

  -- 2. SYNC user_profiles.paper_balance (dashboard SSR source)
  UPDATE public.user_profiles
  SET paper_balance = (
    SELECT current_capital_nok FROM public.trading_sessions WHERE id = NEW.session_id
  )
  WHERE id = NEW.user_id;

  -- 3. SYNC wallets.balance (portfolio page source)
  UPDATE public.wallets
  SET balance = (
    SELECT current_capital_nok FROM public.trading_sessions WHERE id = NEW.session_id
  )
  WHERE user_id = NEW.user_id;

  -- 4. SYNC portfolios.current_balance (portfolio fallback source)
  UPDATE public.portfolios
  SET current_balance = (
    SELECT current_capital_nok FROM public.trading_sessions WHERE id = NEW.session_id
  )
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trigger_update_session_state() IS
  'After INSERT on trades: updates session capital, position state, stats, AND syncs paper_balance/wallets/portfolios to ensure all pages show identical balances.';
