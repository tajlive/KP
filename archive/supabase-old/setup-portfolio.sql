-- Sett opp database for portefølje og trading
-- Kjør dette i Supabase SQL Editor

-- 1. Porteføljer (hver bruker kan ha flere)
CREATE TABLE IF NOT EXISTS public.portfolios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT DEFAULT 'Min Portefølje',
    description TEXT,
    initial_balance DECIMAL(18, 8) DEFAULT 1000000, -- 1M NOK default
    current_balance DECIMAL(18, 8) DEFAULT 1000000,
    total_invested DECIMAL(18, 8) DEFAULT 0,
    total_profit DECIMAL(18, 8) DEFAULT 0,
    total_profit_percent DECIMAL(10, 4) DEFAULT 0,
    currency TEXT DEFAULT 'NOK',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Transaksjoner (kjøp/salg)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('buy', 'sell')), -- kjøp eller salg
    symbol TEXT NOT NULL, -- f.eks. BTC, ETH
    asset_name TEXT, -- f.eks. Bitcoin
    quantity DECIMAL(18, 8) NOT NULL,
    price_per_unit DECIMAL(18, 8) NOT NULL, -- pris per enhet i NOK
    total_amount DECIMAL(18, 8) NOT NULL, -- total verdi
    fee DECIMAL(18, 8) DEFAULT 0, -- handelsavgift
    exchange TEXT, -- hvilken exchange (f.eks. Binance)
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Holdings (nåværende beholdning)
CREATE TABLE IF NOT EXISTS public.holdings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    asset_name TEXT,
    quantity DECIMAL(18, 8) NOT NULL DEFAULT 0,
    avg_buy_price DECIMAL(18, 8) NOT NULL DEFAULT 0, -- gjennomsnittlig kjøpspris
    current_price DECIMAL(18, 8), -- siste kjente pris
    current_value DECIMAL(18, 8), -- nåværende verdi
    unrealized_profit DECIMAL(18, 8) DEFAULT 0, -- urealisert gevinst
    unrealized_profit_percent DECIMAL(10, 4) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(portfolio_id, symbol)
);

-- 4. Trading Signaler
CREATE TABLE IF NOT EXISTS public.trading_signals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    symbol TEXT NOT NULL,
    asset_name TEXT,
    action TEXT CHECK (action IN ('buy', 'sell', 'hold')),
    signal_type TEXT CHECK (signal_type IN ('ai', 'technical', 'news', 'manual')), -- type signal
    confidence INTEGER CHECK (confidence BETWEEN 1 AND 100), -- 1-100%
    entry_price DECIMAL(18, 8),
    target_price DECIMAL(18, 8),
    stop_loss DECIMAL(18, 8),
    reasoning TEXT, -- forklaring på signalet
    risk_level INTEGER CHECK (risk_level BETWEEN 1 AND 10), -- 1-10
    expires_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'executed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) -- hvem som laget signalet
);

-- 5. Bruker preferanser
CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    default_currency TEXT DEFAULT 'NOK',
    risk_tolerance INTEGER DEFAULT 5 CHECK (risk_tolerance BETWEEN 1 AND 10),
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT false,
    auto_trade_enabled BOOLEAN DEFAULT false,
    max_position_size_percent DECIMAL(5, 2) DEFAULT 10.00, -- max 10% per posisjon
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Aktivitetslogg
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- f.eks. 'trade', 'signal', 'login', 'deposit'
    title TEXT NOT NULL,
    description TEXT,
    metadata JSONB, -- ekstra data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Aktiver RLS på alle tabeller
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies for portfolios
CREATE POLICY "Users can view own portfolios" ON public.portfolios
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own portfolios" ON public.portfolios
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own portfolios" ON public.portfolios
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own portfolios" ON public.portfolios
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for transactions
CREATE POLICY "Users can view own transactions" ON public.transactions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON public.transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for holdings
CREATE POLICY "Users can view own holdings" ON public.holdings
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own holdings" ON public.holdings
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own holdings" ON public.holdings
    FOR UPDATE USING (auth.uid() = user_id);

-- Policies for trading_signals (alle kan se aktive signaler)
CREATE POLICY "Anyone can view active signals" ON public.trading_signals
    FOR SELECT USING (status = 'active');
CREATE POLICY "Admins can manage signals" ON public.trading_signals
    FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.user_preferences WHERE auto_trade_enabled = true)); -- forenklet admin-sjekk

-- Policies for user_preferences
CREATE POLICY "Users can view own preferences" ON public.user_preferences
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences" ON public.user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON public.user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- Policies for activity_logs
CREATE POLICY "Users can view own activity" ON public.activity_logs
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activity" ON public.activity_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Funksjon for å automatisk oppdatere updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON public.portfolios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_holdings_updated_at BEFORE UPDATE ON public.holdings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Funksjon for å automatisk opprette portefølje for nye brukere
CREATE OR REPLACE FUNCTION public.handle_new_user_portfolio()
RETURNS TRIGGER AS $$
BEGIN
    -- Opprett default portefølje
    INSERT INTO public.portfolios (user_id, name, description)
    VALUES (NEW.id, 'Min Portefølje', 'Standard portefølje opprettet ved registrering');
    
    -- Opprett default preferanser
    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for ny bruker
DROP TRIGGER IF EXISTS on_auth_user_created_portfolio ON auth.users;
CREATE TRIGGER on_auth_user_created_portfolio
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_portfolio();

-- Verifiser at tabellene ble opprettet
SELECT 'Portfolios tabell: ' || COUNT(*)::text FROM public.portfolios;
SELECT 'Transactions tabell: ' || COUNT(*)::text FROM public.transactions;
SELECT 'Holdings tabell: ' || COUNT(*)::text FROM public.holdings;
SELECT 'Trading signals tabell: ' || COUNT(*)::text FROM public.trading_signals;
