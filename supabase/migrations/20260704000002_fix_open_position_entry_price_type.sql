-- ============================================================================
-- Fix: store open_position.entry_price as a JSON number, not a JSON string.
-- Date: 2026-07-04
-- Context: The previous trigger recreation in 20260704000001 used
--          open_position->>'entry_price' in the partial-sell branch, which
--          returns text. jsonb_build_object then stores it as a JSON string.
--          Downstream code that expects a numeric entry_price fails with
--          "Invalid trade price" during paper auto-trades.
-- Fix:
--   1. Recreate trigger_update_session_state and cast (open_position->>'entry_price')::numeric
--      before passing it to jsonb_build_object in the partial-sell branch.
--   2. Explicitly cast NEW.price::numeric in the buy branch for documentation/defensive parity.
--   3. Backfill existing rows where jsonb_typeof(open_position->'entry_price') = 'string'.
-- ============================================================================

-- Backfill: convert any open_position.entry_price / highest_price stored as JSON string to a JSON number.
UPDATE public.trading_sessions
SET open_position = jsonb_set(
  jsonb_set(
    open_position,
    '{entry_price}',
    to_jsonb((open_position->>'entry_price')::numeric)
  ),
  '{highest_price}',
  to_jsonb(COALESCE((open_position->>'highest_price')::numeric, 0))
)
WHERE open_position IS NOT NULL
  AND (
    jsonb_typeof(open_position->'entry_price') = 'string'
    OR jsonb_typeof(open_position->'highest_price') = 'string'
  );

-- Replace the AFTER trigger so entry_price is always stored as a JSON number.
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
            'entry_price', NEW.price::numeric,
            'entry_time', NEW.executed_at
          ),
          '{highest_price}',
          to_jsonb(GREATEST(
            COALESCE((open_position->>'highest_price')::numeric, 0),
            NEW.price::numeric
          ))
        )
      )
      WHEN NEW.side::text = 'sell' THEN CASE
        WHEN COALESCE((open_position->>'quantity')::numeric, 0) - NEW.quantity > 0 THEN jsonb_build_object(
          'side', 'long',
          'quantity', (open_position->>'quantity')::numeric - NEW.quantity,
          'entry_price', (open_position->>'entry_price')::numeric,
          'entry_time', open_position->>'entry_time',
          'highest_price', (open_position->>'highest_price')::numeric
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
  'After INSERT on trades: updates session capital, position state, stats, syncs balances, and keeps open_position.entry_price stored as a JSON number (not a JSON string).';