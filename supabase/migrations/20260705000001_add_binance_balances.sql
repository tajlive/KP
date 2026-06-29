-- Migration: Add binance_balances table
-- Cached Binance wallet balances per asset, keyed by user or connection.
--
-- NOTE: This merges/updates the older table definition in
-- supabase/migrations/_historical/20250213000000_binance_portfolio_sync.sql.
-- Existing columns are preserved (e.g. last_price) and only missing columns
-- are added safely. No existing data is dropped or altered.

-- 1. TABLE
CREATE TABLE IF NOT EXISTS public.binance_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID REFERENCES public.binance_connections(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    asset TEXT NOT NULL,
    free DECIMAL(18, 8) DEFAULT 0,
    locked DECIMAL(18, 8) DEFAULT 0,
    total DECIMAL(18, 8),
    usd_value DECIMAL(18, 2),
    nok_value DECIMAL(18, 2),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Safely add columns that may be missing from older table definitions.
-- This must run before indexes/constraints that reference the new columns.
ALTER TABLE public.binance_balances
    ADD COLUMN IF NOT EXISTS connection_id UUID REFERENCES public.binance_connections(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS asset TEXT,
    ADD COLUMN IF NOT EXISTS free DECIMAL(18, 8) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS locked DECIMAL(18, 8) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total DECIMAL(18, 8),
    ADD COLUMN IF NOT EXISTS usd_value DECIMAL(18, 2),
    ADD COLUMN IF NOT EXISTS nok_value DECIMAL(18, 2),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Unique index is created separately so it is also applied when the table
-- already exists from an older migration.
CREATE UNIQUE INDEX IF NOT EXISTS uq_binance_balances_connection_asset
    ON public.binance_balances (connection_id, asset);

COMMENT ON TABLE public.binance_balances IS 'Cached Binance wallet balances per asset.';
COMMENT ON COLUMN public.binance_balances.asset IS 'Asset symbol, e.g. BTC, ETH, USDT.';
COMMENT ON COLUMN public.binance_balances.free IS 'Available balance for the asset.';
COMMENT ON COLUMN public.binance_balances.locked IS 'Locked (in-order) balance for the asset.';
COMMENT ON COLUMN public.binance_balances.total IS 'Total balance (free + locked). Calculated by the application or a trigger if needed.';
COMMENT ON COLUMN public.binance_balances.usd_value IS 'Estimated USD value of the total balance.';
COMMENT ON COLUMN public.binance_balances.nok_value IS 'Estimated NOK value of the total balance.';

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_binance_balances_user
    ON public.binance_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_binance_balances_connection
    ON public.binance_balances(connection_id);
CREATE INDEX IF NOT EXISTS idx_binance_balances_user_asset
    ON public.binance_balances(user_id, asset);
CREATE INDEX IF NOT EXISTS idx_binance_balances_updated_at
    ON public.binance_balances(updated_at DESC);

-- 3. ROW LEVEL SECURITY
ALTER TABLE public.binance_balances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own binance balances" ON public.binance_balances;
CREATE POLICY "Users can view own binance balances"
    ON public.binance_balances FOR SELECT
    USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own binance balances" ON public.binance_balances;
CREATE POLICY "Users can insert own binance balances"
    ON public.binance_balances FOR INSERT
    WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own binance balances" ON public.binance_balances;
CREATE POLICY "Users can update own binance balances"
    ON public.binance_balances FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service role full access binance balances" ON public.binance_balances;
CREATE POLICY "Service role full access binance balances"
    ON public.binance_balances FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- 4. GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.binance_balances TO authenticated;
GRANT ALL ON public.binance_balances TO service_role;
