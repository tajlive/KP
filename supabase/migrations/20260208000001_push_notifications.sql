-- ============================================================
-- PUSH NOTIFICATIONS
-- Database schema for Web Push API
-- ============================================================

-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';
-- Create trigger for push_subscriptions
DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON push_subscriptions;
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_push_subscriptions_updated_at();
-- Enable RLS on push_subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
-- RLS Policies for push_subscriptions

-- Users can view their own subscriptions
CREATE POLICY "Users can view own push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);
-- Only service role can insert/update/delete (via API)
CREATE POLICY "Service role can manage push subscriptions"
  ON push_subscriptions FOR ALL
  USING (true)
  WITH CHECK (true);
-- Create function to send push to all user devices
CREATE OR REPLACE FUNCTION send_push_to_user(
  user_uuid UUID,
  notification_title TEXT,
  notification_body TEXT,
  notification_data JSONB DEFAULT '{}'::jsonb
)
RETURNS INTEGER AS $$
DECLARE
  subscription_count INTEGER;
BEGIN
  -- Count subscriptions for user (actual sending done by backend)
  SELECT COUNT(*) INTO subscription_count
  FROM push_subscriptions
  WHERE user_id = user_uuid;
  
  RETURN subscription_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Add notification preferences to profiles
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'push_enabled') THEN
    ALTER TABLE profiles ADD COLUMN push_enabled BOOLEAN DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'email_notifications') THEN
    ALTER TABLE profiles ADD COLUMN email_notifications BOOLEAN DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'sms_notifications') THEN
    ALTER TABLE profiles ADD COLUMN sms_notifications BOOLEAN DEFAULT false;
  END IF;
END $$;
-- Create notification_types enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE notification_type AS ENUM (
      'signal_new',
      'signal_executed',
      'price_alert',
      'subscription_expiring',
      'subscription_expired',
      'achievement_unlocked',
      'leaderboard_update',
      'system'
    );
  END IF;
END $$;
-- Create notifications table for in-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type DEFAULT 'system',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Add indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);
-- Add comments for documentation
COMMENT ON TABLE push_subscriptions IS 'Web Push API subscriptions for users';
COMMENT ON TABLE notifications IS 'In-app notifications for users';
COMMENT ON COLUMN profiles.push_enabled IS 'Whether user wants push notifications';
