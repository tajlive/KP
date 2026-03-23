-- ============================================================================
-- Reconcile public.user_profiles med Klarpakke-repo (E2E, Admin, PostgREST)
-- ============================================================================
-- Fikser vanlig drift: manglende subscription_status (PGRST204), user_id NULL
-- (23502) når tabellen har egen rad-PK + user_id → auth.users.
--
-- Kjør mot prod/dev:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20260323140000_reconcile_user_profiles_schema.sql
-- eller:
--   ./scripts/sql.sh file supabase/migrations/20260323140000_reconcile_user_profiles_schema.sql
-- eller (Supabase CLI): supabase db push
-- ============================================================================
SET lock_timeout = '30s';
SET statement_timeout = '180s';

-- 1) Kolonne user_id (FK → auth.users) hvis den mangler helt
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.user_profiles
      ADD COLUMN user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE;
    RAISE NOTICE 'Lagt til user_profiles.user_id (FK auth.users)';
  END IF;
END;
$$;

-- 2a) Backfill: legacy der rad-PK id = auth.users.id
UPDATE public.user_profiles up
SET user_id = up.id
WHERE up.user_id IS NULL
  AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = up.id);

-- 2b) Backfill via e-post når id ikke er auth-id men email stemmer
UPDATE public.user_profiles up
SET user_id = s.auth_id
FROM (
  SELECT DISTINCT ON (trim(lower(up2.email::text)))
    up2.ctid AS prof_ctid,
    au.id AS auth_id
  FROM public.user_profiles up2
  INNER JOIN auth.users au
    ON trim(lower(au.email::text)) = trim(lower(up2.email::text))
  WHERE up2.user_id IS NULL
    AND up2.email IS NOT NULL
    AND trim(up2.email::text) <> ''
  ORDER BY trim(lower(up2.email::text)), up2.created_at NULLS LAST
) s
WHERE up.ctid = s.prof_ctid
  AND up.user_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_profiles o
    WHERE o.user_id = s.auth_id
      AND o.ctid <> up.ctid
  );

-- 3) subscription_status (PostgREST / create-test-users / triggers)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE public.user_profiles
      ADD COLUMN subscription_status TEXT NOT NULL DEFAULT 'active';
    RAISE NOTICE 'Lagt til user_profiles.subscription_status';
  END IF;
END;
$$;

-- 4) subscription_tier (tekst) hvis app/API forventer kolonnen ved siden av tier-enum
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE public.user_profiles
      ADD COLUMN subscription_tier TEXT NOT NULL DEFAULT 'student';
    RAISE NOTICE 'Lagt til user_profiles.subscription_tier';
  END IF;
END;
$$;

-- Synk subscription_tier fra tier kun når verdiene er ulike (unngå å overskrive manuelle endringer)
UPDATE public.user_profiles up
SET subscription_tier = v.expected
FROM (
  SELECT
    ctid,
    CASE
      WHEN tier::text = 'free' THEN 'student'
      ELSE tier::text
    END AS expected
  FROM public.user_profiles
) v
WHERE up.ctid = v.ctid
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'tier'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'subscription_tier'
  )
  AND up.tier IS NOT NULL
  AND up.subscription_tier IS DISTINCT FROM v.expected;

-- 5) Unik indeks på user_id (ON CONFLICT (user_id) krever full unik indeks, ikke partial)
DO $$
DECLARE
  v_dup BOOL;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'user_id'
  ) THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_id IS NOT NULL
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) INTO v_dup;

  IF v_dup THEN
    RAISE WARNING 'Fant duplikate user_id i user_profiles — unik indeks ikke opprettet. Rydd manuelt.';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'user_profiles'
      AND indexname = 'user_profiles_user_id_unique'
  ) THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'user_profiles'
      AND c.contype = 'u'
      AND pg_get_constraintdef(c.oid) LIKE '%user_id%'
  ) THEN
    RETURN;
  END IF;

  BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_user_id_unique
      ON public.user_profiles (user_id);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Kunne ikke opprette unik indeks på user_id: %', SQLERRM;
  END;
END;
$$;

-- 6) NOT NULL på user_id når alle rader er fylt (valgfritt men anbefalt for nye inserts)
DO $$
DECLARE
  v_nulls INT;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'user_id'
  ) THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_nulls
  FROM public.user_profiles
  WHERE user_id IS NULL;

  IF v_nulls = 0 THEN
    BEGIN
      ALTER TABLE public.user_profiles
        ALTER COLUMN user_id SET NOT NULL;
      RAISE NOTICE 'user_profiles.user_id satt til NOT NULL';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Kunne ikke sette user_id NOT NULL: %', SQLERRM;
    END;
  ELSE
    RAISE WARNING '% user_profiles-rader har fortsatt NULL user_id', v_nulls;
  END IF;
END;
$$;

-- 7) PostgREST: oppfrisk skjema-cache (Supabase)
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE '✅ reconcile_user_profiles_schema ferdig';
END;
$$;
