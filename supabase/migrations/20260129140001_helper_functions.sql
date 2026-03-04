-- =====================================================
-- Klarpakke Helper Functions
-- Additional database utilities
-- =====================================================

-- =====================================================
-- SIGNAL STATISTICS
-- =====================================================

-- Function to get signal statistics by user
CREATE OR REPLACE FUNCTION get_user_signal_stats(user_uuid UUID)
RETURNS TABLE (
  total_signals BIGINT,
  approved_signals BIGINT,
  rejected_signals BIGINT,
  pending_signals BIGINT,
  approval_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_signals,
    COUNT(*) FILTER (WHERE status = 'approved')::BIGINT as approved_signals,
    COUNT(*) FILTER (WHERE status = 'rejected')::BIGINT as rejected_signals,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending_signals,
    CASE
      WHEN COUNT(*) FILTER (WHERE status IN ('approved', 'rejected')) > 0
      THEN ROUND(
        (COUNT(*) FILTER (WHERE status = 'approved')::NUMERIC /
         COUNT(*) FILTER (WHERE status IN ('approved', 'rejected'))::NUMERIC) * 100,
        2
      )
      ELSE 0
    END as approval_rate
  FROM signals
  WHERE processed_by = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SIGNAL NOTIFICATIONS
-- =====================================================

-- Function to notify when signal status changes
CREATE OR REPLACE FUNCTION notify_signal_status_change()
RETURNS TRIGGER AS $$
DECLARE
  payload JSON;
BEGIN
  -- Only notify on status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    payload := json_build_object(
      'signal_id', NEW.id,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'processed_by', NEW.processed_by,
      'processed_at', NEW.processed_at
    );

    -- Send notification to pg_notify channel
    PERFORM pg_notify('signal_status_changed', payload::text);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER signal_status_change_notification
  AFTER UPDATE ON signals
  FOR EACH ROW
  EXECUTE FUNCTION notify_signal_status_change();

-- =====================================================
-- DATA CLEANUP
-- =====================================================

-- Function to archive old signals
CREATE OR REPLACE FUNCTION archive_old_signals(days_old INTEGER DEFAULT 30)
RETURNS TABLE (
  archived_count BIGINT
) AS $$
BEGIN
  -- Create archive table if it doesn't exist
  CREATE TABLE IF NOT EXISTS signals_archive (LIKE signals INCLUDING ALL);

  -- Move old signals to archive
  WITH moved AS (
    DELETE FROM signals
    WHERE created_at < NOW() - (days_old || ' days')::INTERVAL
      AND status IN ('approved', 'rejected')
    RETURNING *
  )
  INSERT INTO signals_archive
  SELECT * FROM moved;

  -- Return count
  RETURN QUERY
  SELECT COUNT(*)::BIGINT FROM signals_archive
  WHERE created_at < NOW() - (days_old || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- USER MANAGEMENT
-- =====================================================

-- Function to assign role to user
CREATE OR REPLACE FUNCTION assign_user_role(
  user_uuid UUID,
  new_role TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Validate role
  IF new_role NOT IN ('admin', 'trader', 'analyst', 'viewer') THEN
    RAISE EXCEPTION 'Invalid role: %', new_role;
  END IF;

  -- Upsert role
  INSERT INTO user_roles (user_id, role)
  VALUES (user_uuid, new_role)
  ON CONFLICT (user_id)
  DO UPDATE SET
    role = new_role,
    updated_at = NOW();

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(
  user_uuid UUID,
  required_roles TEXT[]
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  user_role := get_user_role(user_uuid);
  RETURN user_role = ANY(required_roles);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- AUDIT LOGGING
-- =====================================================

-- Function to log user action
CREATE OR REPLACE FUNCTION log_user_action(
  p_user_id UUID,
  p_action TEXT,
  p_signal_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO audit_logs (user_id, action, signal_id, metadata)
  VALUES (p_user_id, p_action, p_signal_id, p_metadata)
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SIGNAL VALIDATION
-- =====================================================

-- Function to validate signal before processing
CREATE OR REPLACE FUNCTION validate_signal_for_processing(signal_uuid UUID)
RETURNS TABLE (
  is_valid BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  signal_status TEXT;
BEGIN
  -- Check if signal exists
  SELECT status INTO signal_status
  FROM signals
  WHERE id = signal_uuid;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Signal not found';
    RETURN;
  END IF;

  -- Check if signal is pending
  IF signal_status != 'pending' THEN
    RETURN QUERY SELECT FALSE, 'Signal has already been processed';
    RETURN;
  END IF;

  -- All checks passed
  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PERFORMANCE VIEWS
-- =====================================================

-- View: Active signals summary
CREATE OR REPLACE VIEW active_signals_summary AS
SELECT
  COUNT(*) as total_active,
  COUNT(*) FILTER (WHERE direction = 'long') as long_signals,
  COUNT(*) FILTER (WHERE direction = 'short') as short_signals,
  AVG(confidence)::NUMERIC(5,2) as avg_confidence
FROM signals
WHERE status = 'pending';

-- View: User performance
CREATE OR REPLACE VIEW user_performance AS
SELECT
  u.id as user_id,
  u.email,
  ur.role,
  COUNT(s.id) as total_processed,
  COUNT(s.id) FILTER (WHERE s.status = 'approved') as approved_count,
  COUNT(s.id) FILTER (WHERE s.status = 'rejected') as rejected_count,
  CASE
    WHEN COUNT(s.id) > 0
    THEN ROUND((COUNT(s.id) FILTER (WHERE s.status = 'approved')::NUMERIC / COUNT(s.id)::NUMERIC) * 100, 2)
    ELSE 0
  END as approval_rate
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN signals s ON u.id = s.processed_by
GROUP BY u.id, u.email, ur.role;

-- =====================================================
-- GRANTS FOR FUNCTIONS AND VIEWS
-- =====================================================

GRANT EXECUTE ON FUNCTION get_user_signal_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION assign_user_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_permission(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION log_user_action(UUID, TEXT, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_signal_for_processing(UUID) TO authenticated;

GRANT SELECT ON active_signals_summary TO authenticated;
GRANT SELECT ON user_performance TO authenticated;

-- Comments
COMMENT ON FUNCTION get_user_signal_stats IS 'Get signal processing statistics for a user';
COMMENT ON FUNCTION assign_user_role IS 'Assign or update user role';
COMMENT ON FUNCTION user_has_permission IS 'Check if user has required permission level';
COMMENT ON FUNCTION log_user_action IS 'Log user action to audit trail';
COMMENT ON FUNCTION validate_signal_for_processing IS 'Validate if signal can be processed';
COMMENT ON VIEW active_signals_summary IS 'Summary statistics of active (pending) signals';
COMMENT ON VIEW user_performance IS 'User signal processing performance metrics';
