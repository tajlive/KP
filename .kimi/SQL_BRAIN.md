# 🤖 Kimi's SQL Brain - Persistent Context

## ✅ SQL AUTOMATION STATUS

**EXECUTION METHOD:** `node scripts/ai-sql-runner.js <file.sql>`
- Uses `exec_sql()` PostgreSQL function via Supabase RPC
- Service role authentication via SUPABASE_SERVICE_ROLE_KEY
- No manual copy-paste to Supabase Dashboard needed!

**ENVIRONMENT:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://vuxbjlykgmzskxbclquf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs... (from .env.local)
```

---

## 🗄️ DATABASE ARCHITECTURE

### Core Tables
```
profiles              - User profiles, subscription info
auth.users            - Supabase auth (managed)
user_gamification     - XP, level, streak (KLA-34)
xp_transactions       - Audit log for XP
leaderboard_history   - Rank tracking
email_preferences     - User notification settings (KLA-31)
email_log             - Email delivery tracking
notification_queue    - Pending notifications
notifications         - In-app notifications
subscriptions         - Stripe subscription data
```

### Gamification System (KLA-34)
```sql
-- Level calculation
Level = floor(sqrt(total_xp / 100)) + 1
Level 1: 0 XP      Level 6: 2,500 XP
Level 2: 100 XP    Level 7: 3,600 XP
Level 3: 400 XP    Level 10: 8,100 XP

-- Key functions
award_xp(user_id, amount, action, description, metadata)
award_login_xp(user_id)  -- with streak bonus (max 2x at day 10+)
calculate_level(xp)
```

### Email System (KLA-31)
```sql
-- Preferences (per user)
marketing_emails: false
gamification_emails: true
trading_alerts: true
digest_emails: 'weekly' | 'daily' | 'never'

-- Key functions
get_or_create_email_preferences(user_id)
```

---

## 📝 SQL GENERATION GUIDELINES

### 1. Migration File Naming
```
YYYYMMDD_HHMMSS_description.sql
20260228_143000_add_user_tier_column.sql
```

### 2. Idempotent SQL (Safe to run multiple times)
```sql
-- ALWAYS use IF NOT EXISTS / IF EXISTS
CREATE TABLE IF NOT EXISTS table_name (...);
CREATE INDEX IF NOT EXISTS idx_name ON table(...);
DROP TRIGGER IF EXISTS trigger_name ON table;
CREATE OR REPLACE FUNCTION function_name() ...
```

### 3. Standard Template
```sql
-- ============================================================================
-- Description: What this migration does
-- Author: Kimi
-- Date: YYYY-MM-DD
-- ============================================================================

-- 1. Create table (if new)
CREATE TABLE IF NOT EXISTS table_name (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_table_user ON table_name(user_id);

-- 3. RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data"
    ON table_name FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage"
    ON table_name FOR ALL
    USING (true)
    WITH CHECK (true);

-- 4. Triggers
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_timestamp ON table_name;
CREATE TRIGGER update_timestamp
    BEFORE UPDATE ON table_name
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- 5. Comments
COMMENT ON TABLE table_name IS 'Description of table';
```

### 4. Function Template
```sql
CREATE OR REPLACE FUNCTION function_name(
    p_param1 TYPE,
    p_param2 TYPE DEFAULT 'default_value'
)
RETURNS TABLE (col1 TYPE, col2 TYPE) AS $$
DECLARE
    v_variable TYPE;
BEGIN
    -- Logic here
    RETURN QUERY SELECT ...;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION function_name IS 'What this does';
```

### 5. Trigger Template
```sql
CREATE OR REPLACE FUNCTION trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        -- Insert logic
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Update logic
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        -- Delete logic
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_name ON table_name;
CREATE TRIGGER trigger_name
    BEFORE INSERT OR UPDATE ON table_name
    FOR EACH ROW
    EXECUTE FUNCTION trigger_function();
```

---

## 🧠 SMART SQL GENERATION

### When User Says:

**"Add X to users"**
```sql
-- Generate: ALTER TABLE with IF EXISTS check
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'x') THEN
        ALTER TABLE profiles ADD COLUMN x TYPE DEFAULT value;
    END IF;
END $$;
```

**"Track Y events"**
```sql
-- Generate: Event table + trigger
CREATE TABLE IF NOT EXISTS y_events (...);
CREATE OR REPLACE FUNCTION log_y_event() ...
```

**"Calculate Z"**
```sql
-- Generate: Function with proper returns
CREATE OR REPLACE FUNCTION calculate_z(...) RETURNS ...
```

---

## 🔒 SECURITY RULES

### Forbidden in AI-generated SQL:
```
❌ DROP DATABASE
❌ DROP TABLE (use IF EXISTS only)
❌ DELETE FROM without WHERE
❌ TRUNCATE
❌ GRANT/REVOKE
❌ Direct auth.users manipulation (use supabase.auth.admin)
```

### Required:
```
✅ IF NOT EXISTS / IF EXISTS
✅ RLS policies for new tables
✅ Updated_at triggers
✅ Comments on tables/functions
✅ Foreign key constraints
✅ ON DELETE CASCADE (when appropriate)
```

---

## 🚀 EXECUTION WORKFLOW

1. **Generate SQL** using templates above
2. **Save to:** `supabase/migrations/YYYYMMDD_HHMMSS_description.sql`
3. **Run:** `node scripts/ai-sql-runner.js <file>`
4. **Verify:** Check output for ✅/❌
5. **Git:** `git add && git commit && git push`

---

## 📊 COMMON PATTERNS

### Add Column to Existing Table
```sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'new_column') THEN
        ALTER TABLE profiles ADD COLUMN new_column TYPE DEFAULT 'default';
    END IF;
END $$;
```

### Create Junction Table (Many-to-Many)
```sql
CREATE TABLE IF NOT EXISTS user_courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);
```

### Soft Delete Pattern
```sql
ALTER TABLE table_name ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE OR REPLACE VIEW active_table AS
SELECT * FROM table_name WHERE deleted_at IS NULL;

-- Instead of DELETE:
UPDATE table_name SET deleted_at = NOW() WHERE id = x;
```

### Audit Log Pattern
```sql
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    performed_by UUID REFERENCES auth.users(id),
    performed_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 📝 VERSION HISTORY

- 2026-02-28: Created SQL Brain
- 2026-02-28: KLA-34 (Gamification) deployed
- 2026-02-28: KLA-31 (Email Preferences) deployed
- 2026-02-28: exec_sql() function enabled

---

**REMEMBER:** Always run SQL via `scripts/ai-sql-runner.js` - never copy-paste to Dashboard!
