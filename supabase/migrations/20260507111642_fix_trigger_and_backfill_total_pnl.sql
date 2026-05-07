-- ============================================================================
-- Fix: trigger_update_session_state + backfill total_pnl
-- Date: 2026-05-07
-- Context: trading_sessions.total_pnl is 0 for most sessions because the
--   trigger only increments it when trades.realized_pnl is set. Most trade
--   insertion paths (execute-trade.ts, paper-trading, etc.) did not set
--   realized_pnl. This migration:
--   1. Fixes the trigger to compute a fallback realized_pnl for sell trades
--      when not provided, using the session's open_position entry_price.
--   2. Backfills total_pnl for ALL existing sessions from capital diff.
--   3. Backfills winning_trades/losing_trades from trades with realized_pnl.
-- ============================================================================

-- ============================================================================
-- 1. Backfill total_pnl from capital diff for all existing sessions
-- ============================================================================
UPDATE trading_sessions
SET total_pnl = COALESCE(current_capital_nok, current_capital, 0) - COALESCE(starting_capital_nok, initial_capital, 0)
WHERE total_pnl = 0
  AND COALESCE(current_capital_nok, current_capital, 0) != COALESCE(starting_capital_nok, initial_capital, 0);

-- ============================================================================
-- 2. Backfill winning_trades / losing_trades from trades table
--    Only for sessions where these are 0 but trades with realized_pnl exist.
-- ============================================================================
DO $$
BEGIN
  UPDATE trading_sessions s
  SET winning_trades = t.win_count,
      losing_trades = t.loss_count
  FROM (
    SELECT session_id,
           COUNT(*) FILTER (WHERE realized_pnl > 0) AS win_count,
           COUNT(*) FILTER (WHERE realized_pnl < 0) AS loss_count
    FROM trades
    WHERE realized_pnl IS NOT NULL
    GROUP BY session_id
  ) t
  WHERE s.id = t.session_id
    AND s.winning_trades = 0
    AND s.losing_trades = 0
    AND (t.win_count > 0 OR t.loss_count > 0);
END $$;

-- ============================================================================
-- 3. Fix trigger: compute fallback realized_pnl for sell trades
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_update_session_state()
RETURNS TRIGGER AS $$
DECLARE
  v_entry_price NUMERIC;
  v_position_qty NUMERIC;
  v_matched_qty NUMERIC;
  v_computed_pnl NUMERIC;
BEGIN
  -- Compute fallback realized_pnl for trades that don't provide it
  IF NEW.realized_pnl IS NOT NULL THEN
    v_computed_pnl := NEW.realized_pnl;
  ELSIF NEW.side = 'sell' THEN
    -- Try to compute from session's open_position
    SELECT
      (open_position->>'entry_price')::numeric,
      (open_position->>'quantity')::numeric
    INTO v_entry_price, v_position_qty
    FROM trading_sessions
    WHERE id = NEW.session_id;

    IF v_entry_price IS NOT NULL AND v_entry_price > 0 AND v_position_qty IS NOT NULL AND v_position_qty > 0 THEN
      v_matched_qty := LEAST(NEW.quantity, v_position_qty);
      v_computed_pnl := ROUND(((NEW.price - v_entry_price) * v_matched_qty - COALESCE(NEW.fee, 0))::numeric, 2);
    ELSE
      v_computed_pnl := 0;
    END IF;
  ELSE
    v_computed_pnl := 0;
  END IF;

  UPDATE trading_sessions
  SET
    current_capital = CASE
      WHEN NEW.side = 'buy' THEN current_capital - NEW.total_value - COALESCE(NEW.fee, 0)
      WHEN NEW.side = 'sell' THEN current_capital + NEW.total_value - COALESCE(NEW.fee, 0)
      ELSE current_capital
    END,
    open_position = CASE
      WHEN NEW.side = 'buy' THEN jsonb_build_object(
        'side', 'long',
        'quantity', NEW.quantity,
        'entry_price', NEW.price,
        'entry_time', NEW.executed_at
      )
      WHEN NEW.side = 'sell' THEN NULL
      ELSE open_position
    END,
    total_trades = total_trades + 1,
    winning_trades = CASE
      WHEN v_computed_pnl > 0 THEN winning_trades + 1
      ELSE winning_trades
    END,
    losing_trades = CASE
      WHEN v_computed_pnl < 0 THEN losing_trades + 1
      ELSE losing_trades
    END,
    total_pnl = total_pnl + v_computed_pnl,
    last_tick_at = now(),
    updated_at = now()
  WHERE id = NEW.session_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. Fix trade notification trigger to use computed P&L
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_trade_notification()
RETURNS TRIGGER AS $$
DECLARE
  should_notify BOOLEAN;
  v_computed_pnl NUMERIC;
BEGIN
  SELECT email_on_trade INTO should_notify
  FROM user_profiles WHERE id = NEW.user_id;

  -- Use the realized_pnl if set, otherwise 0
  v_computed_pnl := COALESCE(NEW.realized_pnl, 0);

  IF should_notify THEN
    INSERT INTO notification_queue (user_id, type, payload)
    VALUES (NEW.user_id, 'trade_executed', jsonb_build_object(
      'trade_id', NEW.id,
      'side', NEW.side,
      'quantity', NEW.quantity,
      'price', NEW.price,
      'trading_pair', NEW.trading_pair,
      'is_copy', NEW.is_copy,
      'realized_pnl', v_computed_pnl
    ));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION trigger_update_session_state() IS
  'Updates trading_sessions after a trade. Computes fallback realized_pnl for sell trades using open_position entry_price when not provided by the caller.';
