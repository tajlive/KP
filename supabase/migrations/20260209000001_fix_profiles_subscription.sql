-- ============================================================================
-- FIX: Legg til manglende kolonner i profiles tabellen
-- ============================================================================

-- Sjekk og legg til subscription_tier hvis den mangler
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_tier TEXT 
      NOT NULL 
      CHECK (subscription_tier IN ('free', 'standard', 'pluss', 'vip_ekstrem')) 
      DEFAULT 'free';
    
    RAISE NOTICE 'Added subscription_tier column to profiles';
  ELSE
    RAISE NOTICE 'subscription_tier column already exists';
  END IF;
END $$;

-- Sjekk og legg til subscription_status hvis den mangler
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_status TEXT 
      NOT NULL 
      CHECK (subscription_status IN ('trial', 'active', 'past_due', 'canceled', 'expired')) 
      DEFAULT 'trial';
    
    RAISE NOTICE 'Added subscription_status column to profiles';
  ELSE
    RAISE NOTICE 'subscription_status column already exists';
  END IF;
END $$;

-- Sjekk og legg til trial kolonner hvis de mangler
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'trial_started_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN trial_started_at TIMESTAMPTZ;
    RAISE NOTICE 'Added trial_started_at column';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'trial_ends_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN trial_ends_at TIMESTAMPTZ;
    RAISE NOTICE 'Added trial_ends_at column';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added updated_at column';
  END IF;
END $$;

-- Sjekk og legg til display_name hvis den mangler
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN display_name TEXT;
    RAISE NOTICE 'Added display_name column';
  END IF;
END $$;

-- Opprett indexer (hvis de ikke finnes fra før)
CREATE INDEX IF NOT EXISTS idx_profiles_tier ON profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_trial_ends ON profiles(trial_ends_at) 
  WHERE subscription_status = 'trial';

-- Verifiser at alle kolonner er på plass
SELECT 
  'Profiles table columns:' as info,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'profiles';

-- Vis eksisterende kolonner
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
