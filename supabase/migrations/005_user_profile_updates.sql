-- Migration: User Profile Updates - KLA-73, KLA-75, KLA-88
-- Legger til felter for "Kom i gang"-kort, læringsprogresjon og UI-state

-- Legg til dismissed_get_started_card for KLA-73
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS dismissed_get_started_card BOOLEAN NOT NULL DEFAULT FALSE;

-- Legg til onboarding flags
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER NOT NULL DEFAULT 0;

-- Legg til learning progress (JSON for fleksibilitet)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS learning_progress JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Legg til earned badges
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS earned_badges JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Comments
COMMENT ON COLUMN user_profiles.dismissed_get_started_card IS 'Whether user has dismissed the Get Started card in dashboard';
COMMENT ON COLUMN user_profiles.onboarding_completed_at IS 'Timestamp when user completed onboarding';
COMMENT ON COLUMN user_profiles.onboarding_step IS 'Current onboarding step (0 = not started)';
COMMENT ON COLUMN user_profiles.learning_progress IS 'JSON object tracking completed lessons per track';
COMMENT ON COLUMN user_profiles.earned_badges IS 'JSON array of earned badges with timestamps';
