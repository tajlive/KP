-- Admin can read all user_profiles (for admin dashboard user list)
-- Without this, RLS limits SELECT to own row only, so admins see only themselves.
--
-- Kjør med PSQL (DATABASE_URL fra .env.local):
--   ./scripts/sql.sh file supabase/migrations/20260317190000_admin_read_all_user_profiles.sql
-- eller:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20260317190000_admin_read_all_user_profiles.sql

BEGIN;
-- Function to check if current user is admin (bypasses RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_admin_for_profiles()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'is_admin_for_profiles: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;
COMMENT ON FUNCTION public.is_admin_for_profiles() IS 'Returns true if auth.uid() has role=admin in user_profiles. Used by RLS to allow admin SELECT all.';
-- Allow admins to SELECT all rows (keep existing "own profile" semantics via OR)
DROP POLICY IF EXISTS "Users read own profile" ON public.user_profiles;
CREATE POLICY "Users read own profile" ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id OR public.is_admin_for_profiles());
COMMIT;
