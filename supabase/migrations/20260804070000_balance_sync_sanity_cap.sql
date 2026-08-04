-- Sanity-cap i hourly balance sync (prod-hendelse 2026-08-04)
--
-- Bakgrunn: /api/pilot opprettet én sesjon per valgt symbol med HELE
-- paper-balansen (94 389 kr × 11 symboler = 1 038 280 kr). Denne
-- funksjonen summerte deretter alle sesjoner inn i paper_accounts
-- (SSoT) uten plausibilitetssjekk → dashboard viste 1,5M på 100k-konto.
--
-- Cap: sesjons-sum > 3× startkapital = arvet inflasjon → hopp over,
-- behold forrige balance. Samme mønster som leaderboard/summary-capen.

CREATE OR REPLACE FUNCTION public.klarpakke_hourly_balance_sync()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_acc RECORD;
  v_synced_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
  v_session_sum NUMERIC;
  v_initial_sum NUMERIC;
BEGIN
  FOR v_acc IN
    SELECT pa.user_id, pa.current_balance AS old_balance
    FROM public.paper_accounts pa
  LOOP
    SELECT COALESCE(SUM(current_capital_nok), 0), COALESCE(SUM(starting_capital_nok), 0)
    INTO v_session_sum, v_initial_sum
    FROM public.trading_sessions
    WHERE user_id = v_acc.user_id
      AND mode = 'paper'
      AND status IN ('active', 'paused', 'stopped');

    -- Sanity-cap: sum > 3× initial = arvet inflasjon → hopp over
    IF v_initial_sum > 0 AND v_session_sum > v_initial_sum * 3 THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;

    IF ABS(v_acc.old_balance - v_session_sum) > 1 THEN
      UPDATE public.paper_accounts
      SET current_balance = v_session_sum,
          updated_at = NOW()
      WHERE user_id = v_acc.user_id;

      UPDATE public.user_profiles
      SET paper_balance = v_session_sum, updated_at = NOW()
      WHERE id = v_acc.user_id;

      UPDATE public.wallets
      SET balance = v_session_sum, updated_at = NOW()
      WHERE user_id = v_acc.user_id;

      UPDATE public.portfolios
      SET current_balance = v_session_sum, updated_at = NOW()
      WHERE user_id = v_acc.user_id;

      v_synced_count := v_synced_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'klarpakke_hourly_balance_sync: korrigert % brukere, hoppet over % (sanity-cap)', v_synced_count, v_skipped_count;
END;
$function$;
