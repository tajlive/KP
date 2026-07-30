-- Fiks 2026-07-30: Sesjonsbølger + ødelagt session_maintenance
--
-- Bakgrunn:
-- 1) session_maintenance() steg 3 refererte ts.user_id uten alias → SQL-feil
--    ved hver kjøring (hvert 2. min) → hele funksjonen rullet tilbake.
-- 2) ensure_active_sessions_for_all() opprettet NY sesjon per bruker hver gang
--    brukeren manglet aktiv sesjon → ~13 bølger à 11 brukere over én natt,
--    de fleste med 0 handler. Nå: gjenbruk nyeste stopped/crashed-sesjon.
-- 3) Arkiver gamle stoppede paper-sesjoner uten handler.

-- 1) Fiks alias-bug i session_maintenance
CREATE OR REPLACE FUNCTION public.session_maintenance()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  crashed_count int; healed_count int; stopped_count int;
BEGIN
  -- 1. Crash: kun brukere UTEN auto-trading
  UPDATE trading_sessions ts SET status='crashed', updated_at=NOW()
  WHERE ts.status IN ('active','paused') AND ts.mode='paper'
    AND ts.last_heartbeat < NOW() - INTERVAL '60 minutes'
    AND ts.created_at < NOW() - INTERVAL '60 minutes'
    AND ts.archived = FALSE
    AND NOT EXISTS (
      SELECT 1 FROM auto_trading_configs atc
      WHERE atc.user_id = ts.user_id AND atc.is_enabled = true
    );
  GET DIAGNOSTICS crashed_count = ROW_COUNT;

  -- 2. Heal: crashed med nylig heartbeat (alle brukere)
  UPDATE trading_sessions SET status='active', last_heartbeat=NOW(), updated_at=NOW(), stopped_at=NULL
  WHERE status='crashed' AND mode='paper'
    AND last_heartbeat > NOW() - INTERVAL '5 minutes'
    AND archived = FALSE;
  GET DIAGNOSTICS healed_count = ROW_COUNT;

  -- 3. Stop: >24t uten heartbeat (FIKS: alias var 'ts' uten deklarasjon)
  UPDATE trading_sessions SET status='stopped', stopped_at=NOW(), updated_at=NOW()
  WHERE status='active' AND mode='paper'
    AND last_heartbeat < NOW() - INTERVAL '24 hours'
    AND archived = FALSE
    AND NOT EXISTS (
      SELECT 1 FROM auto_trading_configs atc
      WHERE atc.user_id = trading_sessions.user_id AND atc.is_enabled = true
    );
  GET DIAGNOSTICS stopped_count = ROW_COUNT;

  RETURN jsonb_build_object('crashed', crashed_count, 'healed', healed_count, 'stopped', stopped_count);
END;
$function$;

-- 2) ensure_active_sessions_for_all: gjenbruk sesjoner i stedet for evig INSERT
CREATE OR REPLACE FUNCTION public.ensure_active_sessions_for_all()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  affected_count integer := 0;
  inserted_count integer := 0;
BEGIN
  -- 2a. Reaktiver nyeste stopped/crashed paper-sesjon per auto-bruker
  --     (bevarer historikk og kapital, unngår sesjonssprawl)
  WITH candidates AS (
    SELECT DISTINCT ON (ts.user_id)
      ts.id, ts.user_id
    FROM trading_sessions ts
    JOIN auto_trading_configs atc
      ON atc.user_id = ts.user_id AND atc.is_enabled = true
    WHERE ts.mode = 'paper'
      AND ts.status IN ('stopped', 'crashed')
      AND ts.archived = FALSE
      AND NOT EXISTS (
        SELECT 1 FROM trading_sessions act
        WHERE act.user_id = ts.user_id AND act.status = 'active'
      )
    ORDER BY ts.user_id, ts.updated_at DESC NULLS LAST, ts.created_at DESC
  ),
  reactivated AS (
    UPDATE trading_sessions ts
    SET status = 'active',
        last_heartbeat = NOW(),
        last_tick_at = NOW(),
        stopped_at = NULL,
        error_message = NULL,
        updated_at = NOW()
    FROM candidates c
    WHERE ts.id = c.id
    RETURNING ts.id
  )
  SELECT COUNT(*) INTO affected_count FROM reactivated;

  -- 2b. INSERT kun for auto-brukere som aldri har hatt en sesjon
  INSERT INTO trading_sessions (user_id, mode, strategy_id, status, trading_pair, starting_capital_nok, current_capital_nok, current_capital, initial_capital, last_heartbeat, strategy_config)
  SELECT pa.user_id, 'paper', 'cryptopilot', 'active', 'BTCUSDT',
    pa.current_balance::numeric, pa.current_balance::numeric,
    pa.current_balance::numeric, pa.current_balance::numeric,
    NOW(),
    '{"stop_loss_pct":5,"close_on_stop":true}'::jsonb
  FROM paper_accounts pa
  JOIN auto_trading_configs atc ON atc.user_id = pa.user_id AND atc.is_enabled = true
  WHERE pa.current_balance > 0
    AND NOT EXISTS (SELECT 1 FROM trading_sessions ts WHERE ts.user_id = pa.user_id AND ts.status = 'active')
    AND NOT EXISTS (SELECT 1 FROM trading_sessions ts2 WHERE ts2.user_id = pa.user_id AND ts2.mode = 'paper');
  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  RETURN affected_count + inserted_count;
END;
$function$;

-- 3) Arkiver gamle stoppede/crashede paper-sesjoner uten handler
UPDATE trading_sessions
SET archived = TRUE, archived_at = NOW(), updated_at = NOW()
WHERE mode = 'paper'
  AND status IN ('stopped', 'crashed')
  AND archived = FALSE
  AND COALESCE(total_trades, 0) = 0
  AND created_at < NOW() - INTERVAL '24 hours';
