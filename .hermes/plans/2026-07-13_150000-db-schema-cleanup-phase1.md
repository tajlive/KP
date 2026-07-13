# DB Schema Cleanup — Phase 1 (Low-risk fixes)

> **For PC-Hermes:** Lag en branch, implementer hver migrasjon, commit ofte, åpne PR mot `main`.
> **Mac-Hermes merger + deployer.**

**Mål:** Fiks de mest kritiske schema-problemene funnet ved full DB-scan 2026-07-13:
1. `league_participants` peker til tom `public.users` i stedet for `auth.users`
2. Slett `backup_policies_20260224` (ingen PK, backup-navn, sannsynligvis utgått)
3. Fjern redundant `user_profiles_user_id_fkey` (har allerede `user_profiles_id_fkey` til auth.users)
4. Legg til `ON DELETE CASCADE` på `trades.user_id` (hovedtradetabell — kritisk)

**Teknisk tilnærming:** Én Supabase-migrasjon per endring. Tester: kjør `supabase db push` mot staging først, verifiser med psql-spørringer.

**Branch-navn:** `fix/db-schema-cleanup-phase1`

---

## Task 1: Fiks league_participants FK

**Mål:** `league_participants.user_id` skal peke til `auth.users(id)`, ikke `public.users(id)`

**Opprett:** `supabase/migrations/20260713100001_fix_league_participants_fk.sql`

```sql
-- Fjern gammel FK som peker til den tomme public.users-tabellen
ALTER TABLE public.league_participants
  DROP CONSTRAINT IF EXISTS league_participants_user_id_fkey;

-- Legg til ny FK mot auth.users
ALTER TABLE public.league_participants
  ADD CONSTRAINT league_participants_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

**Verifiser:**
```sql
SELECT conname, confrelid::regclass, pg_get_constraintdef(oid)
FROM pg_constraint WHERE conname = 'league_participants_user_id_fkey';
-- Forventet: REFERENCES auth.users(id) ON DELETE CASCADE
```

**Commit:**
```bash
git add supabase/migrations/20260713100001_fix_league_participants_fk.sql
git commit -m "fix: league_participants FK peker til auth.users (ikke tom public.users)"
```

---

## Task 2: Slett backup_policies_20260224

**Mål:** Fjern backup-tabell uten PK og uten FK — sannsynligvis en rest fra feb 2026

**Opprett:** `supabase/migrations/20260713100002_drop_backup_policies_20260224.sql`

```sql
DROP TABLE IF EXISTS public.backup_policies_20260224;
```

**Verifiser:**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'backup_policies_20260224';
-- Forventet: 0 rader
```

**Risiko:** `backup_policies_20260224` refereres i 3 auto-genererte type-filer:
- `src/types/database.types.ts`
- `src/types/supabase.ts`
- `src/lib/supabase/database.types.ts`
  
Etter tabellen er droppet, regenerer typene:
```bash
npx supabase gen types typescript --linked > src/types/database.types.ts
```
Eller bare vent — neste gang `npm run db:types` kjøres fikses det.

**Commit:**
```bash
git add supabase/migrations/20260713100002_drop_backup_policies_20260224.sql
git commit -m "cleanup: fjern backup_policies_20260224 (ingen PK, backup-rest)"
```

---

## Task 3: Fjern redundant user_profiles_user_id_fkey

**Mål:** `user_profiles` har TO FK'er til auth.users (`id`-FK og `user_id`-FK). Behold bare `id`-FK.

**Opprett:** `supabase/migrations/20260713100003_remove_redundant_user_profiles_fk.sql`

```sql
-- user_profiles_id_fkey (id → auth.users.id) er den vi beholder
-- user_profiles_user_id_fkey (user_id → auth.users.id) er redundant
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;
```

**Verifiser:**
```sql
SELECT conname FROM pg_constraint
WHERE conrelid = 'public.user_profiles'::regclass AND contype = 'f';
-- Forventet: user_profiles_id_fkey (kun én FK gjenstår)
```

**Commit:**
```bash
git add supabase/migrations/20260713100003_remove_redundant_user_profiles_fk.sql
git commit -m "fix: fjern redundant user_profiles_user_id_fkey (id-FK dekker samme)"
```

---

## Task 4: Legg til ON DELETE CASCADE på trades.user_id

**Mål:** Når en bruker slettes, skal tradesene deres også slettes (ellers får vi orphaned rows).

**Opprett:** `supabase/migrations/20260713100004_fix_trades_user_id_cascade.sql`

```sql
-- trades.user_id mangler ON DELETE — fikser det
ALTER TABLE public.trades
  DROP CONSTRAINT IF EXISTS trades_user_id_fkey,
  ADD CONSTRAINT trades_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

**Verifiser:**
```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint WHERE conrelid = 'public.trades'::regclass AND conname = 'trades_user_id_fkey';
-- Forventet: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
```

**Commit:**
```bash
git add supabase/migrations/20260713100004_fix_trades_user_id_cascade.sql
git commit -m "fix: legg til ON DELETE CASCADE på trades.user_id"
```

---

## Validering før PR

Kjør mot staging først (via Supabase CLI om tilgjengelig, ellers direkte SQL):

```bash
# Sjekk at alle migrasjoner er syntaktisk korrekte
# (ingen kjørbar test uten DB-tilgang, men SQL er trivielt)
```

**Åpne PR:**
```bash
git push origin fix/db-schema-cleanup-phase1
gh pr create --title "fix: db schema cleanup phase 1" \
  --body "Fikser 4 kritiske schema-problemer:
- league_participants FK → auth.users (var: tom public.users)
- Slett backup_policies_20260224 (ingen PK)
- Fjern redundant user_profiles_user_id_fkey
- Legg til ON DELETE CASCADE på trades.user_id" \
  --base main
```

---

## Risiko & notater

| # | Risiko | Mitigasjon |
|---|--------|-----------|
| 1 | `backup_policies_20260224` kan brukes av kode | Søk i repo etter referanser før sletting |
| 2 | `trades.user_id` CASCADE kan feile hvis det finnes foreldreløse rader | Sjekk med `SELECT count(*) FROM trades WHERE user_id NOT IN (SELECT id FROM auth.users)` først |
| 3 | Migrasjonene kjører i produksjon — låser kort | Hver migrasjon er en ALTER TABLE, bør gå på < 1s |

**Søk etter backup_policies i kode:**
```bash
grep -r "backup_policies_20260224" src/ --include="*.ts" --include="*.tsx" || echo "Ingen kode-referanser"
```
