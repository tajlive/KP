-- Risk profiles for autotrading
CREATE TABLE IF NOT EXISTS risk_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  
  -- Risk limits
  max_position_size_percent DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  max_daily_loss_percent DECIMAL(5,2) NOT NULL DEFAULT 2.00,
  max_total_exposure_percent DECIMAL(5,2) NOT NULL DEFAULT 50.00,
  stop_loss_percent DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  take_profit_percent DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  
  -- Trading limits
  max_concurrent_trades INT NOT NULL DEFAULT 3,
  daily_trade_limit INT NOT NULL DEFAULT 10,
  min_trade_amount DECIMAL(18,8) NOT NULL DEFAULT 10.00,
  max_trade_amount DECIMAL(18,8) NOT NULL DEFAULT 1000.00,
  
  -- Metadata
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_risk_profiles_user_id ON risk_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_profiles_default ON risk_profiles(user_id, is_default) WHERE is_default = true;

ALTER TABLE risk_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own profiles" ON risk_profiles;
DROP POLICY IF EXISTS "Users create own profiles" ON risk_profiles;
DROP POLICY IF EXISTS "Users update own profiles" ON risk_profiles;
DROP POLICY IF EXISTS "Users delete own profiles" ON risk_profiles;

CREATE POLICY "Users view own profiles" ON risk_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own profiles" ON risk_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profiles" ON risk_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own profiles" ON risk_profiles FOR DELETE USING (auth.uid() = user_id);

-- Function to ensure only one default per user
CREATE OR REPLACE FUNCTION ensure_single_default_risk_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE risk_profiles SET is_default = false WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_single_default ON risk_profiles;
CREATE TRIGGER ensure_single_default
  BEFORE INSERT OR UPDATE ON risk_profiles
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_risk_profile();

-- Seed 3 presets for existing users
INSERT INTO risk_profiles (user_id, name, max_position_size_percent, max_daily_loss_percent, stop_loss_percent, take_profit_percent, max_concurrent_trades, is_default)
SELECT 
  u.id,
  p.name,
  p.max_pos,
  p.max_loss,
  p.stop_loss,
  p.take_profit,
  p.max_trades,
  p.is_default
FROM auth.users u
CROSS JOIN (
  VALUES 
    ('Forsiktig', 5.00, 1.00, 3.00, 5.00, 2, true),
    ('Moderat', 10.00, 2.00, 5.00, 10.00, 3, false),
    ('Aggressiv', 20.00, 5.00, 10.00, 20.00, 5, false)
) AS p(name, max_pos, max_loss, stop_loss, take_profit, max_trades, is_default)
ON CONFLICT (user_id, name) DO NOTHING;
