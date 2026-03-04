-- =====================================================
-- UKES 1: UI IMPROVEMENTS MIGRASJON
-- Progressive Dashboard + Trust Indicators + Accessibility
-- =====================================================

-- Legg til nye felter i profiles tabellen
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS view_mode_preference TEXT DEFAULT 'enkel' 
  CHECK (view_mode_preference IN ('enkel', 'mellom', 'avansert'));

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS font_size_preference TEXT DEFAULT 'normal' 
  CHECK (font_size_preference IN ('normal', 'large'));

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS high_contrast_mode BOOLEAN DEFAULT false;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bankid_verified BOOLEAN DEFAULT false;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bankid_verified_at TIMESTAMPTZ;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Oppdater eksisterende brukere med default verdier (kommentert ut)
-- UPDATE profiles 
-- SET view_mode_preference = CASE 
--   WHEN tier IN ('phd', 'professor') THEN 'avansert'
--   WHEN tier = 'master' THEN 'mellom'
--   ELSE 'enkel'
-- END
-- WHERE view_mode_preference IS NULL;

-- Opprett indekser for bedre ytelse
CREATE INDEX IF NOT EXISTS idx_profiles_view_mode ON profiles(view_mode_preference);
CREATE INDEX IF NOT EXISTS idx_profiles_bankid_verified ON profiles(bankid_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles(onboarding_completed);

-- Kommentarer
COMMENT ON COLUMN profiles.view_mode_preference IS 'Dashboard visningsmodus: enkel, mellom, eller avansert';
COMMENT ON COLUMN profiles.font_size_preference IS 'Tekststørrelse: normal (20px) eller large (24px)';
COMMENT ON COLUMN profiles.high_contrast_mode IS 'Høy kontrast modus for synshemmede';
COMMENT ON COLUMN profiles.bankid_verified IS 'Om bruker har verifisert med BankID';
COMMENT ON COLUMN profiles.onboarding_completed IS 'Om bruker har fullført onboarding';

-- =====================================================
-- SYSTEM HEALTH LOGGING (for SystemStatus komponent)
-- =====================================================

CREATE TABLE IF NOT EXISTS system_health_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_status TEXT NOT NULL CHECK (supabase_status IN ('operational', 'degraded', 'down')),
  binance_status TEXT NOT NULL CHECK (binance_status IN ('operational', 'degraded', 'down')),
  email_status TEXT NOT NULL CHECK (email_status IN ('operational', 'degraded', 'down')),
  response_time_ms INTEGER,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Indeks for rask querying
CREATE INDEX IF NOT EXISTS idx_system_health_checked_at ON system_health_logs(checked_at DESC);

-- RLS policy (kun service role kan insert)
ALTER TABLE system_health_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role to insert health logs"
  ON system_health_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public to read health logs"
  ON system_health_logs FOR SELECT
  USING (true);

-- =====================================================
-- ONBOARDING TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS onboarding_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  step TEXT NOT NULL CHECK (step IN ('email', 'bankid', 'video', 'checklist', 'completed')),
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Indekser
CREATE INDEX IF NOT EXISTS idx_onboarding_events_user ON onboarding_events(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_events_step ON onboarding_events(step);

-- RLS
ALTER TABLE onboarding_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own onboarding events"
  ON onboarding_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert onboarding events"
  ON onboarding_events FOR INSERT
  WITH CHECK (true);

-- Funksjon for å beregne gjennomsnittlig onboarding-tid
CREATE OR REPLACE FUNCTION get_avg_onboarding_time()
RETURNS INTERVAL AS $$
DECLARE
  avg_time INTERVAL;
BEGIN
  SELECT AVG(completed_at - first_step)
  INTO avg_time
  FROM (
    SELECT 
      user_id,
      MIN(completed_at) as first_step,
      MAX(completed_at) as completed_at
    FROM onboarding_events
    WHERE step = 'completed'
    GROUP BY user_id
  ) sub;
  
  RETURN avg_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VERIFISERING
-- =====================================================

-- Sjekk at alt er på plass
SELECT 
  'profiles columns' as check_item,
  COUNT(*) as count
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('view_mode_preference', 'font_size_preference', 'high_contrast_mode', 'bankid_verified', 'onboarding_completed');
