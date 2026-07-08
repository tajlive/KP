-- Fix auth trigger — rydder opp ALLE ødelagte triggere + sequence
-- Hermes Lead Architect — 2026-07-08 (verified working)

-- 1. Fiks handle_new_user (core profile creation)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, display_name, full_name,
    subscription_tier, subscription_status, source,
    created_at, updated_at
  ) VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'free', 'active', 'signup',
    NOW(), NOW()
  );
  RETURN NEW;
END;
$$;

-- 2. Fiks assign_user_number (kvalifiser sequence)
CREATE OR REPLACE FUNCTION public.assign_user_number()
RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF NEW.user_number IS NULL THEN
    NEW.user_number := nextval('public.user_number_seq');
  END IF;
  IF NEW.username IS NULL AND NEW.email IS NOT NULL THEN
    NEW.username := SPLIT_PART(NEW.email, '@', 1);
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Opprett sequence hvis den mangler
CREATE SEQUENCE IF NOT EXISTS public.user_number_seq START 1000;

-- 4. Koble trigger (kun handle_new_user på auth.users)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Dropp ALLE ødelagte triggere
DROP TRIGGER IF EXISTS create_email_prefs_on_signup ON auth.users;
DROP TRIGGER IF EXISTS create_risk_profile_on_signup ON auth.users;
DROP TRIGGER IF EXISTS new_user_klt_bonus ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_auto_trade ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_defaults ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_kla158 ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_onboarding ON auth.users;
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
DROP TRIGGER IF EXISTS on_profile_created_notification_prefs ON public.profiles;
DROP TRIGGER IF EXISTS trigger_welcome_email ON public.profiles;
