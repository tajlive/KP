-- ============================================================================
-- KLA-70: Server-side wizard persistence
-- ============================================================================
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS setup_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_dismissed_at TIMESTAMPTZ;
