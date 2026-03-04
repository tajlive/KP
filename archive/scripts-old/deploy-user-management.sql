-- Deploy: User Management + Auto-Trading 3 Levels
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/vuxbjlykgmzskxbclquf/sql/new
-- =================================================================================

-- 1. USER MANAGEMENT SETUP
-- =======================

-- Add username column for competition/leaderboard
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Add user_number column (starting from 4101)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS user_number INTEGER UNIQUE;

-- Add source tracking (where user came from)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'organic' 
CHECK (source IN ('organic', 'google_ads', 'referral', 'social', 'partner', 'beta_invite'));

-- Create sequence for user numbers starting at 4101
DROP SEQUENCE IF EXISTS user_number_seq;
CREATE SEQUENCE user_number_seq START 4101;

-- Function to auto-assign user number on insert
CREATE OR REPLACE FUNCTION assign_user_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_number IS NULL THEN
    NEW.user_number := nextval('user_number_seq');
  END IF;
  
  -- Auto-generate username from email if not provided
  IF NEW.username IS NULL AND NEW.email IS NOT NULL THEN
    NEW.username := SPLIT_PART(NEW.email, '@', 1);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-assigning user_number
DROP TRIGGER IF EXISTS trigger_assign_user_number ON profiles;
CREATE TRIGGER trigger_assign_user_number
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION assign_user_number();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_user_number ON profiles(user_number);
CREATE INDEX IF NOT EXISTS idx_profiles_source ON profiles(source);

-- 2. AUTO-TRADING 3 LEVELS
-- =======================

-- Update risk_level constraint
ALTER TABLE auto_trading_settings 
DROP CONSTRAINT IF EXISTS auto_trading_settings_risk_level_check;

ALTER TABLE auto_trading_settings 
ADD CONSTRAINT auto_trading_settings_risk_level_check 
CHECK (risk_level IN ('conservative', 'balanced', 'aggressive', 'low', 'medium', 'high'));

-- Function to get trading level config
CREATE OR REPLACE FUNCTION get_trading_level_config(p_level TEXT)
RETURNS JSONB AS $$
BEGIN
  RETURN CASE p_level
    WHEN 'conservative' THEN jsonb_build_object(
      'name_no', 'Pensjonist',
      'name_en', 'Conservative',
      'description', 'Sikker vekst med lav risiko. Bra for langsiktig sparing.',
      'max_allocation_percent', 10, 'stop_loss_percent', 2.0, 'take_profit_percent', 4.0,
      'max_trades_per_day', 2, 'min_time_between_trades', 360,
      'ma_short', 20, 'ma_long', 50, 'rsi_oversold', 25, 'rsi_overbought', 75,
      'color', 'emerald', 'icon', '🛡️'
    )
    WHEN 'balanced' THEN jsonb_build_object(
      'name_no', 'Student',
      'name_en', 'Balanced',
      'description', 'Balansert risiko/avkastning. Standard for de fleste brukere.',
      'max_allocation_percent', 25, 'stop_loss_percent', 4.0, 'take_profit_percent', 8.0,
      'max_trades_per_day', 5, 'min_time_between_trades', 180,
      'ma_short', 12, 'ma_long', 26, 'rsi_oversold', 30, 'rsi_overbought', 70,
      'color', 'blue', 'icon', '⚖️'
    )
    WHEN 'aggressive' THEN jsonb_build_object(
      'name_no', 'Day Trader',
      'name_en', 'Aggressive',
      'description', 'Høy risiko, høy potensiell avkastning. Kun for erfarne tradere.',
      'max_allocation_percent', 50, 'stop_loss_percent', 6.0, 'take_profit_percent', 12.0,
      'max_trades_per_day', 15, 'min_time_between_trades', 60,
      'ma_short', 5, 'ma_long', 15, 'rsi_oversold', 35, 'rsi_overbought', 65,
      'color', 'red', 'icon', '🚀'
    )
    ELSE NULL
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to apply trading level
CREATE OR REPLACE FUNCTION apply_trading_level(p_user_id UUID, p_level TEXT)
RETURNS JSONB AS $$
DECLARE
  v_config JSONB;
BEGIN
  v_config := get_trading_level_config(p_level);
  IF v_config IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid trading level');
  END IF;
  
  INSERT INTO auto_trading_settings (
    user_id, risk_level, max_auto_allocation_percent, stop_loss_percent, take_profit_percent,
    max_trades_per_day_per_coin, min_time_between_trades_minutes,
    ma_short, ma_long, rsi_oversold, rsi_overbought
  ) VALUES (
    p_user_id, p_level, (v_config->>'max_allocation_percent')::int,
    (v_config->>'stop_loss_percent')::float, (v_config->>'take_profit_percent')::float,
    (v_config->>'max_trades_per_day')::int, (v_config->>'min_time_between_trades')::int,
    (v_config->>'ma_short')::int, (v_config->>'ma_long')::int,
    (v_config->>'rsi_oversold')::int, (v_config->>'rsi_overbought')::int
  )
  ON CONFLICT (user_id) DO UPDATE SET
    risk_level = EXCLUDED.risk_level, max_auto_allocation_percent = EXCLUDED.max_auto_allocation_percent,
    stop_loss_percent = EXCLUDED.stop_loss_percent, take_profit_percent = EXCLUDED.take_profit_percent,
    max_trades_per_day_per_coin = EXCLUDED.max_trades_per_day_per_coin,
    min_time_between_trades_minutes = EXCLUDED.min_time_between_trades_minutes,
    ma_short = EXCLUDED.ma_short, ma_long = EXCLUDED.ma_long,
    rsi_oversold = EXCLUDED.rsi_oversold, rsi_overbought = EXCLUDED.rsi_overbought,
    updated_at = NOW();
  
  RETURN jsonb_build_object('success', true, 'level', p_level, 'config', v_config);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ADMIN FUNCTIONS
-- =================

-- Admin function to upgrade user subscription tier
CREATE OR REPLACE FUNCTION admin_upgrade_user(p_user_id UUID, p_new_tier TEXT, p_admin_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_old_tier TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND role = 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin only');
  END IF;
  
  SELECT subscription_tier INTO v_old_tier FROM profiles WHERE id = p_user_id;
  
  UPDATE profiles SET subscription_tier = p_new_tier, subscription_status = 'active', updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object('success', true, 'user_id', p_user_id, 'old_tier', v_old_tier, 'new_tier', p_new_tier);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin function to change user role
CREATE OR REPLACE FUNCTION admin_change_role(p_user_id UUID, p_new_role TEXT, p_admin_id UUID)
RETURNS JSONB AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND role = 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin only');
  END IF;
  
  IF p_new_role NOT IN ('admin', 'user', 'beta', 'premium', 'master', 'phd', 'professor') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role');
  END IF;
  
  UPDATE profiles SET role = p_new_role, updated_at = NOW() WHERE id = p_user_id;
  
  RETURN jsonb_build_object('success', true, 'user_id', p_user_id, 'new_role', p_new_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. ADMIN VIEW
-- ============

CREATE OR REPLACE VIEW admin_user_list AS
SELECT 
  p.id, p.user_number, p.username, p.email, p.full_name, p.role,
  p.subscription_tier, p.subscription_status, p.source, p.beta_approved,
  p.created_at, p.last_sign_in_at,
  COALESCE(ps.total_value_nok, 0) as portfolio_value,
  COALESCE((SELECT COUNT(*) FROM auto_trades at WHERE at.user_id = p.id), 0) as total_trades
FROM profiles p
LEFT JOIN portfolio_summary ps ON ps.user_id = p.id;

GRANT SELECT ON admin_user_list TO authenticated;

-- 5. BACKFILL & SETUP
-- ==================

-- Update your profile as admin #4100
UPDATE profiles SET 
  user_number = 4100, username = 'taj_admin', role = 'admin',
  subscription_tier = 'vip_ekstrem', subscription_status = 'active', source = 'organic'
WHERE email = 'tomarnejensen@gmail.com';

-- Backfill existing users with user numbers
UPDATE profiles SET user_number = nextval('user_number_seq')
WHERE user_number IS NULL AND email != 'tomarnejensen@gmail.com';

-- Backfill usernames
UPDATE profiles SET username = SPLIT_PART(email, '@', 1)
WHERE username IS NULL AND email IS NOT NULL;

-- Set sequence to start after 4100
SELECT setval('user_number_seq', GREATEST(4101, (SELECT MAX(user_number) + 1 FROM profiles WHERE user_number IS NOT NULL)), false);

-- Default settings for existing users
INSERT INTO auto_trading_settings (user_id, risk_level)
SELECT id, 'balanced' FROM profiles
WHERE id NOT IN (SELECT user_id FROM auto_trading_settings)
ON CONFLICT (user_id) DO NOTHING;

-- Verify
SELECT 'Setup complete!' as status;
SELECT user_number, username, email, role, subscription_tier FROM profiles WHERE email = 'tomarnejensen@gmail.com';
SELECT COUNT(*) as total_users FROM profiles;
