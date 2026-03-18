-- Admin Access for tomarnejensen@gmail.com
-- AND Extended Push Notification Preferences

-- 1. Ensure role column exists and set admin
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' 
CHECK (role IN ('admin', 'user', 'beta', 'premium', 'master', 'phd', 'professor'));
-- Set tomarnejensen@gmail.com as admin
UPDATE profiles 
SET role = 'admin',
    updated_at = NOW()
WHERE email = 'tomarnejensen@gmail.com';
-- Verify admin status
SELECT id, email, role, created_at 
FROM profiles 
WHERE email = 'tomarnejensen@gmail.com';
-- 2. Extend notification_preferences with fine-grained push control
ALTER TABLE notification_preferences 
ADD COLUMN IF NOT EXISTS push_price_alerts BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS push_trading_signals BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS push_stop_loss BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS push_portfolio_updates BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS push_market_news BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS push_competition BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS push_transactions BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS quiet_hours_start TIME DEFAULT '22:00',
ADD COLUMN IF NOT EXISTS quiet_hours_end TIME DEFAULT '08:00',
ADD COLUMN IF NOT EXISTS quiet_hours_enabled BOOLEAN DEFAULT TRUE;
-- 3. Create function to check if push should be sent
CREATE OR REPLACE FUNCTION should_send_push(
  p_user_id UUID,
  p_notification_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_prefs RECORD;
  v_current_time TIME;
  v_in_quiet_hours BOOLEAN := FALSE;
BEGIN
  -- Get user preferences
  SELECT * INTO v_prefs
  FROM notification_preferences
  WHERE user_id = p_user_id;
  
  -- If no preferences found, default to allowing
  IF v_prefs IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if push notifications are enabled at all
  IF NOT v_prefs.push_notifications THEN
    RETURN FALSE;
  END IF;
  
  -- Check quiet hours
  IF v_prefs.quiet_hours_enabled THEN
    v_current_time := CURRENT_TIME;
    
    -- Handle overnight quiet hours (e.g., 22:00 - 08:00)
    IF v_prefs.quiet_hours_start > v_prefs.quiet_hours_end THEN
      -- Quiet hours span midnight
      IF v_current_time >= v_prefs.quiet_hours_start OR v_current_time <= v_prefs.quiet_hours_end THEN
        v_in_quiet_hours := TRUE;
      END IF;
    ELSE
      -- Quiet hours within same day
      IF v_current_time >= v_prefs.quiet_hours_start AND v_current_time <= v_prefs.quiet_hours_end THEN
        v_in_quiet_hours := TRUE;
      END IF;
    END IF;
    
    -- If in quiet hours, only allow critical notifications
    IF v_in_quiet_hours AND p_notification_type NOT IN ('stop_loss', 'transaction', 'margin_call') THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  -- Check specific notification type
  CASE p_notification_type
    WHEN 'price_alert' THEN RETURN v_prefs.push_price_alerts;
    WHEN 'trading_signal' THEN RETURN v_prefs.push_trading_signals;
    WHEN 'stop_loss' THEN RETURN v_prefs.push_stop_loss;
    WHEN 'portfolio_update' THEN RETURN v_prefs.push_portfolio_updates;
    WHEN 'market_news' THEN RETURN v_prefs.push_market_news;
    WHEN 'competition' THEN RETURN v_prefs.push_competition;
    WHEN 'transaction' THEN RETURN v_prefs.push_transactions;
    ELSE RETURN TRUE; -- Default allow for unknown types
  END CASE;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 4. Create RLS policy for notification preferences
CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);
-- Done!
SELECT 'Admin access granted and push preferences extended!' as status;
