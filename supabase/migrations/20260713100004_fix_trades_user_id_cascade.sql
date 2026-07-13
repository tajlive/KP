-- Fix: trades.user_id mangler ON DELETE CASCADE — kan gi orphaned rows ved brukersletting
ALTER TABLE public.trades
  DROP CONSTRAINT IF EXISTS trades_user_id_fkey;

ALTER TABLE public.trades
  ADD CONSTRAINT trades_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
