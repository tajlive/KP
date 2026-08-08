-- ============================================================================
-- FOUNDER-LOVEN (Tom-mandat 2026-08-08): De 100 FØRSTE registrerte brukerne
-- får GRATIS TILGANG FOR LIVET.
--   - Auto-tildeling: nye user_profiles får role='founder' så lenge det er
--     < 100 founders totalt (de 40 eksisterende testprofilene tar ikke plass —
--     ingen av dem har role='founder').
--   - Loggføring: klt_founder_allocations med student_number (1..100).
--   - KLT-bonus (5000) håndteres av eksisterende grant_beta_klt_bonus + admin.
--   - Race-sikring: pg_advisory_xact_lock serialiserer tildelingen.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_assign_founder_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  founder_count INTEGER;
  next_num INTEGER;
BEGIN
  -- Serialiser founder-tildeling (100 plasser, ingen race)
  PERFORM pg_advisory_xact_lock(424242);

  SELECT COUNT(*) INTO founder_count
  FROM public.user_profiles
  WHERE role = 'founder';

  IF founder_count >= 100 THEN
    RETURN NEW; -- plassene er fylt — vanlig bruker
  END IF;

  NEW.role := 'founder';

  SELECT COALESCE(MAX(student_number), 0) + 1
  INTO next_num
  FROM public.klt_founder_allocations;

  BEGIN
    INSERT INTO public.klt_founder_allocations (user_id, amount, claimed, student_number, created_at)
    VALUES (NEW.id, 5000, false, next_num, NOW())
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- founder-rolle tildelt; logg-feil må aldri blokkere registrering
  END;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_auto_assign_founder ON public.user_profiles;
CREATE TRIGGER trg_auto_assign_founder
BEFORE INSERT ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_founder_status();

-- ============================================================================
-- Verifikasjon (kjøres manuelt):
--   SELECT count(*) FILTER (WHERE role='founder') FROM user_profiles; -- 0
--   INSERT INTO user_profiles (id, email) VALUES (gen_random_uuid(), 'test@x.no');
--   → ny profil får role='founder' + klt_founder_allocations-rad #1
-- ============================================================================
