-- ============================================================================
-- Trader verification audit table and column-level protections
-- ============================================================================
-- Idempotent: safe to re-run.

-- 1. Verification audit table -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trader_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trader_profile_id UUID NOT NULL REFERENCES public.trader_profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'revoked'
    reason TEXT,
    verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trader_verifications_profile_id
    ON public.trader_verifications(trader_profile_id, created_at DESC);

-- 2. Enable RLS ---------------------------------------------------------------
ALTER TABLE public.trader_verifications ENABLE ROW LEVEL SECURITY;

-- 3. Drop any pre-existing policies for idempotency ---------------------------
DROP POLICY IF EXISTS "Trader verifications are viewable by service_role" ON public.trader_verifications;
DROP POLICY IF EXISTS "Trader verifications are manageable by service_role" ON public.trader_verifications;

-- 4. RLS policies: service_role only ------------------------------------------
CREATE POLICY "Trader verifications are viewable by service_role"
    ON public.trader_verifications FOR SELECT
    USING (auth.role() = 'service_role');

CREATE POLICY "Trader verifications are manageable by service_role"
    ON public.trader_verifications FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- 5. Helper function: latest verification for a trader profile --------------
CREATE OR REPLACE FUNCTION public.latest_trader_verification(p_trader_profile_id UUID)
RETURNS public.trader_verifications
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT *
    FROM public.trader_verifications
    WHERE trader_profile_id = p_trader_profile_id
    ORDER BY created_at DESC
    LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.latest_trader_verification(UUID) TO service_role, authenticated, anon;

-- 6. Restructure trader_profiles RLS: replace broad FOR ALL policy ------------
DROP POLICY IF EXISTS "Users can manage own trader profile" ON public.trader_profiles;

-- INSERT: users can create their own profile
CREATE POLICY "Users can insert own trader profile"
    ON public.trader_profiles FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- UPDATE: users can update their own profile (verified column is guarded below)
CREATE POLICY "Users can update own trader profile"
    ON public.trader_profiles FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- DELETE: users can delete their own profile
CREATE POLICY "Users can delete own trader profile"
    ON public.trader_profiles FOR DELETE
    USING (user_id = auth.uid());

-- Service role has full access to trader_profiles
DROP POLICY IF EXISTS "Service role full access trader_profiles" ON public.trader_profiles;
CREATE POLICY "Service role full access trader_profiles"
    ON public.trader_profiles FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- 7. Trigger: only service_role can mutate the verified column ----------------
CREATE OR REPLACE FUNCTION public.trader_profiles_guard_verified_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.verified IS DISTINCT FROM OLD.verified THEN
        IF auth.role() <> 'service_role' THEN
            RAISE EXCEPTION 'Only service_role may update the verified column on trader_profiles';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trader_profiles_guard_verified_column ON public.trader_profiles;
CREATE TRIGGER trader_profiles_guard_verified_column
    BEFORE UPDATE ON public.trader_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.trader_profiles_guard_verified_column();

-- 8. Grants -------------------------------------------------------------------
GRANT ALL ON public.trader_verifications TO service_role;
