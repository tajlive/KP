-- KLT Token System - Klarpakke Token
-- 10,000,000 totalt: 1M til grunnleggere (10%), 9M til team/reserve (90%)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- User KLT Balances
CREATE TABLE IF NOT EXISTS user_klt_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
-- KLT Transactions
CREATE TABLE IF NOT EXISTS klt_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('reward', 'spend', 'bonus', 'founder')),
  category VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- KLT Earning Categories
CREATE TABLE IF NOT EXISTS klt_earning_categories (
  id VARCHAR(50) PRIMARY KEY,
  name_no TEXT NOT NULL,
  name_en TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  cooldown_minutes INTEGER DEFAULT 0,
  max_per_day INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  description_no TEXT,
  description_en TEXT
);
-- Insert earning categories
INSERT INTO klt_earning_categories (id, name_no, name_en, amount, cooldown_minutes, max_per_day, description_no, description_en) VALUES
  ('founder_bonus', 'Grunnlegger-bonus', 'Founder Bonus', 10000, 0, NULL, 'Takk for at du var med fra starten! (0.1% av totalt 10M)', 'Thanks for being there from the start! (0.1% of 10M total)'),
  ('daily_login', 'Daglig innlogging', 'Daily Login', 10, 1440, 10, 'Logg inn hver dag for å samle KLT', 'Log in daily to collect KLT'),
  ('lesson_complete', 'Fullfør leksjon', 'Complete Lesson', 100, 0, 500, 'Lær noe nytt og få belønning', 'Learn something new and get rewarded'),
  ('quiz_pass', 'Bestå quiz', 'Pass Quiz', 200, 0, 600, 'Test kunnskapen din', 'Test your knowledge'),
  ('streak_7day', '7-dagers streak', '7-Day Streak', 2000, 0, 2000, '7 dager på rad med læring!', '7 days in a row of learning!'),
  ('help_student', 'Hjelp student', 'Help Student', 100, 0, NULL, 'Hjelp andre med spørsmål', 'Help others with questions'),
  ('bug_report', 'Bug rapport', 'Bug Report', 500, 0, NULL, 'Finn feil og rapporter', 'Find and report bugs'),
  ('content_create', 'Lag innhold', 'Create Content', 1000, 0, NULL, 'Lag opplæringsmateriale', 'Create educational content'),
  ('trading_profit', 'Trading profitt', 'Trading Profit', 0, 0, 1000, '1% av paper trading profitt', '1% of paper trading profit');
-- Founder allocations tracking
CREATE TABLE IF NOT EXISTS klt_founder_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL DEFAULT 10000,
  claimed BOOLEAN DEFAULT FALSE,
  claimed_at TIMESTAMPTZ,
  student_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id),
  UNIQUE(student_number)
);
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_klt_transactions_user_id ON klt_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_klt_transactions_type ON klt_transactions(type, category);
CREATE INDEX IF NOT EXISTS idx_klt_balances_user_id ON user_klt_balances(user_id);
-- RLS Policies
ALTER TABLE user_klt_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE klt_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE klt_founder_allocations ENABLE ROW LEVEL SECURITY;
-- Users can only see their own balance
CREATE POLICY "Users can view own balance"
  ON user_klt_balances FOR SELECT
  USING (auth.uid() = user_id);
-- Users can only see their own transactions
CREATE POLICY "Users can view own transactions"
  ON klt_transactions FOR SELECT
  USING (auth.uid() = user_id);
-- System can insert transactions (via service role)
CREATE POLICY "Service can insert transactions"
  ON klt_transactions FOR INSERT
  WITH CHECK (true);
-- Managed by API with service key

-- Users can view their founder allocation
CREATE POLICY "Users can view own founder allocation"
  ON klt_founder_allocations FOR SELECT
  USING (auth.uid() = user_id);
-- Function to claim founder tokens
CREATE OR REPLACE FUNCTION claim_founder_tokens(p_user_id UUID)
RETURNS TABLE (claimed_amount INTEGER, student_num INTEGER) AS $$
DECLARE
  allocation_record RECORD;
BEGIN
  -- Get the allocation
  SELECT * INTO allocation_record
  FROM klt_founder_allocations
  WHERE user_id = p_user_id AND claimed = FALSE;
  
  IF allocation_record IS NULL THEN
    RAISE EXCEPTION 'No unclaimed founder allocation found';
  END IF;
  
  -- Mark as claimed
  UPDATE klt_founder_allocations
  SET claimed = TRUE, claimed_at = NOW()
  WHERE id = allocation_record.id;
  
  -- Create or update balance
  INSERT INTO user_klt_balances (user_id, balance, total_earned)
  VALUES (p_user_id, allocation_record.amount, allocation_record.amount)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    balance = user_klt_balances.balance + allocation_record.amount,
    total_earned = user_klt_balances.total_earned + allocation_record.amount,
    updated_at = NOW();
  
  -- Record transaction
  INSERT INTO klt_transactions (user_id, amount, type, category, description, metadata)
  VALUES (
    p_user_id, 
    allocation_record.amount, 
    'founder', 
    'founder_bonus',
    'Grunnlegger-bonus mottatt',
    jsonb_build_object('student_number', allocation_record.student_number)
  );
  
  RETURN QUERY SELECT allocation_record.amount, allocation_record.student_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Function to get next founder student number
CREATE OR REPLACE FUNCTION get_next_founder_number()
RETURNS INTEGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(student_number), 0) + 1
  INTO next_num
  FROM klt_founder_allocations;
  
  RETURN next_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Grant founder allocation to a new beta user (called from application)
CREATE OR REPLACE FUNCTION allocate_founder_tokens(p_user_id UUID)
RETURNS TABLE (student_number INTEGER, amount INTEGER) AS $$
DECLARE
  next_student_num INTEGER;
BEGIN
  -- Check if already allocated
  IF EXISTS (SELECT 1 FROM klt_founder_allocations WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'User already has founder allocation';
  END IF;
  
  -- Check if we have spots left (max 100 founders = 1M tokens = 10% of 10M)
  IF (SELECT COUNT(*) FROM klt_founder_allocations) >= 100 THEN
    RAISE EXCEPTION 'No more founder spots available';
  END IF;
  
  -- Get next student number
  next_student_num := get_next_founder_number();
  
  -- Create allocation
  INSERT INTO klt_founder_allocations (user_id, student_number, amount)
  VALUES (p_user_id, next_student_num, 10000);
  
  RETURN QUERY SELECT next_student_num, 10000;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Grant execute permissions
GRANT EXECUTE ON FUNCTION claim_founder_tokens(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION allocate_founder_tokens(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_founder_number() TO authenticated;
-- Grant table permissions
GRANT SELECT ON user_klt_balances TO authenticated;
GRANT SELECT ON klt_transactions TO authenticated;
GRANT SELECT ON klt_earning_categories TO authenticated;
GRANT SELECT ON klt_founder_allocations TO authenticated;
-- Comments
COMMENT ON TABLE user_klt_balances IS 'User KLT token balances (10M total supply)';
COMMENT ON TABLE klt_transactions IS 'All KLT token transactions';
COMMENT ON TABLE klt_founder_allocations IS 'Reserved tokens for first 100 beta users (1M = 10% of total)';
-- Verify setup
SELECT 'KLT Token System created successfully! 10M total: 1M to founders (10%), 9M team reserve (90%)' as status;
