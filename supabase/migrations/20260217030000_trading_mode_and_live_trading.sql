-- =====================================================
-- TRADING MODE & LIVE TRADING SYSTEM
-- Oppretter tabeller og kolonner for paper/live trading
-- =====================================================

-- 1. Legg til trading_mode og Binance API kolonner i profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS trading_mode TEXT DEFAULT 'paper' CHECK (trading_mode IN ('paper', 'live')),
ADD COLUMN IF NOT EXISTS binance_api_key_encrypted TEXT,
ADD COLUMN IF NOT EXISTS binance_api_secret_encrypted TEXT,
ADD COLUMN IF NOT EXISTS binance_connected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS paper_trades_count INTEGER DEFAULT 0;
-- 2. Opprett live_trades tabell (for ekte Binance trades)
CREATE TABLE IF NOT EXISTS live_trades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    binance_order_id TEXT UNIQUE NOT NULL,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
    type TEXT NOT NULL CHECK (type IN ('market', 'limit', 'stop_loss', 'take_profit')),
    entry_price DECIMAL(20,8) NOT NULL,
    current_price DECIMAL(20,8),
    amount DECIMAL(20,8) NOT NULL,
    leverage INTEGER DEFAULT 1,
    stop_loss DECIMAL(20,8),
    take_profit DECIMAL(20,8),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
    pnl DECIMAL(20,8) DEFAULT 0,
    pnl_percentage DECIMAL(10,4) DEFAULT 0,
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Trigger for å oppdatere updated_at
DROP TRIGGER IF EXISTS update_live_trades_updated_at ON live_trades;
CREATE TRIGGER update_live_trades_updated_at 
    BEFORE UPDATE ON live_trades 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
-- 3. Indekser for live_trades
CREATE INDEX IF NOT EXISTS idx_live_trades_user_id ON live_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_live_trades_user_status ON live_trades(user_id, status) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_live_trades_symbol ON live_trades(symbol);
CREATE INDEX IF NOT EXISTS idx_live_trades_opened_at ON live_trades(opened_at DESC);
-- 4. Funksjon for å telle paper trades (for copy trading unlock)
CREATE OR REPLACE FUNCTION increment_paper_trades_count(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE profiles
    SET paper_trades_count = paper_trades_count + 1
    WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 5. Funksjon for å bytte trading mode
CREATE OR REPLACE FUNCTION set_trading_mode(
    user_uuid UUID,
    new_mode TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    has_api_key BOOLEAN;
BEGIN
    -- Sjekk om bruker har Binance API key hvis de vil bytte til live
    IF new_mode = 'live' THEN
        SELECT binance_api_key_encrypted IS NOT NULL
        INTO has_api_key
        FROM profiles
        WHERE id = user_uuid;
        
        IF NOT has_api_key THEN
            RAISE EXCEPTION 'Binance API key not configured';
        END IF;
    END IF;
    
    UPDATE profiles
    SET trading_mode = new_mode
    WHERE id = user_uuid;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 6. RLS Policies for live_trades
ALTER TABLE live_trades ENABLE ROW LEVEL SECURITY;
-- Brukere kan kun se egne live trades
CREATE POLICY "Users can view own live trades"
    ON live_trades FOR SELECT
    USING (auth.uid() = user_id);
-- Brukere kan kun insert egne trades
CREATE POLICY "Users can insert own live trades"
    ON live_trades FOR INSERT
    WITH CHECK (auth.uid() = user_id);
-- Brukere kan kun oppdatere egne trades
CREATE POLICY "Users can update own live trades"
    ON live_trades FOR UPDATE
    USING (auth.uid() = user_id);
-- 7. Kommentarer for dokumentasjon
COMMENT ON COLUMN profiles.trading_mode IS 'Current trading mode: paper (virtual) or live (real Binance)';
COMMENT ON COLUMN profiles.binance_api_key_encrypted IS 'Encrypted Binance API key (AES-256)';
COMMENT ON COLUMN profiles.binance_api_secret_encrypted IS 'Encrypted Binance API secret (AES-256)';
COMMENT ON COLUMN profiles.paper_trades_count IS 'Number of completed paper trades (for unlocking copy trading)';
COMMENT ON TABLE live_trades IS 'Real trades executed via Binance API';
