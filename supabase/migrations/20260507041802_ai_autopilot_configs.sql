-- ============================================================================
-- MIGRASJON: KlarBot AI Autopilot — autonom trading agent
-- Dato: 2026-05-07
-- Mål: Én tabell for AI-konfigurasjon + RLS + pg_cron for daglig rebalansering
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- TABELL: ai_autopilot_configs
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.ai_autopilot_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Bruker-input (kun én gang ved aktivering)
  risk_appetite text NOT NULL CHECK (risk_appetite IN ('conservative','moderate','aggressive')),
  total_capital_nok numeric NOT NULL DEFAULT 100000,
  max_pairs integer NOT NULL DEFAULT 3,

  -- AI-generert (oppdateres ved hver rebalansering)
  detected_regime text,
  selected_strategy text,
  selected_pairs jsonb DEFAULT '[]'::jsonb,
  capital_per_pair jsonb DEFAULT '{}'::jsonb,

  -- Tilstandsmaskin
  status text NOT NULL DEFAULT 'paused'
    CHECK (status IN ('active','paused','stopped','paper_only')),
  started_at timestamptz,
  last_rebalance_at timestamptz,

  -- Performance-metrikker (oppdateres av rebalance-endepunkt)
  total_pnl_nok numeric DEFAULT 0,
  total_pnl_pct numeric DEFAULT 0,
  max_drawdown_pct numeric DEFAULT 0,
  win_rate numeric DEFAULT 0,

  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),

  -- Én autopilot per bruker
  UNIQUE(user_id)
);

-- Indekser for ytelse
CREATE INDEX IF NOT EXISTS idx_ai_autopilot_user_id ON public.ai_autopilot_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_autopilot_status ON public.ai_autopilot_configs(status);
CREATE INDEX IF NOT EXISTS idx_ai_autopilot_started_at ON public.ai_autopilot_configs(started_at)
  WHERE status = 'active';

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS: Bruker ser kun sin egen autopilot
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.ai_autopilot_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_autopilot_select_own" ON public.ai_autopilot_configs;
CREATE POLICY "ai_autopilot_select_own"
  ON public.ai_autopilot_configs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "ai_autopilot_insert_own" ON public.ai_autopilot_configs;
CREATE POLICY "ai_autopilot_insert_own"
  ON public.ai_autopilot_configs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "ai_autopilot_update_own" ON public.ai_autopilot_configs;
CREATE POLICY "ai_autopilot_update_own"
  ON public.ai_autopilot_configs
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "ai_autopilot_delete_own" ON public.ai_autopilot_configs;
CREATE POLICY "ai_autopilot_delete_own"
  ON public.ai_autopilot_configs
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Service role får full tilgang (for cron-jobs og server actions)
DROP POLICY IF EXISTS "ai_autopilot_service_all" ON public.ai_autopilot_configs;
CREATE POLICY "ai_autopilot_service_all"
  ON public.ai_autopilot_configs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGER: updated_at
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_ai_autopilot_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_autopilot_updated_at ON public.ai_autopilot_configs;

CREATE TRIGGER trg_ai_autopilot_updated_at
  BEFORE UPDATE ON public.ai_autopilot_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ai_autopilot_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- PG_CRON: Daglig rebalansering kl 06:00 UTC
-- ═══════════════════════════════════════════════════════════════════════════

SELECT cron.schedule(
  'klarpakke-autopilot-rebalance',
  '0 6 * * *',
  $$SELECT klarpakke_trigger_cron('/api/ai/autopilot/rebalance')$$
);

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFIKASJON
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE 'KlarBot AI Autopilot: Tabell + RLS + cron opprettet';
END $$;
