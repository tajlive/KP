-- =====================================================
-- Klarpakke Database Schema
-- Initial migration
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- =====================================================
-- TABLES
-- =====================================================

-- Signals table
CREATE TABLE IF NOT EXISTS signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('long', 'short')),
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMP WITH TIME ZONE,

  -- Additional data (JSON for flexibility)
  metadata JSONB DEFAULT '{}'::jsonb
);
-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_signals_status ON signals(status);
CREATE INDEX IF NOT EXISTS idx_signals_direction ON signals(direction);
CREATE INDEX IF NOT EXISTS idx_signals_created_at ON signals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_created_by ON signals(created_by);
CREATE INDEX IF NOT EXISTS idx_signals_processed_by ON signals(processed_by);
-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  signal_id UUID REFERENCES signals(id),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);
-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_signal_id ON audit_logs(signal_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
-- User roles table (for extended role management)
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'trader', 'analyst', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Apply trigger to signals table
DROP TRIGGER IF EXISTS update_signals_updated_at ON signals;
CREATE TRIGGER update_signals_updated_at
  BEFORE UPDATE ON signals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
-- Apply trigger to user_roles table
DROP TRIGGER IF EXISTS update_user_roles_updated_at ON user_roles;
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
-- Function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- First check user_roles table
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_id = user_uuid;

  -- If not found, check auth.users metadata
  IF user_role IS NULL THEN
    SELECT raw_user_meta_data->>'role' INTO user_role
    FROM auth.users
    WHERE id = user_uuid;
  END IF;

  -- Default to 'viewer' if no role found
  RETURN COALESCE(user_role, 'viewer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
-- =====================================================
-- SIGNALS POLICIES
-- =====================================================

-- Policy: Anyone authenticated can view signals
DROP POLICY IF EXISTS "Authenticated users can view signals" ON signals;
CREATE POLICY "Authenticated users can view signals"
  ON signals
  FOR SELECT
  TO authenticated
  USING (true);
-- Policy: Only analysts and admins can create signals
DROP POLICY IF EXISTS "Analysts and admins can create signals" ON signals;
CREATE POLICY "Analysts and admins can create signals"
  ON signals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role(auth.uid()) IN ('admin', 'analyst')
  );
-- Policy: Only traders and admins can update signals (approve/reject)
DROP POLICY IF EXISTS "Traders and admins can update signals" ON signals;
CREATE POLICY "Traders and admins can update signals"
  ON signals
  FOR UPDATE
  TO authenticated
  USING (
    get_user_role(auth.uid()) IN ('admin', 'trader')
  )
  WITH CHECK (
    get_user_role(auth.uid()) IN ('admin', 'trader')
    AND status IN ('approved', 'rejected')
  );
-- Policy: Only admins can delete signals
DROP POLICY IF EXISTS "Only admins can delete signals" ON signals;
CREATE POLICY "Only admins can delete signals"
  ON signals
  FOR DELETE
  TO authenticated
  USING (
    get_user_role(auth.uid()) = 'admin'
  );
-- =====================================================
-- AUDIT LOGS POLICIES
-- =====================================================

-- Policy: Users can view their own audit logs
DROP POLICY IF EXISTS "Users can view their own audit logs" ON audit_logs;
CREATE POLICY "Users can view their own audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR get_user_role(auth.uid()) = 'admin'
  );
-- Policy: System can insert audit logs (via service role)
DROP POLICY IF EXISTS "Service role can insert audit logs" ON audit_logs;
CREATE POLICY "Service role can insert audit logs"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
-- =====================================================
-- USER ROLES POLICIES
-- =====================================================

-- Policy: Users can view their own role
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
CREATE POLICY "Users can view their own role"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR get_user_role(auth.uid()) = 'admin'
  );
-- Policy: Only admins can manage user roles
DROP POLICY IF EXISTS "Only admins can manage user roles" ON user_roles;
CREATE POLICY "Only admins can manage user roles"
  ON user_roles
  FOR ALL
  TO authenticated
  USING (
    get_user_role(auth.uid()) = 'admin'
  )
  WITH CHECK (
    get_user_role(auth.uid()) = 'admin'
  );
-- =====================================================
-- SEED DATA (Optional - for testing)
-- =====================================================

-- Insert some test signals (commented out for production)
/*
INSERT INTO signals (title, direction, confidence, status) VALUES
  ('BTC/USD Long Setup', 'long', 85, 'pending'),
  ('ETH/USD Short Signal', 'short', 72, 'pending'),
  ('SOL/USD Momentum Play', 'long', 90, 'pending');
*/

-- =====================================================
-- GRANTS
-- =====================================================

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;
-- Grant permissions on tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
COMMENT ON TABLE signals IS 'Trading signals awaiting approval';
COMMENT ON TABLE audit_logs IS 'Audit trail of all signal actions';
COMMENT ON TABLE user_roles IS 'User role assignments';
