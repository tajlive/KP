-- ============================================================================
-- STEG 4: Drift-alarm mot balanse-inflasjon (2026-08-10)
-- KLAR TIL GJENNOMGANG — IKKE KJØRT. Krever Toms godkjenning (DB er hellig).
--
-- Formål: "Vi skal ikke gjøre samme feil to ganger." Fanger ENHVER fremtidig
-- paper-saldo-inflasjon uavhengig av hvilken kodevei som forårsaker den —
-- cron, trigger, API eller manuell skrivefeil.
--
-- Logikk: En paper-saldo kan aldri overstige
--   initial_balance + realisert P&L (paper-handler) + buffer
-- uten at noe er galt. Buffer på 50 % av initial_balance unngår falske
-- alarmer fra urealiserte gevinster på åpne posisjoner.
--
-- Aksjon: KUN deteksjon → rad i balance_sync_audit (status 'error').
-- Ingen auto-korreksjon. Menneske (eller agent) vurderer før retting.
--
-- Verifisert mot prod-skjema 2026-08-10:
--   trades har kolonnene: mode, status, realized_pnl, user_id ✅
--   balance_sync_audit(user_id, check_type, status, details) finnes fra
--   migrasjon 20260724120000 ✅
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.klarpakke_hourly_consistency_check()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acc RECORD;
  v_profile_balance NUMERIC;
  v_realized NUMERIC;
  v_expected_max NUMERIC;
  v_mismatch_count INTEGER := 0;
  v_inflation_count INTEGER := 0;
BEGIN
  FOR v_acc IN
    SELECT user_id, current_balance, initial_balance FROM public.paper_accounts
  LOOP
    -- Sjekk 1 (uendret fra 20260724120000): profil må matche SSoT
    SELECT paper_balance INTO v_profile_balance
    FROM public.user_profiles WHERE id = v_acc.user_id;

    IF ABS(v_acc.current_balance - COALESCE(v_profile_balance, 0)) > 1 THEN
      INSERT INTO public.balance_sync_audit (user_id, check_type, status, details)
      VALUES (
        v_acc.user_id,
        'balance_mismatch',
        'error',
        jsonb_build_object(
          'paper_accounts_balance', v_acc.current_balance,
          'profile_balance', v_profile_balance
        )
      );
      v_mismatch_count := v_mismatch_count + 1;
    END IF;

    -- Sjekk 2 (NY): inflasjons-detektor.
    -- Saldo kan aldri overstige initial + realisert paper-P&L + buffer.
    SELECT COALESCE(SUM(realized_pnl), 0) INTO v_realized
    FROM public.trades
    WHERE user_id = v_acc.user_id
      AND mode = 'paper'
      AND status = 'filled'
      AND realized_pnl IS NOT NULL;

    v_expected_max := v_acc.initial_balance + v_realized
                      + (v_acc.initial_balance * 0.5);  -- buffer: urealisert

    IF v_acc.current_balance > v_expected_max THEN
      INSERT INTO public.balance_sync_audit (user_id, check_type, status, details)
      VALUES (
        v_acc.user_id,
        'balance_inflation_detected',
        'error',
        jsonb_build_object(
          'current_balance', v_acc.current_balance,
          'initial_balance', v_acc.initial_balance,
          'realized_pnl_paper', v_realized,
          'expected_max', v_expected_max,
          'excess', v_acc.current_balance - v_expected_max,
          'detected_by', 'klarpakke_hourly_consistency_check steg4'
        )
      );
      v_inflation_count := v_inflation_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'consistency_check: % profil-avvik, % inflasjons-alarm(er)',
    v_mismatch_count, v_inflation_count;
END;
$$;

COMMIT;

-- ---------------------------------------------------------------------------
-- Verifisering etter kjøring:
-- 1) Funksjon erstattet:
--    SELECT pg_get_functiondef('public.klarpakke_hourly_consistency_check()'::regprocedure);
--    → skal inneholde 'balance_inflation_detected'
-- 2) Tørrkjøring NÅ (skal gi 0 alarmer etter P0-fiksen):
--    SELECT public.klarpakke_hourly_consistency_check();
--    SELECT * FROM balance_sync_audit ORDER BY 1 DESC LIMIT 5;
-- 3) Test at alarmen faktisk fanger (valgfritt, i transaksjon som rulles tilbake):
--    BEGIN;
--    UPDATE paper_accounts SET current_balance = 500000
--      WHERE user_id = '0dd08529-b8a8-4fd3-9806-275e2d0135dd';
--    SELECT public.klarpakke_hourly_consistency_check();
--    SELECT * FROM balance_sync_audit WHERE check_type='balance_inflation_detected';
--    ROLLBACK;
-- ---------------------------------------------------------------------------
