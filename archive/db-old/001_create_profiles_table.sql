-- 001_create_profiles_table.sql
CREATE TABLE IF NOT EXISTS profiles (
  id text PRIMARY KEY,
  email text,
  name text,
  avatar_url text,
  risk_preference text DEFAULT 'normal',
  settings jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_trigger ON profiles;
CREATE TRIGGER set_updated_at_trigger
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at();

-- Row Level Security: only owner can read/update/delete
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_own_profile ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY insert_own_profile ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY update_own_profile ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY delete_own_profile ON profiles
  FOR DELETE USING (auth.uid() = id);
