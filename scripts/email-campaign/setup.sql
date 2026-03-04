-- ============================================
-- E-POST KAMPANJE DATABASE SETUP
-- Kjør dette i Supabase SQL Editor
-- ============================================

-- 1. Kontakter ( importert fra LinkedIn )
CREATE TABLE IF NOT EXISTS campaign_contacts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  company TEXT,
  position TEXT,
  source TEXT DEFAULT 'linkedin',
  status TEXT DEFAULT 'pending', -- pending, sent, opened, clicked, bounced, unsubscribed
  tags TEXT[] DEFAULT '{}',
  sequence INTEGER DEFAULT 1,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tracking events (åpninger, klikk)
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

-- 3. Kampanje-statistikk view
CREATE OR REPLACE VIEW campaign_stats AS
SELECT
  COUNT(*) as total_contacts,
  COUNT(*) FILTER (WHERE status = 'sent') as emails_sent,
  COUNT(*) FILTER (WHERE opened_at IS NOT NULL) as emails_opened,
  COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) as emails_clicked,
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

-- 4. Indexes for ytelse
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_status ON campaign_contacts(status);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_email ON campaign_contacts(email);
CREATE INDEX IF NOT EXISTS idx_email_tracking_contact ON email_tracking(contact_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_event ON email_tracking(event);

-- 5. RLS (Row Level Security)
ALTER TABLE campaign_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_tracking ENABLE ROW LEVEL SECURITY;

-- Kun service role kan lese/skrive (ikke vanlige brukere)
CREATE POLICY "Service role full access" ON campaign_contacts
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON email_tracking
  FOR ALL USING (auth.role() = 'service_role');

-- 6. Funksjon for å oppdatere updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_campaign_contacts_updated_at
  BEFORE UPDATE ON campaign_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FERDIG! Tabeller er klare for kampanjen
-- ============================================
