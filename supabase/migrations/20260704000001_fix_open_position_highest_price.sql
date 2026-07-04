-- ============================================================================
-- Fix: highest_price tracking for open_position trailing stop
-- Date: 2026-07-04
-- Context: DCA trailing stop used open_position.highest_price, but the value
--          was never initialized on buy and never updated when adding to a
--          position. Missing/invalid highest_price caused bogus -89.87% PnL
--          sells because the drop-from-peak calculation divided by 0 or used
--          an undefined peak.
-- Fix:
--   1. On buy: initialize highest_price to the trade price when creating a new
--      position, or update it to the greater of the existing highest_price
--      and the new trade price when adding to a long position.
--   2. On partial sell: preserve highest_price in the remaining position.
--   3. Backfill existing open positions where highest_price is missing or 0.
-- ============================================================================

-- Backfill: ensure every existing open position has a valid highest_price
-- (initialized to entry_price when missing/invalid, never left as 0).
UPDATE public.trading_sessions
SET open_position = jsonb_set(
  open_position,
  '{highest_price}',
  to_jsonb(GREATEST(
    COALESCE((open_position->>'highest_price')::numeric, 0),
    (open_position->>'entry_price')::numeric
  ))
)
WHERE open_position IS NOT NULL
  AND (open_position->>'entry_price')::numeric > 0
  AND (
    open_position->>'highest_price' IS NULL
    OR (open_position->>'highest_price')::numeric <= 0
  );

-- Replace the AFTER trigger to keep highest_price in sync on every trade.
CREATE OR REPLACE FUNCTION public.trigger_update_session_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_highest NUMERIC;
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
      WHEN NEW.side::text = 'buy' THEN (
        SELECT jsonb_set(
          jsonb_build_object(
            'side', 'long',
            'quantity', COALESCE((open_position->>'quantity')::numeric, 0) + NEW.quantity,
            'entry_price', NEW.price,
            'entry_time', NEW.executed_at
          ),
          '{highest_price}',
          to_jsonb(GREATEST(
            COALESCE((open_position->>'highest_price')::numeric, 0),
            NEW.price
          ))
        )
      )
      WHEN NEW.side::text = 'sell' THEN CASE
        WHEN COALESCE((open_position->>'quantity')::numeric, 0) - NEW.quantity > 0 THEN jsonb_build_object(
          'side', 'long',
          'quantity', (open_position->>'quantity')::numeric - NEW.quantity,
          'entry_price', open_position->>'entry_price',
          'entry_time', open_position->>'entry_time',
          'highest_price', open_position->>'highest_price'
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
  'After INSERT on trades: updates session capital, position state, stats, syncs balances, and keeps open_position.highest_price initialized/updated for trailing stop correctness.';
