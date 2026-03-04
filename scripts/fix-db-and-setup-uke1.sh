#!/bin/bash

# Kombinert fiks: Legg til manglende kolonner + Uke 1 UI improvements
echo "🔧 Database Fix + Uke 1 Setup"
echo "============================"
echo ""

# Farger
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

MIGRATIONS_DIR="/Users/taj/klarpakke/supabase/migrations"

echo -e "${BLUE}📋 Dette vil kjøre:${NC}"
echo "   1. Fiks: Legg til subscription_tier og andre manglende kolonner"
echo "   2. Uke 1: UI improvements (view_mode, accessibility, onboarding)"
echo ""

# Kombiner SQL-filene
cat > /tmp/combined_migration.sql << 'EOF'
-- ============================================================================
-- STEG 1: Fiks manglende kolonner
-- ============================================================================

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
  END IF;
END $$;

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
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'trial_started_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN trial_started_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'trial_ends_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN trial_ends_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN display_name TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_tier ON profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_trial_ends ON profiles(trial_ends_at) 
  WHERE subscription_status = 'trial';

-- ============================================================================
-- STEG 2: Uke 1 UI Improvements
-- ============================================================================

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

-- Oppdater eksisterende brukere med default verdier
UPDATE profiles 
SET view_mode_preference = CASE 
  WHEN tier IN ('phd', 'professor') THEN 'avansert'
  WHEN tier = 'master' THEN 'mellom'
  ELSE 'enkel'
END
WHERE view_mode_preference IS NULL;

-- Indekser
CREATE INDEX IF NOT EXISTS idx_profiles_view_mode ON profiles(view_mode_preference);
CREATE INDEX IF NOT EXISTS idx_profiles_bankid_verified ON profiles(bankid_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles(onboarding_completed);

-- System health logs
CREATE TABLE IF NOT EXISTS system_health_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_status TEXT NOT NULL CHECK (supabase_status IN ('operational', 'degraded', 'down')),
  binance_status TEXT NOT NULL CHECK (binance_status IN ('operational', 'degraded', 'down')),
  email_status TEXT NOT NULL CHECK (email_status IN ('operational', 'degraded', 'down')),
  response_time_ms INTEGER,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_system_health_checked_at ON system_health_logs(checked_at DESC);

ALTER TABLE system_health_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow service role to insert health logs"
  ON system_health_logs FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow public to read health logs"
  ON system_health_logs FOR SELECT USING (true);

-- Onboarding events
CREATE TABLE IF NOT EXISTS onboarding_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  step TEXT NOT NULL CHECK (step IN ('email', 'bankid', 'video', 'checklist', 'completed')),
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_onboarding_events_user ON onboarding_events(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_events_step ON onboarding_events(step);

ALTER TABLE onboarding_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can see own onboarding events"
  ON onboarding_events FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Service role can insert onboarding events"
  ON onboarding_events FOR INSERT WITH CHECK (true);

-- Verifiser
SELECT 'Migration completed successfully' as status;
EOF

echo -e "${GREEN}✓ Kombinert SQL-fil opprettet${NC}"
echo ""

# Kopier til clipboard
if command -v pbcopy &> /dev/null; then
  cat /tmp/combined_migration.sql | pbcopy
  echo -e "${GREEN}✓ SQL kopiert til clipboard!${NC}"
fi

echo ""
echo -e "${YELLOW}📋 Instruksjon:${NC}"
echo "==============="
echo ""
echo "1. Gå til https://supabase.com/dashboard"
echo "2. Velg ditt Klarpakke-prosjekt"
echo "3. Gå til SQL Editor"
echo "4. Lim inn SQL (allerede kopiert!)"
echo "5. Klikk 'Run'"
echo ""
echo "Fil også lagret på: /tmp/combined_migration.sql"
echo ""
echo -e "${BLUE}📊 Dette legger til:${NC}"
echo "   • subscription_tier, subscription_status"
echo "   • trial_started_at, trial_ends_at"
echo "   • view_mode_preference (enkel/mellom/avansert)"
echo "   • font_size_preference (normal/large)"
echo "   • high_contrast_mode (boolean)"
echo "   • bankid_verified (boolean)"
echo "   • onboarding_completed (boolean)"
echo "   • system_health_logs tabell"
echo "   • onboarding_events tabell"
echo ""
echo -e "${GREEN}✅ Etter kjøring, test med:${NC}"
echo "   npm run dev"
echo "   open http://localhost:3000/onboarding"
