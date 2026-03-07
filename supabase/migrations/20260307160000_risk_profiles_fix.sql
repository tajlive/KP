-- Add missing columns to risk_profiles if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risk_profiles' AND column_name = 'is_default') THEN
    ALTER TABLE risk_profiles ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risk_profiles' AND column_name = 'is_active') THEN
    ALTER TABLE risk_profiles ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risk_profiles' AND column_name = 'daily_trade_limit') THEN
    ALTER TABLE risk_profiles ADD COLUMN daily_trade_limit INT NOT NULL DEFAULT 10;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risk_profiles' AND column_name = 'min_trade_amount') THEN
    ALTER TABLE risk_profiles ADD COLUMN min_trade_amount DECIMAL(18,8) NOT NULL DEFAULT 10.00;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risk_profiles' AND column_name = 'max_trade_amount') THEN
    ALTER TABLE risk_profiles ADD COLUMN max_trade_amount DECIMAL(18,8) NOT NULL DEFAULT 1000.00;
  END IF;
END $$;

-- Create index if not exists
CREATE INDEX IF NOT EXISTS idx_risk_profiles_default ON risk_profiles(user_id, is_default) WHERE is_default = true;

-- Trigger for single default
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
