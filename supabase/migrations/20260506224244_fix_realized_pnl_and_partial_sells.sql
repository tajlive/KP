-- ============================================================================
-- Fix: Compute realized_pnl on sell trades + partial sell position tracking
-- Date: 2026-05-06
-- Context: realized_pnl was never set, so winning_trades/losing_trades/total_pnl
--          stayed at 0. Also, selling a partial position incorrectly cleared
--          the entire open_position.
-- ============================================================================

-- 1. BEFORE trigger: compute realized_pnl from open_position on sell
CREATE OR REPLACE FUNCTION public.trigger_compute_realized_pnl()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pos JSONB;
  pos_qty NUMERIC;
  pos_price NUMERIC;
  sell_qty NUMERIC;
BEGIN
  IF NEW.side::text = 'sell' THEN
    SELECT open_position INTO pos
    FROM public.trading_sessions
    WHERE id = NEW.session_id;

    IF pos IS NOT NULL THEN
      pos_qty := COALESCE((pos->>'quantity')::numeric, 0);
      pos_price := COALESCE((pos->>'entry_price')::numeric, 0);
      sell_qty := LEAST(NEW.quantity, pos_qty);

      IF sell_qty > 0 AND pos_price > 0 THEN
        NEW.realized_pnl := (NEW.price - pos_price) * sell_qty - COALESCE(NEW.fee, 0);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS compute_realized_pnl_trigger ON public.trades;
CREATE TRIGGER compute_realized_pnl_trigger
  BEFORE INSERT ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_compute_realized_pnl();

COMMENT ON FUNCTION public.trigger_compute_realized_pnl() IS
  'BEFORE INSERT on trades: computes realized_pnl for sell trades from session open_position (simplified cost basis). Handles partial sells.';

-- 2. Update AFTER trigger to handle partial sells (reduce quantity instead of clearing)
CREATE OR REPLACE FUNCTION public.trigger_update_session_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Update trading_sessions capital ONLY for paper mode.
  IF NEW.mode = 'paper' THEN
    UPDATE public.trading_sessions
    SET
      current_capital = CASE
        WHEN NEW.side::text = 'buy' THEN current_capital - NEW.total_value - COALESCE(NEW.fee, 0)
        WHEN NEW.side::text = 'sell' THEN current_capital + NEW.total_value - COALESCE(NEW.fee, 0)
        ELSE current_capital
      END,
      current_capital_nok = CASE
        WHEN NEW.side::text = 'buy' THEN current_capital_nok - NEW.total_value - COALESCE(NEW.fee, 0)
        WHEN NEW.side::text = 'sell' THEN current_capital_nok + NEW.total_value - COALESCE(NEW.fee, 0)
        ELSE current_capital_nok
      END
    WHERE id = NEW.session_id;
  END IF;

  -- 2. Update position state and trade counters (both paper and live)
  UPDATE public.trading_sessions
  SET
    open_position = CASE
      WHEN NEW.side::text = 'buy' THEN jsonb_build_object(
        'side', 'long',
        'quantity', COALESCE((open_position->>'quantity')::numeric, 0) + NEW.quantity,
        'entry_price', NEW.price,
        'entry_time', NEW.executed_at
      )
      WHEN NEW.side::text = 'sell' THEN CASE
        WHEN COALESCE((open_position->>'quantity')::numeric, 0) - NEW.quantity > 0 THEN jsonb_build_object(
          'side', 'long',
          'quantity', (open_position->>'quantity')::numeric - NEW.quantity,
          'entry_price', open_position->>'entry_price',
          'entry_time', open_position->>'entry_time'
        )
        ELSE NULL
      END
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

  -- 3. SYNC user_profiles.paper_balance = SUM of all active paper sessions
  UPDATE public.user_profiles
  SET paper_balance = COALESCE((
    SELECT SUM(current_capital_nok)
    FROM public.trading_sessions
    WHERE user_id = NEW.user_id
      AND mode = 'paper'
      AND status = 'active'
  ), 0)
  WHERE id = NEW.user_id;

  -- 4. SYNC wallets.balance = SUM of all active sessions (paper + live)
  UPDATE public.wallets
  SET balance = COALESCE((
    SELECT SUM(current_capital_nok)
    FROM public.trading_sessions
    WHERE user_id = NEW.user_id
      AND status = 'active'
  ), 0)
  WHERE user_id = NEW.user_id;

  -- 5. SYNC portfolios.current_balance = SUM of all active sessions (paper + live)
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
  'After INSERT on trades: paper capital from trade values (NOK), live capital via RPC. Tracks partial sells, computes stats from realized_pnl. Syncs balances.';
