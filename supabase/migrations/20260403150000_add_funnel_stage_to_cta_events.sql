-- Add funnel_stage column to marketing_cta_events
ALTER TABLE marketing_cta_events 
ADD COLUMN IF NOT EXISTS funnel_stage text 
CHECK (funnel_stage IN ('landing', 'paper', 'pricing', 'course', 'signup', 'general'))
DEFAULT 'general';

-- Create index for funnel queries
CREATE INDEX IF NOT EXISTS idx_marketing_cta_funnel 
ON marketing_cta_events(funnel_stage, created_at DESC);

-- Create materialized view for funnel summary
CREATE MATERIALIZED VIEW IF NOT EXISTS marketing_funnel_summary AS
WITH cta_clicks AS (
  SELECT 
    tracking_id,
    variant_key,
    experiment_key,
    funnel_stage,
    user_id,
    session_id,
    created_at,
    route
  FROM marketing_cta_events
  WHERE created_at >= now() - interval '90 days'
),
user_signups AS (
  -- Users who signed up within 7 days of a CTA click
  SELECT DISTINCT
    c.tracking_id,
    c.variant_key,
    c.experiment_key,
    c.user_id,
    c.created_at as clicked_at,
    u.created_at as signed_up_at
  FROM cta_clicks c
  JOIN auth.users u ON u.id = c.user_id
  WHERE u.created_at > c.created_at
    AND u.created_at <= c.created_at + interval '7 days'
),
first_paper_sessions AS (
  -- Users with first paper trading session within 14 days of CTA click
  SELECT DISTINCT
    c.tracking_id,
    c.variant_key,
    c.experiment_key,
    c.user_id,
    c.created_at as clicked_at,
    MIN(ts.created_at) as first_session_at
  FROM cta_clicks c
  JOIN trading_sessions ts ON ts.user_id = c.user_id
  WHERE ts.mode = 'paper'
    AND ts.created_at > c.created_at
    AND ts.created_at <= c.created_at + interval '14 days'
  GROUP BY c.tracking_id, c.variant_key, c.experiment_key, c.user_id, c.created_at
),
first_auto_trades AS (
  -- Users with first auto-trade within 30 days of CTA click
  SELECT DISTINCT
    c.tracking_id,
    c.variant_key,
    c.experiment_key,
    c.user_id,
    c.created_at as clicked_at,
    MIN(ats.created_at) as first_auto_trade_at
  FROM cta_clicks c
  JOIN auto_trade_settings ats ON ats.user_id = c.user_id
  WHERE ats.created_at > c.created_at
    AND ats.created_at <= c.created_at + interval '30 days'
  GROUP BY c.tracking_id, c.variant_key, c.experiment_key, c.user_id, c.created_at
)
SELECT 
  c.tracking_id,
  c.variant_key,
  c.experiment_key,
  c.funnel_stage,
  COUNT(DISTINCT c.user_id) as total_clicks,
  COUNT(DISTINCT us.user_id) as users_signed_up,
  COUNT(DISTINCT fps.user_id) as users_with_first_paper,
  COUNT(DISTINCT fat.user_id) as users_with_first_auto_trade,
  MIN(c.created_at) as first_click_at,
  MAX(c.created_at) as last_click_at
FROM cta_clicks c
LEFT JOIN user_signups us ON us.tracking_id = c.tracking_id 
  AND us.variant_key IS NOT DISTINCT FROM c.variant_key
  AND us.experiment_key IS NOT DISTINCT FROM c.experiment_key
  AND us.user_id = c.user_id
LEFT JOIN first_paper_sessions fps ON fps.tracking_id = c.tracking_id
  AND fps.variant_key IS NOT DISTINCT FROM c.variant_key
  AND fps.experiment_key IS NOT DISTINCT FROM c.experiment_key
  AND fps.user_id = c.user_id
LEFT JOIN first_auto_trades fat ON fat.tracking_id = c.tracking_id
  AND fat.variant_key IS NOT DISTINCT FROM c.variant_key
  AND fat.experiment_key IS NOT DISTINCT FROM c.experiment_key
  AND fat.user_id = c.user_id
GROUP BY c.tracking_id, c.variant_key, c.experiment_key, c.funnel_stage;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_funnel_summary_pk 
ON marketing_funnel_summary(tracking_id, COALESCE(variant_key, ''), COALESCE(experiment_key, ''));

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_marketing_funnel_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY marketing_funnel_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON COLUMN marketing_cta_events.funnel_stage IS 'Which funnel stage this CTA belongs to: landing, paper, pricing, course, signup, general';
COMMENT ON MATERIALIZED VIEW marketing_funnel_summary IS 'Aggregated funnel metrics: clicks -> signup -> paper session -> auto trade';
