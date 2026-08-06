# JokerTrade guard + global kill switch (2026-07-31)

## Hva
Et to-lags sikkerhetsnett rundt SmartTrader/JokerTrade:
1. **Health guard** (`jokertrade_health_guard()`) — pg_cron hvert 15. minutt.
2. **Global kill switch** (`system_flags.jokertrade`) — sjekkes av Edge Function FØR trading.

## Når dette gjenbrukes
- Auto-trading er skrudd på for mange brukere.
- Risiko for inflerte saldoer, symbol-mismatch eller runaway drawdown.
- Bruker krever "full autonomi" / "kjør alt" — da MÅ guard + kill switch være på plass før aktivering.

## Database-objekter

```sql
-- Tabell: global konfigurasjon / kill switch
CREATE TABLE IF NOT EXISTS public.system_flags (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.system_flags (key, value, description)
VALUES ('jokertrade', '{"enabled": true}'::jsonb, 'Global kill switch for JokerTrade')
ON CONFLICT (key) DO NOTHING;

-- Logg
CREATE TABLE IF NOT EXISTS public.jokertrade_guard_log (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  checked_at   timestamptz NOT NULL DEFAULT now(),
  issue_type   text NOT NULL,
  severity     text NOT NULL,
  session_id   uuid,
  user_id      uuid,
  details      jsonb NOT NULL DEFAULT '{}'::jsonb,
  action_taken text
);

-- Nødstopp + gjenoppta
CREATE OR REPLACE FUNCTION public.jokertrade_emergency_stop(p_reason text DEFAULT 'Manuell nødstopp')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_disabled int;
BEGIN
  UPDATE public.system_flags
  SET value = jsonb_build_object('enabled', false, 'reason', p_reason, 'tripped_at', now()), updated_at = now()
  WHERE key = 'jokertrade';
  UPDATE public.trading_sessions SET smart_trader_enabled = false, updated_at = now()
  WHERE mode = 'paper' AND status = 'active' AND smart_trader_enabled = true;
  GET DIAGNOSTICS v_disabled = ROW_COUNT;
  INSERT INTO public.jokertrade_guard_log (issue_type, severity, details, action_taken)
  VALUES ('kill_switch', 'critical', jsonb_build_object('reason', p_reason, 'sessions_disabled', v_disabled), 'kill_switch_tripped');
  RETURN jsonb_build_object('ok', true, 'sessions_disabled', v_disabled);
END;
$$;

CREATE OR REPLACE FUNCTION public.jokertrade_resume(p_reason text DEFAULT 'Manuell gjenopptak')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.system_flags
  SET value = jsonb_build_object('enabled', true, 'reason', p_reason, 'resumed_at', now()), updated_at = now()
  WHERE key = 'jokertrade';
  RETURN jsonb_build_object('ok', true, 'note', 'Kill switch på. Sesjoner må re-aktiveres eksplisitt.');
END;
$$;
```

## Guard-funksjon

```sql
CREATE OR REPLACE FUNCTION public.jokertrade_health_guard()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_enabled boolean; v_inflated int := 0; v_mismatch int := 0; v_drawdown int := 0;
  v_invalid int := 0; r record;
BEGIN
  SELECT COALESCE((value->>'enabled')::boolean, true) INTO v_enabled FROM public.system_flags WHERE key = 'jokertrade';
  IF NOT v_enabled THEN RETURN jsonb_build_object('ok', true, 'skipped', 'kill switch er av'); END IF;

  -- Inflert kapital (>200k eller <0) → deaktiver sesjon
  FOR r IN SELECT id, user_id, current_capital_nok FROM public.trading_sessions
           WHERE mode='paper' AND status='active' AND smart_trader_enabled=true
             AND (current_capital_nok > 200000 OR current_capital_nok < 0) LOOP
    UPDATE public.trading_sessions SET smart_trader_enabled=false,
      error_message='GUARD: Inflert kapital '||r.current_capital_nok||' — auto-deaktivert', updated_at=now() WHERE id=r.id;
    INSERT INTO public.jokertrade_guard_log (issue_type, severity, session_id, user_id, details, action_taken)
    VALUES ('inflated_capital', 'critical', r.id, r.user_id, jsonb_build_object('capital', r.current_capital_nok), 'session_disabled');
    v_inflated := v_inflated + 1;
  END LOOP;

  -- Symbol-mismatch → tøm posisjon
  FOR r IN SELECT id, user_id, trading_pair, open_position FROM public.trading_sessions
           WHERE mode='paper' AND status='active' AND open_position IS NOT NULL
             AND open_position->>'symbol' IS NOT NULL AND open_position->>'symbol' <> trading_pair LOOP
    UPDATE public.trading_sessions SET open_position=NULL,
      error_message='GUARD: Symbol-mismatch ('||(r.open_position->>'symbol')||' vs '||r.trading_pair||')', updated_at=now() WHERE id=r.id;
    INSERT INTO public.jokertrade_guard_log (issue_type, severity, session_id, user_id, details, action_taken)
    VALUES ('symbol_mismatch', 'warning', r.id, r.user_id, jsonb_build_object('position_symbol', r.open_position->>'symbol', 'session_pair', r.trading_pair), 'position_cleared');
    v_mismatch := v_mismatch + 1;
  END LOOP;

  -- Drawdown >20% → deaktiver
  FOR r IN SELECT id, user_id, current_capital_nok, starting_capital_nok FROM public.trading_sessions
           WHERE mode='paper' AND status='active' AND smart_trader_enabled=true AND starting_capital_nok > 0
             AND current_capital_nok < starting_capital_nok * 0.8 LOOP
    UPDATE public.trading_sessions SET smart_trader_enabled=false,
      error_message='GUARD: Drawdown > 20 % — auto-deaktivert', updated_at=now() WHERE id=r.id;
    v_drawdown := v_drawdown + 1;
  END LOOP;

  -- Ugyldige handler siste time ≥3 → global kill switch
  SELECT COUNT(*) INTO v_invalid FROM public.trades
  WHERE created_at > now() - interval '1 hour' AND (quantity <= 0 OR price <= 0 OR total_value <= 0);
  IF v_invalid >= 3 THEN PERFORM public.jokertrade_emergency_stop('GUARD AUTO: '||v_invalid||' ugyldige handler/time'); END IF;

  RETURN jsonb_build_object('ok', true, 'inflated_disabled', v_inflated, 'mismatch_cleared', v_mismatch,
    'drawdown_disabled', v_drawdown, 'invalid_trades_last_hour', v_invalid, 'kill_switch_tripped', v_invalid >= 3);
END;
$$;
```

## Cron

```sql
-- 4 minutter etter smart-trader-v3-cron (*/15)
SELECT cron.schedule('jokertrade-health-guard', '4,19,34,49 * * * *', $$SELECT public.jokertrade_health_guard()$$);
```

## Edge Function kill-switch-sjekk (Deno)

```typescript
const { data: flag } = await supabase.from("system_flags").select("value").eq("key", "jokertrade").maybeSingle();
const killSwitch = flag?.value as { enabled?: boolean; reason?: string } | null;
if (killSwitch && killSwitch.enabled === false) {
  return new Response(JSON.stringify({ ok: false, disabled: true, reason: killSwitch.reason }), { status: 200, headers: { "Content-Type": "application/json" } });
}
```

## Monitor-view

```sql
CREATE OR REPLACE VIEW public.jokertrade_monitor AS
SELECT s.id, s.user_id, s.trading_pair, s.current_capital_nok, s.starting_capital_nok, s.total_pnl,
  CASE WHEN s.starting_capital_nok > 0 THEN round(100 * s.total_pnl / s.starting_capital_nok, 2) END AS pnl_pct,
  (s.open_position IS NOT NULL) AS has_position, s.open_position->>'symbol' AS position_symbol,
  s.smart_trader_enabled, s.error_message, s.last_heartbeat, s.updated_at
FROM public.trading_sessions s
WHERE s.mode = 'paper' AND s.status = 'active';
```

## Bruk

```sql
-- Nødstopp ALT
SELECT public.jokertrade_emergency_stop('manuell nødstopp');

-- Gjenoppta (sesjoner må re-aktiveres eksplisitt)
SELECT public.jokertrade_resume('verifisert OK');

-- Sjekk siste hendelser
SELECT * FROM public.jokertrade_guard_log ORDER BY checked_at DESC LIMIT 20;

-- Sjekk status
SELECT * FROM public.jokertrade_monitor;
```

## Knytning til andre skills
- `klarpakke-currency-pitfalls` — rotårsak: USDT/NOK-blanding og symbol-mismatch i SmartTrader.
- `klarpakke-trading-data-cleanup` — opprydding av inflerte sesjoner og korrumperte trades.
