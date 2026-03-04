-- ============================================
-- KAMPANJE TRACKING - 100 STUDENTER PÅ 24 TIMER
-- ============================================

-- 1. Utvid profiles med source tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'direct';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referrer TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS utm_source TEXT;

-- 2. Kampanje-kontakter (for e-post kampanje)
CREATE TABLE IF NOT EXISTS campaign_contacts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  company TEXT,
  position TEXT,
  source TEXT DEFAULT 'linkedin',
  status TEXT DEFAULT 'pending', -- pending, sent, opened, clicked, bounced, unsubscribed, registered
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

-- 3. E-post tracking events
CREATE TABLE IF NOT EXISTS email_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id TEXT REFERENCES campaign_contacts(id) ON DELETE CASCADE,
  email TEXT,
  sequence INTEGER,
  event TEXT NOT NULL, -- 'open', 'click', 'bounce', 'unsubscribe'
  url TEXT,
  user_agent TEXT,
  ip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Kampanje-statistikk view
CREATE OR REPLACE VIEW campaign_stats AS
SELECT
  COUNT(*) as total_contacts,
  COUNT(*) FILTER (WHERE status = 'sent') as emails_sent,
  COUNT(*) FILTER (WHERE opened_at IS NOT NULL) as emails_opened,
  COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) as emails_clicked,
  COUNT(*) FILTER (WHERE status = 'registered') as registered,
  COUNT(*) FILTER (WHERE status = 'bounced') as bounced,
  COUNT(*) FILTER (WHERE status = 'unsubscribed') as unsubscribed,
  ROUND(
    COUNT(*) FILTER (WHERE opened_at IS NOT NULL) * 100.0 / 
    NULLIF(COUNT(*) FILTER (WHERE status = 'sent'), 0), 2
  ) as open_rate,
  ROUND(
    COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) * 100.0 / 
    NULLIF(COUNT(*) FILTER (WHERE status = 'sent'), 0), 2
  ) as click_rate
FROM campaign_contacts;

-- 5. Indexes for ytelse
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_status ON campaign_contacts(status);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_email ON campaign_contacts(email);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_source ON campaign_contacts(source);
CREATE INDEX IF NOT EXISTS idx_email_tracking_contact ON email_tracking(contact_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_event ON email_tracking(event);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_source ON profiles(source);

-- 6. RLS (Row Level Security)
ALTER TABLE campaign_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_tracking ENABLE ROW LEVEL SECURITY;

-- Kun service role kan lese/skrive
CREATE POLICY "Service role full access" ON campaign_contacts
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON email_tracking
  FOR ALL USING (auth.role() = 'service_role');

-- 7. Funksjon for å oppdatere updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_campaign_contacts_updated_at ON campaign_contacts;
CREATE TRIGGER update_campaign_contacts_updated_at
  BEFORE UPDATE ON campaign_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Funksjon for å tracke nye registreringer
CREATE OR REPLACE FUNCTION track_campaign_registration()
RETURNS TRIGGER AS $$
BEGIN
  -- Oppdater campaign_contacts hvis e-posten finnes der
  UPDATE campaign_contacts
  SET 
    status = 'registered',
    registered_at = NOW(),
    updated_at = NOW()
  WHERE email = NEW.email;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Trigger for nye registreringer
DROP TRIGGER IF EXISTS track_new_registration ON profiles;
CREATE TRIGGER track_new_registration
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION track_campaign_registration();

-- ============================================
-- FERDIG! Nå kan du tracke kampanjen i real-time
-- ============================================
