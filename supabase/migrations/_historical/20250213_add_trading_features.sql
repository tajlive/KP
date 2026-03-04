-- Add trading features columns to paper_trades table
-- Run with: npx supabase db push

-- Add trailing stop columns
ALTER TABLE paper_trades 
ADD COLUMN IF NOT EXISTS trailing_stop_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS trailing_stop_activation_pct DECIMAL(10,4),
ADD COLUMN IF NOT EXISTS trailing_stop_distance_pct DECIMAL(10,4),
ADD COLUMN IF NOT EXISTS highest_price DECIMAL(20,8),
ADD COLUMN IF NOT EXISTS lowest_price DECIMAL(20,8);

-- Add partial profit taking columns
ALTER TABLE paper_trades 
ADD COLUMN IF NOT EXISTS partial_tp_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS partial_tp_levels JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS remaining_quantity DECIMAL(20,8);

-- Add ATR and correlation columns
ALTER TABLE paper_trades 
ADD COLUMN IF NOT EXISTS atr_value DECIMAL(20,8),
ADD COLUMN IF NOT EXISTS correlation_score DECIMAL(5,2);

-- Add exit reason
ALTER TABLE paper_trades 
ADD COLUMN IF NOT EXISTS exit_reason TEXT;

-- Update existing rows to set remaining_quantity
UPDATE paper_trades 
SET remaining_quantity = quantity
WHERE remaining_quantity IS NULL AND quantity IS NOT NULL;

-- Create index for trailing stop queries (using account_id since paper_trades references accounts)
CREATE INDEX IF NOT EXISTS idx_paper_trades_trailing_stop 
ON paper_trades(account_id, trailing_stop_enabled, exit_time) 
WHERE trailing_stop_enabled = true AND exit_time IS NULL;

-- Create index for active trades
CREATE INDEX IF NOT EXISTS idx_paper_trades_active 
ON paper_trades(account_id, exit_time) 
WHERE exit_time IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN paper_trades.trailing_stop_enabled IS 'Whether trailing stop is active for this trade';
COMMENT ON COLUMN paper_trades.highest_price IS 'Highest price reached (for LONG positions)';
COMMENT ON COLUMN paper_trades.partial_tp_levels IS 'JSON array of partial take profit levels';
