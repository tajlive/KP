-- ============================================================
-- 20260215000007_welcome_email_trigger.sql
-- Enable automatic welcome emails via Supabase Edge Functions
-- ============================================================

-- 1. Create a function to call the welcome-email edge function
CREATE OR REPLACE FUNCTION public.activate_welcome_email()
RETURNS TRIGGER AS $$
DECLARE
  v_project_ref TEXT;
BEGIN
  -- We try to get the project ref from a setting or use a placeholder
  -- In a real Supabase environment, you might use a vault secret or hardcode it
  -- For now, we'll try to use the public API gateway if available
  
  -- Note: This requires the 'pg_net' extension to be enabled
  -- CREATE EXTENSION IF NOT EXISTS pg_net;

  PERFORM
    extensions.http_post(
      url := 'https://' || COALESCE(current_setting('app.settings.supabase_project_ref', true), 'vuxbjlykgmzskxbclquf') || '.functions.supabase.co/welcome-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(current_setting('app.settings.supabase_service_role_key', true), '')
      ),
      body := jsonb_build_object('record', row_to_json(NEW))
    );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't block the user creation if email fails
  RAISE WARNING 'Failed to trigger welcome email: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger on public.profiles
DROP TRIGGER IF EXISTS trigger_welcome_email ON public.profiles;

CREATE TRIGGER trigger_welcome_email
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.activate_welcome_email();

-- 3. Mark as complete
SELECT 'Welcome email trigger implemented' as status;
