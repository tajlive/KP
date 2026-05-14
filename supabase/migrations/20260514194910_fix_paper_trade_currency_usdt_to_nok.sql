-- ============================================================================
-- Migration: Fix paper trade currency — convert USDT values to NOK
-- Date: 2026-05-14
-- Context: Paper trades stored price/total_value/fee in USDT (Binance prices)
--   but trading_sessions.current_capital_nok is in NOK. This caused capital
--   corruption and wrong display numbers. This migration converts all paper
--   trade values from USDT → NOK and re-calculates session capital.
--
-- CRITICAL: Only converts trades where total_value ≈ price * quantity
--   (i.e., both in USDT). execute-trade.ts trades already have total_value
--   in NOK, so they are skipped by the filter.
-- ============================================================================

-- Step 1: Convert paper trades from USDT to NOK
-- Filter: ABS(total_value - price * quantity) < 1 catches pure-USDT trades
-- execute-trade.ts trades have total_value in NOK (≈10.8× larger), so skipped
UPDATE trades
SET
  price = ROUND(price * 10.8, 2),
  total_value = ROUND(total_value * 10.8, 2),
  fee = ROUND(COALESCE(fee, 0) * 10.8, 2),
  realized_pnl = CASE WHEN realized_pnl IS NOT NULL THEN ROUND(realized_pnl * 10.8, 2) ELSE NULL END
WHERE mode = 'paper'
  AND ABS(total_value - price * quantity) < 1;

-- Step 2: Convert paper open_position entry_price from USDT to NOK
UPDATE trading_sessions
SET open_position = jsonb_set(
  open_position,
  '{entry_price}',
  to_jsonb(ROUND((open_position->>'entry_price')::numeric * 10.8, 2))
)
WHERE mode = 'paper'
  AND open_position IS NOT NULL
  AND open_position->>'entry_price' IS NOT NULL;

-- Step 3: Re-calculate current_capital_nok for all paper sessions
-- Net outflow = sum(buy costs) - sum(sell proceeds)
-- Buy cost = total_value + fee (cash out)
-- Sell proceeds = total_value - fee (cash in)
WITH trade_outflows AS (
  SELECT
    session_id,
    SUM(CASE WHEN side = 'buy' THEN total_value + COALESCE(fee, 0) ELSE 0 END) -
    SUM(CASE WHEN side = 'sell' THEN total_value - COALESCE(fee, 0) ELSE 0 END) AS net_outflow
  FROM trades
  WHERE mode = 'paper'
  GROUP BY session_id
)
UPDATE trading_sessions ts
SET
  current_capital_nok = ROUND(GREATEST(0, ts.starting_capital_nok - COALESCE(to.net_outflow, 0)), 2),
  current_capital = ROUND(GREATEST(0, ts.starting_capital_nok - COALESCE(to.net_outflow, 0)), 2),
  updated_at = NOW()
FROM trade_outflows to
WHERE ts.id = to.session_id
  AND ts.mode = 'paper';

-- Step 4: Sync user_profiles.paper_balance to SUM of active paper session capital
UPDATE user_profiles up
SET paper_balance = COALESCE(session_sums.total_capital, 0)
FROM (
  SELECT user_id, SUM(current_capital_nok) AS total_capital
  FROM trading_sessions
  WHERE mode = 'paper' AND status = 'active'
  GROUP BY user_id
) session_sums
WHERE up.id = session_sums.user_id;

-- Step 5: Sync wallets.balance to SUM of all active session capital (paper + live)
UPDATE wallets w
SET balance = COALESCE(session_sums.total_capital, 0)
FROM (
  SELECT user_id, SUM(current_capital_nok) AS total_capital
  FROM trading_sessions
  WHERE status = 'active'
  GROUP BY user_id
) session_sums
WHERE w.user_id = session_sums.user_id;
