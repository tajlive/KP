-- KLA-11: Referral System / Golden Tickets
-- Tabell for å spore invitasjoner og affiliates

CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Blir satt når vennen oppretter konto
    referred_email TEXT, -- Om vi vil spore invitasjoner før de registerer seg
    ticket_code TEXT UNIQUE NOT NULL, -- f.eks "GOLD-1234-ABCD"
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'account_created', 'binance_connected', 'deposit_made', 'rewarded')),
    binance_connected BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own generated referrals" 
ON public.referrals FOR SELECT 
USING (auth.uid() = referrer_id);

CREATE POLICY "Users can create their own referrals" 
ON public.referrals FOR INSERT 
WITH CHECK (auth.uid() = referrer_id);

-- En funksjon for å sikre at brukere ikke spam-genererer tickets (maks 3 per mnd)
-- (Sikres gjerne beste i applikasjonskoden API route for enhet, men fint å ha tabellstruktur klar)

-- Legg evt til RPC function / Trigger for å oppdatere `updated_at`
