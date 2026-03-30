-- ═══════════════════════════════════════════════════════════════
-- KLARPAKKE — Monitoring & Alerting Tables
-- Post-launch monitoring infrastruktur
-- ═══════════════════════════════════════════════════════════════

-- 1. Webhook Events Logging Table
-- Logger alle innkommende Stripe webhook events
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    stripe_event_id TEXT UNIQUE NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ,
    status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed', 'error')),
    processing_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indekser for webhook_events
CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON webhook_events(type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_received_at ON webhook_events(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processing_time ON webhook_events(processing_time_ms) 
    WHERE processing_time_ms > 3000;

-- RLS policies for webhook_events
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Webhook events are viewable by admins only" 
    ON webhook_events FOR SELECT 
    TO authenticated 
    USING (auth.jwt() ->> 'role' = 'admin');

-- 2. Monitoring Alerts Table
-- Lagrer alle alerts fra monitoring systemet
CREATE TABLE IF NOT EXISTS monitoring_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
    category TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indekser for monitoring_alerts
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_severity ON monitoring_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_category ON monitoring_alerts(category);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_created_at ON monitoring_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_unacknowledged ON monitoring_alerts(created_at DESC) 
    WHERE acknowledged_at IS NULL;

-- RLS policies for monitoring_alerts
ALTER TABLE monitoring_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alerts are viewable by admins only" 
    ON monitoring_alerts FOR SELECT 
    TO authenticated 
    USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can acknowledge alerts" 
    ON monitoring_alerts FOR UPDATE 
    TO authenticated 
    USING (auth.jwt() ->> 'role' = 'admin');

-- 3. Health Check Metrics Table
-- Historisk data fra health checks
CREATE TABLE IF NOT EXISTS health_check_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    overall_status TEXT NOT NULL CHECK (overall_status IN ('healthy', 'degraded', 'unhealthy')),
    database_latency_ms INTEGER,
    database_status TEXT,
    trading_signals_status TEXT,
    trading_signals_latency_ms INTEGER,
    kv_status TEXT,
    kv_latency_ms INTEGER,
    environment_status TEXT,
    version TEXT,
    uptime_seconds INTEGER,
    raw_response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indekser for health_check_metrics
CREATE INDEX IF NOT EXISTS idx_health_metrics_timestamp ON health_check_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_health_metrics_status ON health_check_metrics(overall_status);
CREATE INDEX IF NOT EXISTS idx_health_metrics_unhealthy ON health_check_metrics(timestamp DESC) 
    WHERE overall_status != 'healthy';

-- RLS policies for health_check_metrics
ALTER TABLE health_check_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Health metrics are viewable by authenticated users" 
    ON health_check_metrics FOR SELECT 
    TO authenticated 
    USING (true);

-- 4. Auto Trade Failure Alert Function
-- Trigger-funksjon som oppretter alert ved for mange feilede trades
CREATE OR REPLACE FUNCTION check_auto_trade_failures()
RETURNS TRIGGER AS $$
DECLARE
    failure_count INTEGER;
BEGIN
    -- Tell feilede trades siste time
    SELECT COUNT(*) INTO failure_count
    FROM auto_trade_log
    WHERE status = 'failed'
      AND created_at > now() - interval '1 hour';
    
    -- Hvis mer enn 10 feil, opprett alert
    IF failure_count > 10 THEN
        INSERT INTO monitoring_alerts (severity, category, message, metadata)
        VALUES (
            'critical',
            'auto_trade_failures',
            format('Auto trade failures exceeded threshold: %s failed trades in last hour', failure_count),
            jsonb_build_object(
                'failure_count', failure_count,
                'threshold', 10,
                'window', '1 hour',
                'latest_error', NEW.error_message
            )
        )
        ON CONFLICT DO NOTHING; -- Unngå duplikater
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS auto_trade_failure_alert ON auto_trade_log;

-- Opprett trigger på auto_trade_log
CREATE TRIGGER auto_trade_failure_alert
    AFTER INSERT ON auto_trade_log
    FOR EACH ROW
    WHEN (NEW.status = 'failed')
    EXECUTE FUNCTION check_auto_trade_failures();

-- 5. Webhook Slow Processing Alert Function
-- Funksjon som sjekker webhook processing time
CREATE OR REPLACE FUNCTION check_webhook_performance()
RETURNS TRIGGER AS $$
BEGIN
    -- Alert hvis processing time > 3000ms (3 sekunder)
    IF NEW.processing_time_ms > 3000 THEN
        INSERT INTO monitoring_alerts (severity, category, message, metadata)
        VALUES (
            'warning',
            'webhook_performance',
            format('Stripe webhook %s took %sms to process', NEW.type, NEW.processing_time_ms),
            jsonb_build_object(
                'event_type', NEW.type,
                'event_id', NEW.stripe_event_id,
                'processing_time_ms', NEW.processing_time_ms,
                'threshold_ms', 3000
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS webhook_performance_alert ON webhook_events;

-- Opprett trigger på webhook_events
CREATE TRIGGER webhook_performance_alert
    AFTER UPDATE OF processing_time_ms ON webhook_events
    FOR EACH ROW
    WHEN (NEW.processing_time_ms > 3000)
    EXECUTE FUNCTION check_webhook_performance();

-- 6. View for aktive alerts
CREATE OR REPLACE VIEW active_alerts AS
SELECT 
    id,
    severity,
    category,
    message,
    metadata,
    created_at,
    EXTRACT(EPOCH FROM (now() - created_at))/60 as age_minutes
FROM monitoring_alerts
WHERE acknowledged_at IS NULL
ORDER BY 
    CASE severity 
        WHEN 'critical' THEN 1 
        WHEN 'warning' THEN 2 
        ELSE 3 
    END,
    created_at DESC;

-- 7. View for webhook health siste 24 timer
CREATE OR REPLACE VIEW webhook_health_summary AS
SELECT 
    type,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE status = 'completed') as successful,
    COUNT(*) FILTER (WHERE status IN ('failed', 'error')) as failed,
    AVG(processing_time_ms)::INTEGER as avg_processing_ms,
    MAX(processing_time_ms) as max_processing_ms,
    COUNT(*) FILTER (WHERE processing_time_ms > 3000) as slow_count
FROM webhook_events
WHERE received_at > now() - interval '24 hours'
GROUP BY type
ORDER BY total_events DESC;

-- 8. Funkjson for å hente siste health status
CREATE OR REPLACE FUNCTION get_latest_health_status()
RETURNS TABLE (
    status TEXT,
    database_latency INTEGER,
    trading_signals_status TEXT,
    kv_status TEXT,
    environment_status TEXT,
    version TEXT,
    checked_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        hcm.overall_status,
        hcm.database_latency_ms,
        hcm.trading_signals_status,
        hcm.kv_status,
        hcm.environment_status,
        hcm.version,
        hcm.timestamp
    FROM health_check_metrics hcm
    ORDER BY hcm.timestamp DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Kommentarer på tabeller
COMMENT ON TABLE webhook_events IS 'Logger alle Stripe webhook events med processing tid og status';
COMMENT ON TABLE monitoring_alerts IS 'Lagrer monitoring alerts fra alle systemer';
COMMENT ON TABLE health_check_metrics IS 'Historiske health check målinger fra /api/health';
COMMENT ON VIEW active_alerts IS 'Ubekreftede aktive alerts sortert etter severity';
COMMENT ON VIEW webhook_health_summary IS 'Sammendrag av webhook health siste 24 timer';
