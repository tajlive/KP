-- KLT-konsolidering: kltbalances (legacy, 38 rader) merges inn i
-- user_klt_balances (autoritativ, brukt av gamification + klt-wallet).
-- Legacy-tabellen beholdes som kltbalances_deprecated (reversibelt).
-- MERK: Allerede applyet i prod 2026-07-25 via Management API.
-- Filen speiler prod-tilstand for repo-synk. Idempotent.

-- 1) Rader som bare finnes i legacy-tabellen
INSERT INTO user_klt_balances (user_id, balance, total_earned, total_spent)
SELECT kb.userid, kb.balance, kb.total_earned, kb.total_spent
FROM kltbalances kb
WHERE NOT EXISTS (
  SELECT 1 FROM user_klt_balances u WHERE u.user_id = kb.userid
)
ON CONFLICT DO NOTHING;

-- 2) Divergerende rader: ta hoyeste verdi (aldri senk en brukers saldo)
UPDATE user_klt_balances u
SET balance = GREATEST(u.balance, kb.balance),
    total_earned = GREATEST(u.total_earned, kb.total_earned),
    updated_at = now()
FROM kltbalances kb
WHERE u.user_id = kb.userid
  AND (kb.balance > u.balance OR kb.total_earned > u.total_earned);

-- 3) Rename legacy (idempotent-guard: kun hvis kltbalances finnes)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'kltbalances'
  ) THEN
    ALTER TABLE kltbalances RENAME TO kltbalances_deprecated;
  END IF;
END $$;
