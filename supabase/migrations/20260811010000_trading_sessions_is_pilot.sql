-- ═══════════════════════════════════════════════════════════════════════════
-- is_pilot-flagg for Pilot-sesjoner (mega-plan Fase 0, 2026-08-10)
--
-- FORMÅL: Skille Pilot-sesjoner (COMBO simple_grid) fra gamle sesjoner
-- i migreringsperioden («Parallel Universe»). Gjør det enkelt å filtrere,
-- måle og fase ut gamle strategier trygt.
--
-- IDEMPOTENT: kan kjøres flere ganger uten feil.
-- VENTER PÅ TOMS GODKJENNING FØR KJØRING (DB-er-hellig).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.trading_sessions
  ADD COLUMN IF NOT EXISTS is_pilot boolean NOT NULL DEFAULT false;

-- Gamle sesjoner er ikke Pilot (default false dekker alt eksisterende).
-- Nye Pilot-sesjoner settes til true av /api/pilot-ruten (se egen kodeendring).

-- Partial index: rask oppslag av kun Pilot-sesjoner per bruker
CREATE INDEX IF NOT EXISTS idx_trading_sessions_pilot
  ON public.trading_sessions (user_id)
  WHERE is_pilot = true;

-- Kommentar for dokumentasjon i DB
COMMENT ON COLUMN public.trading_sessions.is_pilot IS
  'true = Pilot-sesjon (COMBO simple_grid-strategi). false = gamle systemet. 2026-08-10.';
