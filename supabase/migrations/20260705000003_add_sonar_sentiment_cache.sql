-- ============================================================================
-- MIGRASJON: Sonar sentiment cache
-- Dato: 2026-07-05
-- Mål: Cache for Perplexity Sonar Pro markedsentiment per symbol
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- TABELL: sonar_sentiment_cache
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.sonar_sentiment_cache (
  symbol text PRIMARY KEY,
  confidence numeric NOT NULL,
  recommendation text NOT NULL CHECK (recommendation IN ('buy', 'hold', 'avoid')),
  sentiment_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);
-- ═══════════════════════════════════════════════════════════════════════════
-- INDEKSER
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_sonar_sentiment_cache_recommendation
  ON public.sonar_sentiment_cache(recommendation);
CREATE INDEX IF NOT EXISTS idx_sonar_sentiment_cache_created_at
  ON public.sonar_sentiment_cache(created_at DESC);
-- ═══════════════════════════════════════════════════════════════════════════
-- RLS: Global cache — authenticated users kan lese/oppdatere, service_role alt
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.sonar_sentiment_cache ENABLE ROW LEVEL SECURITY;
-- Authenticated users can read global sentiment cache
DROP POLICY IF EXISTS "sonar_sentiment_cache_select_authenticated" ON public.sonar_sentiment_cache;
CREATE POLICY "sonar_sentiment_cache_select_authenticated"
  ON public.sonar_sentiment_cache
  FOR SELECT
  TO authenticated
  USING (true);
-- Authenticated users can insert sentiment cache entries
DROP POLICY IF EXISTS "sonar_sentiment_cache_insert_authenticated" ON public.sonar_sentiment_cache;
CREATE POLICY "sonar_sentiment_cache_insert_authenticated"
  ON public.sonar_sentiment_cache
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
-- Authenticated users can update sentiment cache entries
DROP POLICY IF EXISTS "sonar_sentiment_cache_update_authenticated" ON public.sonar_sentiment_cache;
CREATE POLICY "sonar_sentiment_cache_update_authenticated"
  ON public.sonar_sentiment_cache
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
-- Service role full access (for Edge Functions and server-side operations)
DROP POLICY IF EXISTS "Service role full access sonar_sentiment_cache" ON public.sonar_sentiment_cache;
CREATE POLICY "Service role full access sonar_sentiment_cache"
  ON public.sonar_sentiment_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGER: updated_at
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_sonar_sentiment_cache_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sonar_sentiment_cache_updated_at ON public.sonar_sentiment_cache;
CREATE TRIGGER trg_sonar_sentiment_cache_updated_at
  BEFORE UPDATE ON public.sonar_sentiment_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sonar_sentiment_cache_updated_at();
-- ═══════════════════════════════════════════════════════════════════════════
-- GRANTS
-- ═══════════════════════════════════════════════════════════════════════════

GRANT SELECT, INSERT, UPDATE ON public.sonar_sentiment_cache TO authenticated;
GRANT ALL ON public.sonar_sentiment_cache TO service_role;
