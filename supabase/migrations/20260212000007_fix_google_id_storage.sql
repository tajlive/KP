-- ============================================================
-- FIX: Store google_id from OAuth metadata
-- ============================================================

-- Update the handle_google_auth_user function to capture google_id
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
    google_id,
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
    NEW.raw_user_meta_data->>'sub', -- Google OAuth ID
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
    google_id = COALESCE(
      NEW.raw_user_meta_data->>'sub',
      profiles.google_id
    ),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
COMMENT ON FUNCTION handle_google_auth_user() IS 'Extracts full_name, avatar_url, and google_id (sub) from Google OAuth metadata';
