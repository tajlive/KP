-- Migration: Add course tables for "Hvorfor Priser Beveger Seg" module
-- Created: 2026-03-13

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- COURSE MODULES
-- ============================================
CREATE TABLE IF NOT EXISTS course_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    title_no TEXT NOT NULL,
    title_en TEXT NOT NULL,
    description_no TEXT,
    description_en TEXT,
    icon TEXT,
    difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
    estimated_minutes INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE course_modules IS 'Top-level course modules';

-- ============================================
-- COURSE LESSONS
-- ============================================
CREATE TABLE IF NOT EXISTS course_lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    title_no TEXT NOT NULL,
    title_en TEXT NOT NULL,
    content_no TEXT,
    content_en TEXT,
    video_url TEXT,
    estimated_minutes INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(module_id, slug)
);

COMMENT ON TABLE course_lessons IS 'Individual lessons within a module';

-- ============================================
-- QUIZ QUESTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
    question_no TEXT NOT NULL,
    question_en TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_option_id TEXT NOT NULL,
    explanation_no TEXT,
    explanation_en TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE quiz_questions IS 'Multiple choice quiz questions for lessons';
COMMENT ON COLUMN quiz_questions.options IS 'JSON array of {id, text_no, text_en} objects';

-- ============================================
-- USER LESSON PROGRESS
-- ============================================
CREATE TABLE IF NOT EXISTS user_lesson_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('not_started', 'in_progress', 'completed')) DEFAULT 'not_started',
    time_spent_seconds INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, lesson_id)
);

COMMENT ON TABLE user_lesson_progress IS 'User progress tracking for lessons';

-- ============================================
-- USER QUIZ ATTEMPTS
-- ============================================
CREATE TABLE IF NOT EXISTS user_quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    selected_option_id TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    attempted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, question_id)
);

COMMENT ON TABLE user_quiz_attempts IS 'User quiz attempt tracking';

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_course_modules_slug ON course_modules(slug);
CREATE INDEX IF NOT EXISTS idx_course_modules_published ON course_modules(is_published);
CREATE INDEX IF NOT EXISTS idx_course_modules_sort ON course_modules(sort_order);

CREATE INDEX IF NOT EXISTS idx_course_lessons_module ON course_lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_course_lessons_slug ON course_lessons(slug);
CREATE INDEX IF NOT EXISTS idx_course_lessons_published ON course_lessons(is_published);
CREATE INDEX IF NOT EXISTS idx_course_lessons_sort ON course_lessons(module_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_lesson ON quiz_questions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_sort ON quiz_questions(lesson_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_user ON user_lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_lesson ON user_lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_user_lesson ON user_lesson_progress(user_id, lesson_id);

CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts_user ON user_quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts_question ON user_quiz_attempts(question_id);
CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts_user_question ON user_quiz_attempts(user_id, question_id);

-- ============================================
-- TRIGGER: update_updated_at_column
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables with updated_at
DROP TRIGGER IF EXISTS update_course_modules_updated_at ON course_modules;
CREATE TRIGGER update_course_modules_updated_at
    BEFORE UPDATE ON course_modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_course_lessons_updated_at ON course_lessons;
CREATE TRIGGER update_course_lessons_updated_at
    BEFORE UPDATE ON course_lessons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_quiz_questions_updated_at ON quiz_questions;
CREATE TRIGGER update_quiz_questions_updated_at
    BEFORE UPDATE ON quiz_questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_lesson_progress_updated_at ON user_lesson_progress;
CREATE TRIGGER update_user_lesson_progress_updated_at
    BEFORE UPDATE ON user_lesson_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Course modules: anyone can read published modules
DROP POLICY IF EXISTS course_modules_select_published ON course_modules;
CREATE POLICY course_modules_select_published ON course_modules
    FOR SELECT TO public
    USING (is_published = true);

-- Course lessons: anyone can read published lessons
DROP POLICY IF EXISTS course_lessons_select_published ON course_lessons;
CREATE POLICY course_lessons_select_published ON course_lessons
    FOR SELECT TO public
    USING (is_published = true);

-- Quiz questions: anyone can read questions for published lessons
DROP POLICY IF EXISTS quiz_questions_select_published ON quiz_questions;
CREATE POLICY quiz_questions_select_published ON quiz_questions
    FOR SELECT TO public
    USING (
        EXISTS (
            SELECT 1 FROM course_lessons cl
            JOIN course_modules cm ON cl.module_id = cm.id
            WHERE cl.id = quiz_questions.lesson_id
            AND cl.is_published = true
            AND cm.is_published = true
        )
    );

-- User lesson progress: users can only manage their own progress
DROP POLICY IF EXISTS user_lesson_progress_select_own ON user_lesson_progress;
CREATE POLICY user_lesson_progress_select_own ON user_lesson_progress
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_lesson_progress_insert_own ON user_lesson_progress;
CREATE POLICY user_lesson_progress_insert_own ON user_lesson_progress
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_lesson_progress_update_own ON user_lesson_progress;
CREATE POLICY user_lesson_progress_update_own ON user_lesson_progress
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_lesson_progress_delete_own ON user_lesson_progress;
CREATE POLICY user_lesson_progress_delete_own ON user_lesson_progress
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- User quiz attempts: users can only manage their own attempts
DROP POLICY IF EXISTS user_quiz_attempts_select_own ON user_quiz_attempts;
CREATE POLICY user_quiz_attempts_select_own ON user_quiz_attempts
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_quiz_attempts_insert_own ON user_quiz_attempts;
CREATE POLICY user_quiz_attempts_insert_own ON user_quiz_attempts
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_quiz_attempts_update_own ON user_quiz_attempts;
CREATE POLICY user_quiz_attempts_update_own ON user_quiz_attempts
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_quiz_attempts_delete_own ON user_quiz_attempts;
CREATE POLICY user_quiz_attempts_delete_own ON user_quiz_attempts
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());
