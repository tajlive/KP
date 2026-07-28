-- Daglig integritetssjekk (Fase 6-overvåking, 2026-07-28)
--
-- Read-only vaktpost som kjører daglig kl 06:17 (off-peak):
--   1. Negativ kapital (trading_sessions / paper_accounts / positions)
--   2. CHECK-constraints fortsatt validerte
--   3. Feilede cron-kjøringer siste 24t
-- Status skrives alltid til bot_health (én rad, ON CONFLICT).
-- balance_sync_audit-rader skrives KUN ved avvik (LIMIT 5 per type).
--
-- Godkjent av Tom 2026-07-28. Applied via supabase-db MCP apply_migration.

CREATE OR REPLACE FUNCTION public.klarpakke_daily_integrity_check()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $fn$
DECLARE
  v_neg_sessions INT;
  v_neg_accounts INT;
  v_neg_positions INT;
  v_invalid_constraints INT;
  v_failed_crons INT;
  v_status TEXT;
BEGIN
  SELECT COUNT(*) INTO v_neg_sessions FROM public.trading_sessions
    WHERE current_capital < 0 OR current_capital_nok < 0;
  SELECT COUNT(*) INTO v_neg_accounts FROM public.paper_accounts
    WHERE current_balance < 0 OR initial_balance < 0;
  SELECT COUNT(*) INTO v_neg_positions FROM public.positions WHERE quantity < 0;
  SELECT COUNT(*) INTO v_invalid_constraints FROM pg_catalog.pg_constraint
    WHERE conname IN ('trading_sessions_capital_nonnegative',
                      'paper_accounts_balance_nonnegative')
      AND NOT convalidated;
  SELECT COUNT(*) INTO v_failed_crons FROM cron.job_run_details
    WHERE start_time > now() - interval '24 hours' AND status = 'failed';

  v_status := CASE WHEN v_neg_sessions + v_neg_accounts + v_neg_positions
                        + v_invalid_constraints + v_failed_crons > 0
                   THEN 'error' ELSE 'ok' END;

  INSERT INTO public.bot_health (bot_name, status, last_heartbeat, metadata)
  VALUES ('daily_integrity_check', v_status, now(), jsonb_build_object(
    'negative_sessions', v_neg_sessions,
    'negative_accounts', v_neg_accounts,
    'negative_positions', v_neg_positions,
    'invalid_constraints', v_invalid_constraints,
    'failed_cron_runs_24h', v_failed_crons))
  ON CONFLICT (bot_name) DO UPDATE SET
    status = EXCLUDED.status,
    last_heartbeat = EXCLUDED.last_heartbeat,
    metadata = EXCLUDED.metadata;

  IF v_neg_sessions > 0 THEN
    INSERT INTO public.balance_sync_audit (user_id, check_type, status, details)
    SELECT user_id, 'balance_mismatch', 'error', jsonb_build_object(
      'action', 'daily_integrity_negative_session_capital',
      'session_id', id,
      'current_capital', current_capital,
      'current_capital_nok', current_capital_nok)
    FROM public.trading_sessions
    WHERE current_capital < 0 OR current_capital_nok < 0
    LIMIT 5;
  END IF;

  IF v_neg_accounts > 0 THEN
    INSERT INTO public.balance_sync_audit (user_id, check_type, status, details)
    SELECT user_id, 'balance_mismatch', 'error', jsonb_build_object(
      'action', 'daily_integrity_negative_account_balance',
      'paper_account_id', id,
      'current_balance', current_balance)
    FROM public.paper_accounts
    WHERE current_balance < 0 OR initial_balance < 0
    LIMIT 5;
  END IF;

  IF v_neg_positions > 0 THEN
    INSERT INTO public.balance_sync_audit (user_id, check_type, status, details)
    SELECT user_id, 'balance_mismatch', 'error', jsonb_build_object(
      'action', 'daily_integrity_negative_position',
      'position_id', id, 'session_id', session_id,
      'symbol', symbol, 'quantity', quantity)
    FROM public.positions
    WHERE quantity < 0
    LIMIT 5;
  END IF;
END;
$fn$;

SELECT cron.schedule(
  'klarpakke-daily-integrity-check',
  '17 6 * * *',
  $$SELECT public.klarpakke_daily_integrity_check()$$
);
