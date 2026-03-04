-- ============================================================
-- EMERGENCY CONTROLS SYSTEM
-- Adds tables and functions for panic stop and safety controls
-- ============================================================

-- 1. Global settings table (if not exists)
CREATE TABLE IF NOT EXISTS global_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Singleton pattern
  emergency_stop BOOLEAN DEFAULT false,
  emergency_triggered_at TIMESTAMPTZ,
  emergency_triggered_by TEXT,
  emergency_reason TEXT,
  emergency_resolved_at TIMESTAMPTZ,
  emergency_resolved_by TEXT,
  emergency_resolution TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default row
INSERT INTO global_settings (id, emergency_stop)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

-- 2. Emergency logs table
CREATE TABLE IF NOT EXISTS emergency_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by TEXT NOT NULL,
  reason TEXT NOT NULL,
  affected_sessions INTEGER DEFAULT 0,
  closed_positions INTEGER DEFAULT 0,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Admin alerts table
CREATE TABLE IF NOT EXISTS admin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('EMERGENCY', 'WARNING', 'INFO')),
  severity TEXT NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  message TEXT NOT NULL,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by TEXT,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Add trading_suspended flag to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS trading_suspended BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS trading_suspension_reason TEXT,
ADD COLUMN IF NOT EXISTS trading_suspended_at TIMESTAMPTZ;

-- 5. Update auto_trading_positions with close_reason
ALTER TABLE auto_trading_positions 
ADD COLUMN IF NOT EXISTS close_reason TEXT;

-- 6. RLS Policies for emergency tables
-- Only admins can read/write emergency settings
CREATE POLICY "Admins can manage global_settings"
  ON global_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can read emergency_logs"
  ON emergency_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage admin_alerts"
  ON admin_alerts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Enable RLS
ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_alerts ENABLE ROW LEVEL SECURITY;

-- 7. Function to check if trading is allowed
CREATE OR REPLACE FUNCTION is_trading_allowed()
RETURNS BOOLEAN AS $$
DECLARE
  emergency_active BOOLEAN;
BEGIN
  SELECT emergency_stop INTO emergency_active
  FROM global_settings
  WHERE id = 1;
  
  RETURN NOT COALESCE(emergency_active, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function to get emergency status
CREATE OR REPLACE FUNCTION get_emergency_status()
RETURNS TABLE (
  is_active BOOLEAN,
  triggered_at TIMESTAMPTZ,
  triggered_by TEXT,
  reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gs.emergency_stop,
    gs.emergency_triggered_at,
    gs.emergency_triggered_by,
    gs.emergency_reason
  FROM global_settings gs
  WHERE gs.id = 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Comments
COMMENT ON TABLE global_settings IS 'Singleton table for global system settings including emergency stop';
COMMENT ON TABLE emergency_logs IS 'Log of all emergency stop activations';
COMMENT ON TABLE admin_alerts IS 'System alerts for admin attention';
COMMENT ON FUNCTION is_trading_allowed() IS 'Returns false if global emergency stop is active';

-- ============================================================
-- DONE! Emergency controls system is now ready
-- ============================================================
