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
    account_type TEXT DEFAULT 'spot' CHECK (account_type IN ('spot', 'margin', 'futures')),
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Binance-balanser (synkronisert fra Binance)
CREATE TABLE IF NOT EXISTS public.binance_balances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    connection_id UUID REFERENCES public.binance_connections(id) ON DELETE CASCADE,
    asset TEXT NOT NULL,
    free DECIMAL(18, 8) DEFAULT 0,
    locked DECIMAL(18, 8) DEFAULT 0,
    total DECIMAL(18, 8) DEFAULT 0,
    btc_value DECIMAL(18, 8) DEFAULT 0,
    usd_value DECIMAL(18, 8) DEFAULT 0,
    nok_value DECIMAL(18, 8) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(connection_id, asset)
);

-- 4. Transaksjoner
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('buy', 'sell')),
    symbol TEXT NOT NULL,
    asset_name TEXT,
    quantity DECIMAL(18, 8) NOT NULL,
    price_per_unit DECIMAL(18, 8) NOT NULL,
    total_amount DECIMAL(18, 8) NOT NULL,
    fee DECIMAL(18, 8) DEFAULT 0,
    exchange TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Holdings
CREATE TABLE IF NOT EXISTS public.holdings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    asset_name TEXT,
    quantity DECIMAL(18, 8) NOT NULL DEFAULT 0,
    avg_buy_price DECIMAL(18, 8) NOT NULL DEFAULT 0,
    current_price DECIMAL(18, 8),
    current_value DECIMAL(18, 8),
    unrealized_profit DECIMAL(18, 8) DEFAULT 0,
    unrealized_profit_percent DECIMAL(10, 4) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(portfolio_id, symbol)
);

-- 6. Trading Signaler
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 7. Bruker preferanser
CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    default_currency TEXT DEFAULT 'NOK',
    risk_tolerance INTEGER DEFAULT 5 CHECK (risk_tolerance BETWEEN 1 AND 10),
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT false,
    auto_trade_enabled BOOLEAN DEFAULT false,
    max_position_size_percent DECIMAL(5, 2) DEFAULT 10.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Aktiver RLS
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.binance_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.binance_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY portfolios_select ON public.portfolios FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY portfolios_insert ON public.portfolios FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY portfolios_update ON public.portfolios FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY binance_conn_select ON public.binance_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY binance_conn_insert ON public.binance_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY binance_conn_update ON public.binance_connections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY binance_conn_delete ON public.binance_connections FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY binance_bal_select ON public.binance_balances FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY transactions_select ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY transactions_insert ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY holdings_select ON public.holdings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY holdings_insert ON public.holdings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY holdings_update ON public.holdings FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY signals_select ON public.trading_signals FOR SELECT USING (status = 'active');

CREATE POLICY preferences_select ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY preferences_insert ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY preferences_update ON public.user_preferences FOR UPDATE USING (auth.uid() = user_id);

-- Funksjon for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON public.portfolios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_binance_conn_updated_at BEFORE UPDATE ON public.binance_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_binance_bal_updated_at BEFORE UPDATE ON public.binance_balances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Funksjon for ny bruker
CREATE OR REPLACE FUNCTION public.handle_new_user_portfolio()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.portfolios (user_id, name, description)
    VALUES (NEW.id, 'Min Portefølje', 'Standard portefølje opprettet ved registrering');
    
    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_portfolio ON auth.users;
CREATE TRIGGER on_auth_user_created_portfolio
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_portfolio();

-- Test at det fungerer
SELECT 'Setup complete!' as status;
