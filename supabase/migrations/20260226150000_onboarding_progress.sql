-- ============================================================================
-- ONBOARDING_PROGRESS - Track user onboarding journey
-- ============================================================================

CREATE TABLE IF NOT EXISTS onboarding_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  step1_completed BOOLEAN DEFAULT false,
  step2_completed BOOLEAN DEFAULT false,
  step3_completed BOOLEAN DEFAULT false,
  step4_completed BOOLEAN DEFAULT false,
  step5_completed BOOLEAN DEFAULT false,
  step2_started_at TIMESTAMPTZ,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- RLS
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own onboarding progress"
  ON onboarding_progress
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
-- Service Role
GRANT ALL ON onboarding_progress TO service_role;
GRANT ALL ON onboarding_progress TO authenticated;
-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
CREATE TRIGGER update_onboarding_progress_updated_at
    BEFORE UPDATE ON onboarding_progress
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
