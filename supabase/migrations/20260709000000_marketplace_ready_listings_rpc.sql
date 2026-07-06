-- Lightweight stub RPC for marketplace catalog in the Trading Cockpit.
-- Returns published marketplace listings with materialized stats.
-- ADR: docs/adr/ADR-2026-07-cockpit-ai-guardrails.md
-- KLA-91: docs/adr/ADR-2026-03-20-KLA-91-strategy-marketplace.md

CREATE OR REPLACE FUNCTION public.get_marketplace_ready_listings(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  price_model text,
  price_nok numeric,
  category text,
  status text,
  return_30d_pct numeric,
  return_90d_pct numeric,
  max_drawdown_pct numeric,
  sharpe_ratio numeric,
  win_rate_pct numeric,
  risk_tier text,
  subscriber_count integer,
  rating numeric,
  review_count integer,
  seller_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ml.id,
    ml.title,
    ml.description,
    ml.price_model,
    ml.price_nok,
    ml.category,
    ml.status,
    mls.return_30d_pct,
    mls.return_90d_pct,
    mls.max_drawdown_pct,
    mls.sharpe_ratio,
    mls.win_rate_pct,
    mls.risk_tier,
    ml.subscriber_count,
    ml.rating,
    ml.review_count,
    ml.seller_id,
    ml.created_at,
    ml.updated_at
  FROM public.marketplace_listings ml
  LEFT JOIN public.marketplace_listing_stats mls ON mls.listing_id = ml.id
  WHERE ml.status = 'published'
  ORDER BY ml.created_at DESC
  LIMIT LEAST(p_limit, 100)
  OFFSET GREATEST(p_offset, 0);
$$;

GRANT EXECUTE ON FUNCTION public.get_marketplace_ready_listings(integer, integer)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.get_marketplace_ready_listings IS
  'Read-only catalog hook for the Trading Cockpit. Returns published marketplace listings with materialized stats.';
