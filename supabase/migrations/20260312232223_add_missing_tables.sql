-- 1. auto_trades (hovedtabell for auto-trading)
CREATE TABLE IF NOT EXISTS auto_trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT CHECK (side IN ('buy', 'sell')) NOT NULL,
  amount NUMERIC NOT NULL,
  price NUMERIC,
  status TEXT DEFAULT 'pending',
  strategy_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE auto_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own trades" ON auto_trades FOR ALL USING (auth.uid() = user_id);

-- 2. trade_history
CREATE TABLE IF NOT EXISTS trade_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  pnl NUMERIC DEFAULT 0,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE trade_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own history" ON trade_history FOR ALL USING (auth.uid() = user_id);

-- 3. trading_stats
CREATE TABLE IF NOT EXISTS trading_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  total_pnl NUMERIC DEFAULT 0,
  best_trade NUMERIC DEFAULT 0,
  worst_trade NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE trading_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own stats" ON trading_stats FOR ALL USING (auth.uid() = user_id);

-- 4. trading_risk_config
CREATE TABLE IF NOT EXISTS trading_risk_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  max_position_size NUMERIC DEFAULT 0.1,
  max_daily_loss NUMERIC DEFAULT 0.05,
  stop_loss_pct NUMERIC DEFAULT 0.02,
  take_profit_pct NUMERIC DEFAULT 0.04,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE trading_risk_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own config" ON trading_risk_config FOR ALL USING (auth.uid() = user_id);

-- 5. saved_strategies
CREATE TABLE IF NOT EXISTS saved_strategies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  config JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE saved_strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own + public strategies" ON saved_strategies FOR SELECT USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "Users manage own strategies" ON saved_strategies FOR ALL USING (auth.uid() = user_id);

-- 6. notification_preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email_trades BOOLEAN DEFAULT true,
  email_news BOOLEAN DEFAULT false,
  push_trades BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own prefs" ON notification_preferences FOR ALL USING (auth.uid() = user_id);

-- 7. user_activity_logs
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own logs" ON user_activity_logs FOR SELECT USING (auth.uid() = user_id);

-- 8. waitlist
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  referral_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can join waitlist" ON waitlist FOR INSERT WITH CHECK (true);

-- 9. beta_feedback
CREATE TABLE IF NOT EXISTS beta_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  message TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE beta_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users submit own feedback" ON beta_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 10. admin_notifications
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins see notifications" ON admin_notifications FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);
