-- 2026-07-30: Session-livssyklus — 60-min grace, konsolidert vedlikehold, bulk heartbeat
-- V3.2: Økt crash-terskel fra 5→60 min (JokerTrade 15-min cykel + 4x buffer)
-- V3.3: ensure_active_sessions_for_all med last_heartbeat

-- Grace period (60 min — JokerTrade fornyer heartbeat hvert 15. min)
CREATE OR REPLACE FUNCTION public.detect_crashed_sessions()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE trading_sessions
    SET status = 'crashed', updated_at = NOW()
    WHERE status IN ('active', 'paused')
      AND mode = 'paper'
      AND last_heartbeat < NOW() - INTERVAL '60 minutes'
      AND created_at < NOW() - INTERVAL '60 minutes'
      AND archived = FALSE;
END;
$$;

-- Unified session_maintenance — kjører hvert 2. min
CREATE OR REPLACE FUNCTION public.session_maintenance()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  crashed_count int; healed_count int; stopped_count int;
BEGIN
  -- 1. Crash: kun sessions UTEN auto-trading (de er system-eide, ikke bruker-eide)
  UPDATE trading_sessions ts SET status='crashed', updated_at=NOW()
  WHERE ts.status IN ('active','paused') AND ts.mode='paper'
    AND ts.last_heartbeat < NOW() - INTERVAL '60 minutes'
    AND ts.created_at < NOW() - INTERVAL '60 minutes'
    AND ts.archived = FALSE
    AND NOT EXISTS (
      SELECT 1 FROM auto_trading_configs atc
      WHERE atc.user_id = ts.user_id AND atc.is_enabled = true
    );
  GET DIAGNOSTICS crashed_count = ROW_COUNT;

  -- 2. Heal: crashed med nylig heartbeat → gjenopprett (alle brukere)
  UPDATE trading_sessions
  SET status='active', last_heartbeat=NOW(), updated_at=NOW(), stopped_at=NULL
  WHERE status='crashed' AND mode='paper'
    AND last_heartbeat > NOW() - INTERVAL '5 minutes'
    AND archived = FALSE;
  GET DIAGNOSTICS healed_count = ROW_COUNT;

  -- 3. Stop: >24t uten heartbeat (kun ikke-auto-brukere)
  UPDATE trading_sessions ts SET status='stopped', stopped_at=NOW(), updated_at=NOW()
  WHERE ts.status='active' AND ts.mode='paper'
    AND ts.last_heartbeat < NOW() - INTERVAL '24 hours'
    AND ts.archived = FALSE
    AND NOT EXISTS (
      SELECT 1 FROM auto_trading_configs atc
      WHERE atc.user_id = ts.user_id AND atc.is_enabled = true
    );
  GET DIAGNOSTICS stopped_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'crashed', crashed_count, 'healed', healed_count, 'stopped', stopped_count);
END;
$$;

-- Auto-opprett manglende sessions for auto-trading-brukere
CREATE OR REPLACE FUNCTION public.ensure_active_sessions_for_all()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  created_count integer := 0;
BEGIN
  INSERT INTO trading_sessions (user_id, mode, strategy_id, status, trading_pair,
    starting_capital_nok, current_capital_nok, current_capital, initial_capital,
    last_heartbeat, strategy_config)
  SELECT pa.user_id, 'paper', 'cryptopilot', 'active', 'BTCUSDT',
    pa.current_balance::numeric, pa.current_balance::numeric,
    pa.current_balance::numeric, pa.current_balance::numeric,
    NOW(),
    '{"stop_loss_pct":5,"close_on_stop":true}'::jsonb
  FROM paper_accounts pa
  JOIN auto_trading_configs atc ON atc.user_id = pa.user_id AND atc.is_enabled = true
  WHERE pa.current_balance > 0
    AND NOT EXISTS (SELECT 1 FROM trading_sessions ts WHERE ts.user_id = pa.user_id AND ts.status = 'active');
  GET DIAGNOSTICS created_count = ROW_COUNT;
  RETURN created_count;
END;
$$;

-- Deaktiver 3 gamle kaotiske jobber (Task 3)
SELECT cron.unschedule(1160); -- recover-crashed-sessions
SELECT cron.unschedule(1150); -- reactivate-stale-sessions
SELECT cron.unschedule(1145); -- db-monitor-hanging-sessions
SELECT cron.unschedule(1072); -- detect-crashed-sessions (RAW SQL, ingen guard)

-- Én ny jobb — konsolidert vedlikehold, hvert 2. min
SELECT cron.schedule('session-maintenance-v2', '*/2 * * * *', 'SELECT public.session_maintenance()');
