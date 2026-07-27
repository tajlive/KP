-- Fase 5: Floor negative paper_accounts + permanent CHECK-constraint
--
-- Bakgrunn: viking.no@klarpakke.test (testbruker) hadde
-- current_balance = −3 720 642 532,90 — artefakt fra balanse-krigen
-- (fjernet kode skrev til paper_accounts). Hourly sync kopierer verdien
-- til user_profiles/wallets/portfolios, så tallet må bort.
-- Leaderboard ekskluderer allerede negative kontoer (gt 0), men
-- dashboardet til testbrukeren viste absurd verdi.
--
-- Samme mønster som 20260728000000 (trading_sessions):
-- audit først, floor, NOT VALID constraint, VALIDATE separat.
-- Idempotent: WHERE < 0 + DROP IF EXISTS.
--
-- APPLIED i prod 2026-07-28 via supabase-db MCP (verifisert:
-- 0 negative, 1 audit-rad, convalidated=true).

BEGIN;

INSERT INTO balance_sync_audit (user_id, check_type, status, details)
SELECT user_id, 'phase2_recompute', 'ok',
       jsonb_build_object('action', 'paper_account_floor_to_zero',
         'paper_account_id', id,
         'current_balance_before', current_balance)
FROM paper_accounts
WHERE current_balance < 0 OR initial_balance < 0;

UPDATE paper_accounts SET current_balance = 0 WHERE current_balance < 0;
UPDATE paper_accounts SET initial_balance = 0 WHERE initial_balance < 0;

ALTER TABLE paper_accounts DROP CONSTRAINT IF EXISTS paper_accounts_balance_nonnegative;
ALTER TABLE paper_accounts ADD CONSTRAINT paper_accounts_balance_nonnegative
  CHECK (current_balance >= 0 AND initial_balance >= 0) NOT VALID;

COMMIT;

ALTER TABLE paper_accounts VALIDATE CONSTRAINT paper_accounts_balance_nonnegative;
