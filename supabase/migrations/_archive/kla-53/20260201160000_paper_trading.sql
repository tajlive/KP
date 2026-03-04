-- Paper Trading System
-- Allows users to practice trading risk-free

-- Paper Trading Accounts
CREATE TABLE IF NOT EXISTS paper_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  initial_balance DECIMAL(12, 2) NOT NULL,
  current_balance DECIMAL(12, 2) NOT NULL,
  total_profit_loss DECIMAL(12, 2) DEFAULT 0,
  win_count INTEGER DEFAULT 0,
  loss_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_account UNIQUE(user_id)
);

-- Paper Trading Positions
CREATE TABLE IF NOT EXISTS paper_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES paper_accounts(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  position_type TEXT NOT NULL CHECK (position_type IN ('long', 'short')),
  entry_price DECIMAL(10, 4) NOT NULL,
  entry_amount DECIMAL(12, 2) NOT NULL,
  quantity DECIMAL(16, 8) NOT NULL,
  current_price DECIMAL(10, 4),
  stop_loss DECIMAL(10, 4),
  take_profit DECIMAL(10, 4),
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
  closing_price DECIMAL(10, 4),
  profit_loss DECIMAL(12, 2),
  profit_loss_percent DECIMAL(6, 2),
  close_reason TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Paper Trading History
CREATE TABLE IF NOT EXISTS paper_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES paper_accounts(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES paper_positions(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  position_type TEXT NOT NULL,
  entry_price DECIMAL(10, 4) NOT NULL,
  exit_price DECIMAL(10, 4) NOT NULL,
  quantity DECIMAL(16, 8) NOT NULL,
  entry_amount DECIMAL(12, 2) NOT NULL,
  exit_amount DECIMAL(12, 2) NOT NULL,
  profit_loss DECIMAL(12, 2) NOT NULL,
  profit_loss_percent DECIMAL(6, 2) NOT NULL,
  duration_hours INTEGER,
  entry_time TIMESTAMP WITH TIME ZONE NOT NULL,
  exit_time TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_paper_accounts_user_id ON paper_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_paper_positions_account_id ON paper_positions(account_id);
CREATE INDEX IF NOT EXISTS idx_paper_positions_status ON paper_positions(status);
CREATE INDEX IF NOT EXISTS idx_paper_trades_account_id ON paper_trades(account_id);
CREATE INDEX IF NOT EXISTS idx_paper_trades_exit_time ON paper_trades(exit_time);

-- RLS Policies
ALTER TABLE paper_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_trades ENABLE ROW LEVEL SECURITY;

-- Paper Accounts - Users see only their own
CREATE POLICY "Users can view own paper account"
  ON paper_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own paper account"
  ON paper_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own paper account"
  ON paper_accounts FOR UPDATE
  USING (auth.uid() = user_id);

-- Paper Positions - Users see only their own account's positions
CREATE POLICY "Users can view own positions"
  ON paper_positions FOR SELECT
  USING (
    account_id IN (
      SELECT id FROM paper_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert positions to own account"
  ON paper_positions FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT id FROM paper_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own positions"
  ON paper_positions FOR UPDATE
  USING (
    account_id IN (
      SELECT id FROM paper_accounts WHERE user_id = auth.uid()
    )
  );

-- Paper Trades - Users see only their own trades
CREATE POLICY "Users can view own trades"
  ON paper_trades FOR SELECT
  USING (
    account_id IN (
      SELECT id FROM paper_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert trades"
  ON paper_trades FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT id FROM paper_accounts WHERE user_id = auth.uid()
    )
  );

-- Helper Functions

-- Get paper account stats
CREATE OR REPLACE FUNCTION get_paper_account_stats(account_id UUID)
RETURNS TABLE(
  total_trades INTEGER,
  winning_trades INTEGER,
  losing_trades INTEGER,
  win_rate DECIMAL,
  avg_profit_loss DECIMAL,
  largest_win DECIMAL,
  largest_loss DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_trades,
    COUNT(*) FILTER (WHERE profit_loss > 0)::INTEGER as winning_trades,
    COUNT(*) FILTER (WHERE profit_loss < 0)::INTEGER as losing_trades,
    (COUNT(*) FILTER (WHERE profit_loss > 0)::DECIMAL / NULLIF(COUNT(*)::DECIMAL, 0) * 100) as win_rate,
    AVG(profit_loss) as avg_profit_loss,
    MAX(profit_loss) as largest_win,
    MIN(profit_loss) as largest_loss
  FROM paper_trades
  WHERE paper_trades.account_id = get_paper_account_stats.account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Close a position
CREATE OR REPLACE FUNCTION close_paper_position(
  position_id UUID,
  closing_price DECIMAL,
  close_reason TEXT
)
RETURNS JSON AS $$
DECLARE
  position paper_positions%ROWTYPE;
  pnl DECIMAL;
  pnl_percent DECIMAL;
  trade_record paper_trades%ROWTYPE;
  account paper_accounts%ROWTYPE;
BEGIN
  -- Get position
  SELECT * INTO position FROM paper_positions WHERE id = position_id;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Position not found');
  END IF;

  -- Calculate P&L
  IF position.position_type = 'long' THEN
    pnl := (closing_price - position.entry_price) * position.quantity;
    pnl_percent := ((closing_price - position.entry_price) / position.entry_price) * 100;
  ELSE -- short
    pnl := (position.entry_price - closing_price) * position.quantity;
    pnl_percent := ((position.entry_price - closing_price) / position.entry_price) * 100;
  END IF;

  -- Update position
  UPDATE paper_positions
  SET
    status = 'closed',
    closing_price = closing_price,
    profit_loss = pnl,
    profit_loss_percent = pnl_percent,
    close_reason = close_reason,
    closed_at = NOW(),
    current_price = closing_price,
    updated_at = NOW()
  WHERE id = position_id
  RETURNING * INTO position;

  -- Create trade record
  INSERT INTO paper_trades (
    account_id,
    position_id,
    symbol,
    position_type,
    entry_price,
    exit_price,
    quantity,
    entry_amount,
    exit_amount,
    profit_loss,
    profit_loss_percent,
    duration_hours,
    entry_time,
    exit_time
  )
  VALUES (
    position.account_id,
    position.id,
    position.symbol,
    position.position_type,
    position.entry_price,
    closing_price,
    position.quantity,
    position.entry_amount,
    closing_price * position.quantity,
    pnl,
    pnl_percent,
    EXTRACT(EPOCH FROM (NOW() - position.opened_at)) / 3600,
    position.opened_at,
    NOW()
  )
  RETURNING * INTO trade_record;

  -- Update account balance and stats
  SELECT * INTO account FROM paper_accounts WHERE id = position.account_id;

  UPDATE paper_accounts
  SET
    current_balance = current_balance + pnl,
    total_profit_loss = total_profit_loss + pnl,
    win_count = win_count + CASE WHEN pnl > 0 THEN 1 ELSE 0 END,
    loss_count = loss_count + CASE WHEN pnl < 0 THEN 1 ELSE 0 END,
    updated_at = NOW()
  WHERE id = position.account_id;

  RETURN json_build_object(
    'success', true,
    'position', row_to_json(position),
    'trade', row_to_json(trade_record),
    'account_balance', account.current_balance + pnl,
    'profit_loss', pnl,
    'profit_loss_percent', pnl_percent
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Views

-- Active positions with stats
CREATE VIEW v_active_paper_positions AS
SELECT
  p.id,
  p.account_id,
  a.user_id,
  p.symbol,
  p.position_type,
  p.entry_price,
  p.entry_amount,
  p.quantity,
  p.current_price,
  p.stop_loss,
  p.take_profit,
  p.opened_at,
  CASE
    WHEN p.position_type = 'long' THEN ROUND(((p.current_price - p.entry_price) / p.entry_price * 100)::NUMERIC, 2)
    WHEN p.position_type = 'short' THEN ROUND(((p.entry_price - p.current_price) / p.entry_price * 100)::NUMERIC, 2)
  END AS current_return_percent,
  CASE
    WHEN p.position_type = 'long' THEN ROUND(((p.current_price - p.entry_price) * p.quantity)::NUMERIC, 2)
    WHEN p.position_type = 'short' THEN ROUND(((p.entry_price - p.current_price) * p.quantity)::NUMERIC, 2)
  END AS unrealized_pnl
FROM paper_positions p
JOIN paper_accounts a ON p.account_id = a.id
WHERE p.status = 'open';

-- Trading statistics per account
CREATE VIEW v_paper_trading_stats AS
SELECT
  pa.id as account_id,
  pa.user_id,
  pa.initial_balance,
  pa.current_balance,
  pa.total_profit_loss,
  ROUND((pa.total_profit_loss / NULLIF(pa.initial_balance, 0) * 100)::NUMERIC, 2) as return_percent,
  COUNT(pt.id)::INTEGER as total_trades,
  COUNT(CASE WHEN pt.profit_loss > 0 THEN 1 END)::INTEGER as winning_trades,
  COUNT(CASE WHEN pt.profit_loss < 0 THEN 1 END)::INTEGER as losing_trades,
  ROUND((COUNT(CASE WHEN pt.profit_loss > 0 THEN 1 END)::DECIMAL / NULLIF(COUNT(pt.id)::DECIMAL, 0) * 100)::NUMERIC, 2) as win_rate,
  ROUND(AVG(pt.profit_loss)::NUMERIC, 2) as avg_trade_profit_loss,
  MAX(pt.profit_loss) as best_trade,
  MIN(pt.profit_loss) as worst_trade,
  ROUND(AVG(pt.duration_hours)::NUMERIC, 2) as avg_trade_duration_hours
FROM paper_accounts pa
LEFT JOIN paper_trades pt ON pa.id = pt.account_id
GROUP BY pa.id, pa.user_id, pa.initial_balance, pa.current_balance, pa.total_profit_loss;
