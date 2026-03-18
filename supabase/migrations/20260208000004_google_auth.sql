-- ============================================================
-- GOOGLE AUTH SUPPORT
-- Enable Google OAuth provider in Supabase
-- ============================================================

-- Ensure profiles table has columns for OAuth auth data
DO $$ 
BEGIN
  -- Add google_id if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'google_id') THEN
    ALTER TABLE profiles ADD COLUMN google_id TEXT UNIQUE;
  END IF;
  
  -- Add microsoft_id if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'microsoft_id') THEN
    ALTER TABLE profiles ADD COLUMN microsoft_id TEXT UNIQUE;
  END IF;
  
  -- Add provider if not exists (to track which auth method was used)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'provider') THEN
    ALTER TABLE profiles ADD COLUMN provider TEXT DEFAULT 'email';
  END IF;
END $$;
-- Add index for microsoft_id
CREATE INDEX IF NOT EXISTS idx_profiles_microsoft_id ON profiles(microsoft_id);
-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_google_id ON profiles(google_id);
CREATE INDEX IF NOT EXISTS idx_profiles_provider ON profiles(provider);
-- Create function to handle new Google auth users
CREATE OR REPLACE FUNCTION handle_google_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- If user doesn't have a profile yet, create one
  INSERT INTO profiles (
    id,
    email,
    full_name,
    avatar_url,
    provider,
    subscription_tier,
    subscription_status
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'user_name'
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'provider', 'google'),
    'free',
    'inactive'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    full_name = COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      profiles.full_name
    ),
    avatar_url = COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      profiles.avatar_url
    ),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Create trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created_google ON auth.users;
CREATE TRIGGER on_auth_user_created_google
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_google_auth_user();
-- Enable Google provider in Supabase (run this in Supabase Dashboard SQL Editor)
-- Note: You must also enable Google OAuth in Supabase Dashboard:
-- Authentication > Providers > Google > Enable

COMMENT ON COLUMN profiles.provider IS 'Auth provider: email, google, or apple';
COMMENT ON COLUMN profiles.google_id IS 'Google OAuth ID for the user';
