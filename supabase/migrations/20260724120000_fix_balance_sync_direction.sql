-- ============================================================================
-- FIKS: Balanse-inflasjon fra feil synk-retning
--
-- Rotårsak: klarpakke_hourly_balance_sync() SUMMERte current_capital_nok over
-- ALLE aktive+stoppede paper-sesjoner og overskrev user_profiles.paper_balance,
-- wallets.balance og portfolios.current_balance hver time. Stoppede sesjoner
-- beholder kapitalen sin i summen for alltid → balansen inflasjonerer
-- (observert: 14 074 580 kr hos bruker med reell saldo 92 418 kr).
--
-- Arkitekturbeslutning (står i .hermes.md): paper_accounts.current_balance er
-- source of truth. trigger_sync_paper_balance synker allerede korrekt til
-- user_profiles — men den timevise jobben overskrev igjen.
--
-- Fiks: snu synk-retningen. paper_accounts → profile/wallets/portfolios.
-- Brukere uten paper_accounts-rad berøres ikke.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.klarpakke_hourly_balance_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acc RECORD;
  v_synced_count INTEGER := 0;
BEGIN
  FOR v_acc IN
    SELECT user_id, current_balance FROM public.paper_accounts
  LOOP
    -- Sync til user_profiles
    UPDATE public.user_profiles
    SET paper_balance = v_acc.current_balance, updated_at = NOW()
    WHERE id = v_acc.user_id AND paper_balance IS DISTINCT FROM v_acc.current_balance;

    -- Sync til wallets (NOK-rad)
    UPDATE public.wallets
    SET balance = v_acc.current_balance, updated_at = NOW()
    WHERE user_id = v_acc.user_id AND balance IS DISTINCT FROM v_acc.current_balance;

    -- Sync til portfolios
    UPDATE public.portfolios
    SET current_balance = v_acc.current_balance, updated_at = NOW()
    WHERE user_id = v_acc.user_id AND current_balance IS DISTINCT FROM v_acc.current_balance;

    IF FOUND THEN
      v_synced_count := v_synced_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'klarpakke_hourly_balance_sync: synket % brukere fra paper_accounts', v_synced_count;
END;
$$;

-- Konsistens-sjekken må også måle mot source of truth, ikke sesjonssummer.
CREATE OR REPLACE FUNCTION public.klarpakke_hourly_consistency_check()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acc RECORD;
  v_profile_balance NUMERIC;
  v_wallet_balance NUMERIC;
  v_portfolio_balance NUMERIC;
  v_mismatch_count INTEGER := 0;
BEGIN
  FOR v_acc IN
    SELECT user_id, current_balance FROM public.paper_accounts
  LOOP
    SELECT paper_balance INTO v_profile_balance FROM public.user_profiles WHERE id = v_acc.user_id;
    SELECT COALESCE(SUM(balance), 0) INTO v_wallet_balance FROM public.wallets WHERE user_id = v_acc.user_id;
    SELECT COALESCE(SUM(current_balance), 0) INTO v_portfolio_balance FROM public.portfolios WHERE user_id = v_acc.user_id;

    -- Tillat 1 NOK avrundingsfeil
    IF ABS(v_acc.current_balance - COALESCE(v_profile_balance, 0)) > 1
       OR ABS(v_acc.current_balance - COALESCE(v_wallet_balance, 0)) > 1
       OR ABS(v_acc.current_balance - COALESCE(v_portfolio_balance, 0)) > 1
    THEN
      INSERT INTO public.balance_sync_audit (user_id, check_type, status, details)
      VALUES (
        v_acc.user_id,
        'balance_mismatch',
        'error',
        jsonb_build_object(
          'paper_accounts_balance', v_acc.current_balance,
          'profile_balance', v_profile_balance,
          'wallet_balance', v_wallet_balance,
          'portfolio_balance', v_portfolio_balance
        )
      );
      v_mismatch_count := v_mismatch_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'klarpakke_hourly_consistency_check: % avvik mot paper_accounts', v_mismatch_count;
END;
$$;

-- Engangs-backfill: reparer all eksisterende drift umiddelbart.
UPDATE public.user_profiles up
SET paper_balance = pa.current_balance, updated_at = NOW()
FROM public.paper_accounts pa
WHERE up.id = pa.user_id AND up.paper_balance IS DISTINCT FROM pa.current_balance;

UPDATE public.wallets w
SET balance = pa.current_balance, updated_at = NOW()
FROM public.paper_accounts pa
WHERE w.user_id = pa.user_id AND w.balance IS DISTINCT FROM pa.current_balance;

UPDATE public.portfolios p
SET current_balance = pa.current_balance, updated_at = NOW()
FROM public.paper_accounts pa
WHERE p.user_id = pa.user_id AND p.current_balance IS DISTINCT FROM pa.current_balance;
