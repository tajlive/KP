-- Marketing CTA Events Table
-- Tracks clicks on marketing CTAs for conversion analytics

CREATE TABLE IF NOT EXISTS marketing_cta_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  tracking_id text NOT NULL,
  locale text NOT NULL DEFAULT 'no',
  variant text NOT NULL DEFAULT 'default',
  route text NOT NULL,
  href text NOT NULL,
  experiment_key text,
  variant_key text CHECK (variant_key IN ('A', 'B')),
  
  -- Metadata for debugging
  ip_address inet,
  user_agent text
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_marketing_cta_events_tracking_id 
  ON marketing_cta_events(tracking_id);

CREATE INDEX IF NOT EXISTS idx_marketing_cta_events_created_at 
  ON marketing_cta_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketing_cta_events_user_id 
  ON marketing_cta_events(user_id) 
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marketing_cta_events_experiment 
  ON marketing_cta_events(experiment_key, variant_key) 
  WHERE experiment_key IS NOT NULL;

-- RLS Policies
ALTER TABLE marketing_cta_events ENABLE ROW LEVEL SECURITY;

-- Only service role can insert (via edge function)
CREATE POLICY "Service role can insert marketing CTA events"
  ON marketing_cta_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Only service role can read all events
CREATE POLICY "Service role can read all marketing CTA events"
  ON marketing_cta_events
  FOR SELECT
  TO service_role
  USING (true);

-- Users can only see their own events (if any direct queries)
CREATE POLICY "Users can see own marketing CTA events"
  ON marketing_cta_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Function to get CTA click aggregates (for admin dashboard)
CREATE OR REPLACE FUNCTION get_cta_click_aggregates(
  p_days integer DEFAULT 30
)
RETURNS TABLE (
  tracking_id text,
  route text,
  total_clicks bigint,
  unique_users bigint,
  locale text,
  experiment_key text,
  variant_key text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.tracking_id,
    m.route,
    COUNT(*)::bigint as total_clicks,
    COUNT(DISTINCT m.user_id)::bigint as unique_users,
    m.locale,
    m.experiment_key,
    m.variant_key
  FROM marketing_cta_events m
  WHERE m.created_at >= now() - (p_days || ' days')::interval
  GROUP BY m.tracking_id, m.route, m.locale, m.experiment_key, m.variant_key
  ORDER BY total_clicks DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get daily CTA click trends
CREATE OR REPLACE FUNCTION get_cta_daily_trends(
  p_tracking_id text,
  p_days integer DEFAULT 30
)
RETURNS TABLE (
  date date,
  clicks bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(m.created_at) as date,
    COUNT(*)::bigint as clicks
  FROM marketing_cta_events m
  WHERE m.tracking_id = p_tracking_id
    AND m.created_at >= now() - (p_days || ' days')::interval
  GROUP BY DATE(m.created_at)
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON TABLE marketing_cta_events IS 'Tracks marketing CTA clicks for conversion analytics';
COMMENT ON COLUMN marketing_cta_events.tracking_id IS 'Unique identifier for the CTA (e.g., pricing-primary, paper-secondary)';
COMMENT ON COLUMN marketing_cta_events.experiment_key IS 'A/B test experiment identifier';
COMMENT ON COLUMN marketing_cta_events.variant_key IS 'A/B test variant (A or B)';
