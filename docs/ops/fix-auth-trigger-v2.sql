-- Fix handle_new_user trigger — fyller ALLE påkrevde kolonner
-- Kjør i Supabase Dashboard SQL Editor
-- Hermes Lead Architect — 2026-07-08

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    display_name,
    full_name,
    subscription_tier,
    subscription_status,
    source,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'free',
    'active',
    'signup',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;

-- Koble trigger til auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
