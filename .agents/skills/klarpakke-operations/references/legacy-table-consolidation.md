# Legacy-tabell-konsolidering i prod (to parallelle sannhetskilder)

Spillebok fra KLT-konsolideringen 2026-07-25 (`kltbalances` 38 rader vs
`user_klt_balances` 49 rader, divergerende data). Gjelder enhver "to tabeller,
samme domene"-situasjon.

## 1. Finn autoritativ kilde FØR du rører data

```bash
grep -rn "tabellnavn" src --include="*.ts" --include="*.tsx"
```

Skriveveien (gamification/award-kode) definerer den autoritative tabellen.
Leseruter på legacy-tabellen pekes om — ikke omvendt.

## 2. Merge med GREATEST — aldri senk en brukers saldo

```sql
BEGIN;
-- Rader som bare finnes i legacy:
INSERT INTO ny_tabell (user_id, balance, total_earned, total_spent)
SELECT l.userid, l.balance, l.total_earned, l.total_spent
FROM legacy l
WHERE NOT EXISTS (SELECT 1 FROM ny_tabell n WHERE n.user_id = l.userid);
-- Divergerende rader: hoyeste verdi vinner
UPDATE ny_tabell n
SET balance = GREATEST(n.balance, l.balance),
    total_earned = GREATEST(n.total_earned, l.total_earned),
    updated_at = now()
FROM legacy l
WHERE n.user_id = l.userid AND (l.balance > n.balance OR l.total_earned > n.total_earned);
COMMIT;
```

## 3. RENAME legacy — ikke DROP (reversibelt)

`ALTER TABLE legacy RENAME TO legacy_deprecated;` — data beholdes, rollback er trivielt.

## 4. KRITISK: Sjekk hva som brekker ved rename FØR du gjør det

```sql
-- Funksjoner som refererer tabellen (triggere, RPC-er):
SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND pg_get_functiondef(p.oid) ILIKE '%legacy_tabell%';
-- Triggere pa auth.users (signup-kjeden!):
SELECT tgname FROM pg_trigger WHERE tgrelid='auth.users'::regclass AND NOT tgisinternal;
```

Funnet i KLT-saken: `initialize_user_manually` (SECURITY DEFINER RPC) skrev til
`kltbalances` — hadde brutt hvis den ble kalt etter rename. Fikset med
`CREATE OR REPLACE FUNCTION` mot ny tabell. `handle_new_user_klt` var dod kode
(ingen trigger) → droppet.

## 5. Sjekk for gjenoppstandelses-endepunkter i koden

KLT-saken: admin-endepunktet `kla130` inneholdt `CREATE TABLE IF NOT EXISTS
public.kltbalances` + trigger-opprettelse — ett POST ville gjenopprettet hele
legacy-strukturen. Slett slike engangs-migrasjonsendepunkter, og husk:
**testfiler importerer ruter** — `grep -rn "kla130" src` fant
`admin-routes-auth.test.ts` som brakk vitest (vite import-analysis-feil)
til referansen ble fjernet.

## 6. Repo-synk

Migrasjonsfiler i `supabase/migrations/<timestamp>_navn.sql` (flate!) som speiler
det som er applyet — med kommentar "Allerede applyet i prod via MCP/Management API".
