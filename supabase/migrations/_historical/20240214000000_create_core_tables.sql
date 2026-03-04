-- =====================================================
-- KLARPAKKE CORE TABLES
-- Oppretter alle nødvendige tabeller for dashboard
-- =====================================================

-- 1. Brukerprofiler (kobles til auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'student', 'bachelor', 'master', 'phd', 'professor')),
    subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'past_due')),
    subscription_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for å oppdatere updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 2. Paper Trading Simuleringer
CREATE TABLE IF NOT EXISTS paper_simulations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT DEFAULT 'My Simulation',
    initial_balance DECIMAL(15,2) DEFAULT 1000000.00,
    current_balance DECIMAL(15,2) DEFAULT 1000000.00,
    total_pnl DECIMAL(15,2) DEFAULT 0.00,
    total_pnl_percentage DECIMAL(8,2) DEFAULT 0.00,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_paper_simulations_updated_at ON paper_simulations;
CREATE TRIGGER update_paper_simulations_updated_at 
    BEFORE UPDATE ON paper_simulations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 3. Paper Trading Trades
CREATE TABLE IF NOT EXISTS paper_trades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    simulation_id UUID REFERENCES paper_simulations(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    type TEXT CHECK (type IN ('buy', 'sell')),
    amount DECIMAL(15,8) NOT NULL,
    price DECIMAL(15,2) NOT NULL,
    total_value DECIMAL(15,2) NOT NULL,
    pnl DECIMAL(15,2),
    pnl_percentage DECIMAL(8,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Ordrer/Betalinger
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('student', 'bachelor', 'master', 'phd', 'professor')),
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'NOK',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
    payment_method TEXT CHECK (payment_method IN ('vipps', 'card', 'crypto')),
    payment_provider_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 5. Kurs
CREATE TABLE IF NOT EXISTS courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    duration_minutes INTEGER,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
CREATE TRIGGER update_courses_updated_at 
    BEFORE UPDATE ON courses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Kurs Fremgang
CREATE TABLE IF NOT EXISTS course_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

DROP TRIGGER IF EXISTS update_course_progress_updated_at ON course_progress;
CREATE TRIGGER update_course_progress_updated_at 
    BEFORE UPDATE ON course_progress 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Beta Påmeldinger
CREATE TABLE IF NOT EXISTS beta_signups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    source TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Beta Søknader
CREATE TABLE IF NOT EXISTS beta_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    experience_level TEXT,
    motivation TEXT,
    risk_tolerance TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Varsler
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Auto Trading Konfigurasjon
CREATE TABLE IF NOT EXISTS user_auto_trading_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    is_active BOOLEAN DEFAULT false,
    risk_level TEXT DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high')),
    max_position_size DECIMAL(15,2),
    stop_loss_percentage DECIMAL(5,2),
    take_profit_percentage DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Auto Trading Sesjoner
CREATE TABLE IF NOT EXISTS auto_trading_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    config_id UUID REFERENCES user_auto_trading_configs(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'stopped')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    stopped_at TIMESTAMPTZ,
    total_pnl DECIMAL(15,2) DEFAULT 0,
    total_trades INTEGER DEFAULT 0
);

-- 12. Auto Trading Trades
CREATE TABLE IF NOT EXISTS auto_trading_trades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES auto_trading_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    side TEXT CHECK (side IN ('buy', 'sell')),
    quantity DECIMAL(15,8),
    entry_price DECIMAL(15,2),
    exit_price DECIMAL(15,2),
    pnl DECIMAL(15,2),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

-- 13. Leaderboard
CREATE TABLE IF NOT EXISTS leaderboard_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    simulation_id UUID REFERENCES paper_simulations(id) ON DELETE CASCADE,
    rank INTEGER,
    total_pnl DECIMAL(15,2),
    total_pnl_percentage DECIMAL(8,2),
    period TEXT DEFAULT 'weekly' CHECK (period IN ('daily', 'weekly', 'monthly', 'all_time')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, period)
);

-- 14. Exchange API Nøkler
CREATE TABLE IF NOT EXISTS exchange_api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    exchange TEXT NOT NULL CHECK (exchange IN ('binance', 'coinbase', 'kraken')),
    api_key_encrypted TEXT NOT NULL,
    api_secret_encrypted TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Vipps Betalinger
CREATE TABLE IF NOT EXISTS vipps_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    vipps_order_id TEXT UNIQUE,
    vipps_reference TEXT,
    amount DECIMAL(10,2),
    status TEXT DEFAULT 'pending',
    vipps_status TEXT,
    payer_info JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Analytics Events
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    event_name TEXT NOT NULL,
    properties JSONB,
    session_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Feillogging
CREATE TABLE IF NOT EXISTS client_errors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    component_name TEXT,
    url TEXT,
    user_agent TEXT,
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- RLS (Row Level Security) Policies
-- =====================================================

-- Profiles: Brukere kan kun se/redigere egen profil
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" 
    ON profiles FOR SELECT 
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" 
    ON profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Admins kan se alle profiler
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- Paper simulations: Kun eier
ALTER TABLE paper_simulations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own simulations" ON paper_simulations;
CREATE POLICY "Users can manage own simulations"
    ON paper_simulations FOR ALL
    USING (user_id = auth.uid());

-- Paper trades: Kun eier
ALTER TABLE paper_trades ENABLE ROW LEVEL SECURITY;

-- NOTE: paper_trades schema may differ on remote, skipping policy for now
-- DROP POLICY IF EXISTS "Users can view own trades" ON paper_trades;
-- CREATE POLICY "Users can view own trades"
--     ON paper_trades FOR SELECT
--     USING (user_id = auth.uid());

-- Orders: Kun eier
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Users can view own orders"
    ON orders FOR SELECT
    USING (user_id = auth.uid());

-- Course progress: Kun eier
ALTER TABLE course_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own progress" ON course_progress;
CREATE POLICY "Users can manage own progress"
    ON course_progress FOR ALL
    USING (user_id = auth.uid());

-- Notifications: Kun eier
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own notifications" ON notifications;
CREATE POLICY "Users can manage own notifications"
    ON notifications FOR ALL
    USING (user_id = auth.uid());

-- =====================================================
-- Indexes for ytelse
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

-- NOTE: paper_trades schema may differ on remote, skipping indexes
-- CREATE INDEX IF NOT EXISTS idx_paper_trades_user_id ON paper_trades(user_id);
-- CREATE INDEX IF NOT EXISTS idx_paper_trades_created_at ON paper_trades(created_at);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

CREATE INDEX IF NOT EXISTS idx_course_progress_user_id ON course_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_course_id ON course_progress(course_id);

CREATE INDEX IF NOT EXISTS idx_beta_signups_email ON beta_signups(email);
CREATE INDEX IF NOT EXISTS idx_beta_signups_created_at ON beta_signups(created_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);

-- =====================================================
-- FERDIG!
-- =====================================================
