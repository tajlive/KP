-- Add trial tracking to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
ADD COLUMN IF NOT EXISTS trial_expires_at timestamptz;
-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_profiles_trial_expires 
ON profiles(trial_expires_at) 
WHERE trial_expires_at IS NOT NULL;
-- Events table for analytics (hvis ikke eksisterer)
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_user_type 
ON events(user_id, event_type, created_at DESC);
COMMENT ON COLUMN profiles.trial_started_at IS '14-day auto-trading trial start';
COMMENT ON COLUMN profiles.trial_expires_at IS '14-day auto-trading trial expiry';
COMMENT ON TABLE events IS 'User activity tracking for analytics';
