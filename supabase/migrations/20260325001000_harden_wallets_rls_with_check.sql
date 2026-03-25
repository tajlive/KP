-- Harden wallets RLS: prevent UPDATE from changing user_id ownership

BEGIN;

ALTER TABLE IF EXISTS public.wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can update own wallets" ON public.wallets;

CREATE POLICY "Users can update own wallets"
ON public.wallets
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

COMMIT;

