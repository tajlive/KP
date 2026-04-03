-- ============================================================================
-- Add ui_theme column to user_profiles for theme persistence
-- ============================================================================
-- This migration adds the ui_theme column to store user theme preference
-- Valid values: 'system', 'light', 'dark'
-- ============================================================================

-- Add ui_theme column if it doesn't exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'ui_theme'
  ) THEN
    ALTER TABLE public.user_profiles
      ADD COLUMN ui_theme TEXT NOT NULL DEFAULT 'system'
      CHECK (ui_theme IN ('system', 'light', 'dark'));
    RAISE NOTICE 'Lagt til user_profiles.ui_theme (med check constraint)';
  END IF;
END;
$$;

-- Update RLS policies if needed (theme is readable/writable by owner)
DO $$
BEGIN
  -- Ensure column is visible in the exposed schema for authenticated users
  -- (Supabase automatically includes new columns in the API)
  RAISE NOTICE 'ui_theme kolonne er klar for bruk';
END;
$$;

-- PostgREST: oppfrisk skjema-cache
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE '✅ ui_theme migrasjon ferdig';
END;
$$;
