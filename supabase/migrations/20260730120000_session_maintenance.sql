-- 2026-07-30: Grace period i detect_crashed_sessions + unified session_maintenance
-- Task 2: Sessions yngre enn 15 min crasher ikke lenger
-- Task 3: Én konsolidert vedlikeholdsfunksjon erstatter 4 spretne jobber

-- Task 2: Grace period (15 min)
CREATE OR REPLACE FUNCTION public.detect_crashed_sessions()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE trading_sessions
    SET status = 'crashed', updated_at = NOW()
    WHERE status IN ('active', 'paused')
      AND mode = 'paper'
      AND last_heartbeat < NOW() - INTERVAL '5 minutes'
      AND created_at < NOW() - INTERVAL '15 minutes'
      AND archived = FALSE;
    PERFORM alert_stalled_sessions();
END;
$$;

-- Task 3: Unified session_maintenance
CREATE OR REPLACE FUNCTION public.session_maintenance()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  crashed_count int; healed_count int; stopped_count int;
BEGIN
  UPDATE trading_sessions SET status='crashed', updated_at=NOW()
  WHERE status IN ('active','paused') AND mode='paper'
    AND last_heartbeat < NOW() - INTERVAL '5 minutes'
    AND created_at < NOW() - INTERVAL '15 minutes'
    AND archived = FALSE;
  GET DIAGNOSTICS crashed_count = ROW_COUNT;

  UPDATE trading_sessions
  SET status='active', last_heartbeat=NOW(), updated_at=NOW(), stopped_at=NULL
  WHERE status='crashed' AND mode='paper'
    AND last_heartbeat > NOW() - INTERVAL '5 minutes'
    AND archived = FALSE;
  GET DIAGNOSTICS healed_count = ROW_COUNT;

  UPDATE trading_sessions
  SET status='stopped', stopped_at=NOW(), updated_at=NOW()
  WHERE status='active' AND mode='paper'
    AND last_heartbeat < NOW() - INTERVAL '24 hours'
    AND archived = FALSE;
  GET DIAGNOSTICS stopped_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'crashed', crashed_count, 'healed', healed_count, 'stopped', stopped_count);
END;
$$;

-- Deaktiver 3 gamle jobber
SELECT cron.unschedule(1160); -- recover-crashed-sessions
SELECT cron.unschedule(1150); -- reactivate-stale-sessions
SELECT cron.unschedule(1145); -- db-monitor-hanging-sessions

-- Én ny jobb
SELECT cron.schedule('session-maintenance-v2', '*/2 * * * *', 'SELECT public.session_maintenance()');
