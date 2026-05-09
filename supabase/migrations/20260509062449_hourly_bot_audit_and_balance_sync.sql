-- ============================================================================
-- MIGRASJON: Timevis balanse-synk + bot-audit + konsistens-sjekk
-- Dato: 2026-05-09
-- Mål: Automatisk synk av balanser, konsistens-sjekk, og autopilot-helse hver time
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. TABELL: Audit-logg for konsistens-avvik
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.balance_sync_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  check_type text NOT NULL CHECK (check_type IN ('balance_mismatch', 'autopilot_health', 'bot_count')),
  status text NOT NULL CHECK (status IN ('ok', 'warning', 'error')),
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT NOW(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_balance_sync_audit_user_id ON public.balance_sync_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_sync_audit_created_at ON public.balance_sync_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_balance_sync_audit_unresolved ON public.balance_sync_audit(resolved_at) WHERE resolved_at IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. FUNKSJON: Synk alle brukeres balanser
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.klarpakke_hourly_balance_sync();

CREATE OR REPLACE FUNCTION public.klarpakke_hourly_balance_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_session_capital NUMERIC;
  v_synced_count INTEGER := 0;
BEGIN
  FOR v_user IN
    SELECT DISTINCT user_id FROM public.trading_sessions WHERE mode = 'paper' AND status IN ('active', 'stopped')
  LOOP
    SELECT COALESCE(SUM(current_capital_nok), 0)
    INTO v_session_capital
    FROM public.trading_sessions
    WHERE user_id = v_user.user_id AND mode = 'paper' AND status IN ('active', 'stopped');

    -- Sync til user_profiles
    UPDATE public.user_profiles
    SET paper_balance = v_session_capital, updated_at = NOW()
    WHERE id = v_user.user_id AND paper_balance IS DISTINCT FROM v_session_capital;

    -- Sync til wallets
    UPDATE public.wallets
    SET balance = v_session_capital, updated_at = NOW()
    WHERE user_id = v_user.user_id AND balance IS DISTINCT FROM v_session_capital;

    -- Sync til portfolios
    UPDATE public.portfolios
    SET current_balance = v_session_capital, updated_at = NOW()
    WHERE user_id = v_user.user_id AND current_balance IS DISTINCT FROM v_session_capital;

    IF FOUND THEN
      v_synced_count := v_synced_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'klarpakke_hourly_balance_sync: synket % brukere', v_synced_count;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. FUNKSJON: Konsistens-sjekk — session_capital vs profile/wallet/portfolio
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.klarpakke_hourly_consistency_check();

CREATE OR REPLACE FUNCTION public.klarpakke_hourly_consistency_check()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_session_capital NUMERIC;
  v_profile_balance NUMERIC;
  v_wallet_balance NUMERIC;
  v_portfolio_balance NUMERIC;
  v_mismatch_count INTEGER := 0;
BEGIN
  FOR v_user IN
    SELECT DISTINCT user_id FROM public.trading_sessions WHERE mode = 'paper' AND status IN ('active', 'stopped')
  LOOP
    SELECT COALESCE(SUM(current_capital_nok), 0)
    INTO v_session_capital
    FROM public.trading_sessions
    WHERE user_id = v_user.user_id AND mode = 'paper' AND status IN ('active', 'stopped');

    SELECT paper_balance INTO v_profile_balance FROM public.user_profiles WHERE id = v_user.user_id;
    SELECT COALESCE(SUM(balance), 0) INTO v_wallet_balance FROM public.wallets WHERE user_id = v_user.user_id;
    SELECT COALESCE(SUM(current_balance), 0) INTO v_portfolio_balance FROM public.portfolios WHERE user_id = v_user.user_id;

    -- Tillat 1 NOK avrundingsfeil
    IF ABS(v_session_capital - COALESCE(v_profile_balance, 0)) > 1
       OR ABS(v_session_capital - COALESCE(v_wallet_balance, 0)) > 1
       OR ABS(v_session_capital - COALESCE(v_portfolio_balance, 0)) > 1
    THEN
      INSERT INTO public.balance_sync_audit (user_id, check_type, status, details)
      VALUES (
        v_user.user_id,
        'balance_mismatch',
        'error',
        jsonb_build_object(
          'session_capital', v_session_capital,
          'profile_balance', v_profile_balance,
          'wallet_balance', v_wallet_balance,
          'portfolio_balance', v_portfolio_balance,
          'diff_session_profile', v_session_capital - COALESCE(v_profile_balance, 0),
          'diff_session_wallet', v_session_capital - COALESCE(v_wallet_balance, 0),
          'diff_session_portfolio', v_session_capital - COALESCE(v_portfolio_balance, 0)
        )
      );
      v_mismatch_count := v_mismatch_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'klarpakke_hourly_consistency_check: % avvik funnet', v_mismatch_count;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. FUNKSJON: Autopilot-helse — sessions vs max_pairs, drawdown, siste trade
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.klarpakke_hourly_autopilot_health();

CREATE OR REPLACE FUNCTION public.klarpakke_hourly_autopilot_health()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ap RECORD;
  v_session_count INTEGER;
  v_last_trade_at timestamptz;
  v_hours_since_trade INTEGER;
BEGIN
  FOR v_ap IN
    SELECT
      id, user_id, status, max_pairs, total_pnl_pct, max_drawdown_pct,
      win_rate, total_capital_nok, last_rebalance_at, started_at
    FROM public.ai_autopilot_configs
    WHERE status = 'active'
  LOOP
    -- Sjekk antall aktive sessions vs max_pairs
    SELECT COUNT(*) INTO v_session_count
    FROM public.trading_sessions
    WHERE user_id = v_ap.user_id AND status = 'active' AND mode = 'paper';

    IF v_session_count > v_ap.max_pairs THEN
      INSERT INTO public.balance_sync_audit (user_id, check_type, status, details)
      VALUES (
        v_ap.user_id,
        'autopilot_health',
        'warning',
        jsonb_build_object(
          'issue', 'too_many_sessions',
          'session_count', v_session_count,
          'max_pairs', v_ap.max_pairs,
          'autopilot_id', v_ap.id
        )
      );
    END IF;

    -- Sjekk om autopilot har tradet siste 24 timer
    SELECT MAX(executed_at) INTO v_last_trade_at
    FROM public.trades
    WHERE user_id = v_ap.user_id AND mode = 'paper';

    v_hours_since_trade := EXTRACT(EPOCH FROM (NOW() - COALESCE(v_last_trade_at, v_ap.started_at))) / 3600;

    IF v_hours_since_trade > 24 THEN
      INSERT INTO public.balance_sync_audit (user_id, check_type, status, details)
      VALUES (
        v_ap.user_id,
        'autopilot_health',
        'warning',
        jsonb_build_object(
          'issue', 'no_trades_24h',
          'hours_since_trade', v_hours_since_trade,
          'last_trade_at', v_last_trade_at,
          'autopilot_id', v_ap.id
        )
      );
    END IF;

    -- Sjekk høy drawdown (>10% pauser autopilot, men vi logger ved 8%)
    IF v_ap.max_drawdown_pct > 8 THEN
      INSERT INTO public.balance_sync_audit (user_id, check_type, status, details)
      VALUES (
        v_ap.user_id,
        'autopilot_health',
        'error',
        jsonb_build_object(
          'issue', 'high_drawdown',
          'max_drawdown_pct', v_ap.max_drawdown_pct,
          'total_pnl_pct', v_ap.total_pnl_pct,
          'autopilot_id', v_ap.id
        )
      );
    END IF;

    -- Sjekk negativ PnL etter 48+ timer
    IF v_ap.total_pnl_pct < -2 AND v_ap.started_at < NOW() - INTERVAL '48 hours' THEN
      INSERT INTO public.balance_sync_audit (user_id, check_type, status, details)
      VALUES (
        v_ap.user_id,
        'autopilot_health',
        'warning',
        jsonb_build_object(
          'issue', 'negative_pnl_after_48h',
          'total_pnl_pct', v_ap.total_pnl_pct,
          'started_at', v_ap.started_at,
          'autopilot_id', v_ap.id
        )
      );
    END IF;
  END LOOP;

  RAISE NOTICE 'klarpakke_hourly_autopilot_health: fullført';
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. PG_CRON: Timevis kjøring (hver time ved :05)
-- ═══════════════════════════════════════════════════════════════════════════

-- Idempotent: unschedule hvis finnes, deretter schedule
DO $$
BEGIN
  PERFORM cron.unschedule('klarpakke-hourly-balance-sync');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Job klarpakke-hourly-balance-sync did not exist';
END $$;
SELECT cron.schedule(
  'klarpakke-hourly-balance-sync',
  '5 * * * *',
  $$SELECT klarpakke_hourly_balance_sync()$$
);

DO $$
BEGIN
  PERFORM cron.unschedule('klarpakke-hourly-consistency-check');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Job klarpakke-hourly-consistency-check did not exist';
END $$;
SELECT cron.schedule(
  'klarpakke-hourly-consistency-check',
  '10 * * * *',
  $$SELECT klarpakke_hourly_consistency_check()$$
);

DO $$
BEGIN
  PERFORM cron.unschedule('klarpakke-hourly-autopilot-health');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Job klarpakke-hourly-autopilot-health did not exist';
END $$;
SELECT cron.schedule(
  'klarpakke-hourly-autopilot-health',
  '15 * * * *',
  $$SELECT klarpakke_hourly_autopilot_health()$$
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. RPC: Hent audit-logg for en bruker (dashboard-integrasjon)
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.get_balance_sync_audit(uuid, integer);

CREATE OR REPLACE FUNCTION public.get_balance_sync_audit(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  check_type TEXT,
  status TEXT,
  details JSONB,
  created_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, check_type, status, details, created_at, resolved_at
  FROM public.balance_sync_audit
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT p_limit;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. RLS: Bruker ser kun sin egen audit
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE IF EXISTS public.balance_sync_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "balance_audit_select_own" ON public.balance_sync_audit;
CREATE POLICY "balance_audit_select_own"
  ON public.balance_sync_audit
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. VERIFIKASJON
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE 'KlarBot Hourly Audit: balance_sync_audit tabell + 3 cron-jobs + RPC opprettet';
  RAISE NOTICE '  - klarpakke-hourly-balance-sync: hver time :05';
  RAISE NOTICE '  - klarpakke-hourly-consistency-check: hver time :10';
  RAISE NOTICE '  - klarpakke-hourly-autopilot-health: hver time :15';
END $$;
