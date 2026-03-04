-- ============================================
-- AKTIVÉR REELL TRACKING FOR DASHBOARD
-- ============================================

-- 1. Sjekk om tabellene finnes
SELECT * FROM information_schema.tables 
WHERE table_name IN ('campaign_contacts', 'email_tracking');

-- 2. Hvis de ikke finnes, kjør denne:
/*
CREATE TABLE IF NOT EXISTS campaign_contacts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  company TEXT,
  position TEXT,
  source TEXT DEFAULT 'direct',
  status TEXT DEFAULT 'pending',
  tags TEXT[] DEFAULT '{}',
  sequence INTEGER DEFAULT 1,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  registered_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id TEXT REFERENCES campaign_contacts(id) ON DELETE CASCADE,
  email TEXT,
  sequence INTEGER,
  event TEXT NOT NULL,
  url TEXT,
  user_agent TEXT,
  ip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
*/

-- 3. Sjekk nåværende brukere (reelle tall)
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as this_week
FROM profiles;

-- 4. Se de siste registrerte brukerne
SELECT 
  id,
  email,
  first_name,
  last_name,
  created_at,
  source
FROM profiles
ORDER BY created_at DESC
LIMIT 10;

-- 5. Sett kilde på eksisterende brukere (hvis de ikke har)
UPDATE profiles 
SET source = 'direct' 
WHERE source IS NULL;

-- 6. Lag view for kampanje-statistikk
CREATE OR REPLACE VIEW campaign_stats AS
SELECT
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as this_week,
  COUNT(*) FILTER (WHERE source = 'linkedin') as linkedin,
  COUNT(*) FILTER (WHERE source = 'facebook') as facebook,
  COUNT(*) FILTER (WHERE source = 'email') as email,
  COUNT(*) FILTER (WHERE source IS NULL OR source = 'direct') as direct
FROM profiles;

-- 7. Test viewet
SELECT * FROM campaign_stats;
