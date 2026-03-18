-- ═══════════════════════════════════════════════════════════════
-- Migration: Vipps Agreements Table
-- For storing Vipps Recurring payment agreements
-- ═══════════════════════════════════════════════════════════════

-- Opprett vipps_agreements tabell
CREATE TABLE IF NOT EXISTS vipps_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tier TEXT NOT NULL CHECK (tier IN ('bachelor', 'master', 'phd', 'professor')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'STOPPED', 'EXPIRED')),
  amount INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  vipps_confirmation_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  stopped_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  
  CONSTRAINT valid_dates CHECK (activated_at IS NULL OR activated_at >= created_at)
);
-- Indekser for ytelse
CREATE INDEX IF NOT EXISTS idx_vipps_agreement_id ON vipps_agreements(agreement_id);
CREATE INDEX IF NOT EXISTS idx_vipps_user_id ON vipps_agreements(user_id);
CREATE INDEX IF NOT EXISTS idx_vipps_status ON vipps_agreements(status);
CREATE INDEX IF NOT EXISTS idx_vipps_created_at ON vipps_agreements(created_at);
-- RLS Policies
ALTER TABLE vipps_agreements ENABLE ROW LEVEL SECURITY;
-- Brukere kan se egne avtaler
DROP POLICY IF EXISTS "Users can view own agreements" ON vipps_agreements;
CREATE POLICY "Users can view own agreements"
  ON vipps_agreements FOR SELECT
  USING (auth.uid() = user_id);
-- Service role kan administrere alle avtaler (for webhooks)
DROP POLICY IF EXISTS "Service role can manage agreements" ON vipps_agreements;
CREATE POLICY "Service role can manage agreements"
  ON vipps_agreements FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
-- Autentiserte brukere kan opprette avtaler
DROP POLICY IF EXISTS "Authenticated users can create agreements" ON vipps_agreements;
CREATE POLICY "Authenticated users can create agreements"
  ON vipps_agreements FOR INSERT
  TO authenticated
  WITH CHECK (true);
COMMENT ON TABLE vipps_agreements IS 'Stores Vipps Recurring payment agreements';
COMMENT ON COLUMN vipps_agreements.agreement_id IS 'Unique Vipps agreement ID';
COMMENT ON COLUMN vipps_agreements.status IS 'PENDING, ACTIVE, STOPPED, or EXPIRED';
