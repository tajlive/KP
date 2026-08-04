-- Konkurranse-påmelding (opt-in «Bli med») + offentlig deltakertall.
-- Idempotent. Kun nye objekter — ingen endring av eksisterende data.

CREATE TABLE IF NOT EXISTS public.competition_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    competition_id text NOT NULL,
    joined_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT competition_entries_unique UNIQUE (user_id, competition_id)
);

ALTER TABLE public.competition_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "competition_entries_select_own" ON public.competition_entries;
CREATE POLICY "competition_entries_select_own"
    ON public.competition_entries FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "competition_entries_insert_own" ON public.competition_entries;
CREATE POLICY "competition_entries_insert_own"
    ON public.competition_entries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Offentlig deltakertall uten å eksponere enkelt-rader (kun et aggregert tall).
CREATE OR REPLACE FUNCTION public.competition_participant_count(p_competition_id text)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT count(*)::integer
    FROM public.competition_entries
    WHERE competition_id = p_competition_id;
$$;

REVOKE ALL ON FUNCTION public.competition_participant_count(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.competition_participant_count(text) TO authenticated, anon;
