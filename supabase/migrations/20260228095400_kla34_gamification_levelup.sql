-- ============================================================================
-- KLA-34: Gamification Level Up System
-- Automatisk XP/Nivå-oppgradering med database-triggere og email-varsling
-- ============================================================================

-- ============================================================================
-- 1. EXTEND NOTIFICATION TYPE ENUM
-- ============================================================================
-- Sjekk om typene allerede finnes
DO $$
BEGIN
    -- Legg til nye typer hvis de ikke finnes
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'level_up' AND enumtypid = 'notification_type'::regtype) THEN
        ALTER TYPE notification_type ADD VALUE 'level_up';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'leaderboard_climb' AND enumtypid = 'notification_type'::regtype) THEN
        ALTER TYPE notification_type ADD VALUE 'leaderboard_climb';
    END IF;
END $$;

-- ============================================================================
-- 2. CREATE USER_GAMIFICATION TABLE (if not exists)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_gamification (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    current_level INTEGER NOT NULL DEFAULT 1,
    total_xp INTEGER NOT NULL DEFAULT 0,
    current_streak INTEGER NOT NULL DEFAULT 0,
    last_login_date DATE,
    level_up_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Legg til level_up_at hvis kolonnen mangler
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_gamification' AND column_name = 'level_up_at') THEN
        ALTER TABLE user_gamification ADD COLUMN level_up_at TIMESTAMPTZ;
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_gamification_user_id ON user_gamification(user_id);
CREATE INDEX IF NOT EXISTS idx_user_gamification_level ON user_gamification(current_level);
CREATE INDEX IF NOT EXISTS idx_user_gamification_xp ON user_gamification(total_xp DESC);

-- Enable RLS
ALTER TABLE user_gamification ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own gamification"
    ON user_gamification FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage gamification"
    ON user_gamification FOR ALL
    USING (true)
    WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_gamification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_gamification_timestamp ON user_gamification;
CREATE TRIGGER update_user_gamification_timestamp
    BEFORE UPDATE ON user_gamification
    FOR EACH ROW
    EXECUTE FUNCTION update_user_gamification_updated_at();

-- ============================================================================
-- 3. CREATE XP_TRANSACTIONS TABLE (audit log)
-- ============================================================================
CREATE TABLE IF NOT EXISTS xp_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    action TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    previous_xp INTEGER NOT NULL,
    new_xp INTEGER NOT NULL,
    previous_level INTEGER NOT NULL,
    new_level INTEGER NOT NULL,
    level_up BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_id ON xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created_at ON xp_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_level_up ON xp_transactions(level_up) WHERE level_up = TRUE;

ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own xp transactions"
    ON xp_transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert xp transactions"
    ON xp_transactions FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- 4. LEVEL CALCULATION FUNCTION
-- Formula: Level = floor(sqrt(total_xp / 100)) + 1
-- Lvl 1: 0 XP, Lvl 2: 100 XP, Lvl 3: 400 XP, Lvl 10: 8100 XP
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_level(xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
    IF xp < 0 THEN xp := 0; END IF;
    RETURN floor(sqrt(xp::FLOAT / 100)) + 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get XP needed for next level
CREATE OR REPLACE FUNCTION xp_for_level(level INTEGER)
RETURNS INTEGER AS $$
BEGIN
    IF level <= 1 THEN RETURN 0; END IF;
    RETURN ((level - 1) * (level - 1)) * 100;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 5. TRIGGER: Auto-level up on XP update
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_check_level_up()
RETURNS TRIGGER AS $$
DECLARE
    new_level INTEGER;
    old_level INTEGER;
BEGIN
    old_level := NEW.current_level;
    
    -- Calculate new level based on total XP
    new_level := calculate_level(NEW.total_xp);
    
    -- If level up detected
    IF new_level > old_level THEN
        NEW.current_level := new_level;
        NEW.level_up_at := NOW();
        
        -- Create in-app notification
        INSERT INTO notifications (user_id, type, title, body, data)
        VALUES (
            NEW.user_id,
            'level_up',
            '🎉 Gratulerer med oppgradering!',
            'Du har nådd level ' || new_level || '!',
            jsonb_build_object(
                'old_level', old_level,
                'new_level', new_level,
                'total_xp', NEW.total_xp
            )
        );
        
        -- Queue email notification
        INSERT INTO notification_queue (user_id, type, payload)
        VALUES (
            NEW.user_id,
            'level_up',
            jsonb_build_object(
                'old_level', old_level,
                'new_level', new_level,
                'total_xp', NEW.total_xp,
                'next_level_xp', xp_for_level(new_level + 1)
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_level_up_trigger ON user_gamification;
CREATE TRIGGER check_level_up_trigger
    BEFORE UPDATE OF total_xp ON user_gamification
    FOR EACH ROW
    EXECUTE FUNCTION trigger_check_level_up();

-- ============================================================================
-- 6. FUNCTION: Award XP with transaction logging
-- ============================================================================
CREATE OR REPLACE FUNCTION award_xp(
    p_user_id UUID,
    p_amount INTEGER,
    p_action TEXT,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS TABLE (
    success BOOLEAN,
    new_xp INTEGER,
    new_level INTEGER,
    level_up BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_current record;
    v_new_xp INTEGER;
    v_new_level INTEGER;
    v_level_up BOOLEAN := FALSE;
BEGIN
    -- Get current state (lock row)
    SELECT * INTO v_current
    FROM user_gamification
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    -- If no record exists, create one
    IF v_current IS NULL THEN
        INSERT INTO user_gamification (user_id, current_level, total_xp, current_streak)
        VALUES (p_user_id, 1, p_amount, 0)
        RETURNING * INTO v_current;
        
        v_new_xp := p_amount;
        v_new_level := calculate_level(v_new_xp);
        v_level_up := v_new_level > 1;
    ELSE
        v_new_xp := v_current.total_xp + p_amount;
        v_new_level := calculate_level(v_new_xp);
        v_level_up := v_new_level > v_current.current_level;
        
        -- Update gamification state (trigger will handle level_up notifications)
        UPDATE user_gamification
        SET total_xp = v_new_xp,
            current_level = v_new_level
        WHERE user_id = p_user_id;
    END IF;
    
    -- Log transaction
    INSERT INTO xp_transactions (
        user_id, amount, action, description, metadata,
        previous_xp, new_xp, previous_level, new_level, level_up
    ) VALUES (
        p_user_id, p_amount, p_action, p_description, p_metadata,
        COALESCE(v_current.total_xp, 0), v_new_xp,
        COALESCE(v_current.current_level, 1), v_new_level, v_level_up
    );
    
    RETURN QUERY SELECT 
        TRUE, 
        v_new_xp, 
        v_new_level, 
        v_level_up,
        CASE WHEN v_level_up 
            THEN 'Level up! You are now level ' || v_new_level
            ELSE 'Gained ' || p_amount || ' XP'
        END;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. FUNCTION: Award login XP with streak calculation
-- ============================================================================
CREATE OR REPLACE FUNCTION award_login_xp(p_user_id UUID)
RETURNS TABLE (
    success BOOLEAN,
    new_xp INTEGER,
    new_level INTEGER,
    level_up BOOLEAN,
    streak INTEGER,
    awarded_xp INTEGER,
    already_claimed BOOLEAN
) AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_current record;
    v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
    v_new_streak INTEGER;
    v_base_xp INTEGER := 50;
    v_multiplier NUMERIC;
    v_awarded_xp INTEGER;
    v_result record;
BEGIN
    -- Get current state
    SELECT * INTO v_current
    FROM user_gamification
    WHERE user_id = p_user_id;
    
    -- Check if already claimed today
    IF v_current IS NOT NULL AND v_current.last_login_date = v_today THEN
        RETURN QUERY SELECT 
            FALSE, 
            v_current.total_xp, 
            v_current.current_level, 
            FALSE,
            v_current.current_streak,
            0,
            TRUE;
        RETURN;
    END IF;
    
    -- Calculate streak
    IF v_current IS NULL OR v_current.last_login_date IS NULL OR v_current.last_login_date != v_yesterday THEN
        v_new_streak := 1;
    ELSE
        v_new_streak := v_current.current_streak + 1;
    END IF;
    
    -- Calculate XP with streak multiplier (max 2x)
    v_multiplier := LEAST(1 + (v_new_streak * 0.1), 2.0);
    v_awarded_xp := floor(v_base_xp * v_multiplier)::INTEGER;
    
    -- Award XP
    SELECT * INTO v_result FROM award_xp(
        p_user_id, 
        v_awarded_xp, 
        'login', 
        'Daily login bonus (streak: ' || v_new_streak || ')',
        jsonb_build_object('streak', v_new_streak, 'multiplier', v_multiplier)
    );
    
    -- Update streak and login date
    UPDATE user_gamification
    SET current_streak = v_new_streak,
        last_login_date = v_today
    WHERE user_id = p_user_id;
    
    RETURN QUERY SELECT 
        TRUE,
        v_result.new_xp,
        v_result.new_level,
        v_result.level_up,
        v_new_streak,
        v_awarded_xp,
        FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. LEADERBOARD CLIMB DETECTION
-- ============================================================================
CREATE TABLE IF NOT EXISTS leaderboard_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    time_period TEXT NOT NULL CHECK (time_period IN ('daily', 'weekly', 'monthly', 'all_time')),
    rank INTEGER NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, time_period, DATE(recorded_at))
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_history_user_period ON leaderboard_history(user_id, time_period);
CREATE INDEX IF NOT EXISTS idx_leaderboard_history_recorded ON leaderboard_history(recorded_at);

-- Function to record leaderboard position and detect climb
CREATE OR REPLACE FUNCTION record_leaderboard_position(
    p_user_id UUID,
    p_time_period TEXT,
    p_new_rank INTEGER
)
RETURNS VOID AS $$
DECLARE
    v_old_rank INTEGER;
    v_climb INTEGER;
BEGIN
    -- Get yesterday's rank
    SELECT rank INTO v_old_rank
    FROM leaderboard_history
    WHERE user_id = p_user_id
        AND time_period = p_time_period
        AND DATE(recorded_at) = CURRENT_DATE - INTERVAL '1 day'
    ORDER BY recorded_at DESC
    LIMIT 1;
    
    -- Record current position
    INSERT INTO leaderboard_history (user_id, time_period, rank)
    VALUES (p_user_id, p_time_period, p_new_rank)
    ON CONFLICT (user_id, time_period, DATE(recorded_at)) 
    DO UPDATE SET rank = p_new_rank, recorded_at = NOW();
    
    -- Detect climb (5+ positions)
    IF v_old_rank IS NOT NULL AND v_old_rank > p_new_rank THEN
        v_climb := v_old_rank - p_new_rank;
        
        IF v_climb >= 5 THEN
            -- Create notification
            INSERT INTO notifications (user_id, type, title, body, data)
            VALUES (
                p_user_id,
                'leaderboard_climb',
                '🚀 Du klatrer på leaderboardet!',
                'Du har klatret ' || v_climb || ' plasser på ' || p_time_period || ' leaderboard!',
                jsonb_build_object('climb', v_climb, 'new_rank', p_new_rank, 'old_rank', v_old_rank)
            );
            
            -- Queue email
            INSERT INTO notification_queue (user_id, type, payload)
            VALUES (
                p_user_id,
                'leaderboard_climb',
                jsonb_build_object('climb', v_climb, 'new_rank', p_new_rank, 'time_period', p_time_period)
            );
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. ADD 'level_up' AND 'leaderboard_climb' TO notification_queue TYPE CHECK
-- ============================================================================
-- Note: notification_queue uses TEXT with CHECK constraint, not enum
-- We need to update the constraint to include new types

ALTER TABLE notification_queue DROP CONSTRAINT IF EXISTS notification_queue_type_check;
ALTER TABLE notification_queue ADD CONSTRAINT notification_queue_type_check
    CHECK (type IN (
        'trade_executed', 'bot_crashed', 'bot_recovered', 
        'copy_started', 'daily_digest', 'subscription_change',
        'level_up', 'leaderboard_climb'
    ));

-- ============================================================================
-- 10. INITIAL DATA: Create gamification records for existing users
-- ============================================================================
INSERT INTO user_gamification (user_id, current_level, total_xp, current_streak)
SELECT 
    u.id,
    1,
    0,
    0
FROM auth.users u
LEFT JOIN user_gamification ug ON u.id = ug.user_id
WHERE ug.id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE user_gamification IS 'User gamification state: XP, level, streak';
COMMENT ON TABLE xp_transactions IS 'Audit log of all XP awards with level change tracking';
COMMENT ON TABLE leaderboard_history IS 'Daily leaderboard position history for climb detection';
COMMENT ON FUNCTION calculate_level IS 'Calculate user level from total XP: floor(sqrt(xp/100)) + 1';
COMMENT ON FUNCTION award_xp IS 'Award XP to user, auto-level up, log transaction';
COMMENT ON FUNCTION award_login_xp IS 'Award daily login XP with streak bonus';
