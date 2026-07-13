-- Fix: fjern redundant user_profiles_user_id_fkey (user_profiles_id_fkey dekker allerede id → auth.users)
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;
