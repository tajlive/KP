-- Sett opp database for portefølje, trading OG Binance-integrasjon

-- 1. Porteføljer
CREATE TABLE IF NOT EXISTS public.portfolios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT DEFAULT 'Min Portefølje',
    description TEXT,
    initial_balance DECIMAL(18, 8) DEFAULT 1000000,
    current_balance DECIMAL(18, 8) DEFAULT 1000000,
    total_invested DECIMAL(18, 8) DEFAULT 0,
    total_profit DECIMAL(18, 8) DEFAULT 0,
    total_profit_percent DECIMAL(10, 4) DEFAULT 0,
    currency TEXT DEFAULT 'NOK',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Binance API-tilkoblinger
CREATE TABLE IF NOT EXISTS public.binance_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    api_key TEXT NOT NULL,
    api_secret TEXT NOT NULL,
    account_type TEXT DEFAULT 'spot',
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Binance-balanser
CREATE TABLE IF NOT EXISTS public.binance_balances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    connection_id UUID REFERENCES public.binance_connections(id) ON DELETE CASCADE,
    asset TEXT NOT NULL,
    free DECIMAL(18, 8) DEFAULT 0,
    locked DECIMAL(18, 8) DEFAULT 0,
    total DECIMAL(18, 8) DEFAULT 0,
    usd_value DECIMAL(18, 8) DEFAULT 0,
    nok_value DECIMAL(18, 8) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(connection_id, asset)
);

-- 4. Trading Signaler
CREATE TABLE IF NOT EXISTS public.trading_signals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    symbol TEXT NOT NULL,
    asset_name TEXT,
    action TEXT CHECK (action IN ('buy', 'sell', 'hold')),
    signal_type TEXT CHECK (signal_type IN ('ai', 'technical', 'news', 'manual')),
    confidence INTEGER CHECK (confidence BETWEEN 1 AND 100),
    entry_price DECIMAL(18, 8),
    target_price DECIMAL(18, 8),
    stop_loss DECIMAL(18, 8),
    reasoning TEXT,
    risk_level INTEGER CHECK (risk_level BETWEEN 1 AND 10),
    expires_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'executed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Aktiver RLS
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.binance_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.binance_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_signals ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY portfolios_select ON public.portfolios FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY portfolios_insert ON public.portfolios FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY portfolios_update ON public.portfolios FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY binance_select ON public.binance_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY binance_insert ON public.binance_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY binance_delete ON public.binance_connections FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY binance_bal_select ON public.binance_balances FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY signals_select ON public.trading_signals FOR SELECT USING (status = 'active');

-- Funksjon for ny bruker
CREATE OR REPLACE FUNCTION public.handle_new_user_portfolio()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.portfolios (user_id, name, description)
    VALUES (NEW.id, 'Min Portefølje', 'Standard portefølje opprettet ved registrering');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_portfolio ON auth.users;
CREATE TRIGGER on_auth_user_created_portfolio
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_portfolio();

SELECT 'Database setup complete!' as status;
