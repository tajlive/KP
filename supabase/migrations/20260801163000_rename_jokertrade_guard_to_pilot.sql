-- 20260801163000_rename_jokertrade_guard_to_pilot.sql
-- ============================================================
-- Del 2 av JokerTrade → Pilot (guard-infrastruktur):
--   jokertrade_guard_log → pilot_guard_log (tabell, 37 rader bevart)
--   system_flags.key 'jokertrade' → 'pilot' (kill switch)
--   trg_trade_joker_event → trg_trade_pilot_event (trigger)
--   detect_crashed_sessions: kommentar JokerTrade → PilotTrade
--   pilot_health_guard / pilot_emergency_stop / pilot_resume
--     oppdatert til pilot_guard_log + key 'pilot' (autentisk prosrc)
-- ============================================================

ALTER TABLE public.jokertrade_guard_log RENAME TO pilot_guard_log;
UPDATE public.system_flags SET key = 'pilot' WHERE key = 'jokertrade';
ALTER TRIGGER trg_trade_joker_event ON public.trades RENAME TO trg_trade_pilot_event;

-- detect_crashed_sessions — kommentar oppdatert
CREATE OR REPLACE FUNCTION public.detect_crashed_sessions()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Marker sessions som crashed når heartbeat er > 5 min gammelt
    -- (gjelder også paused — de er like døde)
    -- Grace period: sessions yngre enn 15 min crasher IKKE (gir PilotTrade tid til heartbeat)
    UPDATE trading_sessions
    SET status = 'crashed', updated_at = NOW()
    WHERE status IN ('active', 'paused')
      AND mode = 'paper'
      AND last_heartbeat < NOW() - INTERVAL '5 minutes'
      AND created_at < NOW() - INTERVAL '15 minutes'
      AND archived = FALSE;

    -- Varsle
    PERFORM alert_stalled_sessions();
END;
$function$

-- public.pilot_health_guard() — pilot_guard_log + key 'pilot'
CREATE OR REPLACE FUNCTION public.pilot_health_guard()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_enabled       boolean := true;
  v_inflated      int := 0;
  v_mismatch      int := 0;
  v_drawdown      int := 0;
  v_invalid       int := 0;
  v_issues        int := 0;
  v_actions       int := 0;
  v_reactivated   int := 0;
  r               record;
  v_pos_value     numeric;
  v_missing_price boolean;
  v_equity        numeric;
BEGIN
  SELECT COALESCE((value->>'enabled')::boolean, true)
    INTO v_enabled
  FROM public.system_flags
  WHERE key = 'pilot';

  IF NOT v_enabled THEN
    RETURN jsonb_build_object('ok', true, 'skipped', 'kill switch er av');
  END IF;

  FOR r IN
    SELECT id, user_id, current_capital_nok
    FROM public.trading_sessions
    WHERE mode = 'paper' AND status = 'active' AND smart_trader_enabled = true
      AND (current_capital_nok > 200000 OR current_capital_nok < 0)
  LOOP
    UPDATE public.trading_sessions
    SET smart_trader_enabled = false,
        status = 'stopped',
        stopped_at = now(),
        error_message = 'GUARD: Inflert kapital ' || r.current_capital_nok || ' — auto-stoppet',
        updated_at = now()
    WHERE id = r.id;

    INSERT INTO public.pilot_guard_log (issue_type, severity, session_id, user_id, details, action_taken)
    VALUES ('inflated_capital', 'critical', r.id, r.user_id,
            jsonb_build_object('capital', r.current_capital_nok),
            'session_stopped');
    v_inflated := v_inflated + 1;
  END LOOP;

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

    INSERT INTO public.pilot_guard_log (issue_type, severity, session_id, user_id, details, action_taken)
    VALUES ('symbol_mismatch', 'warning', r.id, r.user_id,
            jsonb_build_object('position_symbol', r.open_position->>'symbol', 'session_pair', r.trading_pair),
            'position_cleared');
    v_mismatch := v_mismatch + 1;
  END LOOP;

  FOR r IN
    SELECT id, user_id, current_capital_nok, starting_capital_nok
    FROM public.trading_sessions
    WHERE mode = 'paper' AND status = 'active' AND smart_trader_enabled = true
      AND starting_capital_nok > 0
  LOOP
    SELECT COALESCE(SUM(CASE WHEN t.qty > 0 THEN t.qty * cp.price END), 0),
           COALESCE(BOOL_OR(t.qty > 0 AND cp.price IS NULL), false)
      INTO v_pos_value, v_missing_price
    FROM (
      SELECT trading_pair,
             SUM(CASE WHEN side = 'buy' THEN quantity ELSE -quantity END) AS qty
      FROM public.trades
      WHERE session_id = r.id AND status = 'filled'
      GROUP BY trading_pair
    ) t
    LEFT JOIN public.coin_prices cp ON cp.symbol = t.trading_pair;

    v_equity := r.current_capital_nok + v_pos_value;

    IF NOT v_missing_price AND v_equity < r.starting_capital_nok * 0.8 THEN
      UPDATE public.trading_sessions
      SET smart_trader_enabled = false,
          status = 'stopped',
          stopped_at = now(),
          error_message = 'GUARD: Drawdown > 20 % (equity) — auto-stoppet',
          updated_at = now()
      WHERE id = r.id;

      INSERT INTO public.pilot_guard_log (issue_type, severity, session_id, user_id, details, action_taken)
      VALUES ('drawdown', 'warning', r.id, r.user_id,
              jsonb_build_object('equity', v_equity,
                                 'cash', r.current_capital_nok,
                                 'position_value', v_pos_value,
                                 'starting', r.starting_capital_nok),
              'session_stopped');
      v_drawdown := v_drawdown + 1;
    END IF;
  END LOOP;

  FOR r IN
    SELECT id, user_id, current_capital_nok, starting_capital_nok
    FROM public.trading_sessions
    WHERE mode = 'paper' AND status = 'active' AND smart_trader_enabled = false
      AND error_message = 'GUARD: Drawdown > 20 % — auto-deaktivert'
      AND starting_capital_nok > 0
  LOOP
    SELECT COALESCE(SUM(CASE WHEN t.qty > 0 THEN t.qty * cp.price END), 0),
           COALESCE(BOOL_OR(t.qty > 0 AND cp.price IS NULL), false)
      INTO v_pos_value, v_missing_price
    FROM (
      SELECT trading_pair,
             SUM(CASE WHEN side = 'buy' THEN quantity ELSE -quantity END) AS qty
      FROM public.trades
      WHERE session_id = r.id AND status = 'filled'
      GROUP BY trading_pair
    ) t
    LEFT JOIN public.coin_prices cp ON cp.symbol = t.trading_pair;

    v_equity := r.current_capital_nok + v_pos_value;

    IF NOT v_missing_price AND v_equity >= r.starting_capital_nok * 0.8 THEN
      UPDATE public.trading_sessions
      SET smart_trader_enabled = true,
          error_message = NULL,
          updated_at = now()
      WHERE id = r.id;

      INSERT INTO public.pilot_guard_log (issue_type, severity, session_id, user_id, details, action_taken)
      VALUES ('false_drawdown_corrected', 'info', r.id, r.user_id,
              jsonb_build_object('equity', v_equity,
                                 'cash', r.current_capital_nok,
                                 'position_value', v_pos_value,
                                 'starting', r.starting_capital_nok),
              'session_reactivated');
      v_reactivated := v_reactivated + 1;
    END IF;
  END LOOP;

  SELECT COUNT(*) INTO v_invalid
  FROM public.trades
  WHERE created_at > now() - interval '1 hour'
    AND (quantity <= 0 OR price <= 0 OR total_value <= 0);

  IF v_invalid > 0 THEN
    INSERT INTO public.pilot_guard_log (issue_type, severity, details, action_taken)
    VALUES ('invalid_trade', 'critical',
            jsonb_build_object('count_last_hour', v_invalid),
            CASE WHEN v_invalid >= 3 THEN 'kill_switch_tripped' ELSE 'logged' END);
  END IF;

  IF v_invalid >= 3 THEN
    PERFORM public.pilot_emergency_stop(
      'GUARD AUTO: ' || v_invalid || ' ugyldige handler siste time — kill switch utløst'
    );
  END IF;

  v_issues  := v_inflated + v_mismatch + v_drawdown + v_invalid;
  v_actions := v_inflated + v_mismatch + v_drawdown;

  RETURN jsonb_build_object(
    'ok', true,
    'issues', v_issues,
    'actions', v_actions,
    'inflated_stopped', v_inflated,
    'mismatch_cleared', v_mismatch,
    'drawdown_stopped', v_drawdown,
    'false_drawdown_reactivated', v_reactivated,
    'invalid_trades_last_hour', v_invalid,
    'kill_switch_tripped', v_invalid >= 3
  );
END;
$function$

-- public.pilot_emergency_stop(text) — pilot_guard_log + key 'pilot'
CREATE OR REPLACE FUNCTION public.pilot_emergency_stop(p_reason text DEFAULT 'Manuell nødstopp'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_disabled int;
BEGIN
  UPDATE public.system_flags
  SET value = jsonb_build_object('enabled', false, 'reason', p_reason, 'tripped_at', now()),
      updated_at = now()
  WHERE key = 'pilot';

  UPDATE public.trading_sessions
  SET smart_trader_enabled = false, updated_at = now()
  WHERE mode = 'paper' AND status = 'active' AND smart_trader_enabled = true;
  GET DIAGNOSTICS v_disabled = ROW_COUNT;

  INSERT INTO public.pilot_guard_log (issue_type, severity, details, action_taken)
  VALUES ('kill_switch', 'critical',
          jsonb_build_object('reason', p_reason, 'sessions_disabled', v_disabled, 'source', 'emergency_stop'),
          'kill_switch_tripped');

  RETURN jsonb_build_object('ok', true, 'sessions_disabled', v_disabled, 'reason', p_reason);
END;
$function$

-- public.pilot_resume(text) — pilot_guard_log + key 'pilot'
CREATE OR REPLACE FUNCTION public.pilot_resume(p_reason text DEFAULT 'Manuell gjenopptak'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.system_flags
  SET value = jsonb_build_object('enabled', true, 'reason', p_reason, 'resumed_at', now()),
      updated_at = now()
  WHERE key = 'pilot';

  INSERT INTO public.pilot_guard_log (issue_type, severity, details, action_taken)
  VALUES ('kill_switch', 'info',
          jsonb_build_object('reason', p_reason, 'source', 'resume'),
          'kill_switch_released');

  RETURN jsonb_build_object('ok', true, 'note', 'Kill switch på. Sesjoner må re-aktiveres eksplisitt.');
END;
$function$
