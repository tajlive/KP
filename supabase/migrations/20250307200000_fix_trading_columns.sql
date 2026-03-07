-- Add missing columns to user_profiles for trading
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS binance_api_key_id text,
ADD COLUMN IF NOT EXISTS binance_api_secret_id text,
ADD COLUMN IF NOT EXISTS binance_connected boolean DEFAULT false;

-- Create trading_sessions if not exists
CREATE TABLE IF NOT EXISTS trading_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    mode text NOT NULL CHECK (mode IN ('paper', 'live')),
    status text DEFAULT 'active',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE trading_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own trading sessions' AND tablename = 'trading_sessions') THEN
        CREATE POLICY "Users can view own trading sessions" ON trading_sessions
            FOR SELECT USING (user_id = auth.uid());
    END IF;
END $$;
