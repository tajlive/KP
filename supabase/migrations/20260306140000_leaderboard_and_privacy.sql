-- ============================================================================
-- Paper Trading Leaderboard & Privacy Settings Migration
-- ============================================================================

-- 1. Add show_on_leaderboard column to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS show_on_leaderboard BOOLEAN DEFAULT false;

-- 2. Add index for efficient leaderboard queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_leaderboard 
ON user_profiles(show_on_leaderboard) 
WHERE show_on_leaderboard = true;

-- 3. Add comment explaining the column
COMMENT ON COLUMN user_profiles.show_on_leaderboard IS 
'User preference to appear on paper trading leaderboard. Default false for privacy.';

-- 4. Update existing users to opt-in (optional - set to false for privacy by default)
-- Uncomment if you want existing users to be opted in:
-- UPDATE user_profiles SET show_on_leaderboard = true WHERE created_at < NOW();

-- ============================================================================
-- Leaderboard Performance Indexes
-- ============================================================================

-- Index for trading_sessions leaderboard queries
CREATE INDEX IF NOT EXISTS idx_trading_sessions_leaderboard 
ON trading_sessions(user_id, mode, status, current_capital_nok DESC) 
WHERE mode = 'paper' AND status = 'active';

-- Index for trades statistics
CREATE INDEX IF NOT EXISTS idx_trades_user_pnl 
ON trades(user_id, mode, side, pnl) 
WHERE mode = 'paper';

-- ============================================================================
-- RLS Policy for Leaderboard
-- ============================================================================

-- Ensure user_profiles has RLS enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can update their own leaderboard preference
DROP POLICY IF EXISTS "Users can update own leaderboard preference" ON user_profiles;
CREATE POLICY "Users can update own leaderboard preference" 
ON user_profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Helper Function: Get User Rank
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_paper_trading_rank(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_rank INTEGER;
BEGIN
  SELECT rank INTO v_rank
  FROM (
    SELECT 
      user_id,
      RANK() OVER (ORDER BY current_capital_nok DESC) as rank
    FROM trading_sessions
    WHERE mode = 'paper' 
      AND status = 'active'
      AND user_id IN (
        SELECT user_id FROM user_profiles WHERE show_on_leaderboard = true
      )
  ) ranked
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(v_rank, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Helper Function: Get Leaderboard Stats
-- ============================================================================

CREATE OR REPLACE FUNCTION get_leaderboard_stats()
RETURNS TABLE (
  total_participants BIGINT,
  avg_roi NUMERIC,
  top_performer TEXT,
  top_roi NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      ts.user_id,
      up.full_name,
      ((ts.current_capital_nok - ts.starting_capital_nok) / ts.starting_capital_nok * 100) as roi
    FROM trading_sessions ts
    JOIN user_profiles up ON ts.user_id = up.user_id
    WHERE ts.mode = 'paper' 
      AND ts.status = 'active'
      AND up.show_on_leaderboard = true
  )
  SELECT 
    COUNT(*)::BIGINT as total_participants,
    AVG(roi)::NUMERIC(10,2) as avg_roi,
    (SELECT full_name FROM stats ORDER BY roi DESC LIMIT 1)::TEXT as top_performer,
    (SELECT MAX(roi) FROM stats)::NUMERIC(10,2) as top_roi
  FROM stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
