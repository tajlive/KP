-- Database Webhook for Welcome Email
-- Triggers when a new profile is created

-- 1. Create the function that calls the edge function
CREATE OR REPLACE FUNCTION public.handle_new_user_welcome_email()
RETURNS TRIGGER AS $$
BEGIN
  -- We use net.http_post (via pg_net extension which is standard in Supabase)
  -- Or we can use the simpler Supabase Webhook UI, but let's provide the SQL for absolute control
  
  -- The Edge Function URL (replace with your actual project URL or use local for testing)
  -- Note: In production, it's better to use the HTTP Webhook UI in Supabase Dashboard
  -- because it handles retries and auth automatically.
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Suggested SQL to run in Supabase SQL Editor if using Webhooks via SQL:
/*
SELECT
  http_post(
    'https://[YOUR_PROJECT_ID].supabase.co/functions/v1/welcome-email',
    jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer [YOUR_SERVICE_ROLE_KEY]'
    ),
    jsonb_build_object('record', row_to_json(NEW))
  );
*/

-- NOTE: The most robust way is to go to Supabase Dashboard -> Database -> Webhooks
-- and create a webhook for "public.profiles" on "INSERT" that calls the "welcome-email" function.
