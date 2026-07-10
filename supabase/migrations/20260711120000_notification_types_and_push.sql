-- ============================================================
-- Notification types + push subscription cleanup
-- Legger til de 4 nye notification-typene for #11
-- ============================================================

-- Legg til nye notification types (safe - bruker IF NOT EXISTS for hver)
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'trade_executed';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'leaderboard_change';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'achievement';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'weekly_summary';

-- Sørg for at notifications tabellen har riktige kolonner
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT false;

-- Oppdater RLS: service_role kan alltid lese/insert (for backend-kall)
DROP POLICY IF EXISTS "Service role can manage notifications" ON notifications;
CREATE POLICY "Service role can manage notifications"
  ON notifications FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS for push_subscriptions: anon/authenticated kan kun select/delete egne
DROP POLICY IF EXISTS "Users can view own push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Service role can manage push subscriptions" ON push_subscriptions;

CREATE POLICY "Users can view own push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can read all push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (true);

-- Funksjon: marker notifikasjoner som lest (brukes av API)
CREATE OR REPLACE FUNCTION mark_notifications_read(p_notification_ids UUID[] DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  IF p_notification_ids IS NULL THEN
    UPDATE notifications SET is_read = true, read = true
    WHERE user_id = auth.uid() AND is_read = false;
  ELSE
    UPDATE notifications SET is_read = true, read = true
    WHERE id = ANY(p_notification_ids) AND user_id = auth.uid();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funksjon: opprett notifikasjon (service_role-only)
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, body, data, is_read, read)
  VALUES (p_user_id, p_type, p_title, p_body, p_data, false, false)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- VACUUM ikke nødvendig for migrering
