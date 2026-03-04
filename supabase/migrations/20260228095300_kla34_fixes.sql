-- Fix missing leaderboard_history table
CREATE TABLE IF NOT EXISTS leaderboard_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    time_period TEXT NOT NULL CHECK (time_period IN ('daily', 'weekly', 'monthly', 'all_time')),
    rank INTEGER NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_history_user_period ON leaderboard_history(user_id, time_period);
CREATE INDEX IF NOT EXISTS idx_leaderboard_history_recorded ON leaderboard_history(recorded_at);

-- Fix notification_queue constraint violation by updating existing rows first
UPDATE notification_queue 
SET type = 'trade_executed' 
WHERE type NOT IN ('trade_executed', 'bot_crashed', 'bot_recovered', 'copy_started', 'daily_digest', 'subscription_change', 'level_up', 'leaderboard_climb');

-- Now add the constraint
ALTER TABLE notification_queue DROP CONSTRAINT IF EXISTS notification_queue_type_check;
ALTER TABLE notification_queue ADD CONSTRAINT notification_queue_type_check
    CHECK (type IN (
        'trade_executed', 'bot_crashed', 'bot_recovered', 
        'copy_started', 'daily_digest', 'subscription_change',
        'level_up', 'leaderboard_climb'
    ));

-- Create record_leaderboard_position function
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
    SELECT rank INTO v_old_rank
    FROM leaderboard_history
    WHERE user_id = p_user_id
        AND time_period = p_time_period
        AND DATE(recorded_at) = CURRENT_DATE - INTERVAL '1 day'
    ORDER BY recorded_at DESC
    LIMIT 1;
    
    INSERT INTO leaderboard_history (user_id, time_period, rank)
    VALUES (p_user_id, p_time_period, p_new_rank)
    ON CONFLICT (user_id, time_period, DATE(recorded_at)) 
    DO UPDATE SET rank = p_new_rank, recorded_at = NOW();
    
    IF v_old_rank IS NOT NULL AND v_old_rank > p_new_rank THEN
        v_climb := v_old_rank - p_new_rank;
        IF v_climb >= 5 THEN
            INSERT INTO notifications (user_id, type, title, body, data)
            VALUES (
                p_user_id,
                'leaderboard_climb',
                '🚀 Du klatrer på leaderboardet!',
                'Du har klatret ' || v_climb || ' plasser på ' || p_time_period || ' leaderboard!',
                jsonb_build_object('climb', v_climb, 'new_rank', p_new_rank, 'old_rank', v_old_rank)
            );
            
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
