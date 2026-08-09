-- ============================================================================
-- STEG 5: Etter-deploy korreksjon (2026-08-10)
-- KLAR TIL GJENNOMGANG — IKKE KJØRT.
--
-- ⚠️  KJØRES FØRST ETTER at kodefiksen (paper-account-sync.ts +
--     portfolio/summary/route.ts) er DEPLOYET til prod. Kjøres den før
--     deploy, re-inflater tick-cronen saldoene igjen innen 5 minutter.
--
-- Bakgrunn: P0-DB-fiks 23:16 UTC ble reversert 23:20 av tick-cron
-- (src/lib/trading/core/paper-account-sync.ts summerte active+paused+stopped
-- → paper_accounts). Koden er fikset lokalt (kun active+paused), men
-- prod kjører fortsatt gammel kode — saldo re-inflateres hvert 5. minutt.
--
-- Bevis 23:25 UTC:
--   Tom:    697 576,98 = 100 000 + 99 646,50 + 199 647 + 198 636,98 + 99 646,50
--           (summen inkluderer ARKIVERTE sesjoner — koden filtrerer ikke archived)
--   Pål:    198 331,68 = 100 000 + 98 331,68 (to aktive sesjoner opprettet
--           23 sekunder fra hverandre 2026-08-08 07:09 — duplikat-sesjon)
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Tom (0dd08529) — samme korreksjon som ble reversert.
-- Fasit: 99 646,50 (100 000 − 353,50 reelt realisert tap).
-- ---------------------------------------------------------------------------
UPDATE public.paper_accounts
SET current_balance = 99646.50, updated_at = NOW()
WHERE user_id = '0dd08529-b8a8-4fd3-9806-275e2d0135dd';

UPDATE public.user_profiles
SET paper_balance = 99646.50, updated_at = NOW()
WHERE id = '0dd08529-b8a8-4fd3-9806-275e2d0135dd';

-- ---------------------------------------------------------------------------
-- Pål (db00be5b) — duplikat aktiv sesjon.
-- Sesjon med 100 000 (uendret, aldri tradet) arkiveres som duplikat.
-- Sesjonen med 98 331,68 (faktisk handelsaktivitet) beholdes aktiv.
-- Fasit: 98 331,68 (100 000 − 1 668,32 reelt resultat).
-- ---------------------------------------------------------------------------
UPDATE public.trading_sessions
SET archived = true, status = 'stopped', updated_at = NOW()
WHERE id = (
  SELECT id FROM public.trading_sessions
  WHERE user_id = 'db00be5b-2558-44fe-a5e3-b3af5f22c3bc'
    AND mode = 'paper' AND status = 'active'
    AND current_capital_nok = 100000 AND initial_capital = 100000
  LIMIT 1
);

UPDATE public.paper_accounts
SET current_balance = 98331.68, updated_at = NOW()
WHERE user_id = 'db00be5b-2558-44fe-a5e3-b3af5f22c3bc';

UPDATE public.user_profiles
SET paper_balance = 98331.68, updated_at = NOW()
WHERE id = 'db00be5b-2558-44fe-a5e3-b3af5f22c3bc';

COMMIT;

-- ---------------------------------------------------------------------------
-- Verifisering ETTER neste tick (vent minst 5 min etter kjøring!):
--   SELECT user_id, current_balance, updated_at FROM paper_accounts
--   WHERE user_id IN ('0dd08529-b8a8-4fd3-9806-275e2d0135dd',
--                     'db00be5b-2558-44fe-a5e3-b3af5f22c3bc');
-- Forventet: 99 646,50 / 98 331,68 — og updated_at skal IKKE tikke videre
-- hvert 5. minutt lenger (deployet kode summerer kun aktive sesjoner,
-- og aktive summer = korrigert fasit → ingen endring skrives).
-- ---------------------------------------------------------------------------
