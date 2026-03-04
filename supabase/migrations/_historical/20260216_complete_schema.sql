-- ============================================================================
-- KLARPAKKE DATABASE SCHEMA - COMPLETE INITIAL SETUP
-- Migration: 20260216_complete_schema.sql
-- Author: KIMI 2.5 Code
-- Description: Creates all essential tables, policies, functions, and triggers
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TABLE: profiles
-- Description: User profile information linked to auth.users
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'student' 
    CHECK (role IN ('student', 'admin', 'instructor')),
  full_name text,
  avatar_url text,
  bio text,
  
  -- Settings
  language text DEFAULT 'no' CHECK (language IN ('no', 'en')),
  timezone text DEFAULT 'Europe/Oslo',
  notifications_enabled boolean DEFAULT true,
  
  -- Timestamps
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  last_sign_in_at timestamptz
);

-- Indexes for profiles
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);
CREATE INDEX IF NOT EXISTS profiles_created_at_idx ON public.profiles(created_at);

-- RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================================
-- TABLE: api_keys
-- Description: Encrypted exchange API keys for trading integrations
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Exchange information
  exchange text NOT NULL DEFAULT 'binance' 
    CHECK (exchange IN ('binance', 'binance_testnet', 'coinbase', 'kraken')),
  label text NOT NULL DEFAULT 'Main Account',
  
  -- API credentials (api_secret will be encrypted client-side)
  api_key text NOT NULL,
  api_secret text NOT NULL, -- Encrypted with AES-GCM
  
  -- Status and permissions
  is_active boolean DEFAULT true,
  last_tested_at timestamptz,
  test_status text CHECK (test_status IN ('success', 'failed', 'pending', null)),
  test_error text,
  
  -- Permissions (JSONB for flexibility)
  permissions jsonb DEFAULT '{"spot": true, "futures": false, "margin": false}'::jsonb,
  
  -- Metadata
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- Unique constraint: one label per user per exchange
  CONSTRAINT unique_user_exchange_label UNIQUE (user_id, exchange, label)
);

-- Indexes for api_keys
CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS api_keys_exchange_idx ON public.api_keys(exchange);
CREATE INDEX IF NOT EXISTS api_keys_is_active_idx ON public.api_keys(is_active);

-- RLS for api_keys
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own API keys" ON public.api_keys;
CREATE POLICY "Users can view own API keys"
  ON public.api_keys FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own API keys" ON public.api_keys;
CREATE POLICY "Users can insert own API keys"
  ON public.api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own API keys" ON public.api_keys;
CREATE POLICY "Users can update own API keys"
  ON public.api_keys FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own API keys" ON public.api_keys;
CREATE POLICY "Users can delete own API keys"
  ON public.api_keys FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- TABLE: trading_positions
-- Description: User trading positions (both paper and live trading)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trading_positions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Position details
  symbol text NOT NULL, -- e.g., "BTCUSDT"
  exchange text NOT NULL DEFAULT 'binance',
  side text NOT NULL CHECK (side IN ('buy', 'sell', 'long', 'short')),
  
  -- Quantities and prices
  quantity decimal(20, 8) NOT NULL,
  entry_price decimal(20, 8) NOT NULL,
  current_price decimal(20, 8),
  exit_price decimal(20, 8),
  
  -- P&L
  pnl decimal(20, 2),
  pnl_percentage decimal(10, 4),
  
  -- Status
  status text NOT NULL DEFAULT 'open' 
    CHECK (status IN ('open', 'closed', 'cancelled')),
  position_type text NOT NULL DEFAULT 'paper' 
    CHECK (position_type IN ('paper', 'live')),
  
  -- Stop loss and take profit
  stop_loss decimal(20, 8),
  take_profit decimal(20, 8),
  
  -- Timestamps
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  closed_at timestamptz
);

-- Indexes for trading_positions
CREATE INDEX IF NOT EXISTS trading_positions_user_id_idx ON public.trading_positions(user_id);
CREATE INDEX IF NOT EXISTS trading_positions_status_idx ON public.trading_positions(status);
CREATE INDEX IF NOT EXISTS trading_positions_symbol_idx ON public.trading_positions(symbol);
CREATE INDEX IF NOT EXISTS trading_positions_created_at_idx ON public.trading_positions(created_at);

-- RLS for trading_positions
ALTER TABLE public.trading_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own positions" ON public.trading_positions;
CREATE POLICY "Users can view own positions"
  ON public.trading_positions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own positions" ON public.trading_positions;
CREATE POLICY "Users can insert own positions"
  ON public.trading_positions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own positions" ON public.trading_positions;
CREATE POLICY "Users can update own positions"
  ON public.trading_positions FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own positions" ON public.trading_positions;
CREATE POLICY "Users can delete own positions"
  ON public.trading_positions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- TABLE: courses
-- Description: Trading courses and educational content
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.courses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Course information
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  thumbnail_url text,
  
  -- Content
  level text NOT NULL DEFAULT 'beginner' 
    CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  duration_minutes int,
  
  -- Access control
  is_published boolean DEFAULT false,
  is_free boolean DEFAULT false,
  price_nok decimal(10, 2) DEFAULT 0,
  
  -- Metadata
  instructor_id uuid REFERENCES public.profiles(id),
  category text,
  tags text[],
  
  -- Ordering
  sort_order int DEFAULT 0,
  
  -- Timestamps
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  published_at timestamptz
);

-- Indexes for courses
CREATE INDEX IF NOT EXISTS courses_slug_idx ON public.courses(slug);
CREATE INDEX IF NOT EXISTS courses_is_published_idx ON public.courses(is_published);
CREATE INDEX IF NOT EXISTS courses_level_idx ON public.courses(level);

-- RLS for courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published courses are viewable by everyone" ON public.courses;
CREATE POLICY "Published courses are viewable by everyone"
  ON public.courses FOR SELECT
  USING (is_published = true OR auth.uid() = instructor_id);

DROP POLICY IF EXISTS "Instructors can manage their courses" ON public.courses;
CREATE POLICY "Instructors can manage their courses"
  ON public.courses FOR ALL
  USING (auth.uid() = instructor_id);

-- ============================================================================
-- TABLE: user_course_progress
-- Description: Track user progress through courses
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_course_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  
  -- Progress
  progress_percentage int DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  completed boolean DEFAULT false,
  current_lesson_id text,
  
  -- Timestamps
  started_at timestamptz DEFAULT now() NOT NULL,
  last_accessed_at timestamptz DEFAULT now() NOT NULL,
  completed_at timestamptz,
  
  -- Unique constraint
  CONSTRAINT unique_user_course UNIQUE (user_id, course_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS user_course_progress_user_id_idx ON public.user_course_progress(user_id);
CREATE INDEX IF NOT EXISTS user_course_progress_course_id_idx ON public.user_course_progress(course_id);

-- RLS
ALTER TABLE public.user_course_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own progress" ON public.user_course_progress;
CREATE POLICY "Users can view own progress"
  ON public.user_course_progress FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own progress" ON public.user_course_progress;
CREATE POLICY "Users can update own progress"
  ON public.user_course_progress FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function: Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, last_sign_in_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET last_sign_in_at = now();
  
  RETURN new;
END;
$$;

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Auto-create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Triggers: Auto-update updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_api_keys_updated_at ON public.api_keys;
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_trading_positions_updated_at ON public.trading_positions;
CREATE TRIGGER update_trading_positions_updated_at
  BEFORE UPDATE ON public.trading_positions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_courses_updated_at ON public.courses;
CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.profiles IS 'User profiles with role-based access';
COMMENT ON TABLE public.api_keys IS 'Encrypted exchange API keys for trading';
COMMENT ON TABLE public.trading_positions IS 'User trading positions (paper and live)';
COMMENT ON TABLE public.courses IS 'Educational courses for trading';
COMMENT ON TABLE public.user_course_progress IS 'User progress through courses';

COMMENT ON FUNCTION public.handle_new_user() IS 'Auto-creates profile when user signs up';
COMMENT ON FUNCTION public.update_updated_at_column() IS 'Updates updated_at timestamp on row update';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify all tables exist
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name IN ('profiles', 'api_keys', 'trading_positions', 'courses', 'user_course_progress')) = 5,
    'Not all tables were created';
END $$;

-- Success message
SELECT 'Database schema created successfully! ✅' AS status;
