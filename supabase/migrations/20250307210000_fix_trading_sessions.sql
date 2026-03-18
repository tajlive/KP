-- Add missing columns to trading_sessions
ALTER TABLE trading_sessions 
ADD COLUMN IF NOT EXISTS started_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS open_position jsonb,
ADD COLUMN IF NOT EXISTS trading_pair text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS mode text DEFAULT 'paper';
-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_trading_sessions_user_mode ON trading_sessions(user_id, mode, status);
