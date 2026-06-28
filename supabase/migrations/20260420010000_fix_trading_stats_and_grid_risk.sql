-- legacy-accepted: 8-sifret timestamp, deployet til prod 2026-04. Se AGENTS.md.
-- ============================================================
-- 2026-04-20: Fix pg_net schema reference in klarpakke_trigger_cron
--
-- Problem: pg_net extension installs in 'public' schema but
--          http_post lives in 'net' schema. The function used
--          pg_net.http_post which does not exist.
--          All 14 cron jobs were failing with:
--          "ERROR: schema pg_net does not exist"
-- ============================================================

CREATE OR REPLACE FUNCTION public.klarpakke_trigger_cron(path TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url    TEXT;
  v_secret TEXT;
BEGIN
  -- 1. Prøv Vault først (persistert, overlever restart)
  SELECT decrypted_secret INTO v_url
  FROM vault.decrypted_secrets
  WHERE name = 'VERCEL_APP_URL'
  LIMIT 1;

  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'CRON_SECRET'
  LIMIT 1;

  -- 2. Fallback til current_setting (bakoverkompatibilitet)
  IF v_url IS NULL OR v_url = '' THEN
    v_url := current_setting('app.vercel_url', true);
  END IF;

  IF v_secret IS NULL OR v_secret = '' THEN
    v_secret := current_setting('app.cron_secret', true);
  END IF;

  -- 3. Guard: ikke kjør uten config
  IF v_url IS NULL OR v_url = '' THEN
    RAISE WARNING 'klarpakke_trigger_cron: VERCEL_APP_URL mangler (Vault + current_setting). Hopper over %', path;
    RETURN;
  END IF;

  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE WARNING 'klarpakke_trigger_cron: CRON_SECRET mangler (Vault + current_setting). Hopper over %', path;
    RETURN;
  END IF;

  -- 4. Send HTTP POST via net (RIKTIG schema — pg_net extension er i public,
  --    men http_post funksjonen ligger i net schema)
  PERFORM net.http_post(
    url     := v_url || path,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_secret,
      'Content-Type',  'application/json',
      'User-Agent',    'Supabase-pg_cron/1.1'
    ),
    body    := jsonb_build_object(
      'source', 'pg_cron',
      'triggered_at', NOW()
    )
  );
END;
$$;

-- ============================================================
-- 2026-04-20: Fix trading_stats backfill + grid risk config
-- ============================================================

-- 1. Backfill trading_stats from existing trades
-- This populates the currently-empty trading_stats table
INSERT INTO trading_stats (
  user_id,
  total_trades,
  winning_trades,
  total_pnl,
  best_trade,
  worst_trade,
  updated_at
)
SELECT
  user_id,
  COUNT(*)::integer AS total_trades,
  COUNT(*) FILTER (WHERE realized_pnl > 0)::integer AS winning_trades,
  COALESCE(SUM(realized_pnl), 0) AS total_pnl,
  COALESCE(MAX(realized_pnl), 0) AS best_trade,
  COALESCE(MIN(realized_pnl), 0) AS worst_trade,
  NOW() AS updated_at
FROM trades
WHERE user_id IS NOT NULL
GROUP BY user_id
ON CONFLICT (user_id)
DO UPDATE SET
  total_trades = EXCLUDED.total_trades,
  winning_trades = EXCLUDED.winning_trades,
  total_pnl = EXCLUDED.total_pnl,
  best_trade = EXCLUDED.best_trade,
  worst_trade = EXCLUDED.worst_trade,
  updated_at = EXCLUDED.updated_at;

-- 2. Create function to maintain trading_stats on new trade
CREATE OR REPLACE FUNCTION update_trading_stats_on_trade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_trades INTEGER;
  v_winning_trades INTEGER;
  v_total_pnl NUMERIC;
  v_best_trade NUMERIC;
  v_worst_trade NUMERIC;
BEGIN
  -- Recalculate stats for this user
  SELECT
    COUNT(*)::integer,
    COUNT(*) FILTER (WHERE realized_pnl > 0)::integer,
    COALESCE(SUM(realized_pnl), 0),
    COALESCE(MAX(realized_pnl), 0),
    COALESCE(MIN(realized_pnl), 0)
  INTO
    v_total_trades,
    v_winning_trades,
    v_total_pnl,
    v_best_trade,
    v_worst_trade
  FROM trades
  WHERE user_id = NEW.user_id;

  -- Upsert into trading_stats
  INSERT INTO trading_stats (
    user_id,
    total_trades,
    winning_trades,
    total_pnl,
    best_trade,
    worst_trade,
    updated_at
  )
  VALUES (
    NEW.user_id,
    v_total_trades,
    v_winning_trades,
    v_total_pnl,
    v_best_trade,
    v_worst_trade,
    NOW()
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_trades = EXCLUDED.total_trades,
    winning_trades = EXCLUDED.winning_trades,
    total_pnl = EXCLUDED.total_pnl,
    best_trade = EXCLUDED.best_trade,
    worst_trade = EXCLUDED.worst_trade,
    updated_at = EXCLUDED.updated_at;

  RETURN NEW;
END;
$$;

-- 3. Attach trigger to trades table (idempotent)
DROP TRIGGER IF EXISTS maintain_trading_stats ON trades;
CREATE TRIGGER maintain_trading_stats
  AFTER INSERT OR UPDATE OF realized_pnl ON trades
  FOR EACH ROW
  EXECUTE FUNCTION update_trading_stats_on_trade();

-- 4. Update existing grid sessions with proper risk_config
-- Merge risk_config into strategy_config so tick cron respects user settings
UPDATE trading_sessions
SET strategy_config = COALESCE(strategy_config, '{}'::jsonb) || jsonb_build_object(
  'risk_config', jsonb_build_object(
    'maxPositionSizePercent', 10,
    'stopLossPercent', 1,
    'trailingStopLossPercent', 1.5,
    'maxDailyLossPercent', 5,
    'maxDailyTrades', 10,
    'maxDrawdownPercent', 15,
    'maxLeverage', 1
  )
)
WHERE strategy_id = 'grid'
  AND status = 'active'
  AND (strategy_config IS NULL OR (strategy_config->'risk_config') IS NULL);
