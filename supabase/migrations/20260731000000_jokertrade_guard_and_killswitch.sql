-- ============================================================
-- JokerTrade: helse-guard, nødstopp (kill switch) og monitor-view
-- Dato: 2026-07-31
-- Formål:
--   1) Automatisk helse-sjekk hvert 15. minutt som fanger avvik
--      (inflasjon, symbol-mismatch, drawdown, ugyldige handler)
--      og KOBLE UT berørte sesjoner — eller hele JokerTrade ved
--      kritiske feil.
--   2) Global kill switch (system_flags) som Edge Function sjekker
--      FØR den gjør noe som helst. Nødstopp = én RPC.
--   3) Monitor-view for sanntidsstatus per sesjon.
-- ============================================================

-- ------------------------------------------------------------
-- 1. system_flags — global konfigurasjon / kill switch
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_flags (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.system_flags (key, value, description)
VALUES (
  'jokertrade',
  '{"enabled": true}'::jsonb,
  'Global kill switch for JokerTrade/smart-trader-v3. enabled=false stopper ALL auto-trading.'
)
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------
-- 2. jokertrade_guard_log — hendelseslogg for guard-aksjoner
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.jokertrade_guard_log (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  checked_at   timestamptz NOT NULL DEFAULT now(),
  issue_type   text NOT NULL,        -- 'inflated_capital' | 'symbol_mismatch' | 'drawdown' | 'invalid_trade' | 'kill_switch'
  severity     text NOT NULL,        -- 'info' | 'warning' | 'critical'
  session_id   uuid,
  user_id      uuid,
  details      jsonb NOT NULL DEFAULT '{}'::jsonb,
  action_taken text                  -- hva guard gjorde, f.eks. 'session_disabled', 'position_cleared', 'kill_switch_tripped'
);

CREATE INDEX IF NOT EXISTS idx_guard_log_checked_at ON public.jokertrade_guard_log (checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_guard_log_severity   ON public.jokertrade_guard_log (severity, checked_at DESC);

-- ------------------------------------------------------------
-- 3. Nødstopp-funksjoner
-- ------------------------------------------------------------

-- Global nødstopp: slår av kill switch OG deaktiverer alle sesjoner.
CREATE OR REPLACE FUNCTION public.jokertrade_emergency_stop(p_reason text DEFAULT 'Manuell nødstopp')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_disabled int;
BEGIN
  UPDATE public.system_flags
  SET value = jsonb_build_object('enabled', false, 'reason', p_reason, 'tripped_at', now()),
      updated_at = now()
  WHERE key = 'jokertrade';

  UPDATE public.trading_sessions
  SET smart_trader_enabled = false, updated_at = now()
  WHERE mode = 'paper' AND status = 'active' AND smart_trader_enabled = true;
  GET DIAGNOSTICS v_disabled = ROW_COUNT;

  INSERT INTO public.jokertrade_guard_log (issue_type, severity, details, action_taken)
  VALUES ('kill_switch', 'critical',
          jsonb_build_object('reason', p_reason, 'sessions_disabled', v_disabled, 'source', 'emergency_stop'),
          'kill_switch_tripped');

  RETURN jsonb_build_object('ok', true, 'sessions_disabled', v_disabled, 'reason', p_reason);
END;
$$;

-- Gjenoppta: skrur kill switch PÅ igjen (aktiverer IKKE sesjoner automatisk —
-- det gjøres bevisst etter verifisering).
CREATE OR REPLACE FUNCTION public.jokertrade_resume(p_reason text DEFAULT 'Manuell gjenopptak')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.system_flags
  SET value = jsonb_build_object('enabled', true, 'reason', p_reason, 'resumed_at', now()),
      updated_at = now()
  WHERE key = 'jokertrade';

  INSERT INTO public.jokertrade_guard_log (issue_type, severity, details, action_taken)
  VALUES ('kill_switch', 'info',
          jsonb_build_object('reason', p_reason, 'source', 'resume'),
          'kill_switch_released');

  RETURN jsonb_build_object('ok', true, 'note', 'Kill switch på. Sesjoner må re-aktiveres eksplisitt.');
END;
$$;

-- ------------------------------------------------------------
-- 4. Helse-guard — kjøres hvert 15. minutt via pg_cron
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.jokertrade_health_guard()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled       boolean := true;
  v_inflated      int := 0;
  v_mismatch      int := 0;
  v_drawdown      int := 0;
  v_invalid       int := 0;
  v_issues        int := 0;
  v_actions       int := 0;
  r               record;
BEGIN
  -- Les kill switch
  SELECT COALESCE((value->>'enabled')::boolean, true)
    INTO v_enabled
  FROM public.system_flags
  WHERE key = 'jokertrade';

  IF NOT v_enabled THEN
    RETURN jsonb_build_object('ok', true, 'skipped', 'kill switch er av');
  END IF;

  -- ----------------------------------------------------------
  -- SJEKK 1: Inflert kapital (aktive sesjoner > 200 000 eller < 0)
  -- → deaktiver sesjonen + logg critical
  -- ----------------------------------------------------------
  FOR r IN
    SELECT id, user_id, current_capital_nok
    FROM public.trading_sessions
    WHERE mode = 'paper' AND status = 'active' AND smart_trader_enabled = true
      AND (current_capital_nok > 200000 OR current_capital_nok < 0)
  LOOP
    UPDATE public.trading_sessions
    SET smart_trader_enabled = false,
        error_message = 'GUARD: Inflert kapital ' || r.current_capital_nok || ' — auto-deaktivert',
        updated_at = now()
    WHERE id = r.id;

    INSERT INTO public.jokertrade_guard_log (issue_type, severity, session_id, user_id, details, action_taken)
    VALUES ('inflated_capital', 'critical', r.id, r.user_id,
            jsonb_build_object('capital', r.current_capital_nok),
            'session_disabled');
    v_inflated := v_inflated + 1;
  END LOOP;

  -- ----------------------------------------------------------
  -- SJEKK 2: Symbol-mismatch i open_position
  -- → nullstill posisjonen + logg warning (sesjonen fortsetter)
  -- ----------------------------------------------------------
  FOR r IN
    SELECT id, user_id, trading_pair, open_position
    FROM public.trading_sessions
    WHERE mode = 'paper' AND status = 'active'
      AND open_position IS NOT NULL
      AND open_position->>'symbol' IS NOT NULL
      AND open_position->>'symbol' <> trading_pair
  LOOP
    UPDATE public.trading_sessions
    SET open_position = NULL,
        error_message = 'GUARD: Symbol-mismatch (' || (r.open_position->>'symbol') || ' vs ' || r.trading_pair || ') — posisjon tømt',
        updated_at = now()
    WHERE id = r.id;

    INSERT INTO public.jokertrade_guard_log (issue_type, severity, session_id, user_id, details, action_taken)
    VALUES ('symbol_mismatch', 'warning', r.id, r.user_id,
            jsonb_build_object('position_symbol', r.open_position->>'symbol', 'session_pair', r.trading_pair),
            'position_cleared');
    v_mismatch := v_mismatch + 1;
  END LOOP;

  -- ----------------------------------------------------------
  -- SJEKK 3: Drawdown > 20 % av startkapital
  -- → deaktiver sesjonen + logg warning
  -- ----------------------------------------------------------
  FOR r IN
    SELECT id, user_id, current_capital_nok, starting_capital_nok
    FROM public.trading_sessions
    WHERE mode = 'paper' AND status = 'active' AND smart_trader_enabled = true
      AND starting_capital_nok > 0
      AND current_capital_nok < starting_capital_nok * 0.8
  LOOP
    UPDATE public.trading_sessions
    SET smart_trader_enabled = false,
        error_message = 'GUARD: Drawdown > 20 % — auto-deaktivert',
        updated_at = now()
    WHERE id = r.id;

    INSERT INTO public.jokertrade_guard_log (issue_type, severity, session_id, user_id, details, action_taken)
    VALUES ('drawdown', 'warning', r.id, r.user_id,
            jsonb_build_object('capital', r.current_capital_nok, 'starting', r.starting_capital_nok),
            'session_disabled');
    v_drawdown := v_drawdown + 1;
  END LOOP;

  -- ----------------------------------------------------------
  -- SJEKK 4: Ugyldige handler siste time (qty/pris/verdi <= 0)
  -- → logg critical; >= 3 stk → trip kill switch globalt
  -- ----------------------------------------------------------
  SELECT COUNT(*) INTO v_invalid
  FROM public.trades
  WHERE created_at > now() - interval '1 hour'
    AND (quantity <= 0 OR price <= 0 OR total_value <= 0);

  IF v_invalid > 0 THEN
    INSERT INTO public.jokertrade_guard_log (issue_type, severity, details, action_taken)
    VALUES ('invalid_trade', 'critical',
            jsonb_build_object('count_last_hour', v_invalid),
            CASE WHEN v_invalid >= 3 THEN 'kill_switch_tripped' ELSE 'logged' END);
  END IF;

  IF v_invalid >= 3 THEN
    PERFORM public.jokertrade_emergency_stop(
      'GUARD AUTO: ' || v_invalid || ' ugyldige handler siste time — kill switch utløst'
    );
  END IF;

  v_issues  := v_inflated + v_mismatch + v_drawdown + v_invalid;
  v_actions := v_inflated + v_mismatch + v_drawdown;

  RETURN jsonb_build_object(
    'ok', true,
    'issues', v_issues,
    'actions', v_actions,
    'inflated_disabled', v_inflated,
    'mismatch_cleared', v_mismatch,
    'drawdown_disabled', v_drawdown,
    'invalid_trades_last_hour', v_invalid,
    'kill_switch_tripped', v_invalid >= 3
  );
END;
$$;

-- ------------------------------------------------------------
-- 5. Monitor-view — sanntidsstatus per aktiv paper-sesjon
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.jokertrade_monitor AS
SELECT
  s.id,
  s.user_id,
  s.trading_pair,
  s.current_capital_nok,
  s.starting_capital_nok,
  s.total_pnl,
  CASE WHEN s.starting_capital_nok > 0
       THEN round(100 * s.total_pnl / s.starting_capital_nok, 2)
  END AS pnl_pct,
  CASE WHEN s.starting_capital_nok > 0
       THEN round(100 * (s.current_capital_nok - s.starting_capital_nok) / s.starting_capital_nok, 2)
  END AS capital_change_pct,
  s.total_trades,
  s.winning_trades,
  s.losing_trades,
  (s.open_position IS NOT NULL)        AS has_position,
  s.open_position->>'symbol'           AS position_symbol,
  (s.open_position->>'entry_price')::numeric AS position_entry_price,
  s.smart_trader_enabled,
  s.error_message,
  s.last_heartbeat,
  s.updated_at
FROM public.trading_sessions s
WHERE s.mode = 'paper' AND s.status = 'active';

-- ------------------------------------------------------------
-- 6. pg_cron — guard kjører 4 minutter ETTER trader-cron (*/15)
--    slik at den fanger opp effekten av siste kjøring.
-- ------------------------------------------------------------
SELECT cron.schedule(
  'jokertrade-health-guard',
  '4,19,34,49 * * * *',
  $$SELECT public.jokertrade_health_guard()$$
);

-- ------------------------------------------------------------
-- Verifikasjon
-- ------------------------------------------------------------
DO $$
BEGIN
  RAISE NOTICE 'jokertrade guard installert: system_flags, guard_log, emergency_stop/resume, health_guard, monitor-view, cron 4,19,34,49';
END $$;
