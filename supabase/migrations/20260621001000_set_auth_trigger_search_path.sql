-- Auth trigger functions are executed by GoTrue as supabase_auth_admin, whose
-- search_path does not include the public schema. SECURITY DEFINER runs with
-- the privileges of the function owner (postgres), but *not* the owner's
-- search_path. Functions that reference public tables without the `public.`
-- prefix therefore fail with "relation does not exist" and GoTrue returns 500.
--
-- Fix: pin search_path on all auth trigger functions to public first.

BEGIN;

ALTER FUNCTION public.handle_new_user_email_prefs() SET search_path = public, pg_temp;
ALTER FUNCTION public.create_default_risk_profile() SET search_path = public, pg_temp;
ALTER FUNCTION public.create_default_user_data() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user_consolidated() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user_klt() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user_onboarding() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user_onboarding_kla158() SET search_path = public, pg_temp;

COMMIT;
