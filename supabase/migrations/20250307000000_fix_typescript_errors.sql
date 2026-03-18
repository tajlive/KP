-- =============================================================================
-- DATABASE SCHEMA FIXES - TypeScript Error Resolution
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Add missing columns to existing tables
-- -----------------------------------------------------------------------------

-- Add display_name and full_name to user_profiles if not exists
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS display_name text,
ADD COLUMN IF NOT EXISTS full_name text;
-- Add amount column to subscriptions if not exists
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS amount numeric;
-- Add completed_lessons column to onboarding_progress if not exists
ALTER TABLE onboarding_progress 
ADD COLUMN IF NOT EXISTS completed_lessons integer DEFAULT 0;
-- Add email column to user_profiles if not exists
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS email text;
-- Add status column to user_profiles if not exists
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
-- -----------------------------------------------------------------------------
-- 2. Create missing tables
-- -----------------------------------------------------------------------------

-- Create ai_cache table
CREATE TABLE IF NOT EXISTS ai_cache (
    cache_key text PRIMARY KEY,
    value jsonb NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- Create auto_trading_sessions table
CREATE TABLE IF NOT EXISTS auto_trading_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    name text NOT NULL,
    strategy_type text NOT NULL,
    status text DEFAULT 'active',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- Create strategy_logs table
CREATE TABLE IF NOT EXISTS strategy_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL,
    strategy_type text NOT NULL,
    status text NOT NULL,
    created_at timestamptz DEFAULT now()
);
-- Create trading_logs table
CREATE TABLE IF NOT EXISTS trading_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL,
    trade_id uuid,
    action text NOT NULL,
    details jsonb,
    created_at timestamptz DEFAULT now()
);
-- Create strategy_reviews table
CREATE TABLE IF NOT EXISTS strategy_reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    strategy_id uuid NOT NULL,
    user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review text,
    created_at timestamptz DEFAULT now()
);
-- Create leaderboard table
CREATE TABLE IF NOT EXISTS leaderboard (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    rank integer NOT NULL,
    total_pnl numeric DEFAULT 0,
    roi numeric DEFAULT 0,
    win_rate numeric DEFAULT 0,
    total_trades integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- -----------------------------------------------------------------------------
-- 3. Enable RLS on new tables
-- -----------------------------------------------------------------------------

ALTER TABLE ai_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_trading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;
-- -----------------------------------------------------------------------------
-- 4. Create basic RLS policies
-- -----------------------------------------------------------------------------

-- Auto trading sessions policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own sessions' AND tablename = 'auto_trading_sessions') THEN
        CREATE POLICY "Users can view own sessions" ON auto_trading_sessions
            FOR SELECT USING (user_id = auth.uid());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own sessions' AND tablename = 'auto_trading_sessions') THEN
        CREATE POLICY "Users can insert own sessions" ON auto_trading_sessions
            FOR INSERT WITH CHECK (user_id = auth.uid());
    END IF;
END $$;
-- Strategy reviews policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view reviews' AND tablename = 'strategy_reviews') THEN
        CREATE POLICY "Anyone can view reviews" ON strategy_reviews
            FOR SELECT USING (true);
    END IF;
END $$;
-- Leaderboard policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view leaderboard' AND tablename = 'leaderboard') THEN
        CREATE POLICY "Anyone can view leaderboard" ON leaderboard
            FOR SELECT USING (true);
    END IF;
END $$;
