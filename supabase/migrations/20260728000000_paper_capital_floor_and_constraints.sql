-- Fase 2b: Floor negative papir-kapitaler + permanente CHECK-constraints
--
-- Bakgrunn: 38 sesjoner har negativ current_capital_nok og/eller current_capital
-- (overdraft-rester fra den gamle salg-uten-beholdning-buggen, utenfor de 388
-- recompute-sesjonene). Negativ papir-kapital er meningsløs — floor til 0.
--
-- Steg:
--   1. Audit-rad per berørt sesjon (før-verdier i details) — gjenbruker
--      check_type 'phase2_recompute' pga CHECK-constraint på check_type.
--   2. Floor begge kapitalkolonner uavhengig der de er < 0.
--   3. NOT VALID CHECK-constraint: hindrer at kolonnene noen gang blir
--      negative igjen. NOT VALID + VALIDATE i to steg for å unngå lang lås.
--
-- Idempotent: UPDATE ... WHERE < 0 og DROP IF EXISTS / ADD NOT VALID.

BEGIN;

-- 1. Audit før floor (fanger faktiske før-verdier)
INSERT INTO balance_sync_audit (user_id, check_type, status, details)
SELECT user_id,
       'phase2_recompute',
       'ok',
       jsonb_build_object(
         'action', 'capital_floor_to_zero',
         'session_id', id,
         'current_capital_before', current_capital,
         'current_capital_nok_before', current_capital_nok
       )
FROM trading_sessions
WHERE current_capital < 0 OR current_capital_nok < 0;

-- 2. Floor
UPDATE trading_sessions SET current_capital = 0 WHERE current_capital < 0;
UPDATE trading_sessions SET current_capital_nok = 0 WHERE current_capital_nok < 0;

-- 3. Permanent sikkerhetsnett (NOT VALID først, så VALIDATE separat)
ALTER TABLE trading_sessions DROP CONSTRAINT IF EXISTS trading_sessions_capital_nonnegative;
ALTER TABLE trading_sessions ADD CONSTRAINT trading_sessions_capital_nonnegative
  CHECK (current_capital >= 0 AND current_capital_nok >= 0 AND initial_capital >= 0) NOT VALID;

COMMIT;

-- VALIDATE utenfor transaksjonen over kjøres som egen statement:
ALTER TABLE trading_sessions VALIDATE CONSTRAINT trading_sessions_capital_nonnegative;
