-- scripts/referral-schema.sql
CREATE TABLE IF NOT EXISTS user_trading_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    risk_level TEXT DEFAULT 'balanced',
    selected_pairs TEXT[] DEFAULT ARRAY['BTCUSDT'],
    paper_balance NUMERIC DEFAULT 1000000,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    referred_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    referral_points INT DEFAULT 0,
    referral_code TEXT UNIQUE
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_utc_user_id ON user_trading_config(user_id);
CREATE INDEX IF NOT EXISTS idx_utc_referral_code ON user_trading_config(referral_code);
