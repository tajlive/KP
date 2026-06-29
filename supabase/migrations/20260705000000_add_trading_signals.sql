-- ============================================================================
-- KLARPAKKE: add public.trading_signals
-- ============================================================================
-- Global signal feed consumed by the dashboard signal preview, signal feed,
-- ensemble AI dashboard, and the tick engine (ensemble_ai path).
--
-- Sources:
--   - src/types/supabase.ts (trading_signals type definition)
--   - supabase/migrations/20260416020000_ensemble_ai_v2_tables.sql
--   - supabase/migrations/20260416160000_trading_signals_signal_type_ensemble_ai.sql
--   - supabase/migrations/20260430190000_performance_optimizations.sql
--   - supabase/migrations/20260318120001_signal_engine_every_5min_and_realtime.sql
-- ============================================================================

SET statement_timeout = '30s';
-- ============================================================================
-- 1. TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.trading_signals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol            TEXT NOT NULL,
  action            TEXT,
  asset_name        TEXT,
  confidence        REAL,
  entry_price       REAL,
  stop_loss         REAL,
  target_price      REAL,
  reasoning         TEXT,
  signal_type       TEXT,
  status            TEXT,
  risk_level        REAL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ,
  ensemble_run_id   UUID,
  agent_id          TEXT,
  agent_weight      REAL,
  model_version     TEXT,
  feature_version   TEXT,
  agent_meta        JSONB
);
-- Idempotent CHECK constraint for signal_type.
ALTER TABLE public.trading_signals
DROP CONSTRAINT IF EXISTS trading_signals_signal_type_check;
ALTER TABLE public.trading_signals
ADD CONSTRAINT trading_signals_signal_type_check
CHECK (signal_type = ANY (ARRAY['ai'::text, 'technical'::text, 'news'::text, 'manual'::text, 'ensemble_ai'::text]));
-- ============================================================================
-- 2. INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_trading_signals_signal_type_agent
  ON public.trading_signals (signal_type, agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trading_signals_created_at
  ON public.trading_signals (created_at DESC);
-- ============================================================================
-- 3. REALTIME
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'trading_signals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trading_signals;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Realtime trading_signals: %', SQLERRM;
END $$;
-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.trading_signals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view trading signals" ON public.trading_signals;
CREATE POLICY "Authenticated users can view trading signals"
  ON public.trading_signals FOR SELECT
  USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Service role can manage trading signals" ON public.trading_signals;
CREATE POLICY "Service role can manage trading signals"
  ON public.trading_signals FOR ALL
  USING (auth.role() = 'service_role');
-- ============================================================================
-- 5. GRANTS
-- ============================================================================
GRANT SELECT ON public.trading_signals TO authenticated;
GRANT ALL ON public.trading_signals TO service_role;
-- ============================================================================
-- 6. COMMENTS
-- ============================================================================
COMMENT ON TABLE public.trading_signals IS 'Global trading signal feed (AI, technical, news, manual, ensemble_ai).';
