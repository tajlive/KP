-- Migration: Visitor Analytics for LinkedIn Premium-style features
-- Created: 2025-02-13

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

CREATE POLICY "Admins can view all analytics events"
  ON analytics_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Anyone can insert analytics events"
  ON analytics_events FOR INSERT
  WITH CHECK (true);

-- ============================================
-- RPC FUNCTIONS
-- ============================================

-- Track page view
CREATE OR REPLACE FUNCTION track_page_view(
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_page_path TEXT DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_ip_hash TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_visit_id UUID;
BEGIN
  INSERT INTO page_visits (
    user_id,
    session_id,
    path,
    referrer,
    user_agent,
    ip_hash
  ) VALUES (
    p_user_id,
    p_session_id,
    p_page_path,
    p_referrer,
    p_user_agent,
    p_ip_hash
  )
  RETURNING id INTO v_visit_id;
  
  RETURN v_visit_id;
END;
$$;

-- Get unique visitors count
CREATE OR REPLACE FUNCTION get_unique_visitors(start_date TIMESTAMPTZ)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT COALESCE(session_id, ip_hash, id::text))
  INTO v_count
  FROM page_visits
  WHERE created_at >= start_date;
  
  RETURN v_count;
END;
$$;

-- Get top pages
CREATE OR REPLACE FUNCTION get_top_pages(
  start_date TIMESTAMPTZ,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  path TEXT,
  visits BIGINT,
  unique_visitors BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pv.path,
    COUNT(*)::BIGINT as visits,
    COUNT(DISTINCT COALESCE(pv.session_id, pv.ip_hash, pv.id::text))::BIGINT as unique_visitors
  FROM page_visits pv
  WHERE pv.created_at >= start_date
  GROUP BY pv.path
  ORDER BY visits DESC
  LIMIT limit_count;
END;
$$;

-- Get visitor stats by time range
CREATE OR REPLACE FUNCTION get_visitor_stats(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_visits BIGINT,
  unique_visitors BIGINT,
  avg_time_spent NUMERIC,
  authenticated_visits BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_visits,
    COUNT(DISTINCT COALESCE(session_id, ip_hash, id::text))::BIGINT as unique_visitors,
    AVG(time_spent_seconds)::NUMERIC as avg_time_spent,
    COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END)::BIGINT as authenticated_visits
  FROM page_visits
  WHERE created_at BETWEEN p_start_date AND p_end_date;
END;
$$;

-- Get recent visitors with user info
CREATE OR REPLACE FUNCTION get_recent_visitors(
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  visit_id UUID,
  path TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ,
  user_email TEXT,
  user_name TEXT,
  is_authenticated BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pv.id as visit_id,
    pv.path,
    pv.referrer,
    pv.created_at,
    u.email as user_email,
    p.full_name as user_name,
    (pv.user_id IS NOT NULL) as is_authenticated
  FROM page_visits pv
  LEFT JOIN auth.users u ON pv.user_id = u.id
  LEFT JOIN profiles p ON pv.user_id = p.id
  ORDER BY pv.created_at DESC
  LIMIT limit_count;
END;
$$;

-- Update time spent on page (call when user navigates away)
CREATE OR REPLACE FUNCTION update_visit_time_spent(
  p_visit_id UUID,
  p_time_spent_seconds INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE page_visits
  SET time_spent_seconds = p_time_spent_seconds
  WHERE id = p_visit_id;
END;
$$;

-- ============================================
-- ADMIN VIEW FOR VISITOR ANALYTICS
-- ============================================
CREATE OR REPLACE VIEW admin_visitor_analytics AS
SELECT 
  pv.id,
  pv.path,
  pv.user_id,
  pv.session_id,
  pv.referrer,
  pv.user_agent,
  pv.time_spent_seconds,
  pv.created_at,
  p.email as user_email,
  p.full_name as user_name,
  p.role as user_role
FROM page_visits pv
LEFT JOIN profiles p ON pv.user_id = p.id
ORDER BY pv.created_at DESC;

-- Grant access to admin view
GRANT SELECT ON admin_visitor_analytics TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE page_visits IS 'Tracks page visits for analytics - LinkedIn Premium style visitor tracking';
COMMENT ON TABLE analytics_events IS 'Custom analytics events (clicks, scroll depth, conversions)';
COMMENT ON FUNCTION track_page_view IS 'Insert a new page visit record';
COMMENT ON FUNCTION get_unique_visitors IS 'Get count of unique visitors since given date';
COMMENT ON FUNCTION get_top_pages IS 'Get most visited pages with counts';
