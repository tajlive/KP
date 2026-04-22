-- Migration: Fix trading pipeline after legacy tables dropped
-- Date: 2026-04-22
--
-- 20260422_drop_legacy_trading_tables.sql dropped paper_trading_sessions,
-- auto_trades, auto_trading_trades, and live_trades. This migration cleans
-- up remaining references so the unified schema (trading_sessions + trades)
-- works end-to-end.

-- ═══════════════════════════════════════════════════════════
-- 1. Unschedule legacy cron that calls broken edge function
-- ═══════════════════════════════════════════════════════════

-- The old auto-trading-every-5-min cron (from 20260307230000_add_supabase_cron_jobs.sql)
-- points directly to the auto-trade Edge Function which still references
-- paper_trading_sessions. Remove it so only the Next.js routes (tick + auto-trade)
-- run via pg_cron.
DO $$
BEGIN
  PERFORM cron.unschedule('auto-trading-every-5-min');
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not unschedule auto-trading-every-5-min: %', SQLERRM;
END $$;

-- ═══════════════════════════════════════════════════════════
-- 2. Fix create_default_user_data() trigger — use trading_sessions
-- ═══════════════════════════════════════════════════════════

-- The trigger on auth.users calls create_default_user_data() which still
-- INSERTs into the dropped paper_trading_sessions table. Replace the
-- function body to use trading_sessions (unified schema) instead.
CREATE OR REPLACE FUNCTION create_default_user_data()
RETURNS TRIGGER AS $$
DECLARE
  new_id UUID := gen_random_uuid();
BEGIN
  -- Create user_profiles (canonical user record)
  INSERT INTO public.user_profiles (
    id, user_id, display_name, email_on_trade, email_on_crash, email_daily_digest,
    tier, role, provider, locale, created_at, updated_at
  )
  VALUES (
    new_id,
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name',
             split_part(NEW.email, '@', 1), 'Trader'),
    true, true, true,
    'free', 'user',
    COALESCE(NEW.raw_user_meta_data->>'provider', 'email'),
    COALESCE(NEW.raw_user_meta_data->>'locale', 'no'),
    NOW(), NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Create user_settings
  INSERT INTO user_settings (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;

  -- Create user_notification_settings
  INSERT INTO user_notification_settings (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;

  -- Create paper trading session using unified schema
  INSERT INTO trading_sessions (
    user_id, trading_pair, mode, strategy_id, status,
    starting_capital_nok, current_capital_nok, initial_capital, current_capital,
    total_trades, winning_trades, losing_trades, total_pnl,
    strategy_config, started_at, last_heartbeat
  )
  VALUES (
    NEW.id, 'BTCUSDT', 'paper', 'manual', 'active',
    100000, 100000, 100000, 100000,
    0, 0, 0, 0,
    '{}', NOW(), NOW()
  )
  ON CONFLICT DO NOTHING;

  -- Create default risk profiles
  INSERT INTO risk_profiles (user_id, name, max_position_size_pct, stop_loss_pct,
                             max_total_exposure_pct, is_active) VALUES
    (NEW.id, 'forsiktig', 2.0, 3.0, 5.0, true),
    (NEW.id, 'moderat', 5.0, 5.0, 15.0, false),
    (NEW.id, 'aggressiv', 10.0, 10.0, 30.0, false)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════
-- 3. Ensure unified tables have required indexes for edge functions
-- ═══════════════════════════════════════════════════════════

-- Index used by auto-trade edge function when looking up active sessions
CREATE INDEX IF NOT EXISTS idx_trading_sessions_user_status
ON trading_sessions(user_id, status)
WHERE status = 'active';

-- Index used by auto-trade edge function for open position counting
CREATE INDEX IF NOT EXISTS idx_trades_open_positions
ON trades(symbol, side, status)
WHERE side = 'buy' AND status = 'filled';
