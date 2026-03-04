-- Add resend_id column to notification_queue for tracking Resend email IDs
ALTER TABLE notification_queue ADD COLUMN IF NOT EXISTS resend_id TEXT;
ALTER TABLE notification_queue ADD COLUMN IF NOT EXISTS error_message TEXT;

CREATE INDEX IF NOT EXISTS idx_notification_queue_resend_id ON notification_queue(resend_id) WHERE resend_id IS NOT NULL;
