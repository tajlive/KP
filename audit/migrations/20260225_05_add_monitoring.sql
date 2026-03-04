-- ============================================================================
-- MIGRATION: Add monitoring and alerting
-- Date: 2026-02-25
-- Author: KIMI Audit
-- ============================================================================
-- Purpose: Fix silent failures with proper monitoring
-- Risk: LOW - Adds observability only
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Create monitoring events table
-- ============================================================================
CREATE TABLE IF NOT EXISTS monitoring_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'cron_tick_started',
    'cron_tick_completed', 
    'cron_tick_failed',
    'cron_tick_timeout',
    'session_processed',
    'session_error',
    'trade_executed',
    'trade_failed',
    'trade_blocked_risk',
    'risk_violation',
    'system_error'
  )),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
  component TEXT NOT NULL, -- e.g., 'cron_tick', 'paper_trading', 'risk_manager'
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id UUID,
  trade_id UUID,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  duration_ms INTEGER, -- For performance tracking
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monitoring_events_type 
  ON monitoring_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_monitoring_events_severity 
  ON monitoring_events (severity, created_at DESC) 
  WHERE severity IN ('error', 'critical', 'warning');

CREATE INDEX IF NOT EXISTS idx_monitoring_events_component 
  ON monitoring_events (component, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_monitoring_events_user 
  ON monitoring_events (user_id, created_at DESC);

-- Enable RLS
ALTER TABLE monitoring_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
  ON monitoring_events FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users can view own events"
  ON monitoring_events FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 2: Create function to log monitoring events
-- ============================================================================
CREATE OR REPLACE FUNCTION log_monitoring_event(
  p_event_type TEXT,
  p_component TEXT,
  p_message TEXT,
  p_severity TEXT DEFAULT 'info',
  p_user_id UUID DEFAULT NULL,
  p_session_id UUID DEFAULT NULL,
  p_trade_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_duration_ms INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO monitoring_events (
    event_type,
    severity,
    component,
    user_id,
    session_id,
    trade_id,
    message,
    metadata,
    duration_ms
  ) VALUES (
    p_event_type,
    p_severity,
    p_component,
    p_user_id,
    p_session_id,
    p_trade_id,
    p_message,
    p_metadata,
    p_duration_ms
  )
  RETURNING id INTO v_event_id;
  
  -- Also send notification for critical errors
  IF p_severity IN ('error', 'critical') THEN
    PERFORM pg_notify('monitoring_alert', json_build_object(
      'event_id', v_event_id,
      'type', p_event_type,
      'severity', p_severity,
      'component', p_component,
      'message', p_message
    )::text);
  END IF;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 3: Create health check view
-- ============================================================================
CREATE OR REPLACE VIEW trading_health_check AS
WITH session_stats AS (
  SELECT 
    COUNT(*) FILTER (WHERE status = 'active') as active_sessions,
    COUNT(*) FILTER (WHERE status = 'crashed') as crashed_sessions,
    COUNT(*) FILTER (WHERE last_heartbeat < NOW() - INTERVAL '5 minutes' AND status = 'active') as stale_sessions,
    AVG(EXTRACT(EPOCH FROM (NOW() - last_heartbeat))) FILTER (WHERE status = 'active') as avg_heartbeat_age_seconds
  FROM trading_sessions
),
trade_stats AS (
  SELECT 
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as trades_last_hour,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as trades_last_24h,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_trades
  FROM trades
),
error_stats AS (
  SELECT 
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as errors_last_hour,
    COUNT(*) FILTER (WHERE severity = 'critical' AND created_at > NOW() - INTERVAL '24 hours') as critical_errors_24h
  FROM monitoring_events
)
SELECT 
  NOW() as check_time,
  s.active_sessions,
  s.crashed_sessions,
  s.stale_sessions,
  ROUND(s.avg_heartbeat_age_seconds::numeric, 2) as avg_heartbeat_age_seconds,
  t.trades_last_hour,
  t.trades_last_24h,
  t.failed_trades,
  e.errors_last_hour,
  e.critical_errors_24h,
  CASE 
    WHEN s.stale_sessions > 5 THEN 'critical'
    WHEN e.critical_errors_24h > 10 THEN 'critical'
    WHEN s.crashed_sessions > 0 THEN 'warning'
    WHEN t.failed_trades > 10 THEN 'warning'
    ELSE 'healthy'
  END as overall_status
FROM session_stats s, trade_stats t, error_stats e;

-- ============================================================================
-- STEP 4: Create alerting function
-- ============================================================================
CREATE OR REPLACE FUNCTION check_trading_health()
RETURNS TABLE (
  alert_type TEXT,
  severity TEXT,
  message TEXT,
  details JSONB
) AS $$
DECLARE
  v_stale_count INTEGER;
  v_crashed_count INTEGER;
  v_error_count INTEGER;
  v_no_trades_hours INTEGER;
BEGIN
  -- Check for stale sessions
  SELECT COUNT(*) INTO v_stale_count
  FROM trading_sessions
  WHERE status = 'active' 
  AND last_heartbeat < NOW() - INTERVAL '5 minutes';
  
  IF v_stale_count > 0 THEN
    RETURN QUERY SELECT 
      'stale_sessions'::TEXT,
      'warning'::TEXT,
      format('%s sessions have stale heartbeats', v_stale_count),
      (SELECT jsonb_agg(jsonb_build_object('id', id, 'user_id', user_id, 'last_heartbeat', last_heartbeat))
       FROM trading_sessions
       WHERE status = 'active' AND last_heartbeat < NOW() - INTERVAL '5 minutes');
  END IF;
  
  -- Check for crashed sessions
  SELECT COUNT(*) INTO v_crashed_count
  FROM trading_sessions
  WHERE status = 'crashed';
  
  IF v_crashed_count > 0 THEN
    RETURN QUERY SELECT 
      'crashed_sessions'::TEXT,
      'error'::TEXT,
      format('%s sessions are crashed', v_crashed_count),
      (SELECT jsonb_agg(jsonb_build_object('id', id, 'user_id', user_id))
       FROM trading_sessions
       WHERE status = 'crashed');
  END IF;
  
  -- Check for errors in last hour
  SELECT COUNT(*) INTO v_error_count
  FROM monitoring_events
  WHERE severity IN ('error', 'critical')
  AND created_at > NOW() - INTERVAL '1 hour';
  
  IF v_error_count > 10 THEN
    RETURN QUERY SELECT 
      'high_error_rate'::TEXT,
      'error'::TEXT,
      format('%s errors in last hour', v_error_count),
      jsonb_build_object('error_count', v_error_count);
  END IF;
  
  -- Check if no trades in last 6 hours (during market hours)
  SELECT COUNT(*) INTO v_no_trades_hours
  FROM trades
  WHERE created_at > NOW() - INTERVAL '6 hours';
  
  IF v_no_trades_hours = 0 THEN
    RETURN QUERY SELECT 
      'no_recent_trades'::TEXT,
      'warning'::TEXT,
      'No trades executed in last 6 hours',
      jsonb_build_object('last_trade_check', NOW());
  END IF;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 5: Schedule health checks
-- ============================================================================
SELECT cron.schedule(
  'trading-health-check',
  '*/5 * * * *',  -- Every 5 minutes
  $$
    INSERT INTO monitoring_events (event_type, severity, component, message, metadata)
    SELECT 
      'health_check',
      severity,
      'health_monitor',
      message,
      details
    FROM check_trading_health()
  $$
);

-- ============================================================================
-- STEP 6: Create performance metrics table
-- ============================================================================
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  unit TEXT,
  labels JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_name_time 
  ON performance_metrics (metric_name, recorded_at DESC);

-- Enable RLS
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
  ON performance_metrics FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- STEP 7: Create function to record metrics
-- ============================================================================
CREATE OR REPLACE FUNCTION record_metric(
  p_name TEXT,
  p_value NUMERIC,
  p_unit TEXT DEFAULT NULL,
  p_labels JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO performance_metrics (metric_name, metric_value, unit, labels)
  VALUES (p_name, p_value, p_unit, p_labels);
  
  -- Clean up old metrics (keep 30 days)
  DELETE FROM performance_metrics
  WHERE recorded_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 8: Create view for common metrics dashboard
-- ============================================================================
CREATE OR REPLACE VIEW metrics_dashboard AS
SELECT 
  'active_sessions' as metric,
  COUNT(*)::numeric as value,
  'count' as unit,
  NOW() as recorded_at
FROM trading_sessions WHERE status = 'active'

UNION ALL

SELECT 
  'trades_last_hour',
  COUNT(*)::numeric,
  'count',
  NOW()
FROM trades WHERE created_at > NOW() - INTERVAL '1 hour'

UNION ALL

SELECT 
  'avg_cron_duration_ms',
  AVG(duration_ms)::numeric,
  'milliseconds',
  NOW()
FROM monitoring_events 
WHERE event_type = 'cron_tick_completed' 
AND created_at > NOW() - INTERVAL '24 hours'

UNION ALL

SELECT 
  'error_rate_1h',
  (COUNT(*) FILTER (WHERE severity IN ('error', 'critical'))::numeric / 
   NULLIF(COUNT(*), 0) * 100),
  'percent',
   NOW()
FROM monitoring_events 
WHERE created_at > NOW() - INTERVAL '1 hour';

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
/*
-- Test monitoring
SELECT log_monitoring_event(
  'system_error',
  'test',
  'Test error message',
  'error',
  NULL, NULL, NULL,
  jsonb_build_object('test', true)
);

-- View health check
SELECT * FROM trading_health_check;

-- View recent alerts
SELECT * FROM check_trading_health();

-- View metrics dashboard
SELECT * FROM metrics_dashboard;

-- View recent events
SELECT * FROM monitoring_events 
ORDER BY created_at DESC 
LIMIT 20;
*/
