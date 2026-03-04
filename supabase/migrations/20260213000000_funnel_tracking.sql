-- Funnel tracking for signup conversion analysis
CREATE TABLE IF NOT EXISTS public.signup_funnel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'page_view', 'form_start', 'erfaring_selected', 'laeringsmaal_selected', 'email_entered', 'submit_attempted', 'success', 'error'
  step_number INTEGER, -- 1=page_view, 2=form_start, 3=erfaring, 4=laeringsmaal, 5=email, 6=submit, 7=success
  metadata JSONB DEFAULT '{}', -- {erfaring: '...', laeringsmaal_count: 2, error_type: '...'}
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_signup_funnel_session ON signup_funnel(session_id);
CREATE INDEX IF NOT EXISTS idx_signup_funnel_event_type ON signup_funnel(event_type);
CREATE INDEX IF NOT EXISTS idx_signup_funnel_created_at ON signup_funnel(created_at DESC);

-- Enable RLS
ALTER TABLE signup_funnel ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (for tracking)
CREATE POLICY "Anyone can track funnel"
  ON signup_funnel FOR INSERT
  WITH CHECK (true);

-- Policy: Only admins can read
CREATE POLICY "Admins can view funnel"
  ON signup_funnel FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- View for conversion statistics
CREATE OR REPLACE VIEW public.signup_funnel_stats AS
WITH funnel_steps AS (
  SELECT 
    event_type,
    step_number,
    COUNT(DISTINCT session_id) as unique_users,
    COUNT(*) as total_events
  FROM signup_funnel
  WHERE created_at > NOW() - INTERVAL '30 days'
  GROUP BY event_type, step_number
  ORDER BY step_number
)
SELECT 
  event_type,
  step_number,
  unique_users,
  total_events,
  ROUND(100.0 * unique_users / NULLIF((SELECT unique_users FROM funnel_steps WHERE event_type = 'page_view'), 0), 2) as conversion_rate
FROM funnel_steps;

-- Function to get funnel drop-off
CREATE OR REPLACE FUNCTION public.get_funnel_dropoff()
RETURNS TABLE (
  step_name TEXT,
  reached_count BIGINT,
  dropped_off_count BIGINT,
  dropoff_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH step_counts AS (
    SELECT 
      event_type,
      COUNT(DISTINCT session_id) as unique_users
    FROM signup_funnel
    WHERE created_at > NOW() - INTERVAL '7 days'
    GROUP BY event_type
  ),
  step_order AS (
    SELECT unnest(ARRAY['page_view', 'form_start', 'erfaring_selected', 'laeringsmaal_selected', 'email_entered', 'submit_attempted', 'success']) as step_name,
           generate_series(1, 7) as step_order
  )
  SELECT 
    so.step_name,
    COALESCE(sc.unique_users, 0) as reached_count,
    COALESCE(LAG(sc.unique_users) OVER (ORDER BY so.step_order) - sc.unique_users, 0) as dropped_off_count,
    CASE 
      WHEN LAG(sc.unique_users) OVER (ORDER BY so.step_order) > 0 
      THEN ROUND(100.0 * (LAG(sc.unique_users) OVER (ORDER BY so.step_order) - sc.unique_users) / LAG(sc.unique_users) OVER (ORDER BY so.step_order), 2)
      ELSE 0
    END as dropoff_rate
  FROM step_order so
  LEFT JOIN step_counts sc ON sc.event_type = so.step_name
  ORDER BY so.step_order;
END;
$$ LANGUAGE plpgsql;
