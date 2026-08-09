-- ============================================================================
-- P0-FIKS: Balanse-inflasjon fra sesjons-summering (2026-08-10)
-- KLAR TIL GJENNOMGANG — IKKE KJØRT. Krever Toms godkjenning (DB er hellig).
--
-- Rotårsak (verifisert mot prod 2026-08-10):
--   Migrasjon 20260804070000 (sanity-cap) reverserte retnings-fiksen fra
--   20260724120000 og gjorde klarpakke_hourly_balance_sync() til å SUMME
--   current_capital_nok over ALLE paper-sesjoner (active+paused+stopped)
--   inn i paper_accounts.current_balance. Stoppede sesjoner forsvinner
--   aldri fra summen → balansen vokser eksponentielt.
--
-- Bevis (Tom, user_id 0dd08529-b8a8-4fd3-9806-275e2d0135dd):
--   22:40 UTC: balance 598 940,50 = 100 000 + 99 646,50 + 199 647 + 199 647
--   23:10 UTC: balance 697 930,48 = samme + ny sesjon 100 000  (+99k på 30 min)
--   Reell trading: 2 paper-handler, realisert P&L = −353,50 kr.
--   Korrekt saldo: 99 646,50 kr (100 000 − reelt tap).
--   Sanity-capen (3× initial) fanger ingenting fordi initial_sum blåses
--   opp i samme takt som current_sum.
--
-- Scope-sjekk: 36 paper_accounts gjennomgått — kun Toms konto er >2×
-- initial_balance. Ingen generell korreksjon nødvendig.
--
-- NB: cron-påstand "jobid 1108, 5 * * * *" er ikke verifiserbar via REST
-- (cron-schema er ikke eksponert). Saldo-oppdateringen 23:10:02 UTC skjedde
-- samtidig med sesjons-opprettelse — uansett hvilken vei som trigger
-- summeringen, nøytraliserer denne fiksen den, fordi funksjonen aldri mer
-- skriver sesjons-summer til kontoen.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- STEG 1: Funksjonen tilbake til korrekt retning (paper_accounts er SSoT).
-- Kun user_profiles synkes — det er den kanoniske kjeden (samme som
-- trigger sync_paper_balance). wallets/portfolios røres IKKE (de viser 0 kr
-- i dag og er ikke del av inflasjonen; wallets(NOK) kan være reell penger).
-- ---------------------------------------------------------------------------
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
    UPDATE public.user_profiles
    SET paper_balance = v_acc.current_balance, updated_at = NOW()
    WHERE id = v_acc.user_id
      AND paper_balance IS DISTINCT FROM v_acc.current_balance;

    IF FOUND THEN
      v_synced_count := v_synced_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'klarpakke_hourly_balance_sync: synket % brukere FRA paper_accounts (SSoT)', v_synced_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- STEG 2: Engangskorreksjon — Tom (eneste berørte konto)
-- Fasit: 99 646,50 = 100 000 start − 353,50 reelt realisert tap
-- (sesjon 6c4faf59-eb85-4c94-90d4-88c88a15a2fa, de eneste 2 reelle
-- paper-tradene). Senere sesjoner kjørte på fantom-kapital og teller ikke.
-- ---------------------------------------------------------------------------
UPDATE public.paper_accounts
SET current_balance = 99646.50, updated_at = NOW()
WHERE user_id = '0dd08529-b8a8-4fd3-9806-275e2d0135dd';

UPDATE public.user_profiles
SET paper_balance = 99646.50, updated_at = NOW()
WHERE id = '0dd08529-b8a8-4fd3-9806-275e2d0135dd';

-- Arkiver fantom-sesjonene (stoppede, kapital bygget på inflert saldo)
UPDATE public.trading_sessions
SET archived = true
WHERE id IN (
  'eb8d85e9-cbf2-4c1f-9819-18431fd76c4e',  -- initial 199 647 (fantom)
  'bf290f6a-536e-40d8-8d78-41b2420f3f3c'   -- initial 199 647 (fantom)
);

-- Rett den aktive sesjonen (opprettet 23:10 med 100 000) til korrigert fasit
UPDATE public.trading_sessions
SET current_capital = 99646.50,
    current_capital_nok = 99646.50,
    updated_at = NOW()
WHERE id = 'c87f9d01-8940-4446-9a54-77ed01ece16a'
  AND status = 'active';

COMMIT;

-- ---------------------------------------------------------------------------
-- STEG 3: Verifisering etter kjøring (forventet: én rad, 99 646,50 overalt)
-- ---------------------------------------------------------------------------
-- SELECT pa.current_balance, up.paper_balance
-- FROM paper_accounts pa JOIN user_profiles up ON up.id = pa.user_id
-- WHERE pa.user_id = '0dd08529-b8a8-4fd3-9806-275e2d0135dd';
--
-- Sjekk at prod-funksjonen faktisk er byttet (må inneholde 'FRA paper_accounts'):
-- SELECT pg_get_functiondef('public.klarpakke_hourly_balance_sync()'::regprocedure);
--
-- Overvåk neste time: balance skal være UENDRET etter neste cron-kjøring.

-- ---------------------------------------------------------------------------
-- VALGFRITT STEG 4 (anbefalt, egen godkjenning): drift-alarm.
-- Utvid klarpakke_hourly_consistency_check() med regel:
--   current_balance > initial_balance + COALESCE(sum(realized_pnl),0) + 1000
--   → INSERT i balance_sync_audit (status 'error').
-- Fanger enhver fremtidig inflasjon uavhengig av hvilken kodevei som
-- forårsaker den. ("Vi skal ikke gjøre samme feil to ganger"-guard.)
-- ---------------------------------------------------------------------------
