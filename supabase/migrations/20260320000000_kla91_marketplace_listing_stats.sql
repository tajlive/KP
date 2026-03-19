-- KLA-91: Marketplace listing stats (materialiserte felt for filter/sort) + copy-spor
-- ADR: docs/adr/ADR-2026-03-20-KLA-91-strategy-marketplace.md
-- Skriv til denne tabellen kun via service_role / cron — ikke fra authenticated.

-- ── 1) Stats-tabell (1:1 med marketplace_listings) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.marketplace_listing_stats (
  listing_id uuid NOT NULL
    REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  return_30d_pct   numeric,
  return_90d_pct    numeric,
  max_drawdown_pct  numeric,
  sharpe_ratio      numeric,
  win_rate_pct      numeric,
  risk_tier         text NOT NULL DEFAULT 'medium'
    CHECK (risk_tier IN ('low', 'medium', 'high')),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketplace_listing_stats_pkey PRIMARY KEY (listing_id)
);

CREATE INDEX IF NOT EXISTS idx_listing_stats_risk_return
  ON public.marketplace_listing_stats (risk_tier, return_30d_pct DESC NULLS LAST);

ALTER TABLE public.marketplace_listing_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stats_select_published_listings" ON public.marketplace_listing_stats;
CREATE POLICY "stats_select_published_listings"
  ON public.marketplace_listing_stats
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.marketplace_listings ml
      WHERE ml.id = marketplace_listing_stats.listing_id
        AND (ml.status = 'published' OR ml.seller_id = auth.uid())
    )
  );

COMMENT ON TABLE public.marketplace_listing_stats IS
  'Materialiserte markedsplass-statistikker; oppdateres av server/cron, ikke direkte fra klient.';

-- ── 2) Copy-spor: user_strategies ────────────────────────────────────────────
ALTER TABLE public.user_strategies
  ADD COLUMN IF NOT EXISTS copied_from_listing_id uuid
    REFERENCES public.marketplace_listings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_strategies_copied_from_listing
  ON public.user_strategies (copied_from_listing_id)
  WHERE copied_from_listing_id IS NOT NULL;

-- ── 3) Copy-spor: trading_sessions (app bruker denne for paper/live bot) ─────
ALTER TABLE public.trading_sessions
  ADD COLUMN IF NOT EXISTS copied_from_listing_id uuid
    REFERENCES public.marketplace_listings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_trading_sessions_copied_from_listing
  ON public.trading_sessions (copied_from_listing_id)
  WHERE copied_from_listing_id IS NOT NULL;

-- ── 4) Realtime (idempotent) ─────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'marketplace_listings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_listings;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'marketplace_listing_stats'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_listing_stats;
  END IF;
END $$;
