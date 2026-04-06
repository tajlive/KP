-- =============================================================================
-- Outbox Recovery Table
-- =============================================================================
-- Brukes for å håndtere partial write failures:
-- - Redis ok / Supabase fail
-- - S3 ok / Supabase fail  
-- - Supabase ok / S3 fail
--
-- Prosesseres av cron job hvert 5. minutt
-- =============================================================================

CREATE TABLE IF NOT EXISTS outbox_recovery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('RISK_STATE_SYNC', 'AUDIT_S3_SYNC', 'AUDIT_DB_SYNC')),
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_attempt TIMESTAMPTZ,
  next_attempt TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  requires_manual_intervention BOOLEAN NOT NULL DEFAULT false
);

-- Indexer for effektive queries
CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox_recovery(status);
CREATE INDEX IF NOT EXISTS idx_outbox_status_attempts ON outbox_recovery(status, attempts);
CREATE INDEX IF NOT EXISTS idx_outbox_next_attempt ON outbox_recovery(next_attempt) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_outbox_manual_intervention ON outbox_recovery(requires_manual_intervention) WHERE requires_manual_intervention = true;
CREATE INDEX IF NOT EXISTS idx_outbox_created ON outbox_recovery(created_at);

-- RLS policies
ALTER TABLE outbox_recovery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Outbox recovery system only" ON outbox_recovery
  FOR ALL USING (false);

-- Kommentar for dokumentasjon
COMMENT ON TABLE outbox_recovery IS 'Queue for recovering from partial write failures between Redis/Supabase/S3';
COMMENT ON COLUMN outbox_recovery.type IS 'Type of sync operation needed';
COMMENT ON COLUMN outbox_recovery.payload IS 'Data needed for recovery';
COMMENT ON COLUMN outbox_recovery.requires_manual_intervention IS 'Set to true after max retry attempts exceeded';

-- =============================================================================
-- System Alerts Table
-- =============================================================================
-- Lagrer alarmer fra systemkomponenter for monitoring og eskalering
-- =============================================================================

CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  component TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT
);

-- Indexer
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_component ON system_alerts(component);
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON system_alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON system_alerts(created_at DESC);

-- RLS
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alerts readable by admins" ON system_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'support', 'risk_manager')
    )
  );

CREATE POLICY "Alerts insertable by system" ON system_alerts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Alerts updatable by admins" ON system_alerts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'support', 'risk_manager')
    )
  );

COMMENT ON TABLE system_alerts IS 'System alerts for monitoring and incident response';

-- =============================================================================
-- Trade Metadata Column
-- =============================================================================
-- Legger til metadata-kolonne for sporbarhet i trades-tabellen
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trades' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE trades ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

COMMENT ON COLUMN trades.metadata IS 'Trade execution metadata: risk_version, policy_version, decision_hash, audit_status';

-- Index for metadata queries
CREATE INDEX IF NOT EXISTS idx_trades_metadata ON trades USING GIN(metadata);
