-- KLA-9: XP & Leveling System (Gamification)
-- Tabell for å lagre brukerens nivå, XP og streaks

CREATE TABLE IF NOT EXISTS public.user_gamification (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_level INTEGER NOT NULL DEFAULT 1,
    total_xp INTEGER NOT NULL DEFAULT 0,
    current_streak INTEGER NOT NULL DEFAULT 0,
    last_login_date DATE, -- For å sjekke om streaken er brutt eller ivaretatt
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;

-- Brukere kan lese sin egen gamification status
CREATE POLICY "Users can view their own gamification stats" 
ON public.user_gamification FOR SELECT 
USING (auth.uid() = user_id);

-- Innsetting og oppdatering av gamification styres primært av service role (backend API) 
-- for å forhindre juks, men vi tillater lesing fra klient.
-- (VIKTIG: Oppdateringer gjøres via edge functions / server actions som bruker Supabase Service Key, eller vi lager en spesifikk policy hvis vi bruker RLS bypass på server).
-- For å tillate API-et (som kjører som brukeren) å oppdatere, legger vi til ALLOW:
CREATE POLICY "Users can update their own gamification stats" 
ON public.user_gamification FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gamification stats" 
ON public.user_gamification FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- En trigger for å sikre at `updated_at` alltid er fersk
CREATE OR REPLACE FUNCTION update_gamification_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_gamification_updated_at ON public.user_gamification;

CREATE TRIGGER update_user_gamification_updated_at
    BEFORE UPDATE ON public.user_gamification
    FOR EACH ROW
    EXECUTE FUNCTION update_gamification_updated_at_column();
