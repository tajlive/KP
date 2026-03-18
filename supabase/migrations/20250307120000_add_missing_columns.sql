-- Add missing columns to klt_transactions
ALTER TABLE klt_transactions 
ADD COLUMN IF NOT EXISTS reason text,
ADD COLUMN IF NOT EXISTS category text DEFAULT 'general',
ADD COLUMN IF NOT EXISTS description text;
-- Add missing columns to copy_trading_follows
ALTER TABLE copy_trading_follows 
ADD COLUMN IF NOT EXISTS scale_factor numeric DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
-- Add missing columns to analytics_events
ALTER TABLE analytics_events 
ADD COLUMN IF NOT EXISTS session_id text;
-- Add user_id to trading_logs
ALTER TABLE trading_logs 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE;
-- Add strategy_id to strategy_logs
ALTER TABLE strategy_logs 
ADD COLUMN IF NOT EXISTS strategy_id uuid;
