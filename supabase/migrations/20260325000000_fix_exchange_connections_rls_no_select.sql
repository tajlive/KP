-- Harden exchange_connections RLS: correct user_id checks and block SELECT (secrets)
-- NOTE: We do not want clients to be able to SELECT encrypted secrets directly.

BEGIN;

ALTER TABLE IF EXISTS public.exchange_connections ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'exchange_connections'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.exchange_connections', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "exchange_connections_no_select"
ON public.exchange_connections
FOR SELECT
TO authenticated
USING (false);

CREATE POLICY "exchange_connections_insert_own"
ON public.exchange_connections
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "exchange_connections_update_own"
ON public.exchange_connections
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "exchange_connections_delete_own"
ON public.exchange_connections
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

COMMIT;

