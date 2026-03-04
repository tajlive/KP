-- MANUAL SETUP: Run this in Supabase Dashboard SQL Editor
-- This creates visitor analytics tables if they don't exist from migration

-- ============================================
-- PAGE VISITS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS page_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  time_spent_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for page_visits
CREATE INDEX IF NOT EXISTS idx_page_visits_created_at ON page_visits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_visits_path ON page_visits(path);
CREATE INDEX IF NOT EXISTS idx_page_visits_user_id ON page_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_page_visits_session_id ON page_visits(session_id);

-- RLS for page_visits
ALTER TABLE page_visits ENABLE ROW LEVEL SECURITY;

-- Only admins can view all page visits
DROP POLICY IF EXISTS "Admins can view all page visits" ON page_visits;
CREATE POLICY "Admins can view all page visits"
  ON page_visits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert allowed for all (anonymous tracking)
DROP POLICY IF EXISTS "Anyone can insert page visits" ON page_visits;
CREATE POLICY "Anyone can insert page visits"
  ON page_visits FOR INSERT
  WITH CHECK (true);

-- ============================================
-- ANALYTICS EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  visitor_id TEXT,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  page_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics_events
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);

-- RLS for analytics_events
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all analytics events" ON analytics_events;
CREATE POLICY "Admins can view all analytics events"
  ON analytics_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Anyone can insert analytics events" ON analytics_events;
CREATE POLICY "Anyone can insert analytics events"
  ON analytics_events FOR INSERT
  WITH CHECK (true);

-- ============================================
-- RPC FUNCTIONS
-- ============================================

-- Track page view
CREATE OR REPLACE FUNCTION track_page_view(...)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_visit_id UUID;
BEGIN
  INSERT INTO page_visits (user_id, session_id, path, referrer, user_agent, ip_hash)
  VALUES ($1, $2, $3, $4, $5, $6)
  RETURNING id INTO v_visit_id;
  RETURN v_visit_id;
END;
$$;

SELECT 'Visitor analytics setup complete!' as status;
