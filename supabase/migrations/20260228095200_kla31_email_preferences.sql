-- ============================================================================
-- KLA-31: Automated Emails - Email Preferences System
-- ============================================================================

-- Email preferences table
CREATE TABLE IF NOT EXISTS email_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Marketing and promotional emails
    marketing_emails BOOLEAN DEFAULT false,
    
    -- Transactional emails (always sent, but track preference)
    transaction_emails BOOLEAN DEFAULT true,
    
    -- Gamification notifications (level up, achievements)
    gamification_emails BOOLEAN DEFAULT true,
    
    -- Trading alerts (trade executed, bot status)
    trading_alerts BOOLEAN DEFAULT true,
    
    -- Digest emails frequency: 'daily', 'weekly', 'never'
    digest_emails TEXT DEFAULT 'weekly' CHECK (digest_emails IN ('daily', 'weekly', 'never')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_preferences_user_id ON email_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_email_preferences_digest ON email_preferences(digest_emails) 
    WHERE digest_emails != 'never';

-- Enable RLS
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own email preferences"
    ON email_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own email preferences"
    ON email_preferences FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email preferences"
    ON email_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Service role can manage all
CREATE POLICY "Service role can manage email preferences"
    ON email_preferences FOR ALL
    USING (true)
    WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_email_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_email_preferences_timestamp ON email_preferences;
CREATE TRIGGER update_email_preferences_timestamp
    BEFORE UPDATE ON email_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_email_preferences_timestamp();

-- Function to get or create email preferences
CREATE OR REPLACE FUNCTION get_or_create_email_preferences(p_user_id UUID)
RETURNS email_preferences AS $$
DECLARE
    v_prefs email_preferences;
BEGIN
    -- Try to get existing preferences
    SELECT * INTO v_prefs
    FROM email_preferences
    WHERE user_id = p_user_id;
    
    -- If not found, create default preferences
    IF v_prefs IS NULL THEN
        INSERT INTO email_preferences (user_id)
        VALUES (p_user_id)
        RETURNING * INTO v_prefs;
    END IF;
    
    RETURN v_prefs;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create default preferences on user signup
CREATE OR REPLACE FUNCTION handle_new_user_email_prefs()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO email_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS create_email_prefs_on_signup ON auth.users;
CREATE TRIGGER create_email_prefs_on_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_email_prefs();

-- Create preferences for existing users
INSERT INTO email_preferences (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- EMAIL LOG TABLE (for tracking delivery status)
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email_type TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'bounced', 'failed')),
    resend_id TEXT,
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_log_user_id ON email_log(user_id);
CREATE INDEX IF NOT EXISTS idx_email_log_status ON email_log(status);
CREATE INDEX IF NOT EXISTS idx_email_log_created_at ON email_log(created_at DESC);

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email log"
    ON email_log FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert email log"
    ON email_log FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Service role can update email log"
    ON email_log FOR UPDATE
    USING (true);

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE email_preferences IS 'User email notification preferences';
COMMENT ON TABLE email_log IS 'Audit log of all sent emails';
COMMENT ON FUNCTION get_or_create_email_preferences IS 'Get or create default email preferences for a user';
