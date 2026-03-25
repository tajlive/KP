-- Harden authenticated RLS policies:
-- Replace permissive WITH CHECK (true) with WITH CHECK (qual)
-- for user-scoped policies to prevent row ownership drift.

BEGIN;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname, qual
    FROM pg_policies
    WHERE schemaname = 'public'
      AND roles::text LIKE '%authenticated%'
      AND with_check = 'true'
      AND qual IS NOT NULL
      AND (
        qual ILIKE '%user_id%'
        OR qual ILIKE '%auth.uid()%'
        OR qual ILIKE '%instructor_id%'
        OR qual ILIKE '%follower_user_id%'
        OR qual ILIKE '%account_id IN%'
      )
  ) LOOP
    EXECUTE format(
      'ALTER POLICY %I ON %I.%I WITH CHECK (%s)',
      r.policyname,
      r.schemaname,
      r.tablename,
      r.qual
    );
  END LOOP;
END $$;

COMMIT;

