-- ============================================================================
-- MIGRASJON: Koble trading_sessions til ai_autopilot_configs (B2-merge)
-- Dato: 2026-05-07
-- Mål: Én kilde til sannhet — trading_sessions vet hvilken autopilot den tilhører
-- ============================================================================

-- Legg til autopilot_id for å koble trading_sessions til ai_autopilot_configs
ALTER TABLE public.trading_sessions
  ADD COLUMN IF NOT EXISTS autopilot_id uuid REFERENCES public.ai_autopilot_configs(id) ON DELETE SET NULL;

-- Index for rask lookup
CREATE INDEX IF NOT EXISTS idx_trading_sessions_autopilot_id ON public.trading_sessions(autopilot_id);

-- Verifikasjon
DO $$
BEGIN
  RAISE NOTICE 'trading_sessions: autopilot_id kolonne lagt til';
END $$;
