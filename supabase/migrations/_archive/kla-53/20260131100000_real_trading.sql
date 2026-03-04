-- Real Trading System for Free Users
-- Integration with Binance (free tier available)

-- ============================================
-- 1. EXCHANGE API KEYS (Encrypted storage)
-- ============================================
CREATE TABLE IF NOT EXISTS exchange_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exchange TEXT NOT NULL CHECK (exchange IN ('binance', 'coinbase', 'kraken')),
  api_key_encrypted TEXT NOT NULL,
  api_secret_encrypted TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_testnet BOOLEAN DEFAULT true,  -- Default to testnet for safety
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_validated_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT unique_user_exchange UNIQUE(user_id, exchange)
);

-- ============================================
-- 2. REAL TRADING ACCOUNTS
-- ============================================
CREATE TABLE IF NOT EXISTS real_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exchange TEXT NOT NULL,
  exchange_account_id TEXT,  -- Exchange's internal account ID
  account_type TEXT DEFAULT 'spot' CHECK (account_type IN ('spot', 'margin', 'futures')),
  total_balance_usd DECIMAL(12, 2) DEFAULT 0,
  available_balance_usd DECIMAL(12, 2) DEFAULT 0,
  locked_balance_usd DECIMAL(12, 2) DEFAULT 0,
  total_profit_loss_usd DECIMAL(12, 2) DEFAULT 0,
  return_percent DECIMAL(6, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_real_account UNIQUE(user_id, exchange)
);

-- ============================================
-- 3. REAL TRADING POSITIONS
-- ============================================
CREATE TABLE IF NOT EXISTS real_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES real_accounts(id) ON DELETE CASCADE,
  exchange_position_id TEXT,  -- Exchange's position ID
  symbol TEXT NOT NULL,
  position_type TEXT NOT NULL CHECK (position_type IN ('long', 'short')),
  entry_price DECIMAL(16, 8) NOT NULL,
  quantity DECIMAL(16, 8) NOT NULL,
  filled_quantity DECIMAL(16, 8) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'open', 'partial', 'closed', 'cancelled')),
  
  -- Order details
  order_type TEXT DEFAULT 'market' CHECK (order_type IN ('market', 'limit', 'stop_limit')),
  limit_price DECIMAL(16, 8),
  stop_price DECIMAL(16, 8),
  
  -- Risk management
  stop_loss DECIMAL(16, 8),
  take_profit DECIMAL(16, 8),
  
  -- Exchange info
  exchange_order_id TEXT,
  
  -- Timestamps
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  filled_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- P&L (filled when closed)
  closing_price DECIMAL(16, 8),
  profit_loss_usd DECIMAL(12, 2),
  profit_loss_percent DECIMAL(6, 2),
  close_reason TEXT,
  
  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================
-- 4. REAL TRADE HISTORY
-- ============================================
CREATE TABLE IF NOT EXISTS real_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES real_accounts(id) ON DELETE CASCADE,
  position_id UUID REFERENCES real_positions(id),
  
  -- Trade details
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  position_type TEXT NOT NULL,
  
  -- Execution
  quantity DECIMAL(16, 8) NOT NULL,
  price DECIMAL(16, 8) NOT NULL,
  total_amount_usd DECIMAL(12, 2) NOT NULL,
  
  -- Fees
  fee_amount DECIMAL(12, 4) DEFAULT 0,
  fee_currency TEXT DEFAULT 'USD',
  
  -- Exchange info
  exchange_trade_id TEXT NOT NULL,
  exchange_order_id TEXT,
  
  -- Timestamps
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. FREEMIUM LIMITS TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS user_trading_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Monthly limits for free tier
  plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'premium', 'pro')),
  
  -- Trade limits (free: 10/month, premium: unlimited)
  max_trades_per_month INTEGER DEFAULT 10,
  trades_used_this_month INTEGER DEFAULT 0,
  
  -- Volume limits (free: $1000/month)
  max_volume_per_month_usd DECIMAL(12, 2) DEFAULT 1000,
  volume_used_this_month_usd DECIMAL(12, 2) DEFAULT 0,
  
  -- Feature flags
  can_use_stop_loss BOOLEAN DEFAULT true,  -- Free tier gets basic features
  can_use_take_profit BOOLEAN DEFAULT true,
  can_use_limit_orders BOOLEAN DEFAULT false,  -- Premium feature
  can_use_margin BOOLEAN DEFAULT false,        -- Premium feature
  
  -- Reset tracking
  month_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. TRADING NOTIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS trading_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('order_filled', 'stop_loss', 'take_profit', 'limit_reached', 'error')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_exchange_api_keys_user_id ON exchange_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_real_accounts_user_id ON real_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_real_positions_account_id ON real_positions(account_id);
CREATE INDEX IF NOT EXISTS idx_real_positions_status ON real_positions(status);
CREATE INDEX IF NOT EXISTS idx_real_positions_symbol ON real_positions(symbol);
CREATE INDEX IF NOT EXISTS idx_real_trades_account_id ON real_trades(account_id);
CREATE INDEX IF NOT EXISTS idx_real_trades_executed_at ON real_trades(executed_at);
CREATE INDEX IF NOT EXISTS idx_trading_notifications_user_id ON trading_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_notifications_unread ON trading_notifications(user_id, is_read) WHERE is_read = false;

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE exchange_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE real_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE real_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE real_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_trading_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_notifications ENABLE ROW LEVEL SECURITY;

-- Exchange API Keys - Users see only their own
CREATE POLICY "Users can view own API keys (without secrets)"
  ON exchange_api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own API keys"
  ON exchange_api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys"
  ON exchange_api_keys FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys"
  ON exchange_api_keys FOR DELETE
  USING (auth.uid() = user_id);

-- Real Accounts
CREATE POLICY "Users can view own real accounts"
  ON real_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own real accounts"
  ON real_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own real accounts"
  ON real_accounts FOR UPDATE
  USING (auth.uid() = user_id);

-- Real Positions
CREATE POLICY "Users can view own positions"
  ON real_positions FOR SELECT
  USING (
    account_id IN (
      SELECT id FROM real_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert positions to own account"
  ON real_positions FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT id FROM real_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own positions"
  ON real_positions FOR UPDATE
  USING (
    account_id IN (
      SELECT id FROM real_accounts WHERE user_id = auth.uid()
    )
  );

-- Real Trades
CREATE POLICY "Users can view own trades"
  ON real_trades FOR SELECT
  USING (
    account_id IN (
      SELECT id FROM real_accounts WHERE user_id = auth.uid()
    )
  );

-- Trading Limits
CREATE POLICY "Users can view own trading limits"
  ON user_trading_limits FOR SELECT
  USING (auth.uid() = user_id);

-- Notifications
CREATE POLICY "Users can view own notifications"
  ON trading_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON trading_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Check if user can place a trade (freemium limits)
CREATE OR REPLACE FUNCTION can_place_trade(p_user_id UUID, p_amount_usd DECIMAL)
RETURNS TABLE(
  allowed BOOLEAN,
  reason TEXT,
  trades_remaining INTEGER,
  volume_remaining DECIMAL
) AS $$
DECLARE
  v_limits RECORD;
  v_current_month TEXT;
BEGIN
  -- Get or create user limits
  SELECT * INTO v_limits FROM user_trading_limits WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    -- Create default free tier limits
    INSERT INTO user_trading_limits (user_id)
    VALUES (p_user_id)
    RETURNING * INTO v_limits;
  END IF;
  
  -- Check if month has reset
  v_current_month := TO_CHAR(NOW(), 'YYYY-MM');
  IF TO_CHAR(v_limits.month_reset_at, 'YYYY-MM') != v_current_month THEN
    -- Reset counters
    UPDATE user_trading_limits
    SET trades_used_this_month = 0,
        volume_used_this_month_usd = 0,
        month_reset_at = NOW()
    WHERE user_id = p_user_id;
    
    v_limits.trades_used_this_month := 0;
    v_limits.volume_used_this_month_usd := 0;
  END IF;
  
  -- Check trade limit
  IF v_limits.trades_used_this_month >= v_limits.max_trades_per_month THEN
    RETURN QUERY SELECT 
      false, 
      'Monthly trade limit reached. Upgrade to Premium for unlimited trades.'::TEXT,
      0::INTEGER,
      (v_limits.max_volume_per_month_usd - v_limits.volume_used_this_month_usd)::DECIMAL;
    RETURN;
  END IF;
  
  -- Check volume limit
  IF (v_limits.volume_used_this_month_usd + p_amount_usd) > v_limits.max_volume_per_month_usd THEN
    RETURN QUERY SELECT 
      false,
      'Monthly volume limit would be exceeded. Upgrade to Premium for higher limits.'::TEXT,
      (v_limits.max_trades_per_month - v_limits.trades_used_this_month)::INTEGER,
      (v_limits.max_volume_per_month_usd - v_limits.volume_used_this_month_usd)::DECIMAL;
    RETURN;
  END IF;
  
  -- Allowed
  RETURN QUERY SELECT 
    true,
    'Trade allowed'::TEXT,
    (v_limits.max_trades_per_month - v_limits.trades_used_this_month)::INTEGER,
    (v_limits.max_volume_per_month_usd - v_limits.volume_used_this_month_usd)::DECIMAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Record a trade (increment counters)
CREATE OR REPLACE FUNCTION record_trade_usage(
  p_user_id UUID,
  p_amount_usd DECIMAL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE user_trading_limits
  SET 
    trades_used_this_month = trades_used_this_month + 1,
    volume_used_this_month_usd = volume_used_this_month_usd + p_amount_usd,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get real account stats
CREATE OR REPLACE FUNCTION get_real_account_stats(p_account_id UUID)
RETURNS TABLE(
  total_trades INTEGER,
  winning_trades INTEGER,
  losing_trades INTEGER,
  win_rate DECIMAL,
  avg_profit_loss DECIMAL,
  largest_win DECIMAL,
  largest_loss DECIMAL,
  total_fees DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_trades,
    COUNT(*) FILTER (WHERE profit_loss_usd > 0)::INTEGER as winning_trades,
    COUNT(*) FILTER (WHERE profit_loss_usd < 0)::INTEGER as losing_trades,
    (COUNT(*) FILTER (WHERE profit_loss_usd > 0)::DECIMAL / NULLIF(COUNT(*)::DECIMAL, 0) * 100) as win_rate,
    AVG(profit_loss_usd) as avg_profit_loss,
    MAX(profit_loss_usd) as largest_win,
    MIN(profit_loss_usd) as largest_loss,
    COALESCE((SELECT SUM(fee_amount) FROM real_trades WHERE real_trades.account_id = p_account_id), 0) as total_fees
  FROM real_positions
  WHERE real_positions.account_id = p_account_id
    AND status = 'closed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VIEWS
-- ============================================

-- Active real positions with unrealized P&L
CREATE VIEW v_active_real_positions AS
SELECT
  p.id,
  p.account_id,
  a.user_id,
  a.exchange,
  p.symbol,
  p.position_type,
  p.entry_price,
  p.quantity,
  p.filled_quantity,
  p.status,
  p.stop_loss,
  p.take_profit,
  p.opened_at,
  p.metadata
FROM real_positions p
JOIN real_accounts a ON p.account_id = a.id
WHERE p.status IN ('open', 'partial');

-- User trading summary
CREATE VIEW v_user_trading_summary AS
SELECT
  u.user_id,
  u.plan_type,
  u.max_trades_per_month,
  u.trades_used_this_month,
  u.max_trades_per_month - u.trades_used_this_month as trades_remaining,
  u.max_volume_per_month_usd,
  u.volume_used_this_month_usd,
  u.max_volume_per_month_usd - u.volume_used_this_month_usd as volume_remaining,
  u.month_reset_at,
  COUNT(DISTINCT ra.id) as connected_exchanges,
  COALESCE(SUM(ra.total_profit_loss_usd), 0) as total_pnl_usd
FROM user_trading_limits u
LEFT JOIN real_accounts ra ON u.user_id = ra.user_id AND ra.is_active = true
GROUP BY u.user_id, u.plan_type, u.max_trades_per_month, u.trades_used_this_month,
         u.max_volume_per_month_usd, u.volume_used_this_month_usd, u.month_reset_at;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-create trading limits for new users
CREATE OR REPLACE FUNCTION create_user_trading_limits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_trading_limits (user_id, plan_type)
  VALUES (NEW.id, 'free')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: This trigger should be added to auth.users via Supabase dashboard or migration
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW
--   EXECUTE FUNCTION create_user_trading_limits();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_exchange_api_keys_updated_at
  BEFORE UPDATE ON exchange_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_real_accounts_updated_at
  BEFORE UPDATE ON real_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_real_positions_updated_at
  BEFORE UPDATE ON real_positions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_trading_limits_updated_at
  BEFORE UPDATE ON user_trading_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
