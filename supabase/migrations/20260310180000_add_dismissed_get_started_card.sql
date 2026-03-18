-- Migration: Add dismissed_get_started_card column to user_profiles
-- Created: 2026-03-10
-- Reason: GetStartedCard component queries this column

-- Add column if it doesn't exist
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS dismissed_get_started_card boolean NOT NULL DEFAULT false;
-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_dismissed_card 
ON user_profiles(user_id, dismissed_get_started_card) 
WHERE dismissed_get_started_card = true;
-- Verify the column was added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'dismissed_get_started_card'
  ) THEN
    RAISE NOTICE 'Column dismissed_get_started_card successfully added to user_profiles';
  ELSE
    RAISE EXCEPTION 'Failed to add column dismissed_get_started_card';
  END IF;
END $$;
