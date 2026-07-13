-- Fix: league_participants.user_id FK peker til tom public.users i stedet for auth.users
ALTER TABLE public.league_participants
  DROP CONSTRAINT IF EXISTS league_participants_user_id_fkey;

ALTER TABLE public.league_participants
  ADD CONSTRAINT league_participants_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
