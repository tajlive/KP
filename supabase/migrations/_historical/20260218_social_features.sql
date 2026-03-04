-- ============================================
-- SOCIAL FEATURES: LEADERBOARD & COPY TRADING
-- ============================================
-- Migration: 20260218_social_features.sql
-- Created: 18. februar 2026
-- 
-- Denne migrasjonen legger til:
-- 1. Copy trading felt på auto_trading_sessions
-- 2. auto_trading_followers tabell
-- 3. Triggere for followers_count
-- 4. RLS policies
-- ============================================

-- ============================================
-- STEP 1: Add copy trading fields to sessions
-- ============================================
ALTER TABLE auto_trading_sessions
ADD COLUMN IF NOT EXISTS copy_of_session_id UUID REFERENCES auto_trading_sessions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0 NOT NULL;

-- Add comments
COMMENT ON COLUMN auto_trading_sessions.copy_of_session_id IS 'If this session is copying another session, reference to source';
COMMENT ON COLUMN auto_trading_sessions.is_public IS 'Whether this session appears on leaderboard and can be copied';
COMMENT ON COLUMN auto_trading_sessions.followers_count IS 'Number of users currently copying this session';

-- Create index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_sessions_leaderboard
  ON auto_trading_sessions(is_paper_trading, is_public, total_pnl_pct DESC, updated_at DESC)
  WHERE status = 'active' AND is_public = true;

CREATE INDEX IF NOT EXISTS idx_sessions_copy_of 
  ON auto_trading_sessions(copy_of_session_id) 
  WHERE copy_of_session_id IS NOT NULL;

-- ============================================
-- STEP 2: Create followers table
-- ============================================
CREATE TABLE IF NOT EXISTS auto_trading_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  follower_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followed_session_id UUID NOT NULL REFERENCES auto_trading_sessions(id) ON DELETE CASCADE,
  follower_session_id UUID NOT NULL REFERENCES auto_trading_sessions(id) ON DELETE CASCADE,
  
  -- Status
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  stopped_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true NOT NULL,
  
  -- Stats
  total_copied_trades INTEGER DEFAULT 0 NOT NULL,
  total_pnl_nok DECIMAL(20, 8) DEFAULT 0 NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  UNIQUE(follower_user_id, followed_session_id),
  CONSTRAINT different_sessions CHECK (followed_session_id != follower_session_id)
);

-- Comments
COMMENT ON TABLE auto_trading_followers IS 'Tracks copy trading relationships between users';
COMMENT ON COLUMN auto_trading_followers.follower_user_id IS 'User who is copying';
COMMENT ON COLUMN auto_trading_followers.followed_session_id IS 'Session being copied';
COMMENT ON COLUMN auto_trading_followers.follower_session_id IS 'Copy session created for the follower';

-- ============================================
-- STEP 3: Indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_followers_user 
  ON auto_trading_followers(follower_user_id);

CREATE INDEX IF NOT EXISTS idx_followers_session 
  ON auto_trading_followers(followed_session_id);

CREATE INDEX IF NOT EXISTS idx_followers_active 
  ON auto_trading_followers(is_active) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_followers_created 
  ON auto_trading_followers(created_at DESC);

-- ============================================
-- STEP 4: Enable RLS
-- ============================================
ALTER TABLE auto_trading_followers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own follows
DROP POLICY IF EXISTS "Users can view their own follows" ON auto_trading_followers;
CREATE POLICY "Users can view their own follows"
  ON auto_trading_followers FOR SELECT
  USING (auth.uid() = follower_user_id);

-- Policy: Users can see who follows them (public sessions only)
DROP POLICY IF EXISTS "Users can see followers of their public sessions" ON auto_trading_followers;
CREATE POLICY "Users can see followers of their public sessions"
  ON auto_trading_followers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auto_trading_sessions s
      WHERE s.id = auto_trading_followers.followed_session_id
      AND s.user_id = auth.uid()
    )
  );

-- Policy: Users can create follows
DROP POLICY IF EXISTS "Users can create follows" ON auto_trading_followers;
CREATE POLICY "Users can create follows"
  ON auto_trading_followers FOR INSERT
  WITH CHECK (auth.uid() = follower_user_id);

-- Policy: Users can stop/update their follows
DROP POLICY IF EXISTS "Users can stop their follows" ON auto_trading_followers;
CREATE POLICY "Users can stop their follows"
  ON auto_trading_followers FOR UPDATE
  USING (auth.uid() = follower_user_id)
  WITH CHECK (auth.uid() = follower_user_id);

-- ============================================
-- STEP 5: Trigger for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_followers_updated_at ON auto_trading_followers;
CREATE TRIGGER update_followers_updated_at
  BEFORE UPDATE ON auto_trading_followers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 6: Function to update followers count
-- ============================================
CREATE OR REPLACE FUNCTION update_followers_count()
RETURNS TRIGGER AS $$
BEGIN
  -- INSERT: New active follow
  IF TG_OP = 'INSERT' AND NEW.is_active THEN
    UPDATE auto_trading_sessions
    SET followers_count = followers_count + 1,
        updated_at = NOW()
    WHERE id = NEW.followed_session_id;
  
  -- UPDATE: Status changed
  ELSIF TG_OP = 'UPDATE' THEN
    -- Was active, now inactive
    IF OLD.is_active AND NOT NEW.is_active THEN
      UPDATE auto_trading_sessions
      SET followers_count = followers_count - 1,
          updated_at = NOW()
      WHERE id = NEW.followed_session_id;
    
    -- Was inactive, now active
    ELSIF NOT OLD.is_active AND NEW.is_active THEN
      UPDATE auto_trading_sessions
      SET followers_count = followers_count + 1,
          updated_at = NOW()
      WHERE id = NEW.followed_session_id;
    END IF;
  
  -- DELETE: Remove active follow
  ELSIF TG_OP = 'DELETE' AND OLD.is_active THEN
    UPDATE auto_trading_sessions
    SET followers_count = followers_count - 1,
        updated_at = NOW()
    WHERE id = OLD.followed_session_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS followers_count_trigger ON auto_trading_followers;
CREATE TRIGGER followers_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON auto_trading_followers
  FOR EACH ROW
  EXECUTE FUNCTION update_followers_count();

-- ============================================
-- STEP 7: Validation trigger
-- ============================================
CREATE OR REPLACE FUNCTION validate_follow()
RETURNS TRIGGER AS $$
DECLARE
  v_followed_is_public BOOLEAN;
  v_followed_is_active BOOLEAN;
  v_followed_is_paper BOOLEAN;
  v_followed_user_id UUID;
BEGIN
  -- Get followed session info
  SELECT is_public, status = 'active', is_paper_trading, user_id
  INTO v_followed_is_public, v_followed_is_active, v_followed_is_paper, v_followed_user_id
  FROM auto_trading_sessions
  WHERE id = NEW.followed_session_id;
  
  -- Check if session exists
  IF v_followed_is_public IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;
  
  -- Check if session is public
  IF NOT v_followed_is_public THEN
    RAISE EXCEPTION 'Cannot follow a private session';
  END IF;
  
  -- Check if session is active
  IF NOT v_followed_is_active THEN
    RAISE EXCEPTION 'Cannot follow an inactive session';
  END IF;
  
  -- Check if session is paper trading
  IF NOT v_followed_is_paper THEN
    RAISE EXCEPTION 'Can only copy paper trading sessions';
  END IF;
  
  -- Check if trying to follow own session
  IF v_followed_user_id = NEW.follower_user_id THEN
    RAISE EXCEPTION 'Cannot follow your own session';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_follow_trigger ON auto_trading_followers;
CREATE TRIGGER validate_follow_trigger
  BEFORE INSERT ON auto_trading_followers
  FOR EACH ROW
  EXECUTE FUNCTION validate_follow();

-- ============================================
-- STEP 8: Function to get leaderboard
-- ============================================
CREATE OR REPLACE FUNCTION get_leaderboard(
  p_timeframe TEXT DEFAULT 'all_time',
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  rank BIGINT,
  session_id UUID,
  user_id UUID,
  username TEXT,
  strategy_name TEXT,
  total_return_pct DECIMAL,
  win_rate DECIMAL,
  total_trades INTEGER,
  profit_nok DECIMAL,
  followers_count INTEGER,
  is_own_session BOOLEAN
) AS $$
DECLARE
  v_current_user_id UUID := auth.uid();
  v_date_filter TIMESTAMPTZ;
BEGIN
  -- Calculate date filter
  v_date_filter := CASE p_timeframe
    WHEN 'today' THEN NOW() - INTERVAL '1 day'
    WHEN 'week' THEN NOW() - INTERVAL '7 days'
    WHEN 'month' THEN NOW() - INTERVAL '30 days'
    ELSE '1970-01-01'::TIMESTAMPTZ
  END;

  RETURN QUERY
  WITH ranked_sessions AS (
    SELECT 
      s.id as sid,
      s.user_id as uid,
      s.strategy_name,
      s.total_pnl_pct,
      s.win_rate,
      s.total_trades,
      s.total_pnl_nok,
      s.followers_count,
      p.username,
      ROW_NUMBER() OVER (ORDER BY s.total_pnl_pct DESC) as rn
    FROM auto_trading_sessions s
    LEFT JOIN profiles p ON p.id = s.user_id
    WHERE s.is_paper_trading = true
      AND s.is_public = true
      AND s.status = 'active'
      AND s.started_at >= v_date_filter
  )
  SELECT 
    rs.rn,
    rs.sid,
    rs.uid,
    CASE 
      WHEN rs.uid = v_current_user_id THEN rs.username
      ELSE 'Trader #' || LEFT(rs.uid::TEXT, 6)
    END,
    rs.strategy_name,
    rs.total_pnl_pct,
    rs.win_rate,
    rs.total_trades,
    rs.total_pnl_nok,
    rs.followers_count,
    rs.uid = v_current_user_id
  FROM ranked_sessions rs
  WHERE rs.rn <= p_limit
  ORDER BY rs.rn;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_leaderboard(TEXT, INTEGER) TO authenticated;

-- ============================================
-- COMPLETION
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Social features migration completed successfully!';
END $$;
