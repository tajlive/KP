-- Add priority monitoring flag to user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_priority BOOLEAN DEFAULT false;

-- Mark hanne.nilsen@outlook.com as priority
UPDATE public.user_profiles 
SET is_priority = true 
WHERE email = 'hanne.nilsen@outlook.com';

-- Refresh schema for PostgREST
NOTIFY pgrst, 'reload schema';
