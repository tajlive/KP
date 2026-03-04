-- Push Notifications System for Klarpakke

-- ============================================
-- 1. PUSH SUBSCRIPTIONS (Web Push API)
-- ============================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL, -- Web Push subscription object
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, endpoint)
);

-- ============================================
-- 2. NOTIFICATION PREFERENCES
-- ============================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Price alerts
  price_alerts BOOLEAN DEFAULT true,
  price_change_threshold DECIMAL(5, 2) DEFAULT 5.0, -- 5% change
  
  -- Trading notifications
  trade_executed BOOLEAN DEFAULT true,
  trade_failed BOOLEAN DEFAULT true,
  position_closed BOOLEAN DEFAULT true,
  
  -- Course/Learning
  course_reminder BOOLEAN DEFAULT true,
  streak_reminder BOOLEAN DEFAULT true,
  new_content BOOLEAN DEFAULT true,
  
  -- Marketing (opt-in)
  marketing_emails BOOLEAN DEFAULT false,
  newsletter BOOLEAN DEFAULT false,
  
  -- System
  maintenance_notice BOOLEAN DEFAULT true,
  security_alert BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================
-- 3. NOTIFICATION LOG (History)
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  icon TEXT DEFAULT '/icons/icon-192x192.png',
  badge TEXT DEFAULT '/icons/icon-72x72.png',
  tag TEXT, -- For grouping similar notifications
  
  -- Action on click
  action_url TEXT,
  action_text TEXT DEFAULT 'Åpne',
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  category TEXT NOT NULL CHECK (category IN ('price', 'trade', 'course', 'system', 'marketing')),
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. FUNCTIONS
-- ============================================

-- Function to save push subscription
CREATE OR REPLACE FUNCTION save_push_subscription(
  p_user_id UUID,
  p_subscription JSONB
)
RETURNS UUID AS $$
DECLARE
  v_subscription_id UUID;
BEGIN
  INSERT INTO push_subscriptions (
    user_id,
    subscription,
    endpoint,
    p256dh,
    auth
  ) VALUES (
    p_user_id,
    p_subscription,
    p_subscription->>'endpoint',
    p_subscription->'keys'->>'p256dh',
    p_subscription->'keys'->>'auth'
  )
  ON CONFLICT (user_id, endpoint) 
  DO UPDATE SET 
    subscription = EXCLUDED.subscription,
    is_active = true,
    updated_at = NOW()
  RETURNING id INTO v_subscription_id;
  
  RETURN v_subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_category TEXT,
  p_action_url TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_has_subscription BOOLEAN;
BEGIN
  -- Insert notification
  INSERT INTO notifications (
    user_id,
    title,
    body,
    category,
    action_url,
    metadata
  ) VALUES (
    p_user_id,
    p_title,
    p_body,
    p_category,
    p_action_url,
    p_metadata
  )
  RETURNING id INTO v_notification_id;
  
  -- Check if user has push subscription
  SELECT EXISTS(
    SELECT 1 FROM push_subscriptions 
    WHERE user_id = p_user_id AND is_active = true
  ) INTO v_has_subscription;
  
  -- If push subscription exists, notification will be sent via edge function
  -- The edge function polls for unsent notifications
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notifications count
CREATE OR REPLACE FUNCTION get_unread_notifications_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM notifications
  WHERE user_id = p_user_id AND is_read = false;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read(
  p_user_id UUID,
  p_notification_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_notification_ids IS NULL THEN
    -- Mark all as read
    UPDATE notifications 
    SET is_read = true 
    WHERE user_id = p_user_id AND is_read = false;
  ELSE
    -- Mark specific as read
    UPDATE notifications 
    SET is_read = true 
    WHERE user_id = p_user_id 
      AND id = ANY(p_notification_ids)
      AND is_read = false;
  END IF;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. RLS POLICIES
-- ============================================
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only manage own subscriptions
CREATE POLICY "Users manage own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id);

-- Users can only view/manage own preferences
CREATE POLICY "Users manage own notification preferences"
  ON notification_preferences FOR ALL
  USING (auth.uid() = user_id);

-- Users can only view own notifications
CREATE POLICY "Users view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update own notifications (mark as read)
CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- 6. INDEXES
-- ============================================
CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id, is_active);
CREATE INDEX idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_user_sent ON notifications(user_id, is_sent, created_at DESC);
CREATE INDEX idx_notifications_category ON notifications(category, created_at DESC);

-- ============================================
-- 7. DEFAULT PREFERENCES ON USER CREATE
-- ============================================
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_profile_create_notification_prefs'
  ) THEN
    CREATE TRIGGER on_profile_create_notification_prefs
      AFTER INSERT ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION create_default_notification_preferences();
  END IF;
END $$;

-- ============================================
-- 8. BROADCAST NOTIFICATION (Admin function)
-- ============================================
CREATE OR REPLACE FUNCTION broadcast_notification(
  p_title TEXT,
  p_body TEXT,
  p_category TEXT,
  p_action_url TEXT DEFAULT NULL,
  p_target_tier TEXT DEFAULT NULL -- NULL = all, or 'student', 'bachelor', etc.
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_user RECORD;
BEGIN
  FOR v_user IN 
    SELECT id FROM profiles 
    WHERE (p_target_tier IS NULL OR subscription_tier = p_target_tier)
  LOOP
    PERFORM create_notification(
      v_user.id,
      p_title,
      p_body,
      p_category,
      p_action_url,
      '{"is_broadcast": true}'::jsonb
    );
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Push notifications system created successfully!' as status;
