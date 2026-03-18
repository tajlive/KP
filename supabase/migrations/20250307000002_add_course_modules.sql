-- ============================================================================
-- KLA-136: Course Modules and Quiz Progress
-- ============================================================================

-- Module Progress Table
CREATE TABLE IF NOT EXISTS module_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  score INTEGER,
  attempts INTEGER DEFAULT 1,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module_id)
);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_module_progress_user_id ON module_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_module_progress_module_id ON module_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_module_progress_completed ON module_progress(completed);
-- RLS
ALTER TABLE module_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own progress"
  ON module_progress FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress"
  ON module_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress"
  ON module_progress FOR UPDATE
  USING (auth.uid() = user_id);
-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_module_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_module_progress_timestamp ON module_progress;
CREATE TRIGGER update_module_progress_timestamp
  BEFORE UPDATE ON module_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_module_progress_updated_at();
-- Function to get user's total progress
CREATE OR REPLACE FUNCTION get_user_course_progress(p_user_id UUID)
RETURNS TABLE (
  total_modules INTEGER,
  completed_modules INTEGER,
  average_score DECIMAL,
  overall_progress DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    8::INTEGER as total_modules,
    COUNT(CASE WHEN completed THEN 1 END)::INTEGER as completed_modules,
    COALESCE(AVG(score), 0)::DECIMAL as average_score,
    (COUNT(CASE WHEN completed THEN 1 END)::DECIMAL / 8 * 100)::DECIMAL as overall_progress
  FROM module_progress
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;
-- Function to check if user can proceed to next module
CREATE OR REPLACE FUNCTION can_proceed_to_module(p_user_id UUID, p_module_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  v_prev_module_completed BOOLEAN;
BEGIN
  -- First module is always accessible
  IF p_module_id = 1 THEN
    RETURN TRUE;
  END IF;
  
  -- Check if previous module is completed with >= 80% score
  SELECT completed AND COALESCE(score, 0) >= 80
  INTO v_prev_module_completed
  FROM module_progress
  WHERE user_id = p_user_id AND module_id = p_module_id - 1;
  
  RETURN COALESCE(v_prev_module_completed, FALSE);
END;
$$ LANGUAGE plpgsql;
