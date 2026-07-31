-- ============================================================
-- Guard equity-fix + håndheving (2026-07-31)
--
-- ROTÅRSAK 1: SJEKK 3 (drawdown) sammenlignet KONTANTER
-- (current_capital_nok) mot startkapital og ignorerte verdien av
-- åpne posisjoner. En sesjon med 20 % av kapitalen i BTC ble
-- feilaktig deaktivert (23 sesjoner 2026-07-31 05:04 UTC).
-- Fiks: equity = kontanter + Σ(netto kvantum per symbol ×
-- coin_prices.price (NOK)) fra trade-ledger.
--
-- ROTÅRSAK 2: Guarden var tannløs — satte kun
-- smart_trader_enabled=false + error_message, mens status forble
-- 'active'. Tick fortsatte å kjøpe etter "auto-deaktivering"
-- (bevis: kjøp 06:08 og 07:45 UTC etter guard-utløsning 05:04).
-- Fiks: status='stopped' + stopped_at — sesjonen ekskluderes fra
-- all videre trading.
--
-- RETTING: Sesjoner feil-deaktivert av den gamle kontant-buggen
-- reaktiveres (idempotent — matcher kun eksakt feilmelding, og kun
-- når equity-basert drawdown er under 20 %).
--
-- Idempotent: CREATE OR REPLACE. Ingen brukerdata seedes.
-- ============================================================

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
  v_reactivated   int := 0;
  r               record;
  v_pos_value     numeric;
  v_missing_price boolean;
  v_equity        numeric;
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
  -- → STOPP sesjonen (status='stopped') + logg critical
  -- ----------------------------------------------------------
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

    INSERT INTO public.jokertrade_guard_log (issue_type, severity, session_id, user_id, details, action_taken)
    VALUES ('inflated_capital', 'critical', r.id, r.user_id,
            jsonb_build_object('capital', r.current_capital_nok),
            'session_stopped');
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
  -- SJEKK 3 (FISKET 2026-07-31): Drawdown > 20 % av startkapital,
  -- beregnet på EQUITY = kontanter + markedsverdi av åpne
  -- posisjoner (fra trade-ledger, verdsatt med coin_prices i NOK).
  -- Sesjoner med manglende prisdata hoppes over (aldri
  -- feil-deaktiver). → STOPP sesjonen + logg warning.
  -- ----------------------------------------------------------
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

      INSERT INTO public.jokertrade_guard_log (issue_type, severity, session_id, user_id, details, action_taken)
      VALUES ('drawdown', 'warning', r.id, r.user_id,
              jsonb_build_object('equity', v_equity,
                                 'cash', r.current_capital_nok,
                                 'position_value', v_pos_value,
                                 'starting', r.starting_capital_nok),
              'session_stopped');
      v_drawdown := v_drawdown + 1;
    END IF;
  END LOOP;

  -- ----------------------------------------------------------
  -- RETTING (idempotent): Reaktiver sesjoner som ble feil-
  -- deaktivert av den gamle kontant-baserte drawdown-guarden.
  -- Kun eksakt feilmelding-matche, kun når equity-drawdown < 20 %.
  -- ----------------------------------------------------------
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

      INSERT INTO public.jokertrade_guard_log (issue_type, severity, session_id, user_id, details, action_taken)
      VALUES ('false_drawdown_corrected', 'info', r.id, r.user_id,
              jsonb_build_object('equity', v_equity,
                                 'cash', r.current_capital_nok,
                                 'position_value', v_pos_value,
                                 'starting', r.starting_capital_nok),
              'session_reactivated');
      v_reactivated := v_reactivated + 1;
    END IF;
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
    'inflated_stopped', v_inflated,
    'mismatch_cleared', v_mismatch,
    'drawdown_stopped', v_drawdown,
    'false_drawdown_reactivated', v_reactivated,
    'invalid_trades_last_hour', v_invalid,
    'kill_switch_tripped', v_invalid >= 3
  );
END;
$$;
