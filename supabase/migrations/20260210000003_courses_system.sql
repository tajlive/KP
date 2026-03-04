-- ============================================================================
-- COURSES SYSTEM - Complete course and lesson management
-- ============================================================================

-- 1. COURSES TABLE
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  level TEXT CHECK (level IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
  duration_hours INTEGER DEFAULT 4,
  order_index INTEGER DEFAULT 0,
  image_url TEXT,
  is_published BOOLEAN DEFAULT true,
  price_nok INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE courses IS 'Trading courses available to students';

-- 2. LESSONS TABLE
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT, -- Markdown content
  content_type TEXT DEFAULT 'markdown' CHECK (content_type IN ('markdown', 'video', 'quiz', 'simulator')),
  video_url TEXT,
  order_index INTEGER DEFAULT 0,
  duration_minutes INTEGER DEFAULT 15,
  is_free_preview BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, slug)
);

COMMENT ON TABLE lessons IS 'Individual lessons within a course';

-- 3. USER COURSE PROGRESS
CREATE TABLE IF NOT EXISTS user_course_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  is_completed BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id, lesson_id)
);

COMMENT ON TABLE user_course_progress IS 'Tracks user progress through courses and lessons';

-- 4. USER ENROLLMENTS
CREATE TABLE IF NOT EXISTS user_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'cancelled')),
  UNIQUE(user_id, course_id)
);

COMMENT ON TABLE user_enrollments IS 'User enrollments in courses';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_courses_level ON courses(level);
CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(is_published);
CREATE INDEX IF NOT EXISTS idx_courses_order ON courses(order_index);

CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order ON lessons(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lessons_published ON lessons(is_published);

CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_course_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_course ON user_course_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_lesson ON user_course_progress(lesson_id);

CREATE INDEX IF NOT EXISTS idx_enrollments_user ON user_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON user_enrollments(course_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_enrollments ENABLE ROW LEVEL SECURITY;

-- Courses: Anyone can read published courses
DROP POLICY IF EXISTS "Published courses are publicly readable" ON courses;
CREATE POLICY "Published courses are publicly readable"
  ON courses FOR SELECT
  USING (is_published = true);

-- Courses: Only admins can modify
DROP POLICY IF EXISTS "Only admins can insert courses" ON courses;
CREATE POLICY "Only admins can insert courses"
  ON courses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Only admins can update courses" ON courses;
CREATE POLICY "Only admins can update courses"
  ON courses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Only admins can delete courses" ON courses;
CREATE POLICY "Only admins can delete courses"
  ON courses FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.id = auth.uid()
    )
  );

-- Lessons: Anyone can read published lessons of published courses
DROP POLICY IF EXISTS "Published lessons are publicly readable" ON lessons;
CREATE POLICY "Published lessons are publicly readable"
  ON lessons FOR SELECT
  USING (
    is_published = true 
    AND EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = lessons.course_id 
      AND courses.is_published = true
    )
  );

-- Lessons: Only admins can modify
DROP POLICY IF EXISTS "Only admins can modify lessons" ON lessons;
CREATE POLICY "Only admins can modify lessons"
  ON lessons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.id = auth.uid()
    )
  );

-- User progress: Users can only see own progress
DROP POLICY IF EXISTS "Users can view own progress" ON user_course_progress;
CREATE POLICY "Users can view own progress"
  ON user_course_progress FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own progress" ON user_course_progress;
CREATE POLICY "Users can update own progress"
  ON user_course_progress FOR ALL
  USING (user_id = auth.uid());

-- Enrollments: Users can see own enrollments
DROP POLICY IF EXISTS "Users can view own enrollments" ON user_enrollments;
CREATE POLICY "Users can view own enrollments"
  ON user_enrollments FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can enroll themselves" ON user_enrollments;
CREATE POLICY "Users can enroll themselves"
  ON user_enrollments FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to calculate course progress
CREATE OR REPLACE FUNCTION calculate_course_progress(p_user_id UUID, p_course_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_lessons INTEGER;
  completed_lessons INTEGER;
  progress INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_lessons
  FROM lessons
  WHERE course_id = p_course_id AND is_published = true;
  
  SELECT COUNT(*) INTO completed_lessons
  FROM user_course_progress
  WHERE user_id = p_user_id 
    AND course_id = p_course_id 
    AND is_completed = true;
  
  IF total_lessons = 0 THEN
    RETURN 0;
  END IF;
  
  progress := (completed_lessons * 100) / total_lessons;
  RETURN progress;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update course progress when lesson is completed
CREATE OR REPLACE FUNCTION update_course_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the progress percent for the entire course
  UPDATE user_course_progress
  SET progress_percent = calculate_course_progress(NEW.user_id, NEW.course_id)
  WHERE user_id = NEW.user_id 
    AND course_id = NEW.course_id
    AND lesson_id IS NULL; -- Course-level progress record
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update progress
DROP TRIGGER IF EXISTS on_lesson_completed ON user_course_progress;
CREATE TRIGGER on_lesson_completed
  AFTER INSERT OR UPDATE ON user_course_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_course_progress();

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert sample courses
INSERT INTO courses (slug, title, description, short_description, level, duration_hours, order_index, price_nok) VALUES
('trading-grunnkurs', 'Trading Grunnkurs', 'Lær det viktigste om markeder, risiko og strategi. Dette kurset gir deg en solid grunnlag for å forstå trading.', 'Grunnleggende trading for nybegynnere', 'beginner', 8, 1, 0),
('teknisk-analyse', 'Teknisk Analyse', 'Forstå grafer, mønstre og indikatorer. Lær å lese markedet og identifisere handelsmuligheter.', 'Les markeder som en pro', 'intermediate', 12, 2, 1990),
('risikostyring', 'Risikostyring', 'Lær å beskytte kapitalen og unngå store tap. Den viktigste ferdigheten for alle tradere.', 'Beskytt kapitalen din', 'intermediate', 6, 3, 990)
ON CONFLICT (slug) DO NOTHING;

-- Insert sample lessons for Trading Grunnkurs
DO $$
DECLARE
  v_course_id UUID;
BEGIN
  SELECT id INTO v_course_id FROM courses WHERE slug = 'trading-grunnkurs';
  
  IF v_course_id IS NOT NULL THEN
    INSERT INTO lessons (course_id, slug, title, description, order_index, duration_minutes, is_free_preview)
    VALUES
      (v_course_id, 'introduksjon', 'Introduksjon til Trading', 'Hva er trading og hvordan fungerer markeder?', 1, 20, true),
      (v_course_id, 'markedstyper', 'Ulike Markedstyper', 'Aksjer, krypto, forex - hva er forskjellen?', 2, 25, true),
      (v_course_id, 'risiko', 'Forstå Risiko', 'Hvorfor de fleste tradere taper penger', 3, 30, false),
      (v_course_id, 'strategi', 'Din Første Strategi', 'Enkel trend-følging strategi', 4, 35, false),
      (v_course_id, 'praksis', 'Praksis med Paper Trading', 'Øv uten å risikere ekte penger', 5, 30, false)
    ON CONFLICT (course_id, slug) DO NOTHING;
  END IF;
END $$;

-- Insert sample lessons for Teknisk Analyse
DO $$
DECLARE
  v_course_id UUID;
BEGIN
  SELECT id INTO v_course_id FROM courses WHERE slug = 'teknisk-analyse';
  
  IF v_course_id IS NOT NULL THEN
    INSERT INTO lessons (course_id, slug, title, description, order_index, duration_minutes, is_free_preview)
    VALUES
      (v_course_id, 'stotte-motstand', 'Støtte og Motstand', 'Identifiser nøkkelnivåer i markedet', 1, 30, true),
      (v_course_id, 'trendlinjer', 'Trendlinjer og Kanaler', 'Følg trenden til den ender', 2, 35, false),
      (v_course_id, 'candlesticks', 'Candlestick-mønstre', 'Les prishandling som en pro', 3, 40, false),
      (v_course_id, 'indikatorer', 'Flyttende Gjennomsnitt', 'Bruk MA for bedre entries', 4, 35, false),
      (v_course_id, 'rsi-macd', 'RSI og MACD', 'Momentum indikatorer i praksis', 5, 40, false)
    ON CONFLICT (course_id, slug) DO NOTHING;
  END IF;
END $$;

-- Insert sample lessons for Risikostyring
DO $$
DECLARE
  v_course_id UUID;
BEGIN
  SELECT id INTO v_course_id FROM courses WHERE slug = 'risikostyring';
  
  IF v_course_id IS NOT NULL THEN
    INSERT INTO lessons (course_id, slug, title, description, order_index, duration_minutes, is_free_preview) VALUES
    (v_course_id, 'posisjonsstorrelse', 'Posisjonsstørrelse', 'Hvor mye bør du handle?', 1, 25, true),
    (v_course_id, 'stop-loss', 'Stop-loss Strategier', 'Beskytte deg mot store tap', 2, 30, false),
    (v_course_id, 'risk-reward', 'Risk/Reward Ratio', 'Sikre at gevinsten er verdt risikoen', 3, 25, false),
    (v_course_id, 'psykologi', 'Trading Psykologi', 'Kontroller følelsene dine', 4, 35, false)
    ON CONFLICT (course_id, slug) DO NOTHING;
  END IF;
END $$;
