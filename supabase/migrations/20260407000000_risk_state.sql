-- Risk State and Audit Log Migration
-- P0 Hardening Sprint

-- =============================================================================
-- 1. RISK STATE TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS risk_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE risk_state IS 'Persistent storage for risk kernel state per user';

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_risk_state_updated ON risk_state(updated_at);

-- =============================================================================
-- 2. RISK VIOLATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS risk_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'critical')),
  expected_value DECIMAL(18,8),
  actual_value DECIMAL(18,8),
  action TEXT NOT NULL CHECK (action IN ('blocked', 'reduced', 'allowed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE risk_violations IS 'Audit log for risk limit violations';

CREATE INDEX IF NOT EXISTS idx_risk_violations_user ON risk_violations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_violations_created ON risk_violations(created_at DESC);

-- =============================================================================
-- 3. AUDIT LOG TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id TEXT UNIQUE NOT NULL,
  evidence_hash TEXT NOT NULL,
  order_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  s3_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE audit_log IS 'Immutable execution evidence for audit and compliance';

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_order ON audit_log(order_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);

-- =============================================================================
-- 4. MiFID II REPORTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS mifid2_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id TEXT UNIQUE NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('RTS22', 'RTS27')),
  generated_at TIMESTAMPTZ NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  record_count INTEGER NOT NULL DEFAULT 0,
  xml_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'submitted', 'failed')),
  submission_error TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mifid2_reports IS 'MiFID II regulatory reports (RTS 22/27)';

CREATE INDEX IF NOT EXISTS idx_mifid2_type ON mifid2_reports(report_type, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_mifid2_period ON mifid2_reports(period_start, period_end);

-- =============================================================================
-- 5. RLS POLICIES
-- =============================================================================

ALTER TABLE risk_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE mifid2_reports ENABLE ROW LEVEL SECURITY;

-- Service role can access all
CREATE POLICY service_all_risk_state ON risk_state FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_all_risk_violations ON risk_violations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_all_audit_log ON audit_log FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_all_mifid2 ON mifid2_reports FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Users can only see their own data
CREATE POLICY user_own_risk_state ON risk_state FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY user_own_risk_violations ON risk_violations FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY user_own_audit_log ON audit_log FOR SELECT TO authenticated USING (user_id = auth.uid());

-- =============================================================================
-- 6. CLEANUP FUNCTION (for data retention)
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  -- Delete audit logs older than 90 days from Supabase (kept in S3)
  DELETE FROM audit_log 
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND s3_path IS NOT NULL;
  
  -- Keep violations for 7 years (regulatory requirement)
  -- Keep MiFID reports for 7 years
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 7. TRIGGER: Update risk_state timestamp
-- =============================================================================

CREATE OR REPLACE FUNCTION update_risk_state_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_risk_state_timestamp
  BEFORE UPDATE ON risk_state
  FOR EACH ROW EXECUTE FUNCTION update_risk_state_timestamp();
